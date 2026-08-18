import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign, Loader2, Table2 } from 'lucide-react';
import {
  FLEET_CARS,
  FLEET_SERVICES,
  HOME_FLEET_SERVICE_IDS,
  buildNewFleetProduct,
  collectFleetServiceRoutes,
  hoursFromRouteId,
} from '../../data/adminFleetServices';
import { createProduct, updateProduct } from '../../firebase/admin';
import { getCarDisplayName } from '../../data/staticData';
import { carCatalogLabel, getPriceGridCarIds } from '../../utils/carCatalogHelpers';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { usePagination } from '../../hooks/usePagination';
import { useAdminInstantSearch, useResetPageOnFilter } from '../../hooks/useAdminInstantSearch';
import { useToast } from '../../context/ToastContext';
import { clearAdminDataCache } from '../../utils/adminDataCache';
import { productMap } from './AdminSectionPriceGrid';
import AdminFilterBox from './AdminFilterBox';
import AdminFilterChips from './AdminFilterChips';
import AdminPagination from './AdminPagination';

const PAGE_SIZES = [10, 20, 50];

function priceCarIds(carCatalog) {
  return getPriceGridCarIds(carCatalog, FLEET_CARS);
}

function priceCarName(carId, carCatalog, lang) {
  const hit = (carCatalog || []).find((item) => item.id === carId);
  if (hit) return carCatalogLabel(hit, lang);
  return getCarDisplayName(carId, lang);
}

function getProduct(byKey, routeId, car, serviceId) {
  const base = serviceId ? `${serviceId}::${routeId}::${car}` : `${routeId}::${car}`;
  if (serviceId && byKey.has(base)) return byKey.get(base);
  return byKey.get(`${routeId}::${car}`);
}

function amountForField(product, layout, field) {
  if (!product) return '';
  if (field === 'pickupPrice') {
    if (product.pickupPrice != null && product.pickupPrice !== '') return product.pickupPrice;
    if (layout === 'round_trip' && !(Number(product.dropoffPrice) > 0)) return product.price ?? '';
    return product.pickupPrice ?? '';
  }
  if (field === 'dropoffPrice') return product.dropoffPrice ?? '';
  return product.price ?? '';
}

export default function AdminFleetPricesTable({
  products = [],
  onProductsChange,
  carCatalog = [],
  locations = {},
  activeServiceId,
  onServiceIdChange,
  hideServiceTabs = false,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const [innerServiceId, setInnerServiceId] = useState(HOME_FLEET_SERVICE_IDS[0]);
  const serviceId = activeServiceId || innerServiceId;
  const setServiceId = (id) => {
    if (typeof onServiceIdChange === 'function') onServiceIdChange(id);
    else setInnerServiceId(id);
  };
  const [pageSize, setPageSize] = useState(10);
  const [savingKey, setSavingKey] = useState('');
  const [drafts, setDrafts] = useState({});
  const { search, onSearchChange, query, isPending: searchPending } = useAdminInstantSearch();

  const service = FLEET_SERVICES[serviceId] || FLEET_SERVICES.train;
  const cars = useMemo(() => priceCarIds(carCatalog), [carCatalog]);
  const byKey = useMemo(() => productMap(products), [products]);

  const rows = useMemo(
    () => collectFleetServiceRoutes(serviceId, locations, products),
    [serviceId, locations, products],
  );

  const filtered = useMemo(() => {
    if (!query) return rows;
    return rows.filter((row) => {
      const label = lang === 'ar' ? (row.label?.ar || row.label?.en) : (row.label?.en || row.label?.ar);
      return `${label} ${row.id}`.toLowerCase().includes(query);
    });
  }, [rows, query, lang]);

  const { page, setPage, paginated, from, to, total, totalPages } = usePagination(filtered, pageSize);
  useResetPageOnFilter(setPage, query, serviceId, pageSize);

  const pricedCount = useMemo(() => {
    let n = 0;
    rows.forEach((row) => {
      cars.forEach((car) => {
        const product = getProduct(byKey, row.id, car, serviceId);
        if (product && Number(product.price) > 0) n += 1;
      });
    });
    return n;
  }, [rows, cars, byKey, serviceId]);

  const serviceTabs = useMemo(
    () => HOME_FLEET_SERVICE_IDS.map((id) => {
      const item = FLEET_SERVICES[id];
      return {
        key: id,
        label: lang === 'ar' ? item.badgeAr : item.badgeEn,
        count: collectFleetServiceRoutes(id, locations, products).length,
      };
    }),
    [lang, locations, products],
  );

  const saveCell = async (routeId, car, field, raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    const existing = getProduct(byKey, routeId, car, serviceId);
    const current = Number(amountForField(existing, service.layout, field));
    if (existing && Number.isFinite(current) && current === value) return;

    const cellKey = `${serviceId}::${routeId}::${car}::${field}`;
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

    if (service.layout === 'hourly') {
      const hours = Number(existing?.hours) || hoursFromRouteId(routeId, service.hoursOptions?.[0] || 4);
      patch.hours = hours;
      patch.hourlyRate = hours ? Math.round(Number(patch.price) / hours) : 0;
    }

    try {
      const canUpdate = existing?.id && (
        !existing.fleetServiceId || String(existing.fleetServiceId) === serviceId
      );
      if (canUpdate) {
        const nextPatch = { ...patch, fleetServiceId: serviceId };
        await updateProduct(existing.id, nextPatch);
        onProductsChange?.((list) => list.map((p) => (
          p.id === existing.id ? { ...p, ...nextPatch } : p
        )));
      } else {
        const payload = {
          ...buildNewFleetProduct(service, {
            car,
            routeId,
            price: patch.price,
            hours: patch.hours,
          }),
          ...patch,
        };
        const id = await createProduct(payload);
        onProductsChange?.((list) => [...list, { ...payload, id }]);
      }
      clearAdminDataCache('admin:home-fleet');
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const renderInputs = (row, field, label) => (
    <tr key={`${row.id}-${field}`} className="border-t border-emerald-100/80 dark:border-white/5">
      <td className="px-3 py-1.5 sticky start-0 bg-emerald-50/95 dark:bg-dark-800 min-w-[10rem]">
        <p className="font-bold text-brand dark:text-white truncate max-w-[16rem]" title={label}>
          {label}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{row.id}</p>
      </td>
      {cars.map((car) => {
        const cellKey = `${serviceId}::${row.id}::${car}::${field}`;
        const product = getProduct(byKey, row.id, car, serviceId);
        const value = drafts[cellKey] ?? String(amountForField(product, service.layout, field) ?? '');
        const busy = savingKey === cellKey;
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
                onChange={(e) => setDrafts((prev) => ({ ...prev, [cellKey]: e.target.value }))}
                onBlur={(e) => saveCell(row.id, car, field, e.target.value)}
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

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/15 overflow-hidden">
      <div className="px-3 py-3 flex flex-wrap items-start gap-2 border-b border-emerald-100 dark:border-emerald-900/40">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
          <Table2 className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-brand dark:text-white">
            {t('admin.homeFleet.tableTitle')}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {t('admin.homeFleet.tableHint', { priced: pricedCount, routes: rows.length, cars: cars.length })}
          </p>
        </div>
      </div>

      <div className="px-3 py-3 space-y-3">
        {hideServiceTabs ? null : (
          <AdminFilterChips
            label={t('admin.homeFleet.serviceFilter')}
            value={serviceId}
            onChange={setServiceId}
            options={serviceTabs}
          />
        )}
        <AdminFilterBox
          search={search}
          onSearchChange={onSearchChange}
          searchPending={searchPending}
          searchPlaceholder={t('admin.homeFleet.searchRoutes')}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-3 py-6 text-xs text-gray-500 text-center">{t('admin.homeFleet.emptyRows')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-xs">
            <thead>
              <tr className="bg-white/70 dark:bg-white/5 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-black sticky start-0 bg-inherit min-w-[10rem]">
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
                const label = lang === 'ar'
                  ? (row.label?.ar || row.label?.en)
                  : (row.label?.en || row.label?.ar);
                if (service.layout === 'round_trip') {
                  return (
                    <Fragment key={row.id}>
                      {renderInputs(row, 'pickupPrice', `${label} · ${t('admin.bookingForms.pickupCol')}`)}
                      {renderInputs(row, 'dropoffPrice', `${label} · ${t('admin.bookingForms.dropoffCol')}`)}
                    </Fragment>
                  );
                }
                return renderInputs(row, 'price', label);
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
          pageSizes={PAGE_SIZES}
        />
      ) : null}

      <p className="px-3 py-2 text-[10px] text-gray-500 flex items-center gap-1">
        <CircleDollarSign className="w-3 h-3" />
        {t('admin.bookingForms.priceSaveHint')}
      </p>
    </div>
  );
}
