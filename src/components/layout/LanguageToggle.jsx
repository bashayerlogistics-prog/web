import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { setLanguage } from '../../i18n';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', short: 'ع' },
  { code: 'en', label: 'English', short: 'EN' },
];

export default function LanguageToggle({ className = '', iconOnly = false, variant = 'header' }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectLang = (code) => {
    setLanguage(code);
    setOpen(false);
  };

  const isMenu = variant === 'menu';

  return (
    <div ref={ref} className={`lang-dropdown relative ${isMenu ? 'lang-dropdown--menu' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`lang-dropdown__trigger ${isMenu ? 'lang-dropdown__trigger--menu' : ''} ${iconOnly ? 'lang-dropdown__trigger--icon-only' : ''} ${open ? 'lang-dropdown__trigger--open' : ''}`}
        aria-label={t('nav.language')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="lang-dropdown__icon-wrap">
          <Globe className="w-4 h-4" strokeWidth={2} />
        </span>
        {!iconOnly && (
          <span className="lang-dropdown__label">{current.label}</span>
        )}
        {iconOnly && (
          <span className="lang-dropdown__short">{current.short}</span>
        )}
        <ChevronDown className={`lang-dropdown__chevron w-3.5 h-3.5 ${open ? 'lang-dropdown__chevron--open' : ''}`} />
      </button>

      {open && (
        <ul
          className="lang-dropdown__menu"
          role="listbox"
          aria-label={t('nav.language')}
        >
          {LANGUAGES.map((lang) => {
            const active = i18n.language === lang.code;
            return (
              <li key={lang.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => selectLang(lang.code)}
                  className={`lang-dropdown__option ${active ? 'lang-dropdown__option--active' : ''}`}
                >
                  <span className="lang-dropdown__option-label">{lang.label}</span>
                  {active && <Check className="w-4 h-4 text-gold shrink-0" strokeWidth={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
