import { startTransition } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('language');
const initialLang = savedLang === 'en' || savedLang === 'ar' ? savedLang : 'ar';

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged',
  },
});

/** Switch language without blocking the click frame (smooth EN↔AR). */
export function setLanguage(lang) {
  const next = lang === 'en' ? 'en' : 'ar';
  if (i18n.language === next) return;

  localStorage.setItem('language', next);

  // Ensure target font stylesheet is present (may still be idle-deferred from index.html)
  if (typeof document !== 'undefined') {
    const id = next === 'ar' ? 'lang-font-ar' : 'lang-font-en';
    const href =
      next === 'ar'
        ? 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap'
        : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    } else if (link.media === 'print') {
      link.media = 'all';
    }
  }

  startTransition(() => {
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    i18n.changeLanguage(next);
  });
}

document.documentElement.lang = initialLang;
document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';

export default i18n;
