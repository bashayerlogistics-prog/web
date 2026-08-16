import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ShoppingBag, X } from 'lucide-react';
import { useArabicAlertSound } from '../../hooks/useArabicAlertSound';
import VehicleImage from './VehicleImage';

export default function AddToCartModal({ open, item, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  useArabicAlertSound(open, 'success');

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !item) return null;

  const name = item.shortName?.[lang] || item.vehicleName?.[lang] || item.vehicleName?.ar;
  const route = item.routeTitle?.[lang] || item.routeTitle?.ar;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-dark-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-brand flex-1 text-center">{t('cart.addedTitle')}</h2>
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex gap-3 p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
            <div className="flex-1 min-w-0 text-start">
              <h3 className="font-black text-brand text-base leading-snug">{name}</h3>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">{route}</p>
              <p className="text-brand font-black text-lg mt-2">
                {item.price}
                <span className="text-xs font-bold ms-1">{t('booking.sar')}</span>
              </p>
            </div>
            {item.image && (
              <VehicleImage
                src={item.image}
                alt={name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0"
              />
            )}
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            <Link
              to="/cart"
              onClick={onClose}
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20"
            >
              <ShoppingBag className="w-4 h-4" />
              {t('cart.completeBooking')}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="w-full border-2 border-brand/30 text-brand font-bold py-3.5 rounded-xl hover:bg-brand/5 transition-all"
            >
              {t('cart.continueBrowsing')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
