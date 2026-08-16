import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  ChevronDown,
  Search,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Landmark,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CITIES,
  TIME_SLOTS,
  CONTACT,
  GALLERY_IMAGES,
  GALLERY_FULL_IMAGES,
  getCarDisplayName,
  BOOKING_PASSENGER_OPTIONS,
  BOOKING_CAR_TYPES,
  DEFAULT_BOOKING_PASSENGERS,
  DEFAULT_BOOKING_CAR_TYPE,
} from '../../data/staticData';
import { DEFAULT_RELIGIOUS_TOURS } from '../../data/religiousTours';
import { resolveHourlyRouteId, getHourlyDurationsForCity } from '../../utils/bookingHelpers';
import { filterVehiclesByCarType } from '../../utils/fleetHelpers';
import { useSiteContent } from '../../context/SiteContentContext';
import { useToast } from '../../context/ToastContext';

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

function pick(cms, key, lang) {
  const en = cms?.[`${key}En`] ?? '';
  const ar = cms?.[`${key}Ar`] ?? '';
  return lang === 'ar' ? ar || en : en || ar;
}

const today = () => new Date().toISOString().split('T')[0];

const TOUR_CITIES = CITIES.filter((c) => ['1', '2', '3', '5'].includes(c.id));

const labelClass =
  'block text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase text-brand/55 mb-1.5';

/** Three Ziyarat landmarks — Haram/Nabawi interiors + Mount Uhud */
const VISUALS = [
  {
    id: 'makkah',
    src: GALLERY_IMAGES.makkah,
    full: GALLERY_FULL_IMAGES.makkah,
    labelEn: 'Inside al-Haram',
    labelAr: 'داخل الحرم',
  },
  {
    id: 'madinah',
    src: GALLERY_IMAGES.madinah,
    full: GALLERY_FULL_IMAGES.madinah,
    labelEn: 'Inside an-Nabawi',
    labelAr: 'داخل النبوي',
  },
  {
    id: 'uhud',
    src: GALLERY_IMAGES.uhud,
    full: GALLERY_FULL_IMAGES.uhud,
    labelEn: 'Mount Uhud',
    labelAr: 'جبل أحد',
  },
];

/** Custom select that always opens downward (native select cannot force direction). */
function DownSelect({
  value,
  onChange,
  options,
  icon: Icon,
  iconSide = 'end',
  required,
  'aria-label': ariaLabel,
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

  return (
    <div className={`rt-select ${open ? 'rt-select--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`rt-select__trigger ${iconSide === 'start' ? 'rt-select__trigger--icon-start' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rt-select__value">{selected?.label ?? ''}</span>
        {Icon ? (
          <Icon className={`rt-select__icon rt-select__icon--${iconSide}`} aria-hidden />
        ) : (
          <ChevronDown className={`rt-select__icon rt-select__icon--${iconSide}`} aria-hidden />
        )}
      </button>

      {open && (
        <ul id={listId} role="listbox" className="rt-select__menu" tabIndex={-1}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={String(opt.value)} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`rt-select__option ${active ? 'rt-select__option--active' : ''}`}
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

export default function ReligiousToursSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { religiousTours: cmsRaw, sections, carCatalog, fleetRoutes, fleet } = useSiteContent();
  const cms = cmsRaw || DEFAULT_RELIGIOUS_TOURS;
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const [from, setFrom] = useState('1');
  const [hours, setHours] = useState('4');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('09:00');
  const [passengers, setPassengers] = useState(DEFAULT_BOOKING_PASSENGERS);
  const [carType, setCarType] = useState(DEFAULT_BOOKING_CAR_TYPE);
  const [searching, setSearching] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteVehicles, setQuoteVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const lightboxOpen = lightboxIndex !== null;
  const activeVisual = lightboxOpen ? VISUALS[lightboxIndex] : null;

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i === null ? i : (i + VISUALS.length - 1) % VISUALS.length));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i === null ? i : (i + 1) % VISUALS.length));
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen]);

  const copy = useMemo(
    () => ({
      formTitle: pick(cms, 'formTitle', lang),
      formSubtitle: pick(cms, 'formSubtitle', lang),
      eyebrow: pick(cms, 'eyebrow', lang),
      heading: pick(cms, 'heading', lang),
      body: pick(cms, 'body', lang),
      cta: pick(cms, 'ctaLabel', lang),
      locationLabel: pick(cms, 'locationLabel', lang),
      hoursLabel: pick(cms, 'hoursLabel', lang),
      dateLabel: pick(cms, 'dateLabel', lang),
      timeLabel: pick(cms, 'timeLabel', lang),
      passengersLabel: pick(cms, 'passengersLabel', lang),
      carLabel: pick(cms, 'carLabel', lang),
      carOption: pick(cms, 'carOption', lang),
      whatsappUrl: cms.whatsappUrl || CONTACT.whatsapp,
    }),
    [cms, lang],
  );

  const cityOptions = useMemo(
    () => TOUR_CITIES.map((c) => ({ value: c.id, label: c[lang] || c.ar })),
    [lang],
  );

  const hourOptions = useMemo(
    () =>
      getHourlyDurationsForCity(from, fleetRoutes).map((h) => ({
        value: String(h),
        label: `${h} ${h === 1 ? t('booking.hour') : t('booking.hours_plural')}`,
      })),
    [from, fleetRoutes, t],
  );

  const timeOptions = useMemo(
    () => TIME_SLOTS.map((slot) => ({ value: slot, label: slot })),
    [],
  );

  const passengerOptions = useMemo(
    () => BOOKING_PASSENGER_OPTIONS.map((n) => ({ value: n, label: String(n) })),
    [],
  );

  const carTypes = useMemo(() => {
    const live = (carCatalog || [])
      .filter((c) => c?.active !== false && c?.id)
      .map((c) => String(c.id));
    if (!live.length) return BOOKING_CAR_TYPES;
    const ordered = BOOKING_CAR_TYPES.filter((id) => live.includes(id));
    const extras = live.filter((id) => !BOOKING_CAR_TYPES.includes(id));
    return ordered.length ? [...ordered, ...extras] : BOOKING_CAR_TYPES;
  }, [carCatalog]);

  const carOptions = useMemo(
    () => [
      { value: '', label: copy.carOption },
      ...carTypes.map((key) => ({
        value: key,
        label: getCarDisplayName(key, lang),
      })),
    ],
    [copy.carOption, lang, carTypes, carCatalog],
  );

  useEffect(() => {
    if (hourOptions.length && !hourOptions.some((o) => o.value === String(hours))) {
      setHours(hourOptions[0].value);
    }
  }, [hourOptions, hours]);

  useEffect(() => {
    if (carType && carTypes.length && !carTypes.includes(carType)) {
      setCarType(carTypes[0] || DEFAULT_BOOKING_CAR_TYPE);
    }
  }, [carTypes, carType]);

  const selectedVehicle =
    quoteVehicles.find((v) => v.id === selectedVehicleId) || quoteVehicles[0] || null;

  const cityName = (id) => {
    const c = CITIES.find((x) => x.id === id);
    return c ? c[lang] || c.ar : id;
  };

  const routeDisplay = useMemo(() => cityName(from), [from, lang]);

  const clearQuote = () => {
    setQuoteReady(false);
    setQuoteVehicles([]);
    setSelectedVehicleId('');
  };

  useEffect(() => {
    clearQuote();
  }, [from, hours, date, time, passengers, carType]);

  const buildParams = (vehicleId) => {
    const routeId = resolveHourlyRouteId(from, 'internal', Number(hours));
    const params = new URLSearchParams({
      trip_type: 'hourly',
      from,
      to: '',
      route: routeId,
      date,
      time,
      passengers: String(passengers),
      cars: '1',
      hours: String(hours),
      hourly_dest: 'internal',
    });
    if (carType) params.set('car_type', carType);
    if (vehicleId) params.set('vehicle_key', vehicleId);
    return params;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searching) return;
    if (!from) {
      toast.warning(t('instantPrice.needFrom'));
      return;
    }

    setSearching(true);
    toast.success(t('instantPrice.searchingPrices'), 1800);
    window.setTimeout(() => {
      const routeId = resolveHourlyRouteId(from, 'internal', Number(hours));
      const all = fleet?.getVehiclesForRoute?.(routeId) || [];
      const vehicles = filterVehiclesByCarType(all, carType);
      setQuoteVehicles(vehicles);
      setSelectedVehicleId(vehicles[0]?.id || '');
      setQuoteReady(true);
      setSearching(false);
    }, 450);
  };

  const handleContinueBooking = () => {
    navigate(`/booking/search?${buildParams(selectedVehicle?.id || '').toString()}`);
  };

  const handleWhatsAppOrder = () => {
    const priceText = selectedVehicle
      ? formatPriceDisplay(selectedVehicle, t('booking.sar')) || t('booking.contactForPrice')
      : '—';
    const car = selectedVehicle ? shortVehicleName(selectedVehicle, lang) : '—';
    const msg =
      lang === 'ar'
        ? `السلام عليكم، أرغب بحجز جولة مواقع دينية:\n${routeDisplay}\nالتاريخ: ${date} ${time}\nالمدة: ${hours} ساعات\nالركاب: ${passengers}\nالسيارة: ${car}\nالسعر التقريبي: ${priceText}`
        : `Hello, I would like to book a religious sites tour:\n${routeDisplay}\nDate: ${date} ${time}\nDuration: ${hours} hours\nPassengers: ${passengers}\nCar: ${car}\nApprox. price: ${priceText}`;
    const url = `${copy.whatsappUrl}${copy.whatsappUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="religious-tours" className="religious-tours-section relative overflow-x-clip">
      <div className="section-container relative z-10 py-10 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-stretch">
          <div className="lg:col-span-5 xl:col-span-5 order-1">
            <div className="rt-card h-full">
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-brand-dark" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold text-brand tracking-tight leading-tight">
                    {copy.formTitle}
                  </h2>
                  <p className="mt-1 text-sm text-brand/60 leading-snug">
                    {copy.formSubtitle}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{copy.locationLabel}</label>
                    <DownSelect
                      value={from}
                      onChange={setFrom}
                      options={cityOptions}
                      icon={MapPin}
                      iconSide="end"
                      required
                      aria-label={copy.locationLabel}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.hoursLabel}</label>
                    <DownSelect
                      value={hours}
                      onChange={setHours}
                      options={hourOptions}
                      iconSide="end"
                      aria-label={copy.hoursLabel}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{copy.dateLabel}</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={date}
                        min={today()}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="rt-field w-full rounded-xl py-2.5 sm:py-3 ps-3 pe-9 text-sm sm:text-[0.9375rem] text-brand font-semibold touch-target"
                      />
                      <Calendar className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{copy.timeLabel}</label>
                    <DownSelect
                      value={time}
                      onChange={setTime}
                      options={timeOptions}
                      iconSide="start"
                      aria-label={copy.timeLabel}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{copy.passengersLabel}</label>
                    <DownSelect
                      value={passengers}
                      onChange={(v) => setPassengers(Number(v))}
                      options={passengerOptions}
                      iconSide="start"
                      aria-label={copy.passengersLabel}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{copy.carLabel}</label>
                    <DownSelect
                      value={carType}
                      onChange={setCarType}
                      options={carOptions}
                      iconSide="start"
                      aria-label={copy.carLabel}
                    />
                  </div>
                </div>

                <button type="submit" disabled={searching} className="rt-cta group">
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
                  )}
                  <span>{searching ? t('instantPrice.searching') : copy.cta}</span>
                </button>

                {quoteReady && (
                  <div className="rt-quote" role="region" aria-live="polite">
                    {quoteVehicles.length === 0 ? (
                      <p className="text-sm text-brand/65 text-center py-2 mb-2">
                        {t('instantPrice.noVehicles')}
                      </p>
                    ) : (
                      <>
                        <div className="rt-quote__estimate">
                          <p className="rt-quote__label">{t('instantPrice.estimatedPrice')}</p>
                          <p className="rt-quote__amount" dir="ltr">
                            {selectedVehicle?.hidePrice
                              ? t('booking.contactForPrice')
                              : formatPriceDisplay(selectedVehicle, t('booking.sar'))}
                          </p>
                          <p className="rt-quote__meta">
                            {routeDisplay}
                            {selectedVehicle ? ` • ${shortVehicleName(selectedVehicle, lang)}` : ''}
                            {` • ${date} ${time}`}
                            {` • ${passengers} ${t('fleet.passengers')}`}
                          </p>
                        </div>

                        <div className="rt-quote__cars">
                          {quoteVehicles.map((vehicle, index) => {
                            const active = vehicle.id === selectedVehicle?.id;
                            const badge =
                              index === 0 ? t('instantPrice.bestPrice') : t('instantPrice.comfortOption');
                            return (
                              <button
                                key={vehicle.id}
                                type="button"
                                onClick={() => setSelectedVehicleId(vehicle.id)}
                                className={`rt-quote__car ${active ? 'rt-quote__car--active' : ''}`}
                              >
                                <span className="rt-quote__car-badge">{badge}</span>
                                <span className="rt-quote__car-name">
                                  {shortVehicleName(vehicle, lang)}
                                </span>
                                <span className="rt-quote__car-price" dir="ltr">
                                  {vehicle.hidePrice
                                    ? t('booking.contactForPrice')
                                    : formatPriceDisplay(vehicle, t('booking.sar'))}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <div className="rt-quote__actions">
                      <button
                        type="button"
                        onClick={handleWhatsAppOrder}
                        className="rt-quote__btn rt-quote__btn--whatsapp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('instantPrice.bookWhatsApp')}
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueBooking}
                        className="rt-quote__btn rt-quote__btn--booking"
                      >
                        {t('instantPrice.continueBooking')}
                        <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
                      </button>
                    </div>
                    <p className="rt-quote__note">{t('religiousTours.priceNote')}</p>
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-7 order-2 flex flex-col gap-4 sm:gap-5">
            <div className="rt-copy">
              <p className="rt-copy__eyebrow">
                <Sparkles className="w-4 h-4 text-gold" />
                {copy.eyebrow}
              </p>
              <h2 className="rt-copy__heading">{copy.heading}</h2>
              <p className="rt-copy__body">{copy.body}</p>
              <ul className="rt-copy__list">
                {[
                  t('religiousTours.benefit1'),
                  t('religiousTours.benefit2'),
                  t('religiousTours.benefit3'),
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rt-visuals">
              {VISUALS.map((item, index) => {
                const title = lang === 'ar' ? item.labelAr : item.labelEn;
                return (
                  <figure key={item.id} className="rt-visuals__item">
                    <button
                      type="button"
                      className="rt-visuals__open"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={title}
                    >
                      <img
                        src={item.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={880}
                        height={660}
                        className="rt-visuals__img"
                      />
                      <span className="rt-visuals__frost" aria-hidden />
                      <span className="rt-visuals__caption">{title}</span>
                    </button>
                  </figure>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {activeVisual && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ar' ? activeVisual.labelAr : activeVisual.labelEn}
        >
          <button
            type="button"
            className="gallery-lightbox__backdrop"
            onClick={() => setLightboxIndex(null)}
            aria-label={t('common.close')}
          />
          <div className="gallery-lightbox__panel">
            <button
              type="button"
              className="gallery-lightbox__close"
              onClick={() => setLightboxIndex(null)}
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="gallery-lightbox__nav gallery-lightbox__nav--prev"
              onClick={() =>
                setLightboxIndex((i) => (i === null ? 0 : (i + VISUALS.length - 1) % VISUALS.length))
              }
              aria-label={t('gallery.prev')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="gallery-lightbox__nav gallery-lightbox__nav--next"
              onClick={() => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % VISUALS.length))}
              aria-label={t('gallery.next')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="gallery-lightbox__media">
              <img
                src={activeVisual.full || activeVisual.src}
                alt={lang === 'ar' ? activeVisual.labelAr : activeVisual.labelEn}
                className="gallery-lightbox__asset"
                decoding="async"
              />
            </div>
            <div className="gallery-lightbox__caption">
              <h3>{lang === 'ar' ? activeVisual.labelAr : activeVisual.labelEn}</h3>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
