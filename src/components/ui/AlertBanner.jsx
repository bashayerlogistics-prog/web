import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const variants = {
  success: {
    className: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
  },
  error: {
    className: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    className: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
  },
  info: {
    className: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
  },
};

export default function AlertBanner({ type = 'info', title, message, onClose }) {
  const v = variants[type] || variants.info;
  const Icon = v.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${v.className}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${v.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold text-sm">{title}</p>}
        {message && <p className="text-sm mt-0.5 opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="p-1 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
