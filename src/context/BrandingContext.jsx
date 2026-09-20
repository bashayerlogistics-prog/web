import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';
import { getBrandingSettings, subscribeBrandingSettings } from '../firebase/branding';
import { runWithServerReads } from '../firebase/reads';
import { DEFAULT_BRANDING, getFontFamily, resolveUserFont } from '../data/brandingDefaults';
import { buildBrandingCssVars } from '../utils/colorUtils';
import { loadGoogleFont } from '../utils/fontUtils';

const BrandingContext = createContext(null);
const BRANDING_CACHE_KEY = 'rafiq_branding';
const BRANDING_AT_KEY = 'rafiq_branding_at';
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

function persistBrandingCache(branding) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
    localStorage.setItem(BRANDING_AT_KEY, String(Date.now()));
  } catch {
    // ignore quota errors
  }
}

function clearBrandingCache() {
  try {
    localStorage.removeItem(BRANDING_CACHE_KEY);
    localStorage.removeItem(BRANDING_AT_KEY);
  } catch {
    // ignore
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

/** Server read — bypass IndexedDB so profiles never stick on stale colors. */
async function fetchLiveBranding() {
  return runWithServerReads(() => getBrandingSettings());
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(initialBranding);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const brandingRef = useRef(branding);
  brandingRef.current = branding;
  const hasServerBrandRef = useRef(false);

  const applyBranding = useCallback((partial) => {
    setBranding((prev) => ({ ...prev, ...partial }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveBranding();
      hasServerBrandRef.current = true;
      setBranding(data);
      return data;
    } catch {
      return brandingRef.current;
    } finally {
      setLoading(false);
    }
  }, []);

  // Live branding for every visitor profile (Fahad save → Jawwad sees new colors fast).
  // Cache is paint-only; never skip sync with a 30‑minute “fresh” TTL.
  useEffect(() => {
    let cancelled = false;
    hasServerBrandRef.current = false;

    // Immediate server fetch so old localStorage paint is replaced ASAP.
    fetchLiveBranding().then((data) => {
      if (cancelled) return;
      hasServerBrandRef.current = true;
      setBranding(data);
      setLoading(false);
    });

    const unsub = subscribeBrandingSettings((data, meta) => {
      if (cancelled) return;
      // Do not let IndexedDB overwrite a fresher server read.
      if (meta?.fromCache && hasServerBrandRef.current) return;
      if (!meta?.fromCache) hasServerBrandRef.current = true;
      setBranding(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isAdminRoute]);

  // Same Chrome profile / other tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(BRANDING_SYNC_CHANNEL);
    channel.onmessage = (event) => {
      const type = event?.data?.type;
      if (type !== 'branding' && type !== 'invalidate' && type !== 'soft') return;
      clearBrandingCache();
      refresh();
    };
    return () => channel.close();
  }, [refresh]);

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
