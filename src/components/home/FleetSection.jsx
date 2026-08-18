import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, MessageCircle, Info, Users, Check } from 'lucide-react';
import {
  getVehicleSlug,
  getShortVehicleName,
} from '../../data/staticData';
import { buildHomeFleetSections, HOME_FLEET_PAIRS } from '../../data/adminFleetServices';
import { useSiteContent } from '../../context/SiteContentContext';
import { useCart } from '../../context/CartContext';
import AddToCartModal from '../ui/AddToCartModal';
import VehicleImage from '../ui/VehicleImage';
import { buildWhatsAppUrl, buildVehicleWhatsAppMessage } from '../../utils/vehicleHelpers';

function VehicleCard({ vehicle, routeTitle, routeId, lang, t }) {
  const { addItem } = useCart();
  const [modalItem, setModalItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  const shortName = getShortVehicleName(vehicle.id, lang);
  const slug = getVehicleSlug(vehicle.id, routeId);
  const routeLabel = routeTitle[lang] || routeTitle.ar;

  const discount =
    vehicle.originalPrice && vehicle.price
      ? Math.round((1 - Number(vehicle.price) / Number(vehicle.originalPrice)) * 100)
      : null;

  const whatsappMsg = buildVehicleWhatsAppMessage({
    lang,
    sarLabel: t('booking.sar'),
    vehicleName: shortName,
    routeTitle: routeLabel,
    price: vehicle.price,
  });

  const buildPayload = () => ({
    vehicleKey: vehicle.id,
    vehicleSlug: slug,
    routeId,
    vehicleName: vehicle.name,
    shortName: {
      ar: getShortVehicleName(vehicle.id, 'ar'),
      en: getShortVehicleName(vehicle.id, 'en'),
    },
    routeTitle,
    price: vehicle.price,
    image: vehicle.image,
    passengers: String(vehicle.passengers),
  });

  const handleAddToCart = () => {
    const payload = buildPayload();
    addItem(payload);
    setModalItem(payload);
    setCartAdded(true);
    setShowModal(true);
    window.setTimeout(() => setCartAdded(false), 700);
  };

  return (
    <>
      <AddToCartModal open={showModal} item={modalItem} onClose={() => setShowModal(false)} />
      <article className="premium-card fleet-card gpu-smooth h-full group">
        <div className="fleet-card__ring" aria-hidden="true" />

        <div className="fleet-card__media">
          <VehicleImage
            src={vehicle.image}
            alt={shortName}
            className="fleet-card__image w-full"
            hoverZoom
          />
          <div className="fleet-card__media-gradient" aria-hidden="true" />

          <span className="fleet-card__passengers">
            <Users className="w-2.5 h-2.5 text-gold shrink-0" />
            {vehicle.passengers}
          </span>

          {discount > 0 && (
            <span className="fleet-card__discount">-{discount}%</span>
          )}

          {vehicle.hidePrice ? (
            <div className="fleet-card__price-chip">
              <span className="fleet-card__price-current text-xs">{t('catalog.whatsappInquiry')}</span>
            </div>
          ) : (
            <div className="fleet-card__price-chip">
              <span className="fleet-card__price-current">
                {vehicle.price}
                <span className="fleet-card__price-currency">{t('booking.sar')}</span>
              </span>
            </div>
          )}
        </div>

        <div className="fleet-card__body">
          <span className="fleet-card__category">{vehicle.badge?.[lang] || vehicle.badge?.ar}</span>
          <h4 className="fleet-card__title">{shortName}</h4>
          <p className="fleet-card__route">{routeLabel}</p>

          <div className="fleet-card__footer">
            <div className="fleet-card__actions">
              <Link
                to={`/vehicles/${slug}`}
                preventScrollReset
                className="fleet-card__btn fleet-card__btn--outline"
              >
                <Info className="w-3 h-3 shrink-0" />
                {t('fleet.details')}
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                className={`fleet-card__btn fleet-card__btn--cart ${cartAdded ? 'fleet-card__btn--cart-added' : ''}`}
              >
                <span className="fleet-card__btn-icon">
                  {cartAdded ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                </span>
                {t('fleet.addToCart')}
              </button>
            </div>

            <a
              href={buildWhatsAppUrl(whatsappMsg)}
              target="_blank"
              rel="noreferrer"
              className="fleet-card__whatsapp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
              {t('fleet.bookWhatsApp')}
            </a>
          </div>
        </div>
      </article>
    </>
  );
}

function ServiceFleetGroup({ group, lang, t, cols = 2 }) {
  const title = group.title[lang] || group.title.ar;
  const routeTitle = group.routeTitle;

  // Guard against duplicate car cards (same type / same id)
  const vehicles = useMemo(() => {
    const seen = new Set();
    return (group.vehicles || []).filter((vehicle) => {
      const car = String(vehicle.id || '').split('-')[0] || vehicle.id;
      if (!car || seen.has(car)) return false;
      seen.add(car);
      return true;
    });
  }, [group.vehicles]);

  const gridClass =
    cols === 4
      ? 'grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5'
      : 'grid grid-cols-2 gap-4 sm:gap-5';

  return (
    <div className="flex flex-col gap-3 sm:gap-4 min-w-0 w-full">
      <div className="flex flex-col gap-1 border-b border-brand/10 pb-2.5">
        <h3 className="text-sm sm:text-base font-black text-brand flex items-center gap-2 min-w-0">
          <span className="w-2 h-4 sm:h-5 bg-gradient-to-b from-gold to-gold-dark rounded-full shrink-0 shadow-sm shadow-gold/30" />
          <span className="line-clamp-2">{title}</span>
        </h3>
        {routeTitle && (
          <p className="text-[11px] sm:text-xs text-gray-500 ps-4 line-clamp-1">
            {routeTitle[lang] || routeTitle.ar}
          </p>
        )}
      </div>

      <div className={gridClass}>
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={`${group.id}-${String(vehicle.id || '').split('-')[0] || vehicle.id}`}
            vehicle={vehicle}
            routeTitle={routeTitle}
            routeId={group.routeId}
            lang={lang}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

export default function FleetSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { fleetRoutes, carCatalog, fleetShowcase } = useSiteContent();
  const homeSections = useMemo(
    () => buildHomeFleetSections(fleetRoutes, fleetShowcase),
    [fleetRoutes, carCatalog, fleetShowcase],
  );

  const byId = useMemo(() => {
    const map = {};
    for (const g of homeSections) map[g.id] = g;
    return map;
  }, [homeSections]);

  if (!homeSections.length) return null;

  return (
    <section id="fleet" className="section-padding overflow-x-clip relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 end-0 w-72 h-72 bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 start-0 w-64 h-64 bg-gold/8 rounded-full blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header" data-aos="fade-up">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('fleet.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand mt-2 section-heading">
            {t('fleet.title')}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-xl mt-1">{t('fleet.subtitle')}</p>
        </div>

        <div
          className="flex flex-col gap-10 sm:gap-12 md:gap-14"
          data-aos="fade-up"
          data-aos-delay="80"
        >
          {HOME_FLEET_PAIRS.map(([leftId, rightId]) => {
            const left = byId[leftId];
            const right = byId[rightId];
            if (!left && !right) return null;
            return (
              <div key={`${leftId}-${rightId}`} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-5">
                {left ? <ServiceFleetGroup group={left} lang={lang} t={t} cols={2} /> : <div className="hidden md:block" />}
                {right ? <ServiceFleetGroup group={right} lang={lang} t={t} cols={2} /> : <div className="hidden md:block" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
