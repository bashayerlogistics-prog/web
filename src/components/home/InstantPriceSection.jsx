import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Flag,
  Calendar,
  ChevronDown,
  Tag,
  Send,
  User,
  Phone,
  Mail,
  Info,
  Search,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  X,
  Loader2,
  ArrowLeft,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';
import {
  TIME_SLOTS,
  CONTACT,
  getCarDisplayName,
  BOOKING_PASSENGER_OPTIONS,
  BOOKING_CAR_TYPES,
  DEFAULT_BOOKING_PASSENGERS,
  DEFAULT_BOOKING_CAR_TYPE,
  DEFAULT_BOOKING_FROM,
  DEFAULT_BOOKING_TO,
  DEFAULT_ROUND_TRIP_ROUTE,
} from '../../data/staticData';
import { getBetweenCitiesDestinations } from '../../data/betweenCitiesPricing';
import { createPriceRequest } from '../../firebase/bookings';
import {
  resolveRouteId,
  resolveHourlyRouteId,
  getHourlyDestinationsForCity,
} from '../../utils/bookingHelpers';
import { getCarTypesForTripSection } from '../../utils/carCatalogHelpers';
import { useSiteContent } from '../../context/SiteContentContext';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_INSTANT_PRICE } from '../../firebase/content';
import { optimizedImageUrl } from '../../utils/mediaPerf';
import { usePublicTripTypes } from '../../hooks/usePublicTripTypes';
import { useBookingLocations } from '../../hooks/useBookingLocations';
import BookingTripDetails from './BookingTripDetails';
import CustomSelect from '../ui/CustomSelect';
import {
  getBookingPreviewVehicle,
  resolveBookingSearchRouteId,
  formatBookingPriceDisplay,
  bookingHourSelectOptions,
} from '../../utils/bookingSearchNav';
import { prefetchRoute } from '../../utils/prefetchRoutes';

const INSTANT_BG_DESKTOP = '/images/instant-price-bg.webp';
const INSTANT_BG_MOBILE = '/images/instant-price-bg-mobile.webp';
const INSTANT_BG_LEGACY = '/images/instant-price-bg.png';

function resolveInstantBg(url) {
  const raw = String(url || '').trim();
  if (!raw || raw === INSTANT_BG_LEGACY || raw === INSTANT_BG_DESKTOP) {
    return { desktop: INSTANT_BG_DESKTOP, mobile: INSTANT_BG_MOBILE };
  }
  const optimized = optimizedImageUrl(raw, 1280, 72);
  return { desktop: optimized, mobile: optimizedImageUrl(raw, 768, 68) || optimized };
}

function shortVehicleName(vehicle, lang) {
  const key = String(vehicle?.id || '').split('-')[0];
  return getCarDisplayName(key, lang) || vehicle?.name?.[lang] || vehicle?.name?.ar || '';
}

function priceRange(vehicle) {
  if (vehicle?.hidePrice) return null;
  const low = Number(vehicle?.price) || 0;
  const high = Number(vehicle?.originalPrice) || low;
  return { low, high: Math.max(high, low) };
}

function buildSearchParams({
  tripType,
  from,
  to,
  date,
  time,
  passengers,
  carType,
  returnDate,
  returnTime,
  hours,
  hourlyDest,
  isRound,
  isOneWay,
  isHourly,
  vehicleId,
  rtRoute,
  station,
}) {
  const usesStationRoute = isRound || isOneWay;
  const routeId = usesStationRoute
    ? (rtRoute || DEFAULT_ROUND_TRIP_ROUTE)
    : isHourly
      ? resolveHourlyRouteId(from, hourlyDest || 'internal', Number(hours))
      : resolveRouteId(from, to || from);
  const params = new URLSearchParams({
    trip_type: tripType,
    from: usesStationRoute ? (station?.cityFrom || '') : from,
    to: isHourly ? '' : (usesStationRoute ? (station?.cityTo || '') : to),
    route: routeId,
    date,
    time,
    passengers: String(passengers),
    cars: '1',
  });
  params.set('form', 'instantPrice');
  if (carType) params.set('car_type', carType);
  if (isRound) {
    params.set('return_date', returnDate);
    params.set('return_time', returnTime);
  }
  if (isHourly) {
    params.set('hours', hours);
    params.set('hourly_dest', hourlyDest || 'internal');
    params.set('fleet_service', (hourlyDest || 'internal') === 'internal' ? 'withinCity' : 'hourly');
  }
  if (vehicleId) params.set('vehicle_key', vehicleId);
  return params;
}

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const PASSENGER_OPTIONS = BOOKING_PASSENGER_OPTIONS;

function pick(cms, key, lang) {
  const en = cms?.[`${key}En`] ?? '';
  const ar = cms?.[`${key}Ar`] ?? '';
  return lang === 'ar' ? ar || en : en || ar;
}

function renderBody(template, whatsapp, phone) {
  if (!template) return null;
  const parts = template.split(/(\{\{whatsapp\}\}|\{\{phone\}\})/g);
  return parts.map((part, i) => {
    if (part === '{{whatsapp}}') {
      return (
        <span key={i} className="text-gold font-bold">
          {whatsapp}
        </span>
      );
    }
    if (part === '{{phone}}') {
      return (
        <span key={i} className="text-gold font-bold">
          {phone}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const darkField =
  'instant-price-field w-full rounded-lg sm:rounded-xl py-2 sm:py-2.5 ps-3 pe-10 text-sm text-white placeholder:text-white/50 appearance-none font-semibold';

const darkLabel =
  'block text-[9px] sm:text-[10px] font-bold tracking-[0.12em] uppercase text-gold/90 mb-1';

export default function InstantPriceSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { instantPrice: cmsRaw, fleet, carCatalog, fleetRoutes, fleetShowcase } = useSiteContent();
  const {
    betweenCities: betweenCityOptions,
    hourlyCities: hourlyCityOptions,
    pickupOptions,
    dropoffOptions,
    findRoute,
    cityName: resolveCityName,
  } = useBookingLocations('instantPrice');
  const cms = cmsRaw || DEFAULT_INSTANT_PRICE;
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { tripTypes: TRIP_TYPES, tripType, setTripType, formFields } = usePublicTripTypes('instantPrice', lang);

  const fieldLabel = (key, fallback) => formFields?.[key]?.label || fallback;
  const showField = (key) => formFields?.[key]?.show !== false;

  const [from, setFrom] = useState(DEFAULT_BOOKING_FROM);
  const [to, setTo] = useState(DEFAULT_BOOKING_TO);
  const [rtRoute, setRtRoute] = useState(DEFAULT_ROUND_TRIP_ROUTE);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState(tomorrow());
  const [returnTime, setReturnTime] = useState('17:00');
  const [hours, setHours] = useState('4');
  const [hourlyDest, setHourlyDest] = useState('internal');
  const [passengers, setPassengers] = useState(DEFAULT_BOOKING_PASSENGERS);
  const [carType, setCarType] = useState(DEFAULT_BOOKING_CAR_TYPE);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [tripDetails, setTripDetails] = useState('');

  const routeCategory = useMemo(() => {
    if (tripType !== 'round_trip' && tripType !== 'one_way') return undefined;
    const category = findRoute(rtRoute)?.category;
    return category === 'airport' || category === 'train' ? category : undefined;
  }, [tripType, findRoute, rtRoute]);

  const carTypes = useMemo(
    () => getCarTypesForTripSection({
      carCatalog,
      formId: 'instantPrice',
      tripType,
      fleetShowcase,
      hourlyDest,
      routeCategory,
    }),
    [carCatalog, tripType, fleetShowcase, hourlyDest, routeCategory],
  );

  const hourSelectOptions = useMemo(
    () => bookingHourSelectOptions(from, fleetRoutes, t),
    [from, fleetRoutes, t],
  );
  const hourOptions = useMemo(
    () => hourSelectOptions.map((o) => o.value),
    [hourSelectOptions],
  );

  const isCustom = tripType === 'custom_price';
  const isRound = tripType === 'round_trip';
  const isHourly = tripType === 'hourly';
  const isOneWay = tripType === 'one_way';
  const isBetweenCities = tripType === 'between_cities';
  const cityOptions = isHourly ? hourlyCityOptions : betweenCityOptions;

  const rtPickupOptions = useMemo(
    () => pickupOptions(lang, isOneWay ? 'oneWay' : 'roundTrip'),
    [pickupOptions, lang, isOneWay],
  );
  const rtDropoffOptions = useMemo(
    () => dropoffOptions(lang, 'roundTrip'),
    [dropoffOptions, lang],
  );

  const copy = useMemo(
    () => ({
      formTitle: pick(cms, 'formTitle', lang),
      formSubtitle: pick(cms, 'formSubtitle', lang),
      eyebrow: pick(cms, 'eyebrow', lang),
      heading: pick(cms, 'heading', lang),
      body: pick(cms, 'body', lang),
      cta: pick(cms, 'ctaLabel', lang),
      fromLabel: pick(cms, 'fromLabel', lang),
      fromPlaceholder: pick(cms, 'fromPlaceholder', lang),
      toLabel: pick(cms, 'toLabel', lang),
      toPlaceholder: pick(cms, 'toPlaceholder', lang),
      timeLabel: pick(cms, 'timeLabel', lang),
      dateLabel: pick(cms, 'dateLabel', lang),
      passengersLabel: pick(cms, 'passengersLabel', lang),
      carLabel: pick(cms, 'carLabel', lang),
      carOption: pick(cms, 'carOption', lang),
      whatsappDisplay: cms.whatsappDisplay || CONTACT.phone,
      phoneDisplay: cms.phoneDisplay || CONTACT.phone,
      whatsappUrl: cms.whatsappUrl || CONTACT.whatsapp,
      phoneTel: cms.phoneTel || CONTACT.phone,
    }),
    [cms, lang],
  );

  const betweenCitiesToOptions = useMemo(() => {
    if (!isBetweenCities || !from) return cityOptions;
    const valid = new Set(getBetweenCitiesDestinations(from, betweenCityOptions));
    return cityOptions.filter((c) => valid.has(c.id));
  }, [isBetweenCities, from, cityOptions, betweenCityOptions]);

  useEffect(() => {
    if (!isBetweenCities || !from) return;
    const valid = getBetweenCitiesDestinations(from, betweenCityOptions);
    if (valid.length && !valid.includes(String(to))) {
      setTo(valid[0]);
    }
  }, [isBetweenCities, from, to, betweenCityOptions]);

  useEffect(() => {
    if (!isHourly) return;
    if (!hourlyCityOptions.some((c) => c.id === from)) {
      setFrom(hourlyCityOptions[0]?.id || DEFAULT_BOOKING_FROM);
    }
  }, [isHourly, from, hourlyCityOptions]);

  const hourlyDestOptions = useMemo(() => {
    if (!from) return [];
    return getHourlyDestinationsForCity(from, Number(hours), lang, fleetRoutes);
  }, [from, hours, lang, fleetRoutes]);

  useEffect(() => {
    if (hourOptions.length && !hourOptions.map(String).includes(String(hours))) {
      setHours(String(hourOptions[0]));
    }
  }, [hourOptions, hours]);

  useEffect(() => {
    if (hourlyDestOptions.length && !hourlyDestOptions.find((d) => d.key === hourlyDest)) {
      setHourlyDest(hourlyDestOptions[0].key);
    }
  }, [hourlyDestOptions, hourlyDest]);

  useEffect(() => {
    if (carTypes.length && !carTypes.includes(carType)) {
      setCarType(carTypes[0] || DEFAULT_BOOKING_CAR_TYPE);
    }
  }, [carTypes, carType]);

  useEffect(() => {
    prefetchRoute('/booking/search');
  }, []);

  const previewRouteId = useMemo(
    () => resolveBookingSearchRouteId({
      tripType,
      from,
      to,
      rtRoute,
      hours,
      hourlyDest,
    }),
    [tripType, from, to, rtRoute, hours, hourlyDest],
  );

  const previewVehicle = useMemo(
    () => getBookingPreviewVehicle(fleet, previewRouteId, carType, {
      formId: 'instantPrice',
      tripType,
      hourlyDest,
    }),
    [fleet, previewRouteId, carType, tripType, hourlyDest],
  );

  const cityName = (id) => resolveCityName(id, lang);

  const routeDisplay = useMemo(() => {
    if (isRound) {
      const pickup = rtPickupOptions.find((s) => s.id === rtRoute)?.label;
      const dropoff = rtDropoffOptions.find((s) => s.id === rtRoute)?.label;
      if (pickup && dropoff) return `${pickup}  ↔  ${dropoff}`;
      const station = findRoute(rtRoute);
      return station?.title?.[lang] || station?.title?.ar || '';
    }
    if (isOneWay) {
      return (
        rtPickupOptions.find((s) => s.id === rtRoute)?.label ||
        findRoute(rtRoute)?.title?.[lang] ||
        ''
      );
    }
    if (isHourly && from) {
      const dest = hourlyDestOptions.find((d) => d.key === hourlyDest);
      return dest?.label || cityName(from);
    }
    if (from && to) {
      return lang === 'ar'
        ? `${cityName(to)} ← ${cityName(from)}`
        : `${cityName(from)} → ${cityName(to)}`;
    }
    if (from && isHourly) return cityName(from);
    return '';
  }, [from, to, isHourly, isOneWay, isRound, rtRoute, lang, hourlyDest, hourlyDestOptions, rtPickupOptions, rtDropoffOptions, findRoute]);

  const tripDetailRows = useMemo(() => {
    if (isCustom) return [];
    const fromValue = isRound || isOneWay
      ? (rtPickupOptions.find((s) => s.id === rtRoute)?.label || '')
      : cityName(from);
    const toValue = isRound
      ? (rtDropoffOptions.find((s) => s.id === rtRoute)?.label || '')
      : isOneWay || isHourly
        ? ''
        : cityName(to);
    const priceValue = formatBookingPriceDisplay(
      previewVehicle,
      t('booking.sar'),
      t('booking.contactForPrice'),
      tripType,
    ) || t('booking.contactForPrice');

    return [
      {
        key: 'from',
        show: showField('from'),
        label: fieldLabel('from', copy.fromLabel),
        value: fromValue,
      },
      {
        key: 'to',
        show: showField('to') && !isHourly && !isOneWay,
        label: fieldLabel('to', copy.toLabel),
        value: toValue,
      },
      {
        key: 'pickupTime',
        show: showField('pickupTime'),
        label: fieldLabel('pickupTime', copy.timeLabel),
        value: date && time ? `${date}  ${time}` : '',
        ltr: true,
      },
      {
        key: 'hours',
        show: showField('hours') && isHourly,
        label: fieldLabel('hours', t('booking.hours')),
        value: hours
          ? `${hours} ${Number(hours) === 1 ? t('booking.hour') : t('booking.hours_plural')}`
          : '',
      },
      {
        key: 'passengers',
        show: showField('passengers'),
        label: fieldLabel('passengers', copy.passengersLabel),
        value: passengers ? String(passengers) : '',
      },
      {
        key: 'car',
        show: showField('car'),
        label: fieldLabel('car', copy.carLabel),
        value: previewVehicle
          ? shortVehicleName(previewVehicle, lang)
          : (carType ? getCarDisplayName(carType, lang) : ''),
      },
      {
        key: 'price',
        show: showField('price'),
        label: fieldLabel('price', t('instantPrice.estimatedPrice')),
        value: priceValue,
        ltr: true,
      },
    ];
  }, [
    isCustom, isRound, isOneWay, isHourly, from, to, rtRoute, date, time, hours,
    passengers, carType, routeDisplay, previewVehicle, formFields,
    copy, lang, t, rtPickupOptions, rtDropoffOptions,
  ]);

  const selectedRange = previewVehicle ? priceRange(previewVehicle) : null;

  useEffect(() => {
    if (!showSuccess) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowSuccess(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSuccess]);

  const getFormParams = (vehicleId) =>
    buildSearchParams({
      tripType,
      from,
      to,
      date,
      time,
      passengers,
      carType,
      returnDate,
      returnTime,
      hours,
      hourlyDest,
      isRound,
      isOneWay,
      isHourly,
      vehicleId,
      rtRoute,
      station: findRoute(rtRoute),
    });

  const handleSearch = (e) => {
    e.preventDefault();
    if (isCustom) return;

    if (isRound || isOneWay) {
      if (!rtRoute) {
        toast.warning(t('instantPrice.needFrom'));
        return;
      }
    } else if (!from) {
      toast.warning(t('instantPrice.needFrom'));
      return;
    } else if (!isHourly && !to) {
      toast.warning(t('instantPrice.needTo'));
      return;
    }

    navigate(`/booking/search?${getFormParams(previewVehicle?.id || '').toString()}`);
  };

  const handleWhatsAppOrder = () => {
    const vehicle = previewVehicle;
    const range = vehicle ? priceRange(vehicle) : null;
    const priceText = range ? `${range.low} - ${range.high}` : '—';
    const carName =
      shortVehicleName(vehicle, lang) ||
      getCarDisplayName(carType, lang) ||
      copy.carOption ||
      '—';
    const msg = t('instantPrice.whatsappOrder', {
      route: routeDisplay || '—',
      vehicle: shortVehicleName(vehicle, lang) || '—',
      date,
      time,
      passengers,
      cars: carName,
      price: priceText,
      currency: t('booking.sar'),
    });
    const base = (copy.whatsappUrl || CONTACT.whatsapp).split('?')[0];
    const url = `${base}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePriceRequest = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !suggestedPrice) {
      toast.warning(t('booking.customNote'));
      return;
    }
    setSubmitting(true);
    try {
      await createPriceRequest({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || null,
        suggestedPrice: Number(suggestedPrice),
        tripDetails: tripDetails.trim(),
        lang,
      });
      toast.success(t('booking.requestSent'), 5000);
      setShowSuccess(true);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setSuggestedPrice('');
      setTripDetails('');
      setTripType('one_way');
    } catch {
      toast.error(t('booking.requestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const bg = useMemo(
    () => resolveInstantBg(cms.backgroundImageUrl || DEFAULT_INSTANT_PRICE.backgroundImageUrl),
    [cms.backgroundImageUrl],
  );
  const [bgReady, setBgReady] = useState(false);
  const bgImgRef = useRef(null);

  useEffect(() => {
    setBgReady(false);
    const img = bgImgRef.current;
    if (img?.complete && img.naturalWidth > 0) setBgReady(true);
  }, [bg.desktop]);

  return (
    <section
      id="instant-price"
      className="instant-price-section relative"
    >
      <div className="instant-price-section__media" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={bg.mobile} type="image/webp" />
          <img
            ref={bgImgRef}
            src={bg.desktop}
            alt=""
            className={`instant-price-section__photo${bgReady ? ' is-ready' : ''}`}
            width={1536}
            height={1024}
            decoding="async"
            loading="lazy"
            fetchPriority="low"
            onLoad={() => setBgReady(true)}
          />
        </picture>
      </div>
      <div className="instant-price-section__bg" aria-hidden="true" />
      <div className="instant-price-section__grid" aria-hidden="true" />

      <div className="section-container relative z-10 instant-price-section__inner">
        <div className="instant-price-layout grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-14 items-center">
          <div className="order-2 lg:order-1 text-center lg:text-start lg:pe-2 instant-price-copy">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/25 mb-3 sm:mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <p className="text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-gold">
                {copy.eyebrow}
              </p>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl xl:text-[2.35rem] font-extrabold text-white leading-[1.15] mb-3 sm:mb-4 max-w-lg mx-auto lg:mx-0">
              {copy.heading}
            </h3>
            <p className="instant-price-copy__body text-xs sm:text-sm text-white/75 leading-relaxed max-w-md mx-auto lg:mx-0 drop-shadow-sm">
              {renderBody(copy.body, copy.whatsappDisplay, copy.phoneDisplay)}
            </p>
            <div className="instant-price-copy__actions mt-5 sm:mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
              <a
                href={copy.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="instant-price-link instant-price-link--gold"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={`tel:${copy.phoneTel}`}
                className="instant-price-link"
              >
                <Phone className="w-4 h-4" />
                {t('instantPrice.callNow')}
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2 instant-price-card" data-dropdown-scope>
            <div className="instant-price-card__shine" aria-hidden="true" />
            <div className="relative z-10 space-y-3.5 sm:space-y-4">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/30 shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-dark" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    {copy.formTitle}
                  </h2>
                  <p className="instant-price-card__subtitle mt-0.5 text-[11px] sm:text-xs text-white/75 leading-snug">
                    {copy.formSubtitle}
                  </p>
                </div>
              </div>

              <div
                className="instant-price-chips flex flex-nowrap items-center gap-1.5 sm:gap-2 pb-2 border-b border-white/25 overflow-x-auto overscroll-x-contain"
                role="radiogroup"
                aria-label={t('booking.badge')}
              >
                {TRIP_TYPES.map((opt) => {
                  const checked = tripType === opt.value;
                  const TripIcon = opt.Icon;
                  return (
                    <label
                      key={opt.id || opt.value}
                      className={`instant-price-chip ${checked ? 'instant-price-chip--active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="instant_trip_type"
                        value={opt.value}
                        checked={checked}
                        onChange={() => startTransition(() => setTripType(opt.value))}
                        className="sr-only"
                      />
                      {TripIcon && <TripIcon className="w-3 h-3 shrink-0" aria-hidden />}
                      {opt.label}
                    </label>
                  );
                })}
              </div>

              <form
                onSubmit={isCustom ? handlePriceRequest : handleSearch}
                className="instant-price-form space-y-3 sm:space-y-3.5"
              >
                {!isCustom && (
                  <>
                    {isRound ? (
                      <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                        <div>
                          <label className={darkLabel}>{t('booking.pickupArrival')}</label>
                          <CustomSelect
                            value={rtRoute}
                            onChange={setRtRoute}
                            required
                            aria-label={t('booking.pickupArrival')}
                            icon={MapPin}
                            iconSide="end"
                            options={rtPickupOptions.map((s) => ({
                              value: s.id,
                              label: s.label,
                            }))}
                          />
                        </div>
                        <div>
                          <label className={darkLabel}>{t('booking.dropoffDeparture')}</label>
                          <CustomSelect
                            value={rtRoute}
                            onChange={setRtRoute}
                            required
                            aria-label={t('booking.dropoffDeparture')}
                            icon={Flag}
                            iconSide="end"
                            options={rtDropoffOptions.map((s) => ({
                              value: s.id,
                              label: s.label,
                            }))}
                          />
                        </div>
                      </div>
                    ) : isOneWay ? (
                      <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                        <div>
                          <label className={darkLabel}>{t('booking.pickupArrival')}</label>
                          <CustomSelect
                            value={rtRoute}
                            onChange={setRtRoute}
                            required
                            aria-label={t('booking.pickupArrival')}
                            icon={MapPin}
                            iconSide="end"
                            options={rtPickupOptions.map((s) => ({
                              value: s.id,
                              label: s.label,
                            }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className={`grid gap-2 sm:gap-2.5 ${isHourly ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {showField('from') && (
                        <div>
                          <label className={darkLabel}>{fieldLabel('from', copy.fromLabel)}</label>
                          <CustomSelect
                            value={from}
                            onChange={setFrom}
                            required
                            aria-label={fieldLabel('from', copy.fromLabel)}
                            icon={MapPin}
                            iconSide="end"
                            options={[
                              { value: '', label: copy.fromPlaceholder },
                              ...cityOptions.map((c) => ({
                                value: c.id,
                                label: c[lang] || c.ar,
                              })),
                            ]}
                          />
                        </div>
                        )}

                        {!isHourly && showField('to') && (
                          <div>
                            <label className={darkLabel}>{fieldLabel('to', copy.toLabel)}</label>
                            <CustomSelect
                              value={to}
                              onChange={setTo}
                              required
                              aria-label={fieldLabel('to', copy.toLabel)}
                              icon={Flag}
                              iconSide="end"
                              options={[
                                { value: '', label: copy.toPlaceholder },
                                ...(isBetweenCities ? betweenCitiesToOptions : cityOptions).map((c) => ({
                                  value: c.id,
                                  label: c[lang] || c.ar,
                                })),
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {showField('pickupTime') && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div>
                        <label className={darkLabel}>{fieldLabel('pickupTime', copy.timeLabel)}</label>
                        <CustomSelect
                          value={time}
                          onChange={setTime}
                          aria-label={fieldLabel('pickupTime', copy.timeLabel)}
                          icon={ChevronDown}
                          iconSide="start"
                          options={TIME_SLOTS.map((slot) => ({
                            value: slot,
                            label: slot,
                          }))}
                        />
                      </div>
                      <div>
                        <label className={darkLabel}>{copy.dateLabel}</label>
                        <div className="relative group">
                          <input
                            type="date"
                            value={date}
                            min={today()}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className={`${darkField} pe-11 [color-scheme:dark]`}
                          />
                          <Calendar className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/80 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      {showField('passengers') && (
                      <div>
                        <label className={darkLabel}>{fieldLabel('passengers', copy.passengersLabel)}</label>
                        <CustomSelect
                          value={passengers}
                          onChange={(v) => setPassengers(Number(v))}
                          aria-label={fieldLabel('passengers', copy.passengersLabel)}
                          icon={ChevronDown}
                          iconSide="start"
                          options={PASSENGER_OPTIONS.map((n) => ({
                            value: n,
                            label: String(n),
                          }))}
                        />
                      </div>
                      )}
                      {showField('car') && (
                      <div>
                        <label className={darkLabel}>{fieldLabel('car', copy.carLabel)}</label>
                        <CustomSelect
                          value={carType}
                          onChange={setCarType}
                          aria-label={fieldLabel('car', copy.carLabel)}
                          icon={ChevronDown}
                          iconSide="start"
                          options={carTypes.map((key) => ({
                            value: key,
                            label: getCarDisplayName(key, lang),
                          }))}
                        />
                      </div>
                      )}
                    </div>

                    {isRound && (
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        <div>
                          <label className={darkLabel}>{t('booking.returnTime')}</label>
                          <input
                            type="date"
                            value={returnDate}
                            min={date || today()}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className={`${darkField} pe-3.5 [color-scheme:dark]`}
                          />
                        </div>
                        <div>
                          <label className={darkLabel}>{t('booking.pickupTime')}</label>
                          <CustomSelect
                            value={returnTime}
                            onChange={setReturnTime}
                            aria-label={t('booking.pickupTime')}
                            icon={ChevronDown}
                            iconSide="end"
                            options={TIME_SLOTS.map((slot) => ({
                              value: slot,
                              label: slot,
                            }))}
                          />
                        </div>
                      </div>
                    )}

                    {isHourly && showField('hours') && (
                      <div>
                        <label className={darkLabel}>{fieldLabel('hours', t('booking.hours'))}</label>
                        <CustomSelect
                          value={hours}
                          onChange={setHours}
                          aria-label={fieldLabel('hours', t('booking.hours'))}
                          icon={ChevronDown}
                          iconSide="end"
                          options={hourSelectOptions}
                        />
                      </div>
                    )}

                    <BookingTripDetails rows={tripDetailRows} tone="dark" className="mt-1" />

                    <button
                      type="submit"
                      className="instant-price-cta group w-full"
                    >
                      <span className="instant-price-cta__shine" aria-hidden="true" />
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform group-hover:scale-110" />
                      <span className="relative z-10">{copy.cta}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppOrder}
                      className="instant-price-quote__btn instant-price-quote__btn--whatsapp w-full mt-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t('instantPrice.bookWhatsApp')}
                    </button>
                  </>
                )}

                {isCustom && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3 mb-1 p-3 rounded-xl bg-gold/15 border border-gold/40">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-full flex items-center justify-center shadow-md shadow-gold/20">
                        <Tag className="w-4 h-4 text-brand-dark" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{t('booking.customTitle')}</h3>
                        <p className="text-xs text-white/70">{t('booking.customSubtitle')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={darkLabel}>
                          <User className="w-3 h-3 inline me-1 text-gold" />
                          {t('booking.fullName')} *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          className={darkField}
                        />
                      </div>
                      <div>
                        <label className={darkLabel}>
                          <Phone className="w-3 h-3 inline me-1 text-gold" />
                          {t('booking.phone')} *
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          required
                          className={`${darkField} text-start`}
                        />
                      </div>
                      <div>
                        <label className={darkLabel}>
                          <Mail className="w-3 h-3 inline me-1 text-gold" />
                          {t('booking.email')}
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className={`${darkField} text-start`}
                        />
                      </div>
                      <div>
                        <label className={darkLabel}>
                          <Tag className="w-3 h-3 inline me-1 text-gold" />
                          {t('booking.suggestedPrice')} *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={suggestedPrice}
                            onChange={(e) => setSuggestedPrice(e.target.value)}
                            required
                            className={`${darkField} pe-12`}
                          />
                          <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-gold font-bold">
                            {t('booking.sar')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={darkLabel}>{t('booking.tripDetails')}</label>
                      <textarea
                        rows={3}
                        value={tripDetails}
                        onChange={(e) => setTripDetails(e.target.value)}
                        className={`${darkField} resize-none pe-3.5`}
                      />
                    </div>

                    <div className="flex items-start gap-2.5 p-3.5 bg-white/[0.08] rounded-xl border border-white/25">
                      <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                      <p className="text-xs text-white/80 leading-relaxed">{t('booking.customNote')}</p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="instant-price-cta group"
                    >
                      <span className="instant-price-cta__shine" aria-hidden="true" />
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      ) : (
                        <Send className="w-4 h-4 relative z-10 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      )}
                      <span className="relative z-10">
                        {submitting ? t('instantPrice.sending') : t('booking.sendRequest')}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSuccess(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="instant-price-success-title"
        >
          <div
            className="instant-price-success relative w-full max-w-md animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="absolute top-3 end-3 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-success-pop">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h4
              id="instant-price-success-title"
              className="text-xl font-extrabold text-white text-center mb-2"
            >
              {t('instantPrice.successTitle')}
            </h4>
            <p className="text-sm text-white/65 text-center leading-relaxed mb-6">
              {t('instantPrice.successBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={copy.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-brand-dark font-bold text-sm hover:from-gold-light hover:to-gold transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/10 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
