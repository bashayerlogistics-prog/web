import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useArabicAlertSound } from '../../hooks/useArabicAlertSound';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    gradient: 'from-red-500 via-rose-500 to-red-700',
    ring: 'ring-red-400/30',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-100',
  },
  success: {
    icon: CheckCircle,
    gradient: 'from-brand via-brand-light to-brand-dark',
    ring: 'ring-brand/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  warning: {
    icon: AlertTriangle,
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    ring: 'ring-amber-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  security: {
    icon: ShieldAlert,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    ring: 'ring-violet-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
};

export default function AuthAlertModal({
  open,
  onClose,
  type = 'error',
  title,
  message,
  code,
  actionLabel,
  onAction,
}) {
  const variant = VARIANTS[type] || VARIANTS.error;
  const Icon = variant.icon;
  const actionRef = useRef(null);
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const fallbackAction = isArabic ? 'حسناً' : 'Continue';

  useArabicAlertSound(open, type);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => actionRef.current?.focus(), 100);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-[#140a20]/65 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="auth-alert-title"
        aria-describedby="auth-alert-message"
        className={`relative w-full max-w-sm auth-glass-modal animate-modal-in ring-1 ${variant.ring}`}
      >
        <div className={`bg-gradient-to-br ${variant.gradient} px-6 pt-8 pb-9 text-center text-white relative overflow-hidden rounded-t-3xl`}>
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -top-8 -end-8 w-32 h-32 bg-white rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -start-8 w-24 h-24 bg-white/60 rounded-full blur-xl" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 end-3 p-2 rounded-full bg-white/15 hover:bg-white/30 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label={isArabic ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className={`w-20 h-20 ${variant.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 animate-success-pop backdrop-blur-sm border border-white/25 ring-8 ring-white/10`}>
              <Icon className={`w-10 h-10 ${variant.iconColor}`} strokeWidth={2.4} />
            </div>
            <h2 id="auth-alert-title" className="text-xl sm:text-2xl font-black">{title}</h2>
          </div>
        </div>

        <div className="px-5 sm:px-7 pt-6 pb-5 space-y-4">
          <p id="auth-alert-message" className="text-sm text-dark-700 text-center leading-7">{message}</p>
          {code && (
            <p className="text-[11px] text-center font-mono text-gray-400 bg-gray-50 rounded-lg py-2 px-3 border border-gray-100 break-all" dir="ltr">
              [{code}]
            </p>
          )}
          <button
            ref={actionRef}
            type="button"
            onClick={onAction || onClose}
            className="auth-btn-primary w-full focus:outline-none focus:ring-4 focus:ring-brand/20"
          >
            {actionLabel || fallbackAction}
          </button>
        </div>
      </div>
    </div>
  );
}
