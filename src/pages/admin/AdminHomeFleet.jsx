import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Save,
  Plane,
  TrainFront,
  Clock,
  MapPin,
  Landmark,
  Package,
  Trash2,
  Info,
  Heading,
  Layers,
  FileSpreadsheet,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getProductsByTripType,
  createProduct,
  updateProduct,
  deleteProduct,
  updateHomeFleetShowcase,
  getAdminHomeFleetShowcase,
  getAdminHomeSections,
  updateHomeSection,
  getAllCars,
  createCarWithPackages,
  getBookingLocationsSettings,
  updateBookingLocationsSettings,
  upsertCar,
} from '../../firebase/admin';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { useToast } from '../../context/ToastContext';
import {
  FLEET_SERVICES,
  HOME_FLEET_SERVICE_COUNTS,
  HOME_FLEET_SERVICE_IDS,
  FLEET_CARS,
  carKeyOf,
  carOptionList,
  getFleetService,
  buildNewFleetProduct,
  collectFleetServiceRoutes,
  normalizeFleetShowcase,
  emptyFleetShowcase,
  hoursFromRouteId,
  productsForFleetService,
  catalogProductsWithDefaults,
} from '../../data/adminFleetServices';
import { getCarDisplayName, resolveCarThumb } from '../../data/staticData';
import { mergeCarCatalog, liveFleetCarCount, MAX_FLEET_CARS, MIN_FLEET_CARS, DEFAULT_CAR_FORMS, carCatalogLabel } from '../../utils/carCatalogHelpers';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import MediaUpload from '../../components/admin/MediaUpload';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminPriceSheetPanel from '../../components/admin/AdminPriceSheetPanel';
import AdminFleetPricesTable from '../../components/admin/AdminFleetPricesTable';
import AdminFleetCarsBar from '../../components/admin/AdminFleetCarsBar';
import { CityRow, RouteRow, AdminAlertModal } from '../../components/admin/AdminBookingFormEditor';
import {
  cloneBookingLocations,
  createBookingCity,
  createPickupRoute,
} from '../../data/bookingLocations';

const SERVICE_SECTION_META = {
  cityToCity: { dataType: 'cities', locationKey: 'betweenCities', formId: 'booking' },
  airport: { dataType: 'routes', locationKey: 'oneWay', formId: 'booking' },
  train: { dataType: 'routes', locationKey: 'roundTrip', formId: 'booking' },
  hourly: { dataType: 'cities', locationKey: 'hourly', formId: 'booking' },
  withinCity: { dataType: 'cities', locationKey: 'hourly', formId: 'booking' },
  ziyarat: { dataType: 'cities', locationKey: 'ziyarat', formId: 'religiousTours' },
};

const SERVICE_ICONS = {
  cityToCity: MapPin,
  airport: Plane,
  train: TrainFront,
  withinCity: Package,
  hourly: Clock,
  ziyarat: Landmark,
};

const SERVICE_META = {
  train: {
    accent: 'from-brand to-brand-light',
    ring: 'ring-brand/30 border-brand/20',
    chipOn: 'bg-brand text-white border-brand',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
  airport: {
    accent: 'from-sky-600 to-blue-500',
    ring: 'ring-sky-200 border-sky-200',
    chipOn: 'bg-sky-700 text-white border-sky-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
  cityToCity: {
    accent: 'from-emerald-600 to-teal-500',
    ring: 'ring-emerald-200 border-emerald-200',
    chipOn: 'bg-emerald-700 text-white border-emerald-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
  hourly: {
    accent: 'from-violet-600 to-indigo-500',
    ring: 'ring-violet-200 border-violet-200',
    chipOn: 'bg-violet-700 text-white border-violet-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
  ziyarat: {
    accent: 'from-amber-600 to-gold',
    ring: 'ring-gold/30 border-gold/30',
    chipOn: 'bg-amber-700 text-white border-amber-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
  withinCity: {
    accent: 'from-teal-600 to-cyan-500',
    ring: 'ring-teal-200 border-teal-200',
    chipOn: 'bg-teal-700 text-white border-teal-700',
    chipOff: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/15',
  },
};

function productOnRoute(products, routeId, car) {
  return products.find(
    (p) => p.routeId === routeId && carKeyOf(p) === car && p.active !== false,
  ) || products.find(
    (p) => p.routeId === routeId && carKeyOf(p) === car,
  );
}

function rankedRouteId(service, products) {
  const counts = new Map();
  for (const p of products) {
    if (!p.routeId) continue;
    counts.set(p.routeId, (counts.get(p.routeId) || 0) + 1);
  }
  const routes = service.getRoutes() || [];
  let bestId = service.defaultRouteId;
  let bestScore = -1;
  for (const route of routes) {
    const n = counts.get(route.id) || 0;
    if (!n) continue;
    let score = n * 10;
    if (route.id === service.defaultRouteId) score += 50;
    if (score > bestScore) {
      bestScore = score;
      bestId = route.id;
    }
  }
  return bestId;
}

function ToggleSwitch({ on, onClick, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 min-w-0 disabled:opacity-50 ${
        on ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500'
      }`}
    >
      <span
        className={`w-11 h-6 rounded-full flex items-center px-0.5 shrink-0 transition-colors ${
          on ? 'bg-emerald-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
        }`}
      >
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </span>
      {label ? <span className="text-[11px] font-bold leading-tight break-words">{label}</span> : null}
    </button>
  );
}

export default function AdminHomeFleet({
  embedded = false,
  compact = false,
  serviceIds = HOME_FLEET_SERVICE_IDS,
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [savingKey, setSavingKey] = useState('');
  const [addFor, setAddFor] = useState(null);
  const [addForm, setAddForm] = useState({ car: '', routeId: '', price: '', nameEn: '', nameAr: '', imageUrl: '' });
  const [addingCar, setAddingCar] = useState(false);
  const [togglingCarId, setTogglingCarId] = useState('');
  const [focusServiceId, setFocusServiceId] = useState(HOME_FLEET_SERVICE_IDS[0]);
  const [openIds, setOpenIds] = useState([HOME_FLEET_SERVICE_IDS[0]]);
  const [publishing, setPublishing] = useState(false);

  const { data: tripBundles, loading, refresh } = useAdminDataLoader(
    async () => {
      const [oneWay, roundTrip, hourly, showcase, sections, cars, locations] = await Promise.all([
        getProductsByTripType('one_way'),
        getProductsByTripType('round_trip'),
        getProductsByTripType('hourly'),
        getAdminHomeFleetShowcase(),
        getAdminHomeSections(),
        getAllCars(),
        getBookingLocationsSettings(),
      ]);
      return {
        products: [...(oneWay || []), ...(roundTrip || []), ...(hourly || [])],
        showcase: normalizeFleetShowcase(showcase),
        sectionActive: sections?.fleet?.active !== false,
        cars: cars || [],
        locations: locations || { cities: [], routes: [] },
      };
    },
    [],
    { cacheKey: 'admin:home-fleet' },
  );

  const [carCatalog, setCarCatalog] = useState(() => mergeCarCatalog([]));
  const [localProducts, setLocalProducts] = useState(null);
  const [localShowcase, setLocalShowcase] = useState(null);
  const [localCities, setLocalCities] = useState([]);
  const [localRoutes, setLocalRoutes] = useState([]);
  const [sectionOn, setSectionOn] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const allProducts = localProducts || tripBundles?.products || [];
  const showcase = localShowcase || tripBundles?.showcase || emptyFleetShowcase();
  const cities = localCities;
  const routes = localRoutes;
  const locations = { cities, routes };

  useEffect(() => {
    if (tripBundles?.products) setLocalProducts(tripBundles.products);
    if (tripBundles?.showcase) setLocalShowcase(tripBundles.showcase);
    if (typeof tripBundles?.sectionActive === 'boolean') setSectionOn(tripBundles.sectionActive);
    if (tripBundles?.cars) setCarCatalog(mergeCarCatalog(tripBundles.cars));
    if (tripBundles?.locations) {
      const built = cloneBookingLocations(tripBundles.locations);
      setLocalCities(built.cities);
      setLocalRoutes(built.routes);
    }
  }, [tripBundles?.products, tripBundles?.showcase, tripBundles?.sectionActive, tripBundles?.cars, tripBundles?.locations]);

  const carChoices = useMemo(() => {
    const ids = [...FLEET_CARS];
    for (const car of carCatalog) {
      const id = String(car.id || '').split('-')[0];
      if (id && !ids.includes(id) && car.active !== false) ids.push(id);
    }
    return carOptionList(ids);
  }, [carCatalog]);

  const visibleServiceIds = useMemo(
    () => HOME_FLEET_SERVICE_IDS.filter((id) => serviceIds.includes(id)),
    [serviceIds],
  );

  const byService = useMemo(() => {
    const map = {};
    for (const id of HOME_FLEET_SERVICE_IDS) {
      map[id] = productsForFleetService(allProducts, id);
    }
    return map;
  }, [allProducts]);

  const catalogProducts = useMemo(
    () => catalogProductsWithDefaults(allProducts),
    [allProducts],
  );

  const persistShowcase = async (serviceId, slot) => {
    const merged = {
      routeId: slot.routeId,
      carIds: slot.carIds,
      active: slot.active !== false,
    };
    const next = normalizeFleetShowcase({
      ...showcase,
      [serviceId]: { ...showcase[serviceId], ...merged },
    });
    setLocalShowcase(next);
    await updateHomeFleetShowcase({ [serviceId]: next[serviceId] });
    await publishSite('soft');
  };

  const saveSlot = async (serviceId, slotIndex, payload) => {
    const service = getFleetService(serviceId);
    const products = byService[serviceId] || [];
    const key = `${serviceId}:${slotIndex}`;
    setSavingKey(key);
    try {
      const { car, routeId, price, nameEn, nameAr, imageUrl, pickupPrice, dropoffPrice } = payload;
      const existing = productOnRoute(products, routeId, car);
      const pickup = Number(pickupPrice);
      const dropoff = Number(dropoffPrice);
      const numericPrice = Number(price)
        || ((Number.isFinite(pickup) ? pickup : 0) + (Number.isFinite(dropoff) ? dropoff : 0));
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        toast.error(t('admin.fleet.invalidPrice'));
        return;
      }
      const safeNameEn = String(nameEn || existing?.nameEn || getCarDisplayName(car, 'en') || '').trim();
      const safeNameAr = String(nameAr || existing?.nameAr || getCarDisplayName(car, 'ar') || '').trim();
      const safeImage = String(imageUrl || existing?.imageUrl || resolveCarThumb(car, '') || '').trim();

      if (existing?.id) {
        const patch = {
          price: numericPrice,
          originalPrice: Number(existing.originalPrice) || numericPrice,
          active: true,
          nameEn: safeNameEn,
          nameAr: safeNameAr,
        };
        if (safeImage) patch.imageUrl = safeImage;
        if (service.layout === 'round_trip') {
          patch.pickupPrice = Number.isFinite(pickup) ? pickup : (Number(existing.pickupPrice) || numericPrice);
          patch.dropoffPrice = Number.isFinite(dropoff) ? dropoff : (Number(existing.dropoffPrice) || 0);
          patch.price = patch.pickupPrice + patch.dropoffPrice || numericPrice;
          patch.originalPrice = patch.price;
        }
        if (service.layout === 'hourly') {
          const hours = Number(existing.hours) || hoursFromRouteId(routeId, 4);
          if (hours > 0) {
            patch.hours = hours;
            patch.hourlyRate = Math.round(numericPrice / hours);
          }
        }
        try {
          await updateProduct(existing.id, patch);
        } catch (err) {
          if (err?.code === 'not-found') {
            const created = buildNewFleetProduct(service, { car, routeId, price: numericPrice });
            await createProduct({
              ...created,
              nameEn: safeNameEn || created.nameEn,
              nameAr: safeNameAr || created.nameAr,
              imageUrl: safeImage || created.imageUrl,
            });
          } else {
            throw err;
          }
        }
        toast.success(t('admin.fleet.updated'));
      } else {
        const created = buildNewFleetProduct(service, { car, routeId, price: numericPrice });
        if (service.layout === 'round_trip') {
          created.pickupPrice = Number.isFinite(pickup) ? pickup : (created.pickupPrice || numericPrice);
          created.dropoffPrice = Number.isFinite(dropoff) ? dropoff : (created.dropoffPrice || 0);
          created.price = created.pickupPrice + created.dropoffPrice || numericPrice;
          created.originalPrice = created.price;
        }
        await createProduct({
          ...created,
          nameEn: safeNameEn || created.nameEn,
          nameAr: safeNameAr || created.nameAr,
          imageUrl: safeImage || created.imageUrl,
        });
        toast.success(t('admin.fleet.created'));
      }

      const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
      const currentCars = [...(showcase[serviceId]?.carIds || [])];
      while (currentCars.length < limit) currentCars.push('');
      currentCars[slotIndex] = car;
      try {
        await persistShowcase(serviceId, {
          routeId,
          carIds: currentCars.filter(Boolean),
          active: showcase[serviceId]?.active !== false,
        });
      } catch (err) {
        console.warn('Fleet showcase pin failed after price save', err);
        try {
          await publishSite('soft');
        } catch {
          /* price is already saved */
        }
      }
      refresh();
    } catch (err) {
      console.error('Fleet price save failed', err);
      const code = err?.code || err?.message || '';
      if (code === 'permission-denied' || code === 'unauthenticated') {
        toast.error(t('admin.fleet.permissionDenied'));
      } else {
        toast.error(t('admin.fleet.saveFailed'));
      }
    } finally {
      setSavingKey('');
    }
  };

  const changeRoute = async (serviceId, routeId) => {
    const products = byService[serviceId] || [];
    const service = getFleetService(serviceId);
    const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
    const existingCars = (showcase[serviceId]?.carIds || []).filter((car) => (
      productOnRoute(products, routeId, car)
    ));
    const pool = [...new Set([
      ...service.cars,
      ...products.map((p) => carKeyOf(p)).filter(Boolean),
    ])];
    const fill = pool.filter((car) => (
      !existingCars.includes(car) && productOnRoute(products, routeId, car)
    ));
    const carIds = [...existingCars, ...fill].slice(0, limit);
    setSavingKey(`${serviceId}:route`);
    try {
      await persistShowcase(serviceId, {
        routeId,
        carIds,
        active: showcase[serviceId]?.active !== false,
      });
      toast.success(t('admin.homeFleet.routePinned'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleService = async (serviceId) => {
    const current = showcase[serviceId] || {};
    setSavingKey(`${serviceId}:toggle`);
    try {
      await persistShowcase(serviceId, {
        routeId: current.routeId || '',
        carIds: current.carIds || [],
        active: current.active === false,
      });
      toast.success(current.active === false ? t('admin.homeFleet.serviceOn') : t('admin.homeFleet.serviceOff'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleSection = async () => {
    setSavingKey('section');
    try {
      await updateHomeSection('fleet', !sectionOn);
      setSectionOn(!sectionOn);
      await publishSite('soft');
      toast.success(!sectionOn ? t('admin.sections.turnedOn') : t('admin.sections.turnedOff'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const toggleProduct = async (product, field) => {
    if (!product?.id) return;
    setSavingKey(product.id);
    try {
      const next = field === 'active' ? product.active === false : !product[field];
      await updateProduct(product.id, { [field]: next });
      await publishSite('soft');
      refresh();
    } catch (err) {
      console.error('Fleet product toggle failed', err);
      toast.error(t('admin.fleet.saveFailed'));
    } finally {
      setSavingKey('');
    }
  };

  const removeProduct = async (product) => {
    if (!product?.id) return;
    if (!window.confirm(t('admin.confirmDelete'))) return;
    setSavingKey(product.id);
    try {
      await deleteProduct(product.id);
      await publishSite('soft');
      toast.success(t('admin.fleet.deleted'));
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const openAdd = (serviceId, routeId) => {
    const service = getFleetService(serviceId);
    const car = service.defaultCar;
    setAddFor(serviceId);
    setAddForm({
      car,
      routeId: routeId || service.defaultRouteId,
      price: '',
      nameEn: getCarDisplayName(car, 'en'),
      nameAr: getCarDisplayName(car, 'ar'),
      imageUrl: resolveCarThumb(car, ''),
    });
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addFor) return;
    const service = getFleetService(addFor);
    setSavingKey(`${addFor}:add`);
    try {
      const created = buildNewFleetProduct(service, addForm);
      await createProduct({
        ...created,
        nameEn: addForm.nameEn || created.nameEn,
        nameAr: addForm.nameAr || created.nameAr,
        imageUrl: addForm.imageUrl || created.imageUrl,
      });
      toast.success(t('admin.fleet.created'));
      setAddFor(null);
      await publishSite('soft');
      refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingKey('');
    }
  };

  const handleAddCar = async (payload) => {
    if (liveFleetCarCount(carCatalog) >= MAX_FLEET_CARS) {
      toast.warning(t('admin.bookingForms.carsBarMaxReached', { max: MAX_FLEET_CARS }));
      return false;
    }
    setAddingCar(true);
    try {
      const result = await createCarWithPackages(payload);
      const dbCars = await getAllCars();
      setCarCatalog(mergeCarCatalog(dbCars));
      await publishSite('soft');
      await refresh();
      toast.success(t('admin.cars.addNewSuccess', { id: result.id, count: result.packagesCreated }));
      return true;
    } catch (err) {
      toast.error(err?.message || t('admin.cars.addNewFailed'));
      return false;
    } finally {
      setAddingCar(false);
    }
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

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await updateBookingLocationsSettings({ cities, routes });
      await publishSite();
      toast.success(t('admin.bookingForms.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPublishing(false);
    }
  };

  const updateCity = (id, patch) => {
    setLocalCities((list) => list.map((city) => (city.id === id ? { ...city, ...patch } : city)));
  };
  const updateRoute = (id, patch) => {
    setLocalRoutes((list) => list.map((route) => (route.id === id ? { ...route, ...patch } : route)));
  };
  const toggleLocationForm = (kind, id, formKey) => {
    if (kind === 'city') {
      setLocalCities((list) => list.map((city) => {
        if (city.id !== id) return city;
        const on = city.forms?.[formKey] !== false;
        return { ...city, forms: { ...city.forms, [formKey]: !on } };
      }));
    } else {
      setLocalRoutes((list) => list.map((route) => {
        if (route.id !== id) return route;
        const on = route.forms?.[formKey] !== false;
        return { ...route, forms: { ...route.forms, [formKey]: !on } };
      }));
    }
  };
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
    if (kind === 'city') setLocalCities((list) => list.map((city) => (city.id === id ? flip(city) : city)));
    else setLocalRoutes((list) => list.map((route) => (route.id === id ? flip(route) : route)));
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
    }, cities);
    if (!next) return;
    setLocalCities((list) => [...list, next]);
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
    }, routes);
    if (!next) return;
    setLocalRoutes((list) => [...list, next]);
    setExpandedId(`route:${next.id}:${formKey}`);
    toast.success(t('admin.bookingForms.routeAdded'));
  };
  const runConfirm = () => {
    if (confirm?.type === 'city') {
      setLocalCities((list) => list.filter((city) => city.id !== confirm.id || city.builtin));
      setExpandedId(null);
      toast.success(t('admin.bookingForms.cityDeleted'));
    }
    if (confirm?.type === 'route') {
      setLocalRoutes((list) => list.filter((route) => route.id !== confirm.id || route.builtin));
      setExpandedId(null);
      toast.success(t('admin.bookingForms.routeDeleted'));
    }
    setConfirm(null);
  };

  const serviceStats = useMemo(() => Object.fromEntries(
    HOME_FLEET_SERVICE_IDS.map((id) => [
      id,
      collectFleetServiceRoutes(id, locations, catalogProducts).length,
    ]),
  ), [locations, catalogProducts]);

  const activeServiceId = visibleServiceIds.includes(focusServiceId)
    ? focusServiceId
    : (visibleServiceIds[0] || HOME_FLEET_SERVICE_IDS[0]);
  const activeMeta = SERVICE_META[activeServiceId] || SERVICE_META.train;
  const activeService = getFleetService(activeServiceId);
  const ActiveIcon = SERVICE_ICONS[activeServiceId] || Package;
  const selectService = (id) => {
    setFocusServiceId(id);
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  };

  const renderServiceEditor = (serviceId, index, editorCompact = false) => (
    <ServiceEditor
      key={serviceId}
      serviceId={serviceId}
      index={index}
      meta={SERVICE_META[serviceId] || SERVICE_META.train}
      lang={lang}
      t={t}
      compact={editorCompact}
      expanded={editorCompact || openIds.includes(serviceId)}
      onToggle={() => selectService(serviceId)}
      products={byService[serviceId] || []}
      pin={showcase[serviceId]}
      carChoices={carChoices}
      locations={locations}
      allProducts={catalogProducts}
      carCatalog={carCatalog}
      onProductsChange={setLocalProducts}
      savingKey={savingKey}
      addOpen={addFor === serviceId}
      addForm={addForm}
      setAddForm={setAddForm}
      onChangeRoute={(routeId) => changeRoute(serviceId, routeId)}
      onToggleService={() => toggleService(serviceId)}
      onSaveSlot={(slotIndex, payload) => saveSlot(serviceId, slotIndex, payload)}
      onToggleProduct={toggleProduct}
      onDeleteProduct={removeProduct}
      onOpenAdd={(routeId) => openAdd(serviceId, routeId)}
      onCloseAdd={() => setAddFor(null)}
      onSubmitAdd={submitAdd}
      cities={cities}
      routes={routes}
      expandedId={expandedId}
      setExpandedId={setExpandedId}
      toggleLocationForm={toggleLocationForm}
      toggleSiteForm={toggleSiteForm}
      updateCity={updateCity}
      updateRoute={updateRoute}
      removeCity={(id) => setConfirm({ type: 'city', id })}
      removeRoute={(id) => setConfirm({ type: 'route', id })}
      onAddCity={onAddCity}
      onAddRoute={onAddRoute}
    />
  );

  return (
    <div className="space-y-5" data-fleet-ui="booking-forms">
      {!embedded && (
        <>
          <AdminPageHeader
            title={t('fleet.title')}
            purposeKey="homeFleet"
            subtitle={t('admin.homeFleet.pageSubtitle')}
          >
            <ToggleSwitch
              on={sectionOn}
              disabled={savingKey === 'section'}
              onClick={toggleSection}
              label={sectionOn ? t('admin.homeFleet.sectionOn') : t('admin.homeFleet.sectionOff')}
            />
            {loading ? (
              <span className="text-xs font-semibold text-gray-500">{t('common.loading')}</span>
            ) : null}
          </AdminPageHeader>

          <div className="grid grid-cols-3 gap-2">
            {[
              { n: '1', icon: Layers, text: t('admin.homeFleet.stepService') },
              { n: '2', icon: Heading, text: t('admin.homeFleet.stepHomepage') },
              { n: '3', icon: Save, text: t('admin.homeFleet.stepTable') },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-2 rounded-2xl border border-brand/10 bg-white dark:bg-white/5 px-2.5 py-2.5 sm:px-3.5 sm:py-3">
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-brand text-white text-[10px] sm:text-xs font-black shrink-0">{step.n}</span>
                <p className="text-[10px] sm:text-xs font-bold text-brand dark:text-white leading-snug">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200/80 bg-sky-50/80 dark:bg-sky-950/30 dark:border-sky-800 px-4 py-3">
            <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <p className="text-sm text-sky-900 dark:text-sky-100 leading-relaxed">{t('admin.homeFleet.howDesc')}</p>
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
            onAdd={handleAddCar}
          />
        </>
      )}

      {embedded && !compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.pricesTitle')}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{t('admin.bookingForms.pricesHint')}</p>
          </div>
        </div>
      )}

      {loading && !tripBundles ? (
        <LoadingSpinner />
      ) : compact ? (
        <div className={`grid grid-cols-1 gap-4 ${visibleServiceIds.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {visibleServiceIds.map((serviceId, index) => renderServiceEditor(serviceId, index, true))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {visibleServiceIds.map((id, index) => {
              const service = FLEET_SERVICES[id];
              const meta = SERVICE_META[id] || SERVICE_META.train;
              const Icon = SERVICE_ICONS[id] || Package;
              const title = lang === 'ar' ? service.badgeAr : service.badgeEn;
              const active = activeServiceId === id;
              const on = showcase[id]?.active !== false;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectService(id)}
                  className={`text-start rounded-2xl border p-4 transition-all ${
                    active
                      ? `ring-2 ${meta.ring} bg-white dark:bg-dark-800 shadow-lg`
                      : 'border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-brand/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                        {t('admin.homeFleet.serviceCard', { number: index + 1 })}
                      </p>
                      <p className="text-sm font-black text-brand dark:text-white truncate">{title}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-gray-500">
                    {t('admin.homeFleet.visibleRoutes', { count: serviceStats[id] || 0 })}
                    {' · '}
                    {on ? t('admin.bookingForms.tabShow') : t('admin.bookingForms.tabHide')}
                  </p>
                </button>
              );
            })}
          </div>

          <GlassCard hover={false} className={`border ${activeMeta.ring} overflow-hidden`}>
            <div className="flex items-center gap-3 mb-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${activeMeta.accent} text-white`}>
                <ActiveIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-brand dark:text-white truncate">
                  {lang === 'ar' ? activeService.badgeAr : activeService.badgeEn}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {t('admin.homeFleet.panelHint')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-1">
                <Layers className="w-4 h-4 text-brand" />
                <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.sectionsTitle')}</p>
                <span className="text-[11px] font-bold text-gray-400">
                  {t('admin.bookingForms.sectionCount', {
                    count: visibleServiceIds.length,
                    max: HOME_FLEET_SERVICE_IDS.length,
                  })}
                </span>
              </div>

              {visibleServiceIds.map((serviceId, index) => renderServiceEditor(serviceId, index))}
            </div>
          </GlassCard>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/15 bg-white/95 dark:bg-dark-800/95 backdrop-blur px-4 py-3 shadow-lg">
            <AdminApplyButton
              type="button"
              loading={publishing}
              onClick={handlePublish}
              label={t('admin.bookingForms.savePublish')}
            />
            <span className="text-xs font-semibold text-gray-400">
              {t('admin.homeFleet.visibleRoutes', {
                count: HOME_FLEET_SERVICE_IDS.reduce((sum, id) => sum + (serviceStats[id] || 0), 0),
              })}
            </span>
            <span className="ms-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('admin.homeFleet.saveHint')}
            </span>
          </div>

          <AdminAlertModal
            open={Boolean(confirm)}
            type="danger"
            title={t('admin.bookingForms.deleteConfirmTitle')}
            body={t('admin.bookingForms.deleteConfirmBody')}
            confirmLabel={t('admin.bookingForms.deleteAction')}
            cancelLabel={t('common.cancel')}
            onConfirm={runConfirm}
            onClose={() => setConfirm(null)}
          />
        </>
      )}
    </div>
  );
}

function ServiceEditor({
  serviceId,
  index = 0,
  meta,
  lang,
  t,
  compact = false,
  expanded = true,
  onToggle,
  products,
  pin,
  carChoices,
  locations,
  allProducts,
  carCatalog = [],
  onProductsChange,
  savingKey,
  addOpen,
  addForm,
  setAddForm,
  onChangeRoute,
  onToggleService,
  onSaveSlot,
  onToggleProduct,
  onDeleteProduct,
  onOpenAdd,
  onCloseAdd,
  onSubmitAdd,
  cities = [],
  routes = [],
  expandedId,
  setExpandedId,
  toggleLocationForm,
  toggleSiteForm,
  updateCity,
  updateRoute,
  removeCity,
  removeRoute,
  onAddCity,
  onAddRoute,
}) {
  const service = getFleetService(serviceId);
  const chipOn = meta?.chipOn || SERVICE_META.train.chipOn;
  const chipOff = meta?.chipOff || SERVICE_META.train.chipOff;
  const homepageRoutes = useMemo(
    () => collectFleetServiceRoutes(serviceId, locations, allProducts || products),
    [serviceId, locations, allProducts, products],
  );
  const limit = HOME_FLEET_SERVICE_COUNTS[serviceId] || 2;
  const routeId = pin?.routeId || rankedRouteId(service, products);
  const visible = pin?.active !== false;

  const slotCars = useMemo(() => {
    const pinned = (pin?.carIds || []).filter(Boolean);
    const onRoute = [
      ...service.cars,
      ...carChoices.map((c) => c.id),
    ].filter((c, i, arr) => arr.indexOf(c) === i && productOnRoute(products, routeId, c));
    const merged = [...pinned, ...onRoute.filter((c) => !pinned.includes(c))];
    const slots = [];
    for (let i = 0; i < limit; i += 1) {
      slots.push(merged[i] || service.cars[i] || service.defaultCar);
    }
    return slots;
  }, [pin, products, routeId, service, limit, carChoices]);

  const sectionMeta = SERVICE_SECTION_META[serviceId] || SERVICE_SECTION_META.cityToCity;
  const { dataType, locationKey, formId } = sectionMeta;
  const DataIcon = dataType === 'routes' ? TrainFront : MapPin;
  const dataCount = dataType === 'cities'
    ? cities.filter((c) => c.active !== false && c.forms?.[locationKey] !== false).length
    : routes.filter((r) => r.active !== false && r.forms?.[locationKey] !== false).length;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-shadow ${
      expanded
        ? 'border-brand/25 shadow-lg shadow-brand/5 bg-white dark:bg-dark-800'
        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand/30'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex flex-wrap items-center gap-3 text-start bg-gradient-to-r from-brand/[0.04] to-transparent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white text-xs font-black shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-brand dark:text-white truncate">
            {lang === 'ar' ? service.badgeAr : service.badgeEn}
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-white/50 mt-0.5">
            {t('admin.homeFleet.visibleRoutes', { count: homepageRoutes.length })}
            {' · '}
            {t('admin.homeFleet.homepageBlock')}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
          visible ? 'bg-emerald-500/15 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {visible ? t('admin.bookingForms.tabShow') : t('admin.bookingForms.tabHide')}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/10">
          <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={onToggleService}
              disabled={savingKey === `${serviceId}:toggle`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border disabled:cursor-not-allowed ${
                visible ? chipOn : chipOff
              }`}
            >
              {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {visible ? t('admin.bookingForms.tabShow') : t('admin.bookingForms.tabHide')}
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-brand via-brand-light to-brand-dark p-4 text-white shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold/90">{t('admin.bookingForms.livePreview')}</p>
              <p className="mt-1.5 text-lg font-black leading-tight">
                {lang === 'ar' ? service.badgeAr : service.badgeEn}
              </p>
              <p className="mt-1 text-xs text-white/75 leading-snug">
                {homepageRoutes.find((r) => r.id === routeId)?.label?.[lang]
                  || homepageRoutes.find((r) => r.id === routeId)?.label?.ar
                  || t('admin.homeFleet.visibleRoutes', { count: homepageRoutes.length })}
              </p>
            </div>

            <label className="block space-y-1.5 min-w-0">
              <span className="text-[11px] font-bold text-gray-500">{t('admin.homeFleet.homepageRoute')}</span>
              <AdminSelect
                className="admin-select--wrap w-full"
                value={routeId}
                onChange={(e) => onChangeRoute(e.target.value)}
                disabled={savingKey === `${serviceId}:route`}
              >
                {homepageRoutes.map((r) => (
                  <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
                ))}
              </AdminSelect>
            </label>

            <div className={`grid grid-cols-1 ${compact ? '' : 'xl:grid-cols-2'} gap-4 min-w-0`}>
              {slotCars.map((car, slotIndex) => (
                <CarSlot
                  key={`${serviceId}-${slotIndex}-${routeId}`}
                  service={service}
                  lang={lang}
                  t={t}
                  cars={carChoices}
                  products={products}
                  routeId={routeId}
                  car={car}
                  saving={savingKey === `${serviceId}:${slotIndex}` || savingKey === productOnRoute(products, routeId, car)?.id}
                  onSave={(payload) => onSaveSlot(slotIndex, payload)}
                  onToggle={onToggleProduct}
                  onDelete={onDeleteProduct}
                />
              ))}
            </div>

            {addOpen ? (
              <form onSubmit={onSubmitAdd} className="rounded-xl border border-brand/20 bg-brand/[0.04] p-3 space-y-3">
                <p className="text-xs font-black">{t('admin.homeFleet.insertNew')}</p>
                <AdminSelect
                  className="admin-select--wrap w-full"
                  value={addForm.routeId}
                  onChange={(e) => setAddForm({ ...addForm, routeId: e.target.value })}
                >
                  {homepageRoutes.map((r) => (
                    <option key={r.id} value={r.id}>{r.label[lang] || r.label.ar}</option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  className="admin-select--wrap w-full"
                  value={addForm.car}
                  onChange={(e) => {
                    const car = e.target.value;
                    setAddForm({
                      ...addForm,
                      car,
                      nameEn: addForm.nameEn || getCarDisplayName(car, 'en'),
                      nameAr: addForm.nameAr || getCarDisplayName(car, 'ar'),
                      imageUrl: addForm.imageUrl || resolveCarThumb(car, ''),
                    });
                  }}
                >
                  {carChoices.map((c) => (
                    <option key={c.id} value={c.id}>{c.name(lang)}</option>
                  ))}
                </AdminSelect>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[11px] font-bold text-gray-500">Name (EN)</span>
                    <textarea
                      rows={2}
                      value={addForm.nameEn}
                      onChange={(e) => setAddForm({ ...addForm, nameEn: e.target.value })}
                      placeholder="Name (EN)"
                      className="admin-input w-full min-h-[4.5rem] resize-y text-sm leading-relaxed"
                    />
                  </label>
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[11px] font-bold text-gray-500">الاسم (AR)</span>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={addForm.nameAr}
                      onChange={(e) => setAddForm({ ...addForm, nameAr: e.target.value })}
                      placeholder="الاسم (AR)"
                      className="admin-input w-full min-h-[4.5rem] resize-y text-sm leading-relaxed"
                    />
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  required
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  placeholder={t('admin.products.price')}
                  className="admin-input"
                />
                <MediaUpload
                  value={addForm.imageUrl}
                  onChange={(url) => setAddForm({ ...addForm, imageUrl: url })}
                  folder="products"
                  allowUrl
                />
                <div className="flex gap-2">
                  <AdminApplyButton
                    type="submit"
                    size="sm"
                    loading={savingKey === `${serviceId}:add`}
                    label={t('admin.homeFleet.insert')}
                  />
                  <button type="button" onClick={onCloseAdd} className="admin-btn-secondary text-xs px-3 py-1.5">
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAdd(routeId)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-brand/20 text-sm font-bold text-brand hover:bg-brand/5"
              >
                <Plus className="w-4 h-4" />
                {t('admin.homeFleet.insertNew')}
              </button>
            )}

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
                    <DataIcon className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-brand dark:text-white">
                      {dataType === 'cities'
                        ? t('admin.bookingForms.citiesData')
                        : t('admin.bookingForms.routesData')}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t('admin.bookingForms.visibleCount', { count: dataCount })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (dataType === 'cities' ? onAddCity(locationKey) : onAddRoute(locationKey))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold bg-brand/10 text-brand hover:bg-brand/15"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {dataType === 'cities'
                    ? t('admin.bookingForms.addCity')
                    : t('admin.bookingForms.addRoute')}
                </button>
              </div>
              <div className="px-3 py-3 space-y-2 max-h-[min(70vh,36rem)] overflow-y-auto pe-1">
                {dataType === 'cities'
                  ? cities.map((city) => (
                    <CityRow
                      key={`${serviceId}-${city.id}`}
                      city={city}
                      formKey={locationKey}
                      formId={formId}
                      lang={lang}
                      t={t}
                      chipOn={chipOn}
                      chipOff={chipOff}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      toggleLocationForm={toggleLocationForm}
                      toggleSiteForm={toggleSiteForm}
                      updateCity={updateCity}
                      removeCity={removeCity}
                      cities={cities}
                      products={allProducts}
                      onProductsChange={onProductsChange}
                      carCatalog={carCatalog}
                    />
                  ))
                  : routes.map((route) => (
                    <RouteRow
                      key={`${serviceId}-${route.id}`}
                      route={route}
                      formKey={locationKey}
                      formId={formId}
                      lang={lang}
                      t={t}
                      chipOn={chipOn}
                      chipOff={chipOff}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      toggleLocationForm={toggleLocationForm}
                      toggleSiteForm={toggleSiteForm}
                      updateRoute={updateRoute}
                      removeRoute={removeRoute}
                      products={allProducts}
                      onProductsChange={onProductsChange}
                      carCatalog={carCatalog}
                    />
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Layers className="w-4 h-4 text-brand" />
              <p className="text-sm font-black text-brand dark:text-white">{t('admin.homeFleet.tableBlock')}</p>
            </div>

            <AdminFleetPricesTable
              products={allProducts}
              onProductsChange={onProductsChange}
              carCatalog={carCatalog}
              locations={locations}
              activeServiceId={serviceId}
              hideServiceTabs
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CarSlot({ service, lang, t, cars, products, routeId, car, saving, onSave, onToggle, onDelete }) {
  const [carId, setCarId] = useState(car);
  const currentCar = carId || car;
  const live = productOnRoute(products, routeId, currentCar);
  const isRound = service.layout === 'round_trip';
  const [price, setPrice] = useState(live?.price ?? '');
  const [pickupPrice, setPickupPrice] = useState(live?.pickupPrice ?? live?.price ?? '');
  const [dropoffPrice, setDropoffPrice] = useState(live?.dropoffPrice ?? '');
  const [nameEn, setNameEn] = useState(live?.nameEn || getCarDisplayName(currentCar, 'en'));
  const [nameAr, setNameAr] = useState(live?.nameAr || getCarDisplayName(currentCar, 'ar'));
  const [imageUrl, setImageUrl] = useState(live?.imageUrl || resolveCarThumb(currentCar, ''));

  useEffect(() => {
    setCarId(car);
  }, [car]);

  useEffect(() => {
    setPrice(live?.price ?? '');
    setPickupPrice(live?.pickupPrice ?? live?.price ?? '');
    setDropoffPrice(live?.dropoffPrice ?? '');
    setNameEn(live?.nameEn || getCarDisplayName(currentCar, 'en'));
    setNameAr(live?.nameAr || getCarDisplayName(currentCar, 'ar'));
    setImageUrl(live?.imageUrl || resolveCarThumb(currentCar, ''));
  }, [live?.id, live?.price, live?.pickupPrice, live?.dropoffPrice, live?.nameEn, live?.nameAr, live?.imageUrl, currentCar, routeId]);

  const exists = Boolean(live);
  const hours = live?.hours || hoursFromRouteId(routeId);
  const isActive = live?.active !== false;
  const canSave = isRound
    ? pickupPrice !== '' || dropoffPrice !== ''
    : price !== '';

  return (
    <div className={`rounded-xl border p-3 sm:p-4 space-y-3 min-w-0 overflow-visible ${isActive ? 'border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5' : 'border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/10'}`}>
      <MediaUpload
        value={imageUrl}
        onChange={setImageUrl}
        folder="products"
        allowUrl
        previewClassName="w-full h-28 sm:h-32 object-cover rounded-xl"
      />
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">{t('admin.fleet.selectCar')}</span>
        <AdminSelect
          className="admin-select--wrap w-full"
          value={currentCar}
          onChange={(e) => setCarId(e.target.value)}
        >
          {cars.map((c) => (
            <option key={c.id} value={c.id}>{c.name(lang)}</option>
          ))}
        </AdminSelect>
      </label>
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">Name (EN)</span>
        <textarea
          rows={2}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Name (EN)"
          title={nameEn}
          className="admin-input w-full min-h-[4.5rem] resize-y py-2 text-sm leading-relaxed"
        />
      </label>
      <label className="block space-y-1 min-w-0">
        <span className="text-[11px] font-bold text-gray-500">الاسم (AR)</span>
        <textarea
          rows={2}
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          placeholder="الاسم (AR)"
          title={nameAr}
          className="admin-input w-full min-h-[4.5rem] resize-y py-2 text-sm leading-relaxed"
        />
      </label>
      {isRound ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-gray-500">{t('admin.bookingForms.pickupCol')}</span>
            <input
              type="number"
              min="0"
              value={pickupPrice}
              onChange={(e) => setPickupPrice(e.target.value)}
              placeholder={t('admin.bookingForms.pickupCol')}
              className="admin-input w-full py-2.5"
            />
          </label>
          <label className="block space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-gray-500">{t('admin.bookingForms.dropoffCol')}</span>
            <input
              type="number"
              min="0"
              value={dropoffPrice}
              onChange={(e) => setDropoffPrice(e.target.value)}
              placeholder={t('admin.bookingForms.dropoffCol')}
              className="admin-input w-full py-2.5"
            />
          </label>
        </div>
      ) : (
        <label className="block space-y-1 min-w-0">
          <span className="text-[11px] font-bold text-gray-500">{t('admin.products.price')}</span>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t('admin.products.price')}
            className="admin-input w-full py-2.5"
          />
        </label>
      )}
      {service.layout === 'hourly' && hours ? (
        <p className="text-xs text-gray-500">
          {hours} {t('booking.hours_plural')}
        </p>
      ) : null}

      {exists ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToggleSwitch
            on={isActive}
            disabled={saving}
            onClick={() => onToggle(live, 'active')}
            label={isActive ? t('admin.table.show') : t('admin.table.hide')}
          />
          <ToggleSwitch
            on={!live.hidePrice}
            disabled={saving}
            onClick={() => onToggle(live, 'hidePrice')}
            label={live.hidePrice ? t('admin.fleet.hidden') : t('admin.fleet.visible')}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || !canSave}
          onClick={() => onSave({
            car: currentCar,
            routeId,
            price,
            pickupPrice,
            dropoffPrice,
            nameEn,
            nameAr,
            imageUrl,
          })}
          className="flex-1 min-w-[7.5rem] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-50"
        >
          <Save className="w-4 h-4 shrink-0" />
          {saving
            ? t('common.loading')
            : exists
              ? t('admin.homeFleet.updatePrice')
              : t('admin.homeFleet.insert')}
        </button>
        {exists ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onDelete(live)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold disabled:opacity-50"
            aria-label={t('admin.table.delete')}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
