import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';
import { getBrandingSettings, subscribeBrandingSettings } from '../firebase/branding';
import { DEFAULT_BRANDING, getFontFamily, resolveUserFont } from '../data/brandingDefaults';
import { buildBrandingCssVars } from '../utils/colorUtils';
import { loadGoogleFont } from '../utils/fontUtils';

const BrandingContext = createContext(null);
const BRANDING_CACHE_KEY = 'rafiq_branding';
const BRANDING_AT_KEY = 'rafiq_branding_at';
const BRANDING_TTL_MS = 30 * 60 * 1000;
const USE_BRANDING_REALTIME = import.meta.env.VITE_ENABLE_BRANDING_REALTIME === 'true';
const BRANDING_SYNC_CHANNEL = 'bashayer-site-content';

function readCachedBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw);
    if (parsed?.data && parsed.at && typeof parsed.data === 'object' && !parsed.primaryColor) {
      return { ...DEFAULT_BRANDING, ...parsed.data };
    }
    return { ...DEFAULT_BRANDING, ...parsed };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function isBrandingCacheFresh() {
  if (import.meta.env.DEV) return false;
  try {
    const at = Number(localStorage.getItem(BRANDING_AT_KEY) || 0);
    return at > 0 && Date.now() - at < BRANDING_TTL_MS;
  } catch {
    return false;
  }
}

function persistBrandingCache(branding) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
    localStorage.setItem(BRANDING_AT_KEY, String(Date.now()));
  } catch {
    // ignore quota errors
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
  const [loading, setLoading] = useState(!isBrandingCacheFresh());
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const brandingRef = useRef(branding);
  brandingRef.current = branding;

  const applyBranding = useCallback((partial) => {
    setBranding((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (isAdminRoute && !USE_BRANDING_REALTIME) {
      setLoading(false);
      return undefined;
    }

    if (USE_BRANDING_REALTIME) {
      const unsub = subscribeBrandingSettings((data) => {
        setBranding(data);
        setLoading(false);
      });
      return unsub;
    }

    if (isBrandingCacheFresh()) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const start = () => {
      getBrandingSettings().then((data) => {
        if (cancelled) return;
        setBranding(data);
        setLoading(false);
      });
    };

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timeout = window.setTimeout(start, isMobile ? 400 : 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(BRANDING_SYNC_CHANNEL);
    channel.onmessage = (event) => {
      const type = event?.data?.type;
      if (type !== 'branding' && type !== 'invalidate') return;
      getBrandingSettings().then(setBranding);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    applyBrandingToDom(branding, isAdminRoute);
    persistBrandingCache(branding);
  }, [branding, isAdminRoute]);

  useEffect(() => {
    const onLangChange = () => {
      const current = brandingRef.current;
      const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
      const userFontKey = resolveUserFont(current, lang);
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
    try {
      const data = await getBrandingSettings();
      setBranding(data);
    } catch {
      // keep cached branding
    } finally {
      setLoading(false);
    }
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
