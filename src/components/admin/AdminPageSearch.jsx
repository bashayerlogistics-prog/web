import { useEffect, useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * SuperAdmin page finder — filters sidebar pages by name / path.
 */
export default function AdminPageSearch({
  value,
  onChange,
  onSubmitFirst,
  inputRef: externalRef,
  className = '',
}) {
  const { t } = useTranslation();
  const id = useId();
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select?.();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current && value) {
        onChange('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputRef, onChange, value]);

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {t('admin.pageSearchPlaceholder')}
      </label>
      <Search
        className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50 dark:text-gold/50 pointer-events-none"
        aria-hidden
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && typeof onSubmitFirst === 'function') {
            e.preventDefault();
            onSubmitFirst();
          }
        }}
        placeholder={t('admin.pageSearchPlaceholder')}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        inputMode="search"
        className="admin-input w-full ps-9 pe-16 py-2.5 text-sm rounded-xl outline-none"
        aria-keyshortcuts="Control+K Meta+K"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5"
          aria-label={t('common.clear', { defaultValue: 'Clear' })}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd
          className="absolute end-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-brand/15 bg-brand/5 text-[10px] font-bold text-gray-400 dark:text-white/40 pointer-events-none"
          aria-hidden
        >
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      )}
    </div>
  );
}
