import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';
import { subscribeBrandingSettings } from '../firebase/branding';
import { DEFAULT_BRANDING, getFontFamily, resolveUserFont } from '../data/brandingDefaults';
import { buildBrandingCssVars } from '../utils/colorUtils';
import { loadGoogleFont } from '../utils/fontUtils';

const BrandingContext = createContext(null);
const BRANDING_CACHE_KEY = 'rafiq_branding';
const USE_BRANDING_REALTIME = import.meta.env.VITE_ENABLE_BRANDING_REALTIME === 'true';

function readCachedBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

const initialBranding = readCachedBranding();
if (typeof document !== 'undefined') {
  applyBrandingToDom(initialBranding, window.location.pathname.startsWith('/admin'));
}

function getActiveLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function applyBrandingToDom(branding, isAdminRoute) {
  const root = document.documentElement;
  const vars = buildBrandingCssVars(branding.primaryColor, branding.secondaryColor);
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta && branding.primaryColor) {
    themeMeta.setAttribute('content', branding.primaryColor);
  }

  const lang = getActiveLang();
  const userFontKey = resolveUserFont(branding, lang);
  const adminFont = getFontFamily(branding.adminFont);

  loadGoogleFont(branding.userFontAr || branding.userFont || 'Tajawal', 'brand-font-user-ar');
  loadGoogleFont(branding.userFontEn || branding.userFont || 'Inter', 'brand-font-user-en');
  loadGoogleFont(branding.adminFont, 'brand-font-admin');

  root.style.setProperty('--font-user-active', getFontFamily(userFontKey));

  if (isAdminRoute) {
    document.body.style.fontFamily = adminFont;
    root.dataset.brandSurface = 'admin';
  } else {
    document.body.style.fontFamily = getFontFamily(userFontKey);
    root.dataset.brandSurface = 'user';
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(initialBranding);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const brandingRef = useRef(branding);
  brandingRef.current = branding;

  const applyBranding = useCallback((partial) => {
    setBranding((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (!USE_BRANDING_REALTIME) {
      setLoading(false);
      return undefined;
    }
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    let unsubscribe = () => {};

    const start = () => {
      unsubscribe = subscribeBrandingSettings((data) => {
        setBranding(data);
        setLoading(false);
      });
    };

    if (isMobile && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 3500 });
      return () => {
        window.cancelIdleCallback(id);
        unsubscribe();
      };
    }

    const timeout = window.setTimeout(start, isMobile ? 600 : 80);
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyBrandingToDom(branding, isAdminRoute);
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
    } catch {
      // ignore quota errors
    }
  }, [branding, isAdminRoute]);

  useEffect(() => {
    const onLangChange = () => {
      // Fonts already preloaded — only swap active family (cheap).
      const branding = brandingRef.current;
      const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
      const userFontKey = resolveUserFont(branding, lang);
      const root = document.documentElement;
      root.style.setProperty('--font-user-active', getFontFamily(userFontKey));
      if (!isAdminRoute) {
        document.body.style.fontFamily = getFontFamily(userFontKey);
      }
    };
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, [isAdminRoute]);

  const refresh = useCallback(async () => {
    // Kept for API compatibility; realtime listener handles updates.
    setLoading(false);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return { branding: DEFAULT_BRANDING, loading: false, refresh: () => {}, applyBranding: () => {} };
  }
  return ctx;
}
