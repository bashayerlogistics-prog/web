import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Users, Calendar, Clock, Heart, ShoppingCart, MessageCircle, Check,
} from 'lucide-react';
import {
  getVehicleSlug,
  getVehicleTypeFeatures,
  PICKUP_LOCATIONS,
  DESTINATION_LOCATIONS,
  PASSENGER_OPTIONS,
  TIME_SLOTS,
} from '../data/staticData';
import { useSiteContent } from '../context/SiteContentContext';
import { useCart } from '../context/CartContext';
import AddToCartModal from '../components/ui/AddToCartModal';
import { buildWhatsAppUrl, buildVehicleWhatsAppMessage } from '../utils/vehicleHelpers';

const today = () => new Date().toISOString().split('T')[0];

export default function VehicleDetail() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { fleet } = useSiteContent();
  const { addItem } = useCart();

  const data = fleet.findVehicleBySlug(slug);
  const [pickupId, setPickupId] = useState('jeddah-airport');
  const [destinationId, setDestinationId] = useState('makkah');
  const [passengers, setPassengers] = useState('1');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const routePrices = useMemo(() => {
    if (!data) return [];
    return fleet.buildRoutePrices(data.routeId, data.vehicle.price);
  }, [fleet, data]);

  if (!data) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-brand font-bold">{t('vehicle.notFound')}</p>
        <Link to="/#vehicles" className="text-gold font-bold hover:underline">{t('vehicle.backToFleet')}</Link>
      </div>
    );
  }

  const { vehicle, route, routeId, shortName } = data;
  const features = getVehicleTypeFeatures(vehicle.id);
  const displayName = shortName?.[lang] || shortName?.ar || vehicle.name[lang];
  const routeTitle = route.title;

  const pickupLabel = PICKUP_LOCATIONS.find((p) => p.id === pickupId)?.label[lang];
  const destinationLabel = DESTINATION_LOCATIONS.find((d) => d.id === destinationId)?.label[lang];

  const buildCartPayload = () => ({
    vehicleKey: vehicle.id,
    vehicleSlug: getVehicleSlug(vehicle.id, routeId),
    routeId,
    vehicleName: vehicle.name,
    shortName: shortName || { ar: displayName, en: displayName },
    routeTitle,
    price: vehicle.price,
    image: vehicle.image,
    pickupId,
    destinationId,
    pickupLabel,
    destinationLabel,
    passengers,
    date,
    time,
  });

  const handleAddToCart = () => {
    const payload = buildCartPayload();
    addItem(payload);
    setModalItem(payload);
    setShowModal(true);
  };

  const whatsappMessage = buildVehicleWhatsAppMessage({
    lang,
    sarLabel: t('booking.sar'),
    vehicleName: displayName,
    routeTitle: routeTitle[lang],
    price: vehicle.price,
    pickup: pickupLabel,
    destination: destinationLabel,
    passengers,
    date,
    time,
  });

  return (
    <>
      <AddToCartModal open={showModal} item={modalItem} onClose={() => setShowModal(false)} />

      <div className="min-h-screen bg-[#EDEFF2]/50 pt-20 sm:pt-24 pb-12">
        <div className="bg-brand text-white py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-gold text-xs font-bold uppercase tracking-wider mb-1">{t('vehicle.fleetBadge')}</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">{displayName}</h1>
            <p className="text-white/70 text-sm mt-1">{routeTitle[lang]}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Booking form */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm order-2 lg:order-1">
              <h2 className="text-lg sm:text-xl font-black text-brand mb-1">{t('vehicle.bookingTitle')}</h2>
              <p className="text-gray-500 text-xs sm:text-sm mb-5">{t('vehicle.bookingSubtitle')}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                    {t('vehicle.pickupArea')}
                  </label>
                  <select
                    value={pickupId}
                    onChange={(e) => setPickupId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                  >
                    {PICKUP_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.label[lang]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                    {t('vehicle.destination')}
                  </label>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                  >
                    {DESTINATION_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.label[lang]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3.5 h-3.5 text-gold shrink-0" />
                    {t('vehicle.passengersCount')}
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                  >
                    {PASSENGER_OPTIONS.slice(0, 4).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt[lang] || opt.ar}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
                      {t('vehicle.tripDate')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      min={today()}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
                      {t('vehicle.tripTime')}
                    </label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                    >
                      <option value="">{t('vehicle.selectTime')}</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] text-gray-400 font-semibold mb-1">{t('vehicle.routePrice')}</p>
                  <p className="text-2xl sm:text-3xl font-black text-brand">
                    {vehicle.price}
                    <span className="text-sm font-bold ms-1">{t('booking.sar')}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <a
                    href={buildWhatsAppUrl(whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                    {t('fleet.bookWhatsApp')}
                  </a>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full bg-gold hover:bg-gold-dark text-brand font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-gold/20"
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    {t('fleet.addToCart')}
                  </button>
                  <button
                    type="button"
                    className="w-full border-2 border-brand/25 text-brand font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-brand/5 transition-all"
                  >
                    <Heart className="w-4 h-4 shrink-0" />
                    {t('vehicle.addToFavorites')}
                  </button>
                </div>

                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-2xl text-start">
                  <h4 className="font-black text-brand text-sm mb-2">{t('vehicle.guaranteeTitle')}</h4>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {['guarantee1', 'guarantee2', 'guarantee3'].map((key) => (
                      <li key={key} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                        {t(`vehicle.${key}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Vehicle info */}
            <div className="space-y-5 sm:space-y-6 order-1 lg:order-2">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-black text-brand flex items-center gap-2 mb-3">
                  <span className="w-2 h-5 bg-gold rounded-full shrink-0" />
                  {t('vehicle.detailsTitle')}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{vehicle.description[lang]}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Users className="w-5 h-5 text-brand mx-auto mb-1" />
                    <p className="text-xs text-gray-500">{t('vehicle.maxPassengers')}</p>
                    <p className="font-black text-brand text-sm">{vehicle.passengers} {t('fleet.passengers')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <ShoppingCart className="w-5 h-5 text-brand mx-auto mb-1" />
                    <p className="text-xs text-gray-500 line-clamp-2">{features.storage[lang]}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-black text-brand flex items-center gap-2 mb-4">
                  <span className="w-2 h-5 bg-gold rounded-full shrink-0" />
                  {t('vehicle.comfortTitle')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {features.comfort.map((item) => (
                    <div key={item.ar} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-gold shrink-0" />
                      {item[lang]}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-black text-brand flex items-center gap-2 mb-1">
                  <span className="w-2 h-5 bg-gold rounded-full shrink-0" />
                  {t('vehicle.pricesTitle')}
                </h2>
                <p className="text-gray-400 text-xs mb-4">{t('vehicle.pricesNote')}</p>
                <div className="space-y-3">
                  {routePrices.map((rp) => {
                    const rpMsg = buildVehicleWhatsAppMessage({
                      lang,
                      sarLabel: t('booking.sar'),
                      vehicleName: displayName,
                      routeTitle: rp.title[lang],
                      price: rp.price,
                    });
                    return (
                      <div
                        key={rp.routeId}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border border-gray-100 rounded-2xl hover:border-brand/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0 text-start">
                          <span className="text-[9px] font-bold text-gold-dark bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                            {t('routes.availableRoutes')}
                          </span>
                          <p className="font-bold text-brand text-sm mt-1.5 leading-snug">{rp.title[lang]}</p>
                          <p className="text-brand font-black text-base mt-1">
                            {rp.price}
                            <span className="text-xs font-bold ms-1">{t('booking.sar')}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={buildWhatsAppUrl(rpMsg)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl transition-all"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 fill-white" />
                          </a>
                          <Link
                            to={`/vehicles/${getVehicleSlug(vehicle.id, rp.routeId === routeId ? routeId : 'jeddah-makkah')}`}
                            className="text-xs font-bold text-brand hover:text-gold transition-colors px-3 py-2"
                          >
                            {t('fleet.details')}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
