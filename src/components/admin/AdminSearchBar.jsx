import { Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Instant SuperAdmin search input — updates on every keystroke, clear in one tap.
 */
export default function AdminSearchBar({
  value,
  onChange,
  placeholder,
  className = '',
  pending = false,
  autoFocus = false,
}) {
  const { t } = useTranslation();

  return (
    <div className={`relative w-full group admin-search-wrap ${className}`}>
      <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 dark:text-gold pointer-events-none transition-colors group-focus-within:text-brand" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('admin.searchPlaceholder', { defaultValue: 'Search…' })}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        enterKeyHint="search"
        inputMode="search"
        className={`admin-search-input w-full ps-12 pe-11 py-3 sm:py-3.5 rounded-2xl outline-none transition-shadow duration-150 ${
          pending ? 'admin-search-input--pending' : ''
        }`}
        aria-busy={pending || undefined}
      />
      {pending && !value && (
        <Loader2 className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50 animate-spin pointer-events-none" />
      )}
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 active:scale-95 transition-all touch-manipulation"
          aria-label={t('common.clear', { defaultValue: 'Clear' })}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin text-brand/60" /> : <X className="w-4 h-4" />}
        </button>
      ) : null}
    </div>
  );
}
