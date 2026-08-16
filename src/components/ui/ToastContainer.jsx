import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { playAlertSound } from '../../utils/alertSound';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success:
    'toast-card toast-card--success bg-gradient-to-br from-emerald-50 to-teal-50/90 dark:from-emerald-950/95 dark:to-teal-950/80 border-emerald-300/70 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-100',
  error:
    'toast-card toast-card--error bg-gradient-to-br from-red-50 to-rose-50/90 dark:from-red-950/95 dark:to-rose-950/80 border-red-300/70 dark:border-red-700/60 text-red-900 dark:text-red-100',
  warning:
    'toast-card toast-card--warning bg-gradient-to-br from-amber-50 to-orange-50/90 dark:from-amber-950/95 dark:to-orange-950/80 border-amber-300/70 dark:border-amber-700/60 text-amber-900 dark:text-amber-100',
  info:
    'toast-card toast-card--info bg-gradient-to-br from-sky-50 to-blue-50/90 dark:from-sky-950/95 dark:to-blue-950/80 border-sky-300/70 dark:border-sky-700/60 text-sky-900 dark:text-sky-100',
};

const iconWrap = {
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
};

const barColors = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

export default function ToastContainer({ toasts, onRemove }) {
  const { i18n } = useTranslation();
  const prevCount = useRef(0);

  useEffect(() => {
    if (i18n.language !== 'ar') return;
    if (toasts.length > prevCount.current && toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      playAlertSound(latest.type, 'ar');
    }
    prevCount.current = toasts.length;
  }, [toasts, i18n.language]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 end-4 z-[9999] flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 pe-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-toast-in ${styles[t.type]}`}
            role="alert"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconWrap[t.type]}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <p className="flex-1 text-sm font-semibold leading-snug pt-1.5">{t.message}</p>
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <span
              className={`toast-progress absolute bottom-0 inset-x-0 h-0.5 origin-left ${barColors[t.type]}`}
              style={{ animationDuration: `${t.duration || 4000}ms` }}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );
}
