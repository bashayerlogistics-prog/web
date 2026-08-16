import { Clock, CheckCircle, Car, XCircle } from 'lucide-react';

const config = {
  pending: {
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock,
    dot: 'bg-amber-500',
  },
  confirmed: {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
  },
  completed: {
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
    icon: Car,
    dot: 'bg-green-500',
  },
  cancelled: {
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
    icon: XCircle,
    dot: 'bg-red-500',
  },
};

export default function StatusBadge({ status, label, size = 'sm' }) {
  const cfg = config[status] || config.pending;
  const Icon = cfg.icon;
  const sizeClass = size === 'lg' ? 'text-sm px-4 py-2 gap-2' : 'text-xs px-3 py-1.5 gap-1.5';

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${cfg.className} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  );
}
