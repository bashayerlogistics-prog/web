import { useEffect, useState, useMemo, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  ArrowLeftRight,
  ChevronDown,
  Calendar,
  CalendarClock,
  Tag,
  Send,
  User,
  Phone,
  Mail,
  Info,
  Clock,
} from 'lucide-react';
import {
  CITIES,
  ONE_WAY_CITIES,
  TIME_SLOTS,
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
  getCarDisplayName,
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
import { useToast } from '../../context/ToastContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { usePublicTripTypes } from '../../hooks/usePublicTripTypes';
import { consumePendingTripType } from '../../data/bookingTripTypes';
import BookingTripDetails from './BookingTripDetails';

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const HOURLY_CITIES = HOURLY_BASE_CITIES.map((c) => ({ id: c.id, ar: c.ar, en: c.en }));
const PASSENGER_OPTIONS = BOOKING_PASSENGER_OPTIONS;

const fieldClass =
  'booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-10 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold touch-target';

export default function BookingForm({ overlapHero = true }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { carCatalog, fleetRoutes } = useSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { tripTypes: TRIP_TYPES, tripType, setTripType, formFields } = usePublicTripTypes('booking', lang);

  const fieldLabel = (key, fallbackKey) =>
    formFields?.[key]?.label || t(fallbackKey);

  useEffect(() => {
    const pending = consumePendingTripType();
    if (pending && TRIP_TYPES.some((opt) => opt.value === pending)) {
      setTripType(pending);
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [TRIP_TYPES, setTripType]);

  const [from, setFrom] = useState(DEFAULT_BOOKING_FROM);
  const [to, setTo] = useState(DEFAULT_BOOKING_TO);
  const [rtRoute, setRtRoute] = useState(DEFAULT_ROUND_TRIP_ROUTE);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('14:00');
  const [returnDate, setReturnDate] = useState(tomorrow());
  const [returnTime, setReturnTime] = useState('17:00');
  const [hours, setHours] = useState('4');
  const [hourlyDest, setHourlyDest] = useState('internal');
  const [passengers, setPassengers] = useState(DEFAULT_BOOKING_PASSENGERS);
  const [carType, setCarType] = useState(DEFAULT_BOOKING_CAR_TYPE);
  const [submitting, setSubmitting] = useState(false);

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

  const swapLocations = () => {
    if (tripType !== 'between_cities') return;
    setFrom(to);
    setTo(from);
  };

  const rtPickupOptions = useMemo(() => getRoundTripPickupOptions(lang), [lang]);
  const rtDropoffOptions = useMemo(() => getRoundTripDropoffOptions(lang), [lang]);

  const setRoundTripRoute = (routeId) => {
    setRtRoute(routeId);
  };

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (tripType === 'custom_price') return;

    if (tripType === 'round_trip' || tripType === 'one_way') {
      if (!rtRoute) return;
      const station = getRoundTripStation(rtRoute);
      const params = new URLSearchParams({
        trip_type: tripType,
        from: station?.cityFrom || '',
        to: station?.cityTo || '',
        route: rtRoute,
        date,
        time,
        passengers: String(passengers),
        cars: '1',
        car_type: carType,
      });
      if (tripType === 'round_trip') {
        params.set('return_date', returnDate);
        params.set('return_time', returnTime);
      }
      navigate(`/booking/search?${params.toString()}`);
      return;
    }

    if (!from) return;
    if (tripType !== 'hourly' && !to) return;

    const routeId = tripType === 'hourly'
      ? resolveHourlyRouteId(from, hourlyDest, Number(hours))
      : resolveRouteId(from, to || from);
    const params = new URLSearchParams({
      trip_type: tripType,
      from,
      to: tripType === 'hourly' ? '' : to,
      route: routeId,
      date,
      time,
      passengers: String(passengers),
      cars: '1',
      car_type: carType,
    });

    if (tripType === 'hourly') {
      params.set('hours', hours);
      params.set('hourly_dest', hourlyDest);
    }

    navigate(`/booking/search?${params.toString()}`);
  };

  const handlePriceRequest = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !suggestedPrice) {
      toast.error(t('booking.customNote'));
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
      toast.success(t('booking.requestSent'));
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

  const isCustom = tripType === 'custom_price';
  const isRound = tripType === 'round_trip';
  const isHourly = tripType === 'hourly';
  const isOneWay = tripType === 'one_way';
  const isBetweenCities = tripType === 'between_cities';
  const cityOptions = isHourly ? HOURLY_CITIES : isBetweenCities ? ONE_WAY_CITIES : CITIES;

  const betweenCitiesToOptions = useMemo(() => {
    if (!isBetweenCities || !from) return cityOptions;
    const valid = new Set(getBetweenCitiesDestinations(from));
    return cityOptions.filter((c) => valid.has(c.id));
  }, [isBetweenCities, from, cityOptions]);

  useEffect(() => {
    if (!isBetweenCities || !from) return;
    const valid = getBetweenCitiesDestinations(from);
    if (valid.length && !valid.includes(String(to))) {
      setTo(valid[0]);
    }
  }, [isBetweenCities, from, to]);

  useEffect(() => {
    if (!isHourly) return;
    if (!HOURLY_CITIES.some((c) => c.id === from)) {
      setFrom(HOURLY_CITIES[0]?.id || DEFAULT_BOOKING_FROM);
    }
  }, [isHourly, from]);

  const showField = (key) => formFields?.[key]?.show !== false;

  const cityName = (id) => {
    const list = [...CITIES, ...ONE_WAY_CITIES, ...HOURLY_CITIES];
    const city = list.find((c) => c.id === id);
    return city ? (city[lang] || city.ar || city.en) : '';
  };

  const tripDetailRows = useMemo(() => {
    if (isCustom) return [];
    const stationLabel = (isRound || isOneWay)
      ? (getRoundTripPickupOptions(lang).find((s) => s.id === rtRoute)?.label || '')
      : '';
    const locationLabel = hourlyDestOptions.find((d) => d.key === hourlyDest)?.label || '';

    const fromValue = isRound || isOneWay
      ? stationLabel
      : cityName(from);
    const toValue = isRound
      ? (getRoundTripDropoffOptions(lang).find((s) => s.id === rtRoute)?.label || stationLabel)
      : isOneWay
        ? ''
        : isHourly
          ? ''
          : cityName(to);

    return [
      {
        key: 'from',
        show: showField('from') && !isHourly,
        label: fieldLabel('from', 'booking.from'),
        value: fromValue,
      },
      {
        key: 'to',
        show: showField('to') && !isHourly && !isOneWay,
        label: fieldLabel('to', 'booking.to'),
        value: toValue,
      },
      {
        key: 'location',
        show: showField('location') && isHourly,
        label: fieldLabel('location', 'booking.destination'),
        value: `${cityName(from)}${locationLabel ? ` — ${locationLabel}` : ''}`,
      },
      {
        key: 'pickupTime',
        show: showField('pickupTime'),
        label: fieldLabel('pickupTime', 'booking.pickupTime'),
        value: date && time ? `${date}  ${time}` : '',
        ltr: true,
      },
      {
        key: 'hours',
        show: showField('hours') && isHourly,
        label: fieldLabel('hours', 'booking.hours'),
        value: hours
          ? `${hours} ${Number(hours) === 1 ? t('booking.hour') : t('booking.hours_plural')}`
          : '',
      },
      {
        key: 'passengers',
        show: showField('passengers'),
        label: fieldLabel('passengers', 'booking.passengers'),
        value: passengers ? String(passengers) : '',
      },
      {
        key: 'car',
        show: showField('car'),
        label: fieldLabel('car', 'booking.cars'),
        value: carType ? getCarDisplayName(carType, lang) : '',
      },
    ];
  }, [
    isCustom, isRound, isOneWay, isHourly, from, to, rtRoute, date, time, hours,
    passengers, carType, hourlyDest, hourlyDestOptions, formFields, lang, t,
  ]);

  return (
    <section
      id="pricing-calculator"
      className={`section-container relative z-30 ${
        overlapHero ? 'booking-form-section--overlap' : 'booking-form-section--spaced'
      }`}
      data-aos="fade-up"
      data-aos-delay="100"
    >
      <div id="booking-form" className="booking-form-card">
        <div className="booking-form-card__inner">
          <div className="flex items-center gap-3 px-3.5 sm:px-4 md:px-5 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3 border-b border-gray-100">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-md shadow-gold/30 shrink-0">
              <CalendarClock className="w-5 h-5 text-brand-dark" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-brand tracking-tight leading-tight">
                {t('booking.calculatorTitle')}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500 leading-snug line-clamp-2">
                {t('booking.badge')}
              </p>
            </div>
          </div>

          <div
            className="booking-form-card__header booking-trip-types flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 bg-gray-50 border-b border-gray-200"
            role="radiogroup"
            aria-label={t('booking.badge')}
          >
            {TRIP_TYPES.map((opt) => {
              const checked = tripType === opt.value;
              const isGold = opt.gold || opt.value === 'custom_price';
              const TripIcon = opt.Icon;
              return (
                <label
                  key={opt.id || opt.value}
                  className={`flex items-center gap-2 md:gap-2.5 cursor-pointer group py-1.5 px-2 rounded-lg transition-colors ${
                    isGold ? 'hover:bg-gold/10' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="trip_type"
                    value={opt.value}
                    checked={checked}
                    onChange={() => startTransition(() => setTripType(opt.value))}
                    className="sr-only peer"
                  />
                  <span
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      checked
                        ? isGold
                          ? 'border-gold bg-gold'
                          : 'border-brand bg-brand'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full transition-opacity ${
                        checked ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </span>
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors flex items-center gap-1.5 ${
                      checked
                        ? isGold
                          ? 'text-gold'
                          : 'text-brand'
                        : 'text-gray-600 group-hover:text-brand'
                    }`}
                  >
                    {TripIcon && <TripIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>

          <form
            onSubmit={isCustom ? handlePriceRequest : handleSearch}
            className="p-3.5 sm:p-4 md:p-5"
          >
            {!isCustom && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-3.5 mb-3 sm:mb-4">
                  {isRound ? (
                    <>
                      <div className="sm:col-span-2 lg:col-span-5 relative">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                          {t('booking.pickupArrival')}
                        </label>
                        <div className="relative">
                          <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                          <select
                            value={rtRoute}
                            onChange={(e) => setRoundTripRoute(e.target.value)}
                            required
                            className={fieldClass}
                          >
                            {rtPickupOptions.map((s) => (
                              <option key={`pickup-${s.id}`} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1 flex items-center lg:items-end justify-center lg:pb-2 -my-1 lg:my-0">
                        <span
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-gold/15 text-gold rounded-full flex items-center justify-center"
                          aria-hidden
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </span>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-5 relative">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                          {t('booking.dropoffDeparture')}
                        </label>
                        <div className="relative">
                          <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                          <select
                            value={rtRoute}
                            onChange={(e) => setRoundTripRoute(e.target.value)}
                            required
                            className={fieldClass}
                          >
                            {rtDropoffOptions.map((s) => (
                              <option key={`dropoff-${s.id}`} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </>
                  ) : isOneWay ? (
                    <div className="sm:col-span-2 lg:col-span-12 relative">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {t('booking.pickupArrival')}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                        <select
                          value={rtRoute}
                          onChange={(e) => setRoundTripRoute(e.target.value)}
                          required
                          className={fieldClass}
                        >
                          {rtPickupOptions.map((s) => (
                            <option key={`one-way-pickup-${s.id}`} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {showField('from') && (
                        <div className="sm:col-span-2 lg:col-span-3 relative">
                          <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                            {fieldLabel('from', 'booking.from')}
                          </label>
                          <div className="relative">
                            <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                            <select
                              value={from}
                              onChange={(e) => setFrom(e.target.value)}
                              required
                              className={fieldClass}
                            >
                              <option value="">{fieldLabel('from', 'booking.from')}</option>
                              {cityOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c[lang] || c.ar}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {!isHourly && showField('to') && (
                        <>
                          {showField('from') && (
                            <div className="sm:col-span-2 lg:col-span-1 flex items-center lg:items-end justify-center lg:pb-2 -my-1 lg:my-0">
                              <button
                                type="button"
                                onClick={swapLocations}
                                className="w-9 h-9 sm:w-10 sm:h-10 bg-gold/15 hover:bg-gold/25 text-gold rounded-full flex items-center justify-center transition-all hover:rotate-180 duration-300"
                                aria-label="Swap"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          <div className="sm:col-span-2 lg:col-span-3 relative">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                              {fieldLabel('to', 'booking.to')}
                            </label>
                            <div className="relative">
                              <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                              <select
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                required
                                className={fieldClass}
                              >
                                <option value="">{fieldLabel('to', 'booking.to')}</option>
                                {(isBetweenCities ? betweenCitiesToOptions : cityOptions).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c[lang] || c.ar}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {showField('pickupTime') && (
                    <div className={`sm:col-span-2 ${isRound || isOneWay ? 'lg:col-span-12' : isHourly ? 'lg:col-span-8' : 'lg:col-span-5'}`}>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {fieldLabel('pickupTime', 'booking.pickupTime')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={date}
                            min={today()}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="booking-form-input booking-form-date w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-semibold"
                          />
                          <Calendar className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold pointer-events-none z-[1]" />
                        </div>
                        <div className="relative">
                          <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold"
                          >
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="booking-form-row grid grid-cols-2 lg:grid-cols-12 gap-3">
                  {showField('passengers') && (
                    <div className="booking-form-field lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {fieldLabel('passengers', 'booking.passengers')}
                      </label>
                      <div className="relative">
                        <select
                          value={passengers}
                          onChange={(e) => setPassengers(Number(e.target.value))}
                          className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold touch-target"
                        >
                          {PASSENGER_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {showField('car') && (
                    <div className={`booking-form-field ${isHourly ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {fieldLabel('car', 'booking.cars')}
                      </label>
                      <div className="relative">
                        <select
                          value={carType}
                          onChange={(e) => setCarType(e.target.value)}
                          className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold touch-target"
                        >
                          {carTypes.map((key) => (
                            <option key={`${key}-${carCatalog?.find((c) => c.id === key)?.updatedAt || carCatalog?.find((c) => c.id === key)?.nameEn || ''}`} value={key}>
                              {getCarDisplayName(key, lang)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {isRound && (
                    <div className="booking-form-field col-span-2 lg:col-span-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {t('booking.returnTime')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={returnDate}
                            min={date || today()}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="booking-form-input booking-form-date w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-2 pe-8 sm:ps-3 sm:pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-semibold"
                          />
                          <Calendar className="absolute end-2 md:end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold pointer-events-none z-[1]" />
                        </div>
                        <div className="relative">
                          <select
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-2 sm:ps-3 pe-8 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold"
                          >
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {isHourly && showField('hours') && (
                    <div className="booking-form-field lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {fieldLabel('hours', 'booking.hours')}
                      </label>
                      <div className="relative">
                        <select
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold"
                        >
                          {hourOptions.map((h) => (
                            <option key={h} value={h}>
                              {h} {h === 1 ? t('booking.hour') : t('booking.hours_plural')}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {isHourly && showField('location') && (
                    <div className="booking-form-field col-span-2 lg:col-span-4">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                        {fieldLabel('location', 'booking.destination')}
                      </label>
                      <div className="relative">
                        <select
                          value={hourlyDest}
                          onChange={(e) => setHourlyDest(e.target.value)}
                          disabled={!from || !hourlyDestOptions.length}
                          title={hourlyDestOptions.find((d) => d.key === hourlyDest)?.label || ''}
                          className="booking-form-input booking-form-select w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all appearance-none font-semibold disabled:opacity-50"
                        >
                          {hourlyDestOptions.map((d) => (
                            <option key={d.key} value={d.key}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {!isRound && !isOneWay && !isHourly && <div className="hidden lg:block lg:col-span-3" aria-hidden />}

                  <div className={`booking-form-actions booking-form-actions--inline hidden lg:block ${isHourly ? 'lg:col-span-2' : 'lg:col-span-4'}`}>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5 opacity-0 select-none pointer-events-none">
                      {t('booking.search')}
                    </label>
                    <button
                      type="submit"
                      className="booking-form-card__submit w-full text-sm sm:text-base font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl flex items-center justify-center gap-2 touch-target"
                    >
                      <Search className="w-4 h-4" />
                      <span>{t('booking.search')}</span>
                    </button>
                  </div>
                </div>

                <div className="booking-form-actions lg:hidden">
                  <button
                    type="submit"
                    className="booking-form-card__submit w-full text-sm sm:text-base font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl flex items-center justify-center gap-2 touch-target"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('booking.search')}</span>
                  </button>
                </div>

                <BookingTripDetails rows={tripDetailRows} className="mt-3 sm:mt-4" />
              </>
            )}

            {isCustom && (
              <div className="border-t-0 pt-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-gold to-gold-dark rounded-full flex items-center justify-center shadow-lg">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-brand">
                      {t('booking.customTitle')}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500">
                      {t('booking.customSubtitle')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                      <User className="w-3.5 h-3.5 text-gold inline me-1" />
                      {t('booking.fullName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="booking-form-input w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 px-3 text-sm sm:text-[0.9375rem] text-brand focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-gold inline me-1" />
                      {t('booking.phone')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="booking-form-input w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 px-3 text-sm sm:text-[0.9375rem] text-brand focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-start"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-gold inline me-1" />
                      {t('booking.email')}
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="booking-form-input w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 px-3 text-sm sm:text-[0.9375rem] text-brand focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-start"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                      <Tag className="w-3.5 h-3.5 text-gold inline me-1" />
                      {t('booking.suggestedPrice')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={suggestedPrice}
                        onChange={(e) => setSuggestedPrice(e.target.value)}
                        required
                        className="booking-form-input w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 ps-3 pe-12 text-sm sm:text-[0.9375rem] text-brand focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        {t('booking.sar')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 md:mt-4">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-1.5">
                    {t('booking.tripDetails')}
                  </label>
                  <textarea
                    rows={3}
                    value={tripDetails}
                    onChange={(e) => setTripDetails(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 sm:py-3 px-3 text-sm sm:text-[0.9375rem] text-brand focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                  />
                </div>

                <div className="mt-3 flex items-start gap-2 p-3 bg-gold/10 rounded-lg border border-gold/30">
                  <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                  <p className="text-xs md:text-sm text-brand/80">{t('booking.customNote')}</p>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="booking-form-card__submit w-full md:w-auto md:min-w-[200px] text-sm sm:text-base font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? '...' : t('booking.sendRequest')}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
