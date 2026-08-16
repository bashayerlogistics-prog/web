import { useEffect, useId, useMemo, useRef, useState, startTransition } from 'react';
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
  Route,
} from 'lucide-react';
import {
  CITIES,
  ONE_WAY_CITIES,
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
  getRoundTripStation,
  getRoundTripPickupOptions,
  getRoundTripDropoffOptions,
} from '../../data/staticData';
import { HOURLY_BASE_CITIES } from '../../data/hourlyPricing';
import { getBetweenCitiesDestinations } from '../../data/betweenCitiesPricing';
import { createPriceRequest } from '../../firebase/bookings';
import {
  resolveRouteId,
  resolveHourlyRouteId,
  getHourlyDestinationsForCity,
  getHourlyDurationsForCity,
} from '../../utils/bookingHelpers';
import { filterVehiclesByCarType } from '../../utils/fleetHelpers';
import { useSiteContent } from '../../context/SiteContentContext';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_INSTANT_PRICE } from '../../firebase/content';
import { optimizedImageUrl } from '../../utils/mediaPerf';

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

const HOURLY_CITIES = HOURLY_BASE_CITIES.map((c) => ({ id: c.id, ar: c.ar, en: c.en }));

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

function formatPriceDisplay(vehicle, currency) {
  if (!vehicle || vehicle.hidePrice) return null;
  const range = priceRange(vehicle);
  if (!range) return null;
  if (range.low === range.high) return `${range.low} ${currency}`;
  return `${range.low} - ${range.high} ${currency}`;
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
  isHourly,
  vehicleId,
  rtRoute,
}) {
  const station = isRound ? getRoundTripStation(rtRoute) : null;
  const routeId = isRound
    ? (rtRoute || DEFAULT_ROUND_TRIP_ROUTE)
    : isHourly
      ? resolveHourlyRouteId(from, hourlyDest || 'internal', Number(hours))
      : resolveRouteId(from, to || from);
  const params = new URLSearchParams({
    trip_type: tripType,
    from: isRound ? (station?.cityFrom || '') : from,
    to: isHourly ? '' : (isRound ? (station?.cityTo || '') : to),
    route: routeId,
    date,
    time,
    passengers: String(passengers),
    cars: '1',
  });
  if (carType) params.set('car_type', carType);
  if (isRound) {
    params.set('return_date', returnDate);
    params.set('return_time', returnTime);
  }
  if (isHourly) {
    params.set('hours', hours);
    params.set('hourly_dest', hourlyDest || 'internal');
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

const TRIP_TYPES = [
  { value: 'one_way', labelKey: 'booking.oneWay', Icon: Route },
  { value: 'round_trip', labelKey: 'booking.roundTrip', Icon: ArrowLeftRight },
  { value: 'hourly', labelKey: 'booking.hourly', Icon: Clock },
  { value: 'custom_price', labelKey: 'booking.customPrice', Icon: Tag },
];

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

/** Custom select — always opens downward; opaque menu so text stays readable. */
function IpSelect({
  value,
  onChange,
  options,
  icon: Icon,
  iconSide = 'end',
  required,
  disabled,
  'aria-label': ariaLabel,
  title,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => String(o.value) === String(value)) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      className={`ip-select ${open ? 'ip-select--open' : ''} ${disabled ? 'ip-select--disabled' : ''}`}
      ref={rootRef}
      title={title}
    >
      <button
        type="button"
        className={`ip-select__trigger ${iconSide === 'start' ? 'ip-select__trigger--icon-start' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <span className="ip-select__value">{selected?.label ?? ''}</span>
        {Icon ? (
          <Icon className={`ip-select__icon ip-select__icon--${iconSide}`} aria-hidden />
        ) : (
          <ChevronDown className={`ip-select__icon ip-select__icon--${iconSide}`} aria-hidden />
        )}
      </button>

      {open && !disabled && (
        <ul id={listId} role="listbox" className="ip-select__menu" tabIndex={-1}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={`${opt.value}-${opt.label}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`ip-select__option ${active ? 'ip-select__option--active' : ''}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function InstantPriceSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { instantPrice: cmsRaw, fleet, carCatalog, fleetRoutes } = useSiteContent();
  const cms = cmsRaw || DEFAULT_INSTANT_PRICE;
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const [tripType, setTripType] = useState('round_trip');
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
  const [searching, setSearching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteVehicles, setQuoteVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [tripDetails, setTripDetails] = useState('');

  const carTypes = useMemo(() => {
    const live = (carCatalog || [])
      .filter((c) => c?.active !== false && c?.id)
      .map((c) => String(c.id));
    if (!live.length) return BOOKING_CAR_TYPES;
    const ordered = BOOKING_CAR_TYPES.filter((id) => live.includes(id));
    const extras = live.filter((id) => !BOOKING_CAR_TYPES.includes(id));
    return ordered.length ? [...ordered, ...extras] : BOOKING_CAR_TYPES;
  }, [carCatalog]);

  const hourOptions = useMemo(
    () => getHourlyDurationsForCity(from, fleetRoutes),
    [from, fleetRoutes],
  );

  const rtPickupOptions = useMemo(() => getRoundTripPickupOptions(lang), [lang]);
  const rtDropoffOptions = useMemo(() => getRoundTripDropoffOptions(lang), [lang]);

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
      currencyLabel: pick(cms, 'currencyLabel', lang),
      currencyOption: pick(cms, 'currencyOption', lang),
      whatsappDisplay: cms.whatsappDisplay || CONTACT.phone,
      phoneDisplay: cms.phoneDisplay || CONTACT.phone,
      whatsappUrl: cms.whatsappUrl || CONTACT.whatsapp,
      phoneTel: cms.phoneTel || CONTACT.phone,
    }),
    [cms, lang],
  );

  const isCustom = tripType === 'custom_price';
  const isRound = tripType === 'round_trip';
  const isHourly = tripType === 'hourly';
  const isOneWay = tripType === 'one_way';
  const cityOptions = isHourly ? HOURLY_CITIES : isOneWay ? ONE_WAY_CITIES : CITIES;

  const oneWayToOptions = useMemo(() => {
    if (!isOneWay || !from) return cityOptions;
    const valid = new Set(getBetweenCitiesDestinations(from));
    return cityOptions.filter((c) => valid.has(c.id));
  }, [isOneWay, from, cityOptions]);

  useEffect(() => {
    if (!isOneWay || !from) return;
    const valid = getBetweenCitiesDestinations(from);
    if (valid.length && !valid.includes(String(to))) {
      setTo(valid[0]);
    }
  }, [isOneWay, from, to]);

  useEffect(() => {
    if (!isHourly) return;
    if (!HOURLY_CITIES.some((c) => c.id === from)) {
      setFrom(HOURLY_CITIES[0]?.id || DEFAULT_BOOKING_FROM);
    }
  }, [isHourly, from]);

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

  const selectedVehicle =
    quoteVehicles.find((v) => v.id === selectedVehicleId) || quoteVehicles[0] || null;

  const cityName = (id) => {
    const c = CITIES.find((x) => x.id === id);
    return c ? c[lang] || c.ar : id;
  };

  const routeDisplay = useMemo(() => {
    if (isRound) {
      const pickup = rtPickupOptions.find((s) => s.id === rtRoute)?.label;
      const dropoff = rtDropoffOptions.find((s) => s.id === rtRoute)?.label;
      if (pickup && dropoff) return `${pickup}  ↔  ${dropoff}`;
      const station = getRoundTripStation(rtRoute);
      return station?.title?.[lang] || station?.title?.ar || '';
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
  }, [from, to, isHourly, isRound, rtRoute, lang, hourlyDest, hourlyDestOptions, rtPickupOptions, rtDropoffOptions]);

  const selectedRange = selectedVehicle ? priceRange(selectedVehicle) : null;

  const clearQuote = () => {
    setQuoteReady(false);
    setQuoteVehicles([]);
    setSelectedVehicleId('');
  };

  useEffect(() => {
    clearQuote();
  }, [tripType, from, to, rtRoute, date, time, returnDate, returnTime, hours, hourlyDest, passengers, carType]);

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
      isHourly,
      vehicleId,
      rtRoute,
    });

  const handleSearch = (e) => {
    e.preventDefault();
    if (isCustom || searching) return;

    if (isRound) {
      if (!rtRoute) {
        toast.warning(t('instantPrice.needFrom'));
        return;
      }
      setSearching(true);
      toast.success(t('instantPrice.searchingPrices'), 1200);
      const all = fleet?.getVehiclesForRoute?.(rtRoute) || [];
      const vehicles = filterVehiclesByCarType(all, carType);
      startTransition(() => {
        setQuoteVehicles(vehicles);
        setSelectedVehicleId(vehicles[0]?.id || '');
        setQuoteReady(true);
        setSearching(false);
      });
      return;
    }

    if (!from) {
      toast.warning(t('instantPrice.needFrom'));
      return;
    }
    if (!isHourly && !to) {
      toast.warning(t('instantPrice.needTo'));
      return;
    }

    const routeId = isHourly
      ? resolveHourlyRouteId(from, hourlyDest || 'internal', Number(hours))
      : resolveRouteId(from, to || from);
    setSearching(true);
    toast.success(t('instantPrice.searchingPrices'), 1200);

    const all = fleet?.getVehiclesForRoute?.(routeId) || [];
    const vehicles = filterVehiclesByCarType(all, carType);
    startTransition(() => {
      setQuoteVehicles(vehicles);
      setSelectedVehicleId(vehicles[0]?.id || '');
      setQuoteReady(true);
      setSearching(false);
    });
  };

  const handleContinueBooking = () => {
    const params = getFormParams(selectedVehicle?.id);
    navigate(`/booking/search?${params.toString()}`);
  };

  const handleWhatsAppOrder = () => {
    const vehicle = selectedVehicle;
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

          <div className="order-1 lg:order-2 instant-price-card">
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
                      key={opt.value}
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
                      {t(opt.labelKey)}
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
                          <IpSelect
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
                          <IpSelect
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
                    ) : (
                      <div className={`grid gap-2 sm:gap-2.5 ${isHourly ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        <div>
                          <label className={darkLabel}>{copy.fromLabel}</label>
                          <IpSelect
                            value={from}
                            onChange={setFrom}
                            required
                            aria-label={copy.fromLabel}
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

                        {!isHourly && (
                          <div>
                            <label className={darkLabel}>{copy.toLabel}</label>
                            <IpSelect
                              value={to}
                              onChange={setTo}
                              required
                              aria-label={copy.toLabel}
                              icon={Flag}
                              iconSide="end"
                              options={[
                                { value: '', label: copy.toPlaceholder },
                                ...(isOneWay ? oneWayToOptions : cityOptions).map((c) => ({
                                  value: c.id,
                                  label: c[lang] || c.ar,
                                })),
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div>
                        <label className={darkLabel}>{copy.timeLabel}</label>
                        <IpSelect
                          value={time}
                          onChange={setTime}
                          aria-label={copy.timeLabel}
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

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div>
                        <label className={darkLabel}>{copy.passengersLabel}</label>
                        <IpSelect
                          value={passengers}
                          onChange={(v) => setPassengers(Number(v))}
                          aria-label={copy.passengersLabel}
                          icon={ChevronDown}
                          iconSide="start"
                          options={PASSENGER_OPTIONS.map((n) => ({
                            value: n,
                            label: String(n),
                          }))}
                        />
                      </div>
                      <div>
                        <label className={darkLabel}>{copy.carLabel}</label>
                        <IpSelect
                          value={carType}
                          onChange={setCarType}
                          aria-label={copy.carLabel}
                          icon={ChevronDown}
                          iconSide="start"
                          options={carTypes.map((key) => ({
                            value: key,
                            label: getCarDisplayName(key, lang),
                          }))}
                        />
                      </div>
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
                          <IpSelect
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

                    {isHourly && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        <div>
                          <label className={darkLabel}>{t('booking.hours')}</label>
                          <IpSelect
                            value={hours}
                            onChange={setHours}
                            aria-label={t('booking.hours')}
                            icon={ChevronDown}
                            iconSide="end"
                            options={hourOptions.map((h) => ({
                              value: String(h),
                              label: `${h} ${h === 1 ? t('booking.hour') : t('booking.hours_plural')}`,
                            }))}
                          />
                        </div>
                        <div className="sm:col-span-2 min-w-0">
                          <label className={darkLabel}>{t('booking.destination')}</label>
                          <IpSelect
                            value={hourlyDest}
                            onChange={setHourlyDest}
                            disabled={!from || !hourlyDestOptions.length}
                            title={hourlyDestOptions.find((d) => d.key === hourlyDest)?.label || ''}
                            aria-label={t('booking.destination')}
                            icon={ChevronDown}
                            iconSide="end"
                            options={hourlyDestOptions.map((d) => ({
                              value: d.key,
                              label: d.label,
                            }))}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-2.5 sm:items-end">
                      <div>
                        <label className={darkLabel}>{copy.currencyLabel}</label>
                        <IpSelect
                          value="SAR"
                          onChange={() => {}}
                          aria-label={copy.currencyLabel}
                          icon={ChevronDown}
                          iconSide="start"
                          options={[{ value: 'SAR', label: copy.currencyOption }]}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searching}
                        className="instant-price-cta group sm:min-w-[11.5rem]"
                      >
                        <span className="instant-price-cta__shine" aria-hidden="true" />
                        {searching ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin relative z-10" />
                        ) : (
                          <Search className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform group-hover:scale-110" />
                        )}
                        <span className="relative z-10">
                          {searching ? t('instantPrice.searching') : copy.cta}
                        </span>
                      </button>
                    </div>

                    {quoteReady && (
                      <div className="instant-price-quote" role="region" aria-live="polite">
                        {quoteVehicles.length === 0 ? (
                          <>
                            <p className="text-sm text-white/65 text-center py-2 mb-3">
                              {t('instantPrice.noVehicles')}
                            </p>
                            <div className="instant-price-quote__actions">
                              <button
                                type="button"
                                onClick={handleWhatsAppOrder}
                                className="instant-price-quote__btn instant-price-quote__btn--whatsapp"
                              >
                                <MessageCircle className="w-4 h-4" />
                                {t('instantPrice.bookWhatsApp')}
                              </button>
                              <button
                                type="button"
                                onClick={handleContinueBooking}
                                className="instant-price-quote__btn instant-price-quote__btn--booking"
                              >
                                {t('instantPrice.continueBooking')}
                                <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="instant-price-quote__estimate">
                              <p className="instant-price-quote__label">
                                {t('instantPrice.estimatedPrice')}
                              </p>
                              <p className="instant-price-quote__amount" dir="ltr">
                                {selectedVehicle?.hidePrice
                                  ? t('booking.contactForPrice')
                                  : formatPriceDisplay(selectedVehicle, t('booking.sar'))}
                              </p>
                              {isRound && selectedVehicle && !selectedVehicle.hidePrice && (
                                <p className="instant-price-quote__meta" dir="ltr">
                                  {t('booking.pickupArrival')}: {selectedVehicle.pickupPrice ?? '—'}
                                  {' + '}
                                  {t('booking.dropoffDeparture')}: {selectedVehicle.dropoffPrice ?? '—'}
                                </p>
                              )}
                              <p className="instant-price-quote__meta">
                                {routeDisplay}
                                {selectedVehicle
                                  ? ` • ${shortVehicleName(selectedVehicle, lang)}`
                                  : ''}
                                {` • ${date} ${time}`}
                                {` • ${passengers} ${t('fleet.passengers')}`}
                              </p>
                            </div>

                            <div className="instant-price-quote__cars">
                              {quoteVehicles.map((vehicle, index) => {
                                const range = priceRange(vehicle);
                                const active = vehicle.id === selectedVehicle?.id;
                                const badge =
                                  index === 0
                                    ? t('instantPrice.bestPrice')
                                    : t('instantPrice.comfortOption');
                                return (
                                  <button
                                    key={vehicle.id}
                                    type="button"
                                    onClick={() => setSelectedVehicleId(vehicle.id)}
                                    className={`instant-price-quote__car ${
                                      active ? 'instant-price-quote__car--active' : ''
                                    }`}
                                  >
                                    <span className="instant-price-quote__car-badge">{badge}</span>
                                    <span className="instant-price-quote__car-name">
                                      {shortVehicleName(vehicle, lang)}
                                    </span>
                                    <span className="instant-price-quote__car-price" dir="ltr">
                                      {vehicle.hidePrice
                                        ? t('booking.contactForPrice')
                                        : formatPriceDisplay(vehicle, t('booking.sar'))}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="instant-price-quote__actions">
                              <button
                                type="button"
                                onClick={handleWhatsAppOrder}
                                className="instant-price-quote__btn instant-price-quote__btn--whatsapp"
                              >
                                <MessageCircle className="w-4 h-4" />
                                {t('instantPrice.bookWhatsApp')}
                              </button>
                              <button
                                type="button"
                                onClick={handleContinueBooking}
                                className="instant-price-quote__btn instant-price-quote__btn--booking"
                              >
                                {t('instantPrice.continueBooking')}
                                <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
                              </button>
                            </div>

                            <p className="instant-price-quote__note">
                              {t('instantPrice.priceDisclaimer')}
                            </p>
                          </>
                        )}
                      </div>
                    )}
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
