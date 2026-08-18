import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CircleDollarSign, Tag } from 'lucide-react';
import { FLEET_CARS, FLEET_SERVICES, buildNewFleetProduct, carKeyOf } from '../../data/adminFleetServices';
import { createProduct, updateProduct } from '../../firebase/admin';
import { extraFleetRoutesForService } from '../../data/bookingLocations';
import { getCarDisplayName } from '../../data/staticData';
import { carCatalogLabel, getPriceGridCarIds } from '../../utils/carCatalogHelpers';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { HOURLY_DESTINATIONS_BY_CITY, HOURLY_DURATIONS } from '../../data/hourlyPricing';
import AdminPagination from './AdminPagination';

function priceCarIds(carCatalog) {
  return getPriceGridCarIds(carCatalog, FLEET_CARS);
}

function priceCarName(carId, carCatalog, lang) {
  const hit = (carCatalog || []).find((item) => item.id === carId);
  if (hit) return carCatalogLabel(hit, lang);
  return getCarDisplayName(carId, lang);
}

const SECTION_SERVICES = {
  between_cities: ['cityToCity'],
  one_way: ['airport'],
  round_trip: ['train', 'airport'],
  hourly: ['hourly', 'withinCity'],
  ziyarat: ['ziyarat'],
  custom_price: [],
};

export function productMap(products) {
  const map = new Map();
  (products || []).forEach((p) => {
    const car = carKeyOf(p);
    if (!p.routeId || !car) return;
    const svc = String(p.fleetServiceId || '').trim();
    const formId = String(p.bookingFormId || '').trim();
    const base = svc ? `${svc}::${p.routeId}::${car}` : `${p.routeId}::${car}`;
    if (formId) map.set(`${base}::${formId}`, p);
    else if (!map.has(base)) map.set(base, p);
    if (!map.has(`${p.routeId}::${car}`)) map.set(`${p.routeId}::${car}`, p);
  });
  return map;
}

function getProduct(byKey, routeId, car, serviceId, formId) {
  const base = serviceId ? `${serviceId}::${routeId}::${car}` : `${routeId}::${car}`;
  if (formId && byKey.has(`${base}::${formId}`)) return byKey.get(`${base}::${formId}`);
  if (serviceId && byKey.has(base)) return byKey.get(base);
  return byKey.get(`${routeId}::${car}`);
}

function cityLabel(city, lang) {
  return lang === 'ar' ? (city?.ar || city?.en || '') : (city?.en || city?.ar || '');
}

function hourlyDestKeysForCity(city, cities = []) {
  const key = String(city?.key || '').trim();
  const fromSheet = (HOURLY_DESTINATIONS_BY_CITY[key] || []).filter((dest) => dest !== 'internal');
  if (fromSheet.length) return fromSheet;
  return (cities || [])
    .filter((item) => item.id !== city.id && item.active !== false && item.key && item.key !== key)
    .map((item) => item.key);
}

function sectionRows({ mode, formId, cities, routes, locations }) {
  if (mode === 'custom_price') return [];

  const mergeServiceRoutes = (serviceIds) => {
    const out = [];
    const seen = new Set();
    serviceIds.forEach((id) => {
      const service = FLEET_SERVICES[id];
      (service?.getRoutes?.() || []).forEach((route) => {
        if (!route?.id || seen.has(route.id)) return;
        seen.add(route.id);
        out.push({ id: route.id, label: route.label });
      });
      extraFleetRoutesForService(id, locations).forEach((route) => {
        if (!route?.id || seen.has(route.id)) return;
        seen.add(route.id);
        out.push(route);
      });
    });
    return out;
  };

  if (mode === 'between_cities') return mergeServiceRoutes(['cityToCity']);
  if (mode === 'one_way') {
    const allowed = new Set(
      (routes || []).filter((route) => route.active !== false && route.forms?.oneWay !== false).map((r) => r.id),
    );
    return mergeServiceRoutes(['airport', 'train']).filter((row) => allowed.has(row.id));
  }
  if (mode === 'round_trip') {
    const allowed = new Set(
      (routes || []).filter((route) => route.active !== false && route.forms?.roundTrip !== false).map((r) => r.id),
    );
    return mergeServiceRoutes(['airport', 'train']).filter((row) => allowed.has(row.id));
  }
  if (mode === 'hourly') {
    const serviceIds = formId === 'religiousTours' ? ['ziyarat'] : ['hourly', 'withinCity'];
    const extra = mergeServiceRoutes(serviceIds);
    const seen = new Set(extra.map((row) => row.id));
    const formKey = formId === 'religiousTours' ? 'ziyarat' : 'hourly';
    (cities || [])
      .filter((city) => city.active !== false && city.forms?.[formKey] !== false)
      .forEach((city) => {
        HOURLY_DURATIONS.forEach((hours) => {
          const id = `hr-${hours}-${city.key}-internal`;
          if (seen.has(id)) return;
          extra.push({
            id,
            label: {
              en: `${hours}h · ${city.en}`,
              ar: `${hours}س · ${city.ar}`,
            },
          });
          seen.add(id);
        });
      });
    return extra;
  }
  return [];
}

export function priceGroupsForCity(city, formKey, cities = [], lang = 'en') {
  if (!city) return [];
  const cityKey = String(city.key || '').trim();
  const hoursLabel = (hours) => (lang === 'ar' ? `${hours} ساعات` : `${hours} hours`);

  if (formKey === 'betweenCities') {
    return (cities || [])
      .filter((item) => item.id !== city.id && item.active !== false && item.forms?.betweenCities !== false)
      .map((to) => ({
        routeId: `ow-${city.id}-${to.id}`,
        label: lang === 'ar' ? `إلى ${to.ar || to.en}` : `To ${to.en || to.ar}`,
        serviceId: 'cityToCity',
        priceKind: 'flat',
      }));
  }

  if (formKey === 'ziyarat') {
    if (!cityKey) return [];
    return HOURLY_DURATIONS.map((hours) => ({
      routeId: `hr-${hours}-${cityKey}-internal`,
      label: hoursLabel(hours),
      serviceId: 'ziyarat',
      priceKind: 'flat',
      hours,
      heading: lang === 'ar' ? 'زيارات (داخل المدينة)' : 'Ziyarat (within city)',
    }));
  }

  if (formKey === 'hourly') {
    if (!cityKey) return [];
    const groups = HOURLY_DURATIONS.map((hours) => ({
      routeId: `hr-${hours}-${cityKey}-internal`,
      label: hoursLabel(hours),
      serviceId: 'withinCity',
      priceKind: 'flat',
      hours,
      heading: lang === 'ar' ? 'داخل المدينة' : 'Within the city',
    }));
    hourlyDestKeysForCity(city, cities).forEach((destKey) => {
      const dest = (cities || []).find((item) => item.key === destKey);
      const destName = dest
        ? cityLabel(dest, lang)
        : destKey;
      HOURLY_DURATIONS.forEach((hours) => {
        groups.push({
          routeId: `hr-${hours}-${cityKey}-${destKey}`,
          label: lang === 'ar' ? `${hoursLabel(hours)} → ${destName}` : `${hoursLabel(hours)} → ${destName}`,
          serviceId: 'hourly',
          priceKind: 'flat',
          hours,
          heading: lang === 'ar' ? 'بالساعة إلى مدن أخرى' : 'Hourly to other cities',
        });
      });
    });
    return groups;
  }

  return [];
}

export function priceGroupsForRoute(route, formKey = 'roundTrip') {
  if (!route?.id) return [];
  const serviceId = route.category === 'train' ? 'train' : 'airport';
  if (formKey === 'oneWay') {
    return [{
      routeId: route.id,
      label: 'One way',
      serviceId,
      priceKind: 'one_way_pickup',
    }];
  }
  return [{
    routeId: route.id,
    label: 'Round trip',
    serviceId,
    priceKind: 'round_trip',
  }];
}

function captionKey(groups = []) {
  const services = new Set(groups.map((g) => g.serviceId));
  const kinds = new Set(groups.map((g) => g.priceKind));
  if (services.has('ziyarat') && services.size === 1) return 'rowPricesZiyarat';
  if (services.has('withinCity') && services.has('hourly')) return 'rowPricesHourlyAndWithin';
  if (services.has('withinCity') && services.size === 1) return 'rowPricesWithin';
  if (services.has('hourly') && services.size === 1) return 'rowPricesHourly';
  if (kinds.has('round_trip')) return 'rowPricesRound';
  if (kinds.has('one_way_pickup')) return 'rowPricesOneWay';
  if (services.has('cityToCity')) return 'rowPricesBetween';
  return 'rowPrices';
}

function amountForGroup(product, group, field) {
  if (!product) return '';
  if (field === 'pickupPrice') {
    if (product.pickupPrice != null && product.pickupPrice !== '') return product.pickupPrice;
    if (group.priceKind === 'one_way_pickup') return product.price ?? '';
    if (!(Number(product.dropoffPrice) > 0)) return product.price ?? '';
    return '';
  }
  if (field === 'dropoffPrice') return product.dropoffPrice ?? '';
  return product.price ?? '';
}

export function LocationPriceFields({
  groups = [],
  products,
  onProductsChange,
  carCatalog = [],
  formId = '',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const [savingKey, setSavingKey] = useState('');
  const [drafts, setDrafts] = useState({});
  const byKey = useMemo(() => productMap(products), [products]);
  const cars = useMemo(() => priceCarIds(carCatalog), [carCatalog]);
  const { page, setPage, paginated, from, to, total, totalPages, pageSize } = usePagination(groups, 10);
  useResetPageOnFilter(setPage, formId, groups.length);

  const saveCell = async (group, car, field, raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    const existing = getProduct(byKey, group.routeId, car, group.serviceId, formId);
    const current = Number(amountForGroup(existing, group, field));
    if (existing && Number.isFinite(current) && current === value) return;

    const cellKey = `${formId}::${group.serviceId}::${group.routeId}::${car}::${field}`;
    setSavingKey(cellKey);

    const pickup = field === 'pickupPrice' ? value : Number(existing?.pickupPrice) || 0;
    const dropoff = field === 'dropoffPrice' ? value : Number(existing?.dropoffPrice) || 0;
    const patch = (field === 'pickupPrice' || field === 'dropoffPrice')
      ? {
        pickupPrice: pickup,
        dropoffPrice: dropoff,
        price: pickup + dropoff || value,
        originalPrice: pickup + dropoff || value,
      }
      : { price: value, originalPrice: value };

    try {
      const scoped = existing && String(existing.bookingFormId || '') === String(formId || '');
      if (scoped && existing?.id) {
        await updateProduct(existing.id, patch);
        onProductsChange?.((list) => list.map((p) => (
          p.id === existing.id ? { ...p, ...patch } : p
        )));
      } else {
        const service = FLEET_SERVICES[group.serviceId] || FLEET_SERVICES.cityToCity;
        const payload = {
          ...buildNewFleetProduct(service, {
            car,
            routeId: group.routeId,
            price: patch.price,
            hours: group.hours,
          }),
          ...patch,
          bookingFormId: formId || '',
        };
        const id = await createProduct(payload);
        onProductsChange?.((list) => [...list, { ...payload, id }]);
      }
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  if (!groups.length) return null;

  const renderInputs = (group, field, label) => (
    <tr key={`${group.serviceId}-${group.routeId}-${field}`} className="border-t border-gray-100 dark:border-white/10">
      <td className="px-2 py-1.5 font-bold text-brand dark:text-white whitespace-nowrap">
        {label}
      </td>
      {cars.map((car) => {
        const cellKey = `${formId}::${group.serviceId}::${group.routeId}::${car}::${field}`;
        const product = getProduct(byKey, group.routeId, car, group.serviceId, formId);
        const value = drafts[cellKey] ?? String(amountForGroup(product, group, field) ?? '');
        const busy = savingKey === cellKey;
        return (
          <td key={car} className="px-1 py-1">
            <label className="relative block">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={value}
                disabled={busy}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [cellKey]: e.target.value }))}
                onBlur={(e) => saveCell(group, car, field, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="admin-input w-full text-center text-xs py-1.5 px-1 rounded-lg"
                placeholder="—"
              />
              {busy ? (
                <Loader2 className="absolute end-1 top-1.5 w-3 h-3 animate-spin text-emerald-700" />
              ) : null}
            </label>
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-white dark:bg-dark-800 overflow-hidden">
      <p className="px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
        {t(`admin.bookingForms.${captionKey(groups)}`, { count: cars.length })}
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[520px] w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-500">
              <th className="px-2 py-1.5 text-start font-black min-w-[6.5rem]">{t('admin.bookingForms.routeCol')}</th>
              {cars.map((car) => (
                <th key={car} className="px-1 py-1.5 font-black text-center whitespace-nowrap">
                  {priceCarName(car, carCatalog, lang)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((group, index) => {
              const prev = paginated[index - 1];
              const showHeading = group.heading && group.heading !== prev?.heading;
              const rows = group.priceKind === 'round_trip'
                ? [
                  renderInputs(group, 'pickupPrice', t('admin.bookingForms.pickupCol')),
                  renderInputs(group, 'dropoffPrice', t('admin.bookingForms.dropoffCol')),
                ]
                : group.priceKind === 'one_way_pickup'
                  ? [renderInputs(group, 'pickupPrice', t('admin.bookingForms.oneWayPickupCol'))]
                  : [renderInputs(group, 'price', group.label || 'SAR')];
              return (
                <Fragment key={`${group.serviceId}-${group.routeId}-${index}`}>
                  {showHeading ? (
                    <tr className="bg-emerald-50/80 dark:bg-emerald-950/20">
                      <td
                        colSpan={cars.length + 1}
                        className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300"
                      >
                        {group.heading}
                      </td>
                    </tr>
                  ) : null}
                  {rows}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {total > pageSize ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={setPage}
        />
      ) : null}
      <p className="px-3 py-1.5 text-[10px] text-gray-500">{t('admin.bookingForms.priceSaveHint')}</p>
    </div>
  );
}

export function compactPricePreview(groups, products, lang = 'en', carCatalog = [], formId = '') {
  const byKey = productMap(products);
  const first = groups[0];
  if (!first) return '';
  return priceCarIds(carCatalog).map((car) => {
    const product = getProduct(byKey, first.routeId, car, first.serviceId, formId);
    if (!product) return null;
    let amount = product.price;
    if (first.priceKind === 'round_trip') {
      amount = (Number(product.pickupPrice) || 0) + (Number(product.dropoffPrice) || 0) || product.price;
    } else if (first.priceKind === 'one_way_pickup') {
      amount = product.pickupPrice ?? product.price;
    }
    if (amount == null || amount === '') return null;
    return `${priceCarName(car, carCatalog, lang).split(' ')[0]} ${amount}`;
  }).filter(Boolean).slice(0, 3).join(' · ');
}

export default function AdminSectionPriceGrid({
  mode,
  formId,
  cities,
  routes,
  products,
  onProductsChange,
  carCatalog = [],
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const [savingKey, setSavingKey] = useState('');
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState({});
  const [pageSize, setPageSize] = useState(20);

  const locations = useMemo(() => ({ cities, routes }), [cities, routes]);
  const rows = useMemo(
    () => sectionRows({ mode, formId, cities, routes, locations }),
    [mode, formId, cities, routes, locations],
  );
  const byKey = useMemo(() => productMap(products), [products]);
  const cars = useMemo(() => priceCarIds(carCatalog), [carCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const label = lang === 'ar' ? (row.label?.ar || row.label?.en) : (row.label?.en || row.label?.ar);
      return `${label} ${row.id}`.toLowerCase().includes(q);
    });
  }, [rows, query, lang]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(filtered, pageSize);
  useResetPageOnFilter(setPage, query, mode, formId, pageSize);

  if (mode === 'custom_price') {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-3 py-3 text-[12px] text-amber-900">
        {t('admin.bookingForms.customPriceNote')}
      </div>
    );
  }

  const saveCell = async (routeId, car, raw) => {
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) return;
    const key = `${routeId}::${car}`;
    const existing = byKey.get(key);
    if (existing && Number(existing.price) === price) return;
    setSavingKey(key);
    try {
      if (existing?.id) {
        await updateProduct(existing.id, { price, originalPrice: price });
        onProductsChange?.((list) => list.map((p) => (
          p.id === existing.id ? { ...p, price, originalPrice: price } : p
        )));
      } else {
        const serviceId = formId === 'religiousTours'
          ? 'ziyarat'
          : (mode === 'hourly' ? 'withinCity' : (SECTION_SERVICES[mode]?.[0] || 'cityToCity'));
        const service = FLEET_SERVICES[serviceId] || FLEET_SERVICES.cityToCity;
        const payload = buildNewFleetProduct(service, { car, routeId, price });
        const id = await createProduct(payload);
        onProductsChange?.((list) => [...list, { ...payload, id }]);
      }
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/15 overflow-hidden">
      <div className="px-3 py-2.5 flex flex-wrap items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/40">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Tag className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-brand dark:text-white">
            {t('admin.bookingForms.livePrices')}
          </p>
          <p className="text-[11px] text-gray-500">
            {t('admin.bookingForms.livePricesHint')}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.bookingForms.priceSearch')}
          className="admin-input text-xs py-2 px-3 w-full sm:w-44 rounded-xl"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-500">{t('admin.bookingForms.noPriceRows')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-xs">
            <thead>
              <tr className="bg-white/70 dark:bg-white/5 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-black sticky start-0 bg-inherit min-w-[9rem]">
                  {t('admin.bookingForms.routeCol')}
                </th>
                {cars.map((car) => (
                  <th key={car} className="px-2 py-2 font-black text-center whitespace-nowrap">
                    {priceCarName(car, carCatalog, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => {
                const label = lang === 'ar' ? (row.label?.ar || row.label?.en) : (row.label?.en || row.label?.ar);
                return (
                  <tr key={row.id} className="border-t border-emerald-100/80 dark:border-white/5">
                    <td className="px-3 py-1.5 sticky start-0 bg-emerald-50/90 dark:bg-dark-800">
                      <p className="font-bold text-brand dark:text-white truncate max-w-[14rem]" title={label}>
                        {label || row.id}
                      </p>
                    </td>
                    {cars.map((car) => {
                      const key = `${row.id}::${car}`;
                      const product = byKey.get(key);
                      const value = drafts[key] ?? (product ? String(product.price ?? '') : '');
                      const busy = savingKey === key;
                      return (
                        <td key={car} className="px-1.5 py-1">
                          <label className="relative block">
                            <span className="sr-only">SAR</span>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={value}
                              disabled={busy}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                              onBlur={(e) => saveCell(row.id, car, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                              }}
                              className="admin-input w-full text-center text-xs py-1.5 px-1 rounded-lg"
                              placeholder="—"
                            />
                            {busy ? (
                              <Loader2 className="absolute end-1.5 top-1.5 w-3 h-3 animate-spin text-emerald-700" />
                            ) : null}
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : null}
      <p className="px-3 py-2 text-[10px] text-gray-500 flex items-center gap-1">
        <CircleDollarSign className="w-3 h-3" />
        {t('admin.bookingForms.priceSaveHint')}
      </p>
    </div>
  );
}
