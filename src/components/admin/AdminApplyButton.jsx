import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Consistent primary action for admin settings — apply/save changes.
 */
export default function AdminApplyButton({
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  label,
  loadingLabel,
  className = '',
  fullWidth = false,
  size = 'md',
}) {
  const { t } = useTranslation();
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-bold shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <Check className={iconSize} />
      {loading ? (loadingLabel || t('common.loading')) : (label || t('common.apply'))}
    </button>
  );
}
