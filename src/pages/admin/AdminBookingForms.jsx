import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Zap, Landmark } from 'lucide-react';
import {
  getBookingLocationsSettings,
  updateBookingLocationsSettings,
  getBookingTripTypesSettings,
  updateBookingTripTypesSettings,
} from '../../firebase/admin';
import {
  cloneBookingLocations,
  createBookingCity,
  createPickupRoute,
  getDefaultBookingCities,
  getDefaultPickupRoutes,
} from '../../data/bookingLocations';
import {
  DEFAULT_BOOKING_TRIP_TYPES,
  MAX_TRIP_TYPE_OPTIONS,
  buildBookingTripTypesFromFirestore,
  sanitizeFormFields,
} from '../../data/bookingTripTypes';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import GlassCard from '../../components/ui/GlassCard';
import {
  PRIMARY_TRIP_SECTIONS,
  TripSectionPanel,
  ZiyaratFormPanel,
  isFormOn,
} from '../../components/admin/AdminBookingFormEditor';

const FORM_META = [
  {
    id: 'booking',
    number: 1,
    Icon: Calculator,
    ring: 'ring-brand/30 border-brand/25 bg-brand/5',
    chipOn: 'bg-brand text-white border-brand',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-brand/10 dark:from-brand/30 to-transparent',
    isPrimary: true,
  },
  {
    id: 'instantPrice',
    number: 2,
    Icon: Zap,
    ring: 'ring-violet-200 border-violet-200 bg-violet-50/50',
    chipOn: 'bg-violet-700 text-white border-violet-700',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-violet-100/80 dark:from-violet-900/45 to-transparent',
    isPrimary: true,
  },
  {
    id: 'religiousTours',
    number: 3,
    Icon: Landmark,
    ring: 'ring-gold/30 border-gold/30 bg-gold/5',
    chipOn: 'bg-amber-700 text-white border-amber-700',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-amber-50 dark:from-amber-950/55 to-transparent',
    isPrimary: false,
  },
];

function findOptionByMode(options, mode) {
  return options.find((o) => o.mode === mode || o.id === mode);
}

export default function AdminBookingForms() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const [cities, setCities] = useState(getDefaultBookingCities());
  const [routes, setRoutes] = useState(getDefaultPickupRoutes());
  const tripInitial = buildBookingTripTypesFromFirestore(null);
  const [options, setOptions] = useState(tripInitial.options);
  const [formFields, setFormFields] = useState(tripInitial.formFields);
  const [syncing, setSyncing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [focusForm, setFocusForm] = useState('booking');

  useEffect(() => {
    (async () => {
      setSyncing(true);
      try {
        const [locData, tripData] = await Promise.all([
          getBookingLocationsSettings(),
          getBookingTripTypesSettings(),
        ]);
        const builtLoc = cloneBookingLocations(locData);
        const builtTrip = buildBookingTripTypesFromFirestore(tripData);
        setCities(builtLoc.cities);
        setRoutes(builtLoc.routes);
        setOptions(builtTrip.options);
        setFormFields(builtTrip.formFields);
      } catch {
        toast.error(t('common.error'));
        const builtLoc = cloneBookingLocations(null);
        const builtTrip = buildBookingTripTypesFromFirestore(null);
        setCities(builtLoc.cities);
        setRoutes(builtLoc.routes);
        setOptions(builtTrip.options);
        setFormFields(builtTrip.formFields);
      } finally {
        setSyncing(false);
      }
    })();
  }, [t, toast]);

  const updateCity = (id, patch) => {
    setCities((list) => list.map((city) => (city.id === id ? { ...city, ...patch } : city)));
  };

  const updateRoute = (id, patch) => {
    setRoutes((list) => list.map((route) => (route.id === id ? { ...route, ...patch } : route)));
  };

  const updateOption = (id, patch) => {
    setOptions((list) => list.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)));
  };

  const toggleTripOnForm = (optionId, formId) => {
    setOptions((list) => list.map((opt) => {
      if (opt.id !== optionId) return opt;
      return { ...opt, forms: { ...opt.forms, [formId]: !isFormOn(opt.forms, formId) } };
    }));
  };

  const toggleLocationForm = (kind, id, formKey) => {
    if (kind === 'city') {
      setCities((list) => list.map((city) => {
        if (city.id !== id) return city;
        const on = city.forms?.[formKey] !== false;
        return { ...city, forms: { ...city.forms, [formKey]: !on } };
      }));
    } else {
      setRoutes((list) => list.map((route) => {
        if (route.id !== id) return route;
        const on = route.forms?.[formKey] !== false;
        return { ...route, forms: { ...route.forms, [formKey]: !on } };
      }));
    }
  };

  const updateField = (formId, fieldKey, patch) => {
    setFormFields((prev) => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        [fieldKey]: { ...prev[formId]?.[fieldKey], ...patch },
      },
    }));
  };

  const removeCity = (id) => {
    setCities((list) => list.filter((city) => city.id !== id || city.builtin));
    setExpandedId(null);
  };

  const removeRoute = (id) => {
    setRoutes((list) => list.filter((route) => route.id !== id || route.builtin));
    setExpandedId(null);
  };

  const onAddCity = (formKey) => {
    const next = createBookingCity({
      en: t('admin.bookingForms.newCityEn'),
      ar: t('admin.bookingForms.newCityAr'),
      forms: Object.fromEntries(
        ['betweenCities', 'hourly', 'ziyarat'].map((key) => [key, key === formKey]),
      ),
    }, cities);
    if (!next) return;
    setCities((list) => [...list, next]);
    setExpandedId(`city:${next.id}:${formKey}`);
    toast.success(t('admin.bookingForms.cityAdded'));
  };

  const onAddRoute = (formKey) => {
    const next = createPickupRoute({
      pickupLabelEn: t('admin.bookingForms.newRouteEn'),
      pickupLabelAr: t('admin.bookingForms.newRouteAr'),
      category: formKey === 'oneWay' ? 'airport' : 'train',
      forms: { oneWay: formKey === 'oneWay', roundTrip: formKey === 'roundTrip' },
    }, routes);
    if (!next) return;
    setRoutes((list) => [...list, next]);
    setExpandedId(`route:${next.id}:${formKey}`);
    toast.success(t('admin.bookingForms.routeAdded'));
  };

  const resetDefaults = () => {
    const builtLoc = cloneBookingLocations(null);
    const builtTrip = buildBookingTripTypesFromFirestore(DEFAULT_BOOKING_TRIP_TYPES);
    setCities(builtLoc.cities);
    setRoutes(builtLoc.routes);
    setOptions(builtTrip.options);
    setFormFields(builtTrip.formFields);
    setExpandedId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        updateBookingLocationsSettings({ cities, routes }),
        updateBookingTripTypesSettings({
          options: options.slice(0, MAX_TRIP_TYPE_OPTIONS).map((opt, index) => ({
            id: opt.id,
            mode: opt.mode,
            labelEn: opt.labelEn,
            labelAr: opt.labelAr,
            order: index,
            active: opt.active !== false,
            builtin: Boolean(opt.builtin),
            forms: {
              booking: opt.forms?.booking !== false,
              instantPrice: opt.forms?.instantPrice !== false,
              religiousTours: opt.forms?.religiousTours !== false,
            },
          })),
          formFields: sanitizeFormFields(formFields),
        }),
      ]);
      await publishSite();
      toast.success(t('admin.bookingForms.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = FORM_META.find((f) => f.id === focusForm) || FORM_META[0];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.bookingForms')}
        subtitle={syncing ? t('admin.bookingForms.syncing') : t('admin.bookingForms.subtitle')}
      />

      <GlassCard hover={false} className="bg-brand/5 border border-brand/10">
        <p className="text-sm text-gray-700 leading-relaxed">{t('admin.bookingForms.howDesc')}</p>
      </GlassCard>

      {/* Form toggle */}
      <div className="flex flex-wrap gap-2">
        {FORM_META.map(({ id, number, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFocusForm(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
              focusForm === id
                ? 'bg-brand text-white border-brand shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t('admin.bookingForms.formToggle', {
              number,
              name: t(`admin.tripTypes.forms.${id}`),
            })}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <GlassCard hover={false} className={`border ${activeMeta.ring} overflow-hidden`}>
          <div className={`-mx-1 -mt-1 mb-5 rounded-xl bg-gradient-to-r ${activeMeta.headerBg} px-4 py-3`}>
            <div className="flex items-center gap-2">
              <activeMeta.Icon className="w-5 h-5 text-brand" />
              <h2 className="text-lg font-black text-brand">
                {t('admin.tripTypes.formLabel', {
                  number: activeMeta.number,
                  name: t(`admin.tripTypes.forms.${activeMeta.id}`),
                })}
              </h2>
            </div>
            <p className="text-xs text-gray-600 mt-1 pl-7">
              {activeMeta.isPrimary
                ? t('admin.bookingForms.primaryFormHint')
                : t('admin.bookingForms.ziyaratFormHint')}
            </p>
          </div>

          {activeMeta.isPrimary ? (
            <div className="space-y-4">
              {PRIMARY_TRIP_SECTIONS.map((section) => (
                <TripSectionPanel
                  key={`${activeMeta.id}-${section.mode}`}
                  section={section}
                  formId={activeMeta.id}
                  tripOption={findOptionByMode(options, section.mode)}
                  cities={cities}
                  routes={routes}
                  formFields={formFields}
                  lang={lang}
                  t={t}
                  chipOn={activeMeta.chipOn}
                  chipOff={activeMeta.chipOff}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  toggleTripOnForm={toggleTripOnForm}
                  updateOption={updateOption}
                  toggleLocationForm={toggleLocationForm}
                  updateCity={updateCity}
                  updateRoute={updateRoute}
                  removeCity={removeCity}
                  removeRoute={removeRoute}
                  onAddCity={onAddCity}
                  onAddRoute={onAddRoute}
                  updateField={updateField}
                />
              ))}
            </div>
          ) : (
            <ZiyaratFormPanel
              formId={activeMeta.id}
              options={options}
              cities={cities}
              formFields={formFields}
              lang={lang}
              t={t}
              chipOn={activeMeta.chipOn}
              chipOff={activeMeta.chipOff}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              toggleTripOnForm={toggleTripOnForm}
              toggleLocationForm={toggleLocationForm}
              updateCity={updateCity}
              removeCity={removeCity}
              onAddCity={onAddCity}
              updateField={updateField}
            />
          )}
        </GlassCard>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/15 bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
          <AdminApplyButton type="submit" loading={saving} label={t('common.save')} />
          <button
            type="button"
            onClick={resetDefaults}
            className="px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50"
          >
            {t('admin.bookingForms.reset')}
          </button>
          <span className="text-xs text-gray-400">
            {t('admin.bookingForms.counts', { cities: cities.length, routes: routes.length })}
          </span>
        </div>
      </form>
    </div>
  );
}
