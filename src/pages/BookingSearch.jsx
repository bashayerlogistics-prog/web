import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, MapPin, Calendar, Clock, Users, ArrowLeft, MessageCircle } from 'lucide-react';
import { CITIES, CONTACT, getCarDisplayName } from '../data/staticData';
import { resolveRoundTripRouteId, resolveHourlyRouteId } from '../utils/bookingHelpers';
import { filterVehiclesByCarType } from '../utils/fleetHelpers';
import { useSiteContent } from '../context/SiteContentContext';
import VehicleImage from '../components/ui/VehicleImage';

export default function BookingSearch() {
  const { t, i18n } = useTranslation();
  const { fleet } = useSiteContent();
  const [searchParams] = useSearchParams();
  const lang = i18n.language;

  const tripType = searchParams.get('trip_type') || 'one_way';
  const isRoundTrip = tripType === 'round_trip';
  const isHourly = tripType === 'hourly';
  let routeId = searchParams.get('route') || 'ow-2-1';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const hours = searchParams.get('hours') || '4';
  const hourlyDest = searchParams.get('hourly_dest') || 'internal';
  if (isRoundTrip) {
    if (!String(routeId).startsWith('rt-') && from) {
      routeId = resolveRoundTripRouteId(from, to || from);
    }
  }
  if (isHourly && from) {
    routeId = resolveHourlyRouteId(from, hourlyDest, Number(hours));
  }
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const passengers = searchParams.get('passengers') || '1';
  const cars = searchParams.get('cars') || '1';
  const returnDate = searchParams.get('return_date') || '';
  const returnTime = searchParams.get('return_time') || '';
  const vehicleKeyFromUrl = searchParams.get('vehicle_key') || '';
  const carTypeFromUrl = searchParams.get('car_type') || '';

  const vehicles = useMemo(() => {
    let list = fleet.getVehiclesForRoute(routeId);
    if (vehicleKeyFromUrl) {
      const exact = list.filter((v) => v.id === vehicleKeyFromUrl);
      if (exact.length) return exact.slice(0, 1);
    }
    if (carTypeFromUrl) {
      return filterVehiclesByCarType(list, carTypeFromUrl);
    }
    return list.slice(0, 1);
  }, [fleet, routeId, carTypeFromUrl, vehicleKeyFromUrl]);

  const preferredVehicleKey = useMemo(() => {
    if (vehicleKeyFromUrl) return vehicleKeyFromUrl;
    if (!carTypeFromUrl) return '';
    return (
      vehicles.find((v) => String(v.id).startsWith(`${carTypeFromUrl}-`))?.id ||
      vehicles.find((v) => String(v.id).split('-')[0] === carTypeFromUrl)?.id ||
      ''
    );
  }, [vehicleKeyFromUrl, carTypeFromUrl, vehicles]);

  const [selectedVehicleKey, setSelectedVehicleKey] = useState(
    () => preferredVehicleKey || vehicles[0]?.id,
  );

  useEffect(() => {
    if (preferredVehicleKey) {
      setSelectedVehicleKey(preferredVehicleKey);
      return;
    }
    if (vehicles[0]?.id) setSelectedVehicleKey(vehicles[0].id);
  }, [preferredVehicleKey, vehicles]);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleKey) ||
    vehicles.find((v) => v.id === vehicleKeyFromUrl) ||
    vehicles[0];

  const cityName = (id) => {
    const c = CITIES.find((x) => x.id === id);
    return c ? c[lang] : id;
  };

  const routeLabel = useMemo(() => {
    if (isRoundTrip) {
      return fleet.getRouteLabel(routeId, lang);
    }
    if (isHourly && from) {
      return fleet.getRouteLabel(routeId, lang);
    }
    if (from && to) return `${cityName(from)} → ${cityName(to)}`;
    return fleet.getRouteLabel(routeId, lang);
  }, [from, to, routeId, lang, fleet, isHourly, isRoundTrip]);

  const basePrice = selectedVehicle?.price || 190;
  const total = basePrice;

  const vehicleNumericId = vehicles.findIndex((v) => v.id === selectedVehicle?.id) + 1 || 1;

  const checkoutParams = new URLSearchParams({
    trip_type: tripType,
    route: routeId,
    from,
    to,
    date,
    time,
    passengers,
    cars,
    vehicle_id: String(vehicleNumericId),
    vehicle_key: selectedVehicle?.id || '',
    base_price: String(basePrice),
    total: String(total),
  });
  if (tripType === 'round_trip') {
    checkoutParams.set('return_date', returnDate);
    checkoutParams.set('return_time', returnTime);
  }
  if (tripType === 'hourly') {
    checkoutParams.set('hours', hours);
    checkoutParams.set('hourly_dest', hourlyDest);
  }

  const tripTypeLabel = {
    one_way: t('booking.oneWay'),
    round_trip: t('booking.roundTrip'),
    hourly: t('booking.hourly'),
  }[tripType] || tripType;

  const shortName = (vehicle) => {
    const key = vehicle.id.split('-')[0];
    return getCarDisplayName(key, lang) || vehicle.name[lang];
  };

  const whatsappMsg = encodeURIComponent(
    `${routeLabel}\n${shortName(selectedVehicle)}\n${date} ${time}\n${passengers} ${t('fleet.passengers')}\n${basePrice} ${t('booking.sar')}`
  );

  return (
    <div className="min-h-screen bg-[#EDEFF2]/50 pt-24 sm:pt-28 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-brand font-semibold mb-4 sm:mb-6 hover:text-gold transition-colors text-sm">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('common.back')}
        </Link>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand mb-2">{t('booking.searchResults')}</h1>
        <p className="text-gray-500 text-sm mb-6 sm:mb-8">{routeLabel}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Summary sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm lg:sticky lg:top-28">
              <h2 className="text-base sm:text-lg font-black text-brand mb-4">{t('checkout.summary')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Car className="w-4 h-4 text-gold shrink-0" />
                  <span>{tripTypeLabel}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span className="leading-snug">{routeLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gold shrink-0" />
                  <span dir="ltr">{date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gold shrink-0" />
                  <span dir="ltr">{time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gold shrink-0" />
                  <span>{passengers} {t('fleet.passengers')}</span>
                </div>
                {selectedVehicle && (
                  <div className="flex items-center gap-2 text-brand font-semibold pt-1 border-t border-gray-100">
                    <Car className="w-4 h-4 text-gold shrink-0" />
                    <span>{shortName(selectedVehicle)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-sm">
                {!selectedVehicle?.hidePrice ? (
                  <div className="flex justify-between font-black text-lg text-brand">
                    <span>{t('checkout.total')}</span>
                    <span>{total} {t('booking.sar')}</span>
                  </div>
                ) : (
                  <p className="text-brand font-bold text-center py-2">{t('booking.contactForPrice')}</p>
                )}
              </div>

              <Link
                to={`/checkout?${checkoutParams.toString()}`}
                className="mt-5 block w-full text-center bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-brand/20"
              >
                {t('common.next')}
              </Link>

              <a
                href={`${CONTACT.whatsapp}?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-brand font-bold py-3 rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4 fill-brand" />
                {t('fleet.bookWhatsApp')}
              </a>
            </div>
          </div>

          {/* Vehicle grid */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <h2 className="text-base sm:text-lg font-black text-brand mb-4">{t('booking.chooseVehicle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {vehicles.map((vehicle) => {
                const selected = selectedVehicleKey === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicleKey(vehicle.id)}
                    className={`text-start rounded-2xl sm:rounded-3xl overflow-hidden border-2 transition-all bg-white ${
                      selected
                        ? 'border-brand shadow-lg shadow-brand/15 ring-2 ring-brand/10'
                        : 'border-gray-100 hover:border-brand/30 hover:shadow-md'
                    }`}
                  >
                    <div className="relative">
                      <VehicleImage
                        src={vehicle.image}
                        alt={shortName(vehicle)}
                        className="aspect-[4/3] bg-[#EDEFF2]/40"
                      />
                      {selected && (
                        <div className="absolute top-3 end-3 bg-brand text-white text-[10px] font-black px-2.5 py-1 rounded-full z-10">
                          {t('booking.selected')}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-brand text-sm sm:text-base leading-snug line-clamp-2">
                        {shortName(vehicle)}
                      </h3>
                      <p className="text-gray-400 text-[10px] sm:text-xs mt-1 line-clamp-1">
                        {vehicle.passengers} {t('fleet.passengers')} · {vehicle.badge[lang]}
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        {vehicle.hidePrice ? (
                          <span className="text-brand font-bold text-sm">{t('booking.contactForPrice')}</span>
                        ) : (
                          <>
                            <span className="text-brand font-black text-lg">{vehicle.price} {t('booking.sar')}</span>
                            {vehicle.originalPrice && vehicle.originalPrice !== vehicle.price && (
                              <span className="text-gray-400 text-xs line-through">{vehicle.originalPrice} {t('booking.sar')}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
