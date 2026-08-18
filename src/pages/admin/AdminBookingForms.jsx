import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Zap, Landmark, Heading, Layers, Save, Info, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import {
  getBookingLocationsSettings,
  updateBookingLocationsSettings,
  getBookingTripTypesSettings,
  updateBookingTripTypesSettings,
  getInstantPriceSettings,
  updateInstantPriceSettings,
  getReligiousToursSettings,
  updateReligiousToursSettings,
  getProductsByTripType,
  getAllCars,
  createCarWithPackages,
  upsertCar,
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
  DEFAULT_FORM_HEADINGS,
  MAX_TRIP_TYPE_OPTIONS,
  buildBookingTripTypesFromFirestore,
  createTripTypeOption,
  sanitizeFormFields,
  sanitizeFormHeadings,
} from '../../data/bookingTripTypes';
import { DEFAULT_INSTANT_PRICE } from '../../firebase/content';
import { DEFAULT_RELIGIOUS_TOURS } from '../../data/religiousTours';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { withTimeout } from '../../utils/withTimeout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import GlassCard from '../../components/ui/GlassCard';
import {
  AddSectionBar,
  AdminAlertModal,
  TripSectionPanel,
  getSectionMeta,
  inputClass,
  isFormOn,
} from '../../components/admin/AdminBookingFormEditor';
import AdminPriceSheetPanel from '../../components/admin/AdminPriceSheetPanel';
import AdminFleetCarsBar from '../../components/admin/AdminFleetCarsBar';
import {
  DEFAULT_CAR_FORMS,
  carCatalogLabel,
  liveFleetCarCount,
  mergeCarCatalog,
  MIN_FLEET_CARS,
  MAX_FLEET_CARS,
} from '../../utils/carCatalogHelpers';

const FORM_META = [
  {
    id: 'booking',
    number: 1,
    Icon: Calculator,
    accent: 'from-brand to-brand-light',
    chipOn: 'bg-brand text-white border-brand',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
    ring: 'ring-brand/30 border-brand/20',
  },
  {
    id: 'instantPrice',
    number: 2,
    Icon: Zap,
    accent: 'from-violet-600 to-indigo-500',
    chipOn: 'bg-violet-700 text-white border-violet-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
    ring: 'ring-violet-200 border-violet-200',
  },
  {
    id: 'religiousTours',
    number: 3,
    Icon: Landmark,
    accent: 'from-amber-600 to-gold',
    chipOn: 'bg-amber-700 text-white border-amber-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
    ring: 'ring-gold/30 border-gold/30',
  },
];

function copyFromInstant(data) {
  const src = { ...DEFAULT_INSTANT_PRICE, ...(data || {}) };
  return {
    titleEn: src.formTitleEn || '',
    titleAr: src.formTitleAr || '',
    subtitleEn: src.formSubtitleEn || '',
    subtitleAr: src.formSubtitleAr || '',
    headingEn: src.headingEn || '',
    headingAr: src.headingAr || '',
  };
}

function copyFromReligious(data) {
  const src = { ...DEFAULT_RELIGIOUS_TOURS, ...(data || {}) };
  return {
    titleEn: src.formTitleEn || '',
    titleAr: src.formTitleAr || '',
    subtitleEn: src.formSubtitleEn || '',
    subtitleAr: src.formSubtitleAr || '',
    headingEn: src.headingEn || '',
    headingAr: src.headingAr || '',
  };
}

function HeadingEditor({ copy, onChange, showSectionHeading, t, lang }) {
  const liveTitle = lang === 'ar' ? (copy.titleAr || copy.titleEn) : (copy.titleEn || copy.titleAr);
  const liveSub = lang === 'ar' ? (copy.subtitleAr || copy.subtitleEn) : (copy.subtitleEn || copy.subtitleAr);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2 bg-gradient-to-r from-brand/[0.05] to-gold/[0.06]">
        <Heading className="w-4 h-4 text-brand" />
        <div>
          <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.headingBlock')}</p>
          <p className="text-[11px] text-gray-500">{t('admin.bookingForms.headingHint')}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-dark p-4 text-white shadow-inner">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold/90">{t('admin.bookingForms.livePreview')}</p>
          <p className="mt-1.5 text-lg font-black leading-tight">{liveTitle || '—'}</p>
          <p className="mt-1 text-xs text-white/75 leading-snug">{liveSub || '—'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
              <span className="rounded-md bg-brand/10 text-brand px-1.5 py-0.5">EN</span>
              {t('admin.bookingForms.titleEn')}
            </label>
            <input value={copy.titleEn} onChange={(e) => onChange({ titleEn: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
              <span className="rounded-md bg-gold/15 text-gold-dark px-1.5 py-0.5">AR</span>
              {t('admin.bookingForms.titleAr')}
            </label>
            <input value={copy.titleAr} onChange={(e) => onChange({ titleAr: e.target.value })} className={inputClass} dir="rtl" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
              <span className="rounded-md bg-brand/10 text-brand px-1.5 py-0.5">EN</span>
              {t('admin.bookingForms.subtitleEn')}
            </label>
            <input value={copy.subtitleEn} onChange={(e) => onChange({ subtitleEn: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
              <span className="rounded-md bg-gold/15 text-gold-dark px-1.5 py-0.5">AR</span>
              {t('admin.bookingForms.subtitleAr')}
            </label>
            <input value={copy.subtitleAr} onChange={(e) => onChange({ subtitleAr: e.target.value })} className={inputClass} dir="rtl" />
          </div>
          {showSectionHeading && (
            <>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
                  <span className="rounded-md bg-brand/10 text-brand px-1.5 py-0.5">EN</span>
                  {t('admin.bookingForms.sectionHeadingEn')}
                </label>
                <input value={copy.headingEn} onChange={(e) => onChange({ headingEn: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
                  <span className="rounded-md bg-gold/15 text-gold-dark px-1.5 py-0.5">AR</span>
                  {t('admin.bookingForms.sectionHeadingAr')}
                </label>
                <input value={copy.headingAr} onChange={(e) => onChange({ headingAr: e.target.value })} className={inputClass} dir="rtl" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
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
  const [bookingCopy, setBookingCopy] = useState({ ...DEFAULT_FORM_HEADINGS.booking });
  const [instantCopy, setInstantCopy] = useState(copyFromInstant(null));
  const [religiousCopy, setReligiousCopy] = useState(copyFromReligious(null));
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [focusForm, setFocusForm] = useState('booking');
  const [newMode, setNewMode] = useState('between_cities');
  const [openSectionId, setOpenSectionId] = useState(tripInitial.options[0]?.id || null);
  const [confirm, setConfirm] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [carCatalog, setCarCatalog] = useState(() => mergeCarCatalog([]));
  const [togglingCarId, setTogglingCarId] = useState('');
  const [addingCar, setAddingCar] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const [locData, tripData, instantData, religiousData, oneWay, roundTrip, hourly, dbCars] = await withTimeout(
          Promise.all([
            getBookingLocationsSettings(),
            getBookingTripTypesSettings(),
            getInstantPriceSettings(),
            getReligiousToursSettings(),
            getProductsByTripType('one_way'),
            getProductsByTripType('round_trip'),
            getProductsByTripType('hourly'),
            getAllCars(),
          ]),
          8000,
          'booking-forms',
        );
        if (cancelled) return;
        const builtLoc = cloneBookingLocations(locData);
        const builtTrip = buildBookingTripTypesFromFirestore(tripData);
        setCities(builtLoc.cities);
        setRoutes(builtLoc.routes);
        setOptions(builtTrip.options);
        setFormFields(builtTrip.formFields);
        setBookingCopy({ ...DEFAULT_FORM_HEADINGS.booking, ...builtTrip.formHeadings?.booking });
        setInstantCopy(copyFromInstant(instantData));
        setReligiousCopy(copyFromReligious(religiousData));
        setProducts([...(oneWay || []), ...(roundTrip || []), ...(hourly || [])]);
        setCarCatalog(mergeCarCatalog(dbCars));
        setOpenSectionId(builtTrip.options[0]?.id || null);
      } catch {
        if (!cancelled) toast.error(t('common.error'));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const removeCity = (id) => setConfirm({ type: 'city', id });
  const removeRoute = (id) => setConfirm({ type: 'route', id });

  const toggleSiteForm = (kind, id, siteFormId) => {
    const flip = (item) => {
      const on = item.siteForms?.[siteFormId] !== false;
      return {
        ...item,
        siteForms: {
          booking: true,
          instantPrice: true,
          religiousTours: true,
          ...item.siteForms,
          [siteFormId]: !on,
        },
      };
    };
    if (kind === 'city') {
      setCities((list) => list.map((city) => (city.id === id ? flip(city) : city)));
    } else {
      setRoutes((list) => list.map((route) => (route.id === id ? flip(route) : route)));
    }
  };

  const onAddCity = (formKey) => {
    const next = createBookingCity({
      en: t('admin.bookingForms.newCityEn'),
      ar: t('admin.bookingForms.newCityAr'),
      forms: {
        betweenCities: formKey === 'betweenCities',
        hourly: formKey === 'hourly',
        ziyarat: formKey === 'ziyarat',
      },
      siteForms: {
        booking: focusForm === 'booking',
        instantPrice: focusForm === 'instantPrice',
        religiousTours: focusForm === 'religiousTours',
      },
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
      forms: {
        oneWay: formKey === 'oneWay',
        roundTrip: formKey === 'roundTrip',
      },
      siteForms: {
        booking: focusForm === 'booking',
        instantPrice: focusForm === 'instantPrice',
        religiousTours: focusForm === 'religiousTours',
      },
    }, routes);
    if (!next) return;
    setRoutes((list) => [...list, next]);
    setExpandedId(`route:${next.id}:${formKey}`);
    toast.success(t('admin.bookingForms.routeAdded'));
  };

  const reloadPriceProducts = async () => {
    const [oneWay, roundTrip, hourly] = await Promise.all([
      getProductsByTripType('one_way'),
      getProductsByTripType('round_trip'),
      getProductsByTripType('hourly'),
    ]);
    setProducts([...(oneWay || []), ...(roundTrip || []), ...(hourly || [])]);
  };

  const onToggleCar = async (car, nextActive) => {
    const liveCount = liveFleetCarCount(carCatalog);
    if (!nextActive && liveCount <= MIN_FLEET_CARS) {
      toast.warning(t('admin.bookingForms.carsBarMinReached', { min: MIN_FLEET_CARS }));
      return;
    }
    if (nextActive && liveCount >= MAX_FLEET_CARS) {
      toast.warning(t('admin.bookingForms.carsBarMaxReached', { max: MAX_FLEET_CARS }));
      return;
    }
    setTogglingCarId(car.id);
    try {
      await upsertCar(car.id, {
        nameEn: car.nameEn,
        nameAr: car.nameAr,
        modelEn: car.modelEn || car.nameEn,
        modelAr: car.modelAr || car.nameAr,
        imageUrl: car.imageUrl,
        passengers: Number(car.passengers) || 4,
        vip: Boolean(car.vip),
        sortOrder: Number(car.sortOrder) || 0,
        forms: car.forms || DEFAULT_CAR_FORMS,
        active: nextActive,
      });
      setCarCatalog((list) => list.map((item) => (
        item.id === car.id ? { ...item, active: nextActive } : item
      )));
      await publishSite();
      const name = carCatalogLabel(car, lang);
      toast.success(nextActive
        ? t('admin.bookingForms.carsBarShownToast', { name })
        : t('admin.bookingForms.carsBarHiddenToast', { name }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setTogglingCarId('');
    }
  };

  const onAddCar = async (payload) => {
    if (liveFleetCarCount(carCatalog) >= MAX_FLEET_CARS) {
      toast.warning(t('admin.bookingForms.carsBarMaxReached', { max: MAX_FLEET_CARS }));
      return false;
    }
    setAddingCar(true);
    try {
      const result = await createCarWithPackages(payload);
      const dbCars = await getAllCars();
      setCarCatalog(mergeCarCatalog(dbCars));
      await reloadPriceProducts();
      await publishSite();
      toast.success(t('admin.cars.addNewSuccess', { id: result.id, count: result.packagesCreated }));
      return true;
    } catch (err) {
      toast.error(err?.message || t('admin.cars.addNewFailed'));
      return false;
    } finally {
      setAddingCar(false);
    }
  };

  const onAddSection = () => {
    if (options.length >= MAX_TRIP_TYPE_OPTIONS) {
      toast.warning(t('admin.tripTypes.maxReached', { max: MAX_TRIP_TYPE_OPTIONS }));
      return;
    }
    const next = createTripTypeOption({
      mode: newMode,
      labelEn: t('admin.bookingForms.newSectionEn'),
      labelAr: t('admin.bookingForms.newSectionAr'),
      order: options.length,
      forms: {
        booking: focusForm === 'booking',
        instantPrice: focusForm === 'instantPrice',
        religiousTours: focusForm === 'religiousTours',
      },
    });
    setOptions((list) => [...list, next]);
    setOpenSectionId(next.id);
    toast.success(t('admin.bookingForms.sectionAdded'));
  };

  const onDeleteSection = (id) => setConfirm({ type: 'section', id });

  const patchCopy = (formId, patch) => {
    if (formId === 'booking') setBookingCopy((prev) => ({ ...prev, ...patch }));
    if (formId === 'instantPrice') setInstantCopy((prev) => ({ ...prev, ...patch }));
    if (formId === 'religiousTours') setReligiousCopy((prev) => ({ ...prev, ...patch }));
  };

  const activeCopy = focusForm === 'instantPrice'
    ? instantCopy
    : focusForm === 'religiousTours'
      ? religiousCopy
      : bookingCopy;

  const applyReset = () => {
    const builtLoc = cloneBookingLocations(null);
    const builtTrip = buildBookingTripTypesFromFirestore(DEFAULT_BOOKING_TRIP_TYPES);
    setCities(builtLoc.cities);
    setRoutes(builtLoc.routes);
    setOptions(builtTrip.options);
    setFormFields(builtTrip.formFields);
    setBookingCopy({ ...DEFAULT_FORM_HEADINGS.booking });
    setInstantCopy(copyFromInstant(null));
    setReligiousCopy(copyFromReligious(null));
    setExpandedId(null);
    setOpenSectionId(builtTrip.options[0]?.id || null);
    toast.info(t('admin.bookingForms.resetInfo'));
  };

  const runConfirm = () => {
    if (confirm?.type === 'section') {
      setOptions((list) => list.filter((opt) => opt.id !== confirm.id || opt.builtin));
      toast.success(t('admin.bookingForms.sectionDeleted'));
    }
    if (confirm?.type === 'city') {
      setCities((list) => list.filter((city) => city.id !== confirm.id || city.builtin));
      setExpandedId(null);
      toast.success(t('admin.bookingForms.cityDeleted'));
    }
    if (confirm?.type === 'route') {
      setRoutes((list) => list.filter((route) => route.id !== confirm.id || route.builtin));
      setExpandedId(null);
      toast.success(t('admin.bookingForms.routeDeleted'));
    }
    if (confirm?.type === 'reset') applyReset();
    setConfirm(null);
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
            extraFields: Array.isArray(opt.extraFields) ? opt.extraFields : [],
            forms: {
              booking: opt.forms?.booking !== false,
              instantPrice: opt.forms?.instantPrice !== false,
              religiousTours: opt.forms?.religiousTours !== false,
            },
          })),
          formFields: sanitizeFormFields(formFields),
          formHeadings: sanitizeFormHeadings({ booking: bookingCopy }),
        }),
        updateInstantPriceSettings({
          formTitleEn: instantCopy.titleEn,
          formTitleAr: instantCopy.titleAr,
          formSubtitleEn: instantCopy.subtitleEn,
          formSubtitleAr: instantCopy.subtitleAr,
          headingEn: instantCopy.headingEn,
          headingAr: instantCopy.headingAr,
        }),
        updateReligiousToursSettings({
          formTitleEn: religiousCopy.titleEn,
          formTitleAr: religiousCopy.titleAr,
          formSubtitleEn: religiousCopy.subtitleEn,
          formSubtitleAr: religiousCopy.subtitleAr,
          headingEn: religiousCopy.headingEn,
          headingAr: religiousCopy.headingAr,
        }),
      ]);
      await publishSite();
      toast.success(t('admin.bookingForms.saved'));
      setSuccessOpen(true);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = FORM_META.find((f) => f.id === focusForm) || FORM_META[0];

  const formStats = useMemo(() => Object.fromEntries(
    FORM_META.map(({ id }) => {
      const visible = options.filter((opt) => opt.active !== false && isFormOn(opt.forms, id)).length;
      return [id, visible];
    }),
  ), [options]);

  const selectForm = (id) => {
    setFocusForm(id);
    setOpenSectionId(options[0]?.id || null);
  };

  const confirmCopy = confirm?.type === 'reset'
    ? {
      type: 'warning',
      title: t('admin.bookingForms.resetConfirmTitle'),
      body: t('admin.bookingForms.resetConfirmBody'),
      confirmLabel: t('admin.bookingForms.reset'),
    }
    : confirm
      ? {
        type: 'danger',
        title: t('admin.bookingForms.deleteConfirmTitle'),
        body: t('admin.bookingForms.deleteConfirmBody'),
        confirmLabel: t('admin.bookingForms.deleteAction'),
      }
      : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t('admin.nav.bookingForms')}
        purposeKey="bookingForms"
        subtitle={t('admin.bookingForms.subtitle')}
      >
        {syncing ? (
          <span className="text-xs font-semibold text-gray-500">{t('common.loading')}</span>
        ) : null}
      </AdminPageHeader>

      <div className="grid grid-cols-3 gap-2">
        {[
          { n: '1', icon: Heading, text: t('admin.bookingForms.stepHeading') },
          { n: '2', icon: Layers, text: t('admin.bookingForms.stepSections') },
          { n: '3', icon: Save, text: t('admin.bookingForms.stepSave') },
        ].map((step) => (
          <div key={step.n} className="flex items-center gap-2 rounded-2xl border border-brand/10 bg-white dark:bg-white/5 px-2.5 py-2.5 sm:px-3.5 sm:py-3">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-brand text-white text-[10px] sm:text-xs font-black shrink-0">{step.n}</span>
            <p className="text-[10px] sm:text-xs font-bold text-brand dark:text-white leading-snug">{step.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200/80 bg-sky-50/80 dark:bg-sky-950/30 dark:border-sky-800 px-4 py-3">
        <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-sm text-sky-900 dark:text-sky-100 leading-relaxed">{t('admin.bookingForms.howDesc')}</p>
      </div>

      <details className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-800 group">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-black text-brand dark:text-white [&::-webkit-details-marker]:hidden">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          {t('admin.bookingForms.excelTitle')}
          <span className="ms-auto text-[11px] font-bold text-gray-500 group-open:hidden">
            {t('admin.bookingForms.excelToggle')}
          </span>
        </summary>
        <div className="px-2 pb-3">
          <AdminPriceSheetPanel />
        </div>
      </details>

      <AdminFleetCarsBar
        cars={carCatalog}
        lang={lang}
        t={t}
        togglingId={togglingCarId}
        adding={addingCar}
        onToggle={onToggleCar}
        onAdd={onAddCar}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FORM_META.map(({ id, number, Icon, accent }) => {
          const copy = id === 'instantPrice' ? instantCopy : id === 'religiousTours' ? religiousCopy : bookingCopy;
          const title = lang === 'ar' ? (copy.titleAr || copy.titleEn) : (copy.titleEn || copy.titleAr);
          const active = focusForm === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectForm(id)}
              className={`text-start rounded-2xl border p-4 transition-all ${
                active
                  ? `ring-2 ${FORM_META.find((f) => f.id === id).ring} bg-white dark:bg-dark-800 shadow-lg`
                  : 'border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-brand/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md`}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                    {t('admin.bookingForms.formToggle', { number, name: t(`admin.tripTypes.forms.${id}`) })}
                  </p>
                  <p className="text-sm font-black text-brand dark:text-white truncate">{title}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold text-gray-500">
                {t('admin.bookingForms.visibleTabs', { count: formStats[id] || 0 })}
              </p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <GlassCard hover={false} className={`border ${activeMeta.ring} overflow-hidden`}>
          <div className="flex items-center gap-3 mb-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${activeMeta.accent} text-white`}>
              <activeMeta.Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-brand dark:text-white truncate">
                {lang === 'ar' ? (activeCopy.titleAr || activeCopy.titleEn) : (activeCopy.titleEn || activeCopy.titleAr)}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {lang === 'ar' ? (activeCopy.subtitleAr || activeCopy.subtitleEn) : (activeCopy.subtitleEn || activeCopy.subtitleAr)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <HeadingEditor
              copy={activeCopy}
              onChange={(patch) => patchCopy(focusForm, patch)}
              showSectionHeading={focusForm !== 'booking'}
              t={t}
              lang={lang}
            />

            <div className="flex items-center gap-2 pt-1">
              <Layers className="w-4 h-4 text-brand" />
              <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.sectionsTitle')}</p>
              <span className="text-[11px] font-bold text-gray-400">
                {t('admin.bookingForms.sectionCount', { count: options.length, max: MAX_TRIP_TYPE_OPTIONS })}
              </span>
            </div>

            <AddSectionBar
              t={t}
              disabled={options.length >= MAX_TRIP_TYPE_OPTIONS}
              newMode={newMode}
              setNewMode={setNewMode}
              onAdd={onAddSection}
            />

            {options.map((opt, index) => {
              const section = getSectionMeta(focusForm, opt.mode);
              return (
                <TripSectionPanel
                  key={`${focusForm}-${opt.id}`}
                  section={section}
                  formId={focusForm}
                  tripOption={opt}
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
                  toggleSiteForm={toggleSiteForm}
                  updateCity={updateCity}
                  updateRoute={updateRoute}
                  removeCity={removeCity}
                  removeRoute={removeRoute}
                  onAddCity={onAddCity}
                  onAddRoute={onAddRoute}
                  updateField={updateField}
                  onDeleteSection={onDeleteSection}
                  expanded={openSectionId === opt.id}
                  onToggle={() => setOpenSectionId((id) => (id === opt.id ? null : opt.id))}
                  index={index}
                  products={products}
                  onProductsChange={setProducts}
                  carCatalog={carCatalog}
                />
              );
            })}
          </div>
        </GlassCard>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/15 bg-white/95 dark:bg-dark-800/95 backdrop-blur px-4 py-3 shadow-lg">
          <AdminApplyButton type="submit" loading={saving} label={t('admin.bookingForms.savePublish')} />
          <button
            type="button"
            onClick={() => setConfirm({ type: 'reset' })}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 font-bold text-sm text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            {t('admin.bookingForms.reset')}
          </button>
          <span className="text-xs font-semibold text-gray-400">
            {t('admin.bookingForms.counts', { cities: cities.length, routes: routes.length })}
          </span>
          <span className="ms-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('admin.bookingForms.saveHint')}
          </span>
        </div>
      </form>

      <AdminAlertModal
        open={Boolean(confirmCopy)}
        type={confirmCopy?.type || 'warning'}
        title={confirmCopy?.title}
        body={confirmCopy?.body}
        confirmLabel={confirmCopy?.confirmLabel}
        cancelLabel={t('common.cancel')}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />

      <AdminAlertModal
        open={successOpen}
        type="success"
        title={t('admin.bookingForms.savedTitle')}
        body={t('admin.bookingForms.savedBody')}
        confirmLabel={t('admin.bookingForms.ok')}
        onConfirm={() => setSuccessOpen(false)}
        onClose={() => setSuccessOpen(false)}
      />
    </div>
  );
}
