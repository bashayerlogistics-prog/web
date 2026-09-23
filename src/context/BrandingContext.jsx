import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';
import { getBrandingSettings, subscribeBrandingSettings } from '../firebase/branding';
import { runWithServerReads } from '../firebase/reads';
import { DEFAULT_BRANDING, getFontFamily, resolveUserFont } from '../data/brandingDefaults';
import { buildBrandingCssVars } from '../utils/colorUtils';
import { loadGoogleFont } from '../utils/fontUtils';
import { isMysqlCmsEnabled } from '../api/mysqlApi';

const BrandingContext = createContext(null);
const BRANDING_CACHE_KEY = 'rafiq_branding';
const BRANDING_AT_KEY = 'rafiq_branding_at';
const BRANDING_SYNC_CHANNEL = 'bashayer-site-content';
/** Stale local palette older than this is never painted — fetch live first. */
const BRANDING_CACHE_MAX_MS = 5 * 60 * 1000;

function readCachedBranding() {
  try {
    const at = Number(localStorage.getItem(BRANDING_AT_KEY) || 0);
    if (at && Date.now() - at > BRANDING_CACHE_MAX_MS) {
      localStorage.removeItem(BRANDING_CACHE_KEY);
      localStorage.removeItem(BRANDING_AT_KEY);
      return null;
    }
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.data && parsed.at && typeof parsed.data === 'object' && !parsed.primaryColor) {
      return { ...DEFAULT_BRANDING, ...parsed.data };
    }
    return { ...DEFAULT_BRANDING, ...parsed };
  } catch {
    return null;
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

function brandingSignature(b) {
  if (!b) return '';
  return [
    b.primaryColor,
    b.secondaryColor,
    b.logoUrl,
    b.faviconUrl,
    b.adminFont,
    b.userFontAr || b.userFont,
    b.userFontEn || b.userFont,
  ].join('|');
}

function getActiveLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

const DEFAULT_FAVICON = '/favicon.png';

function resolveFaviconHref(branding) {
  const custom = branding?.faviconUrl?.trim() || branding?.logoUrl?.trim() || '';
  return custom || DEFAULT_FAVICON;
}

function faviconMime(href) {
  const path = String(href).split('?')[0].toLowerCase();
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.ico')) return 'image/x-icon';
  return '';
}

function applyFaviconToDom(branding) {
  if (typeof document === 'undefined') return;
  const rawHref = resolveFaviconHref(branding);
  const isDefault = rawHref === DEFAULT_FAVICON;
  const href = isDefault
    ? rawHref
    : `${rawHref}${rawHref.includes('?') ? '&' : '?'}v=${encodeURIComponent(rawHref.slice(-48))}`;
  const type = faviconMime(rawHref);

  document
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((el) => el.remove());

  const addLink = (rel) => {
    const link = document.createElement('link');
    link.rel = rel;
    if (type) link.type = type;
    link.href = href;
    document.head.appendChild(link);
  };

  addLink('icon');
  addLink('shortcut icon');
  addLink('apple-touch-icon');
}

function applyBrandingToDom(branding, isAdminRoute) {
  const root = document.documentElement;
  const vars = buildBrandingCssVars(branding.primaryColor, branding.secondaryColor);
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta && branding.primaryColor) {
    themeMeta.setAttribute('content', branding.primaryColor);
  }

  applyFaviconToDom(branding);

  const splashLogo = document.querySelector('.splash-logo');
  const logoUrl = branding?.logoUrl?.trim();
  if (splashLogo && logoUrl) {
    splashLogo.src = logoUrl;
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

async function fetchLiveBranding() {
  // MySQL path skips Firestore IndexedDB entirely (no old-color flash).
  if (isMysqlCmsEnabled()) {
    return getBrandingSettings();
  }
  return runWithServerReads(() => getBrandingSettings());
}

/** Prefer early HTML bootstrap branding when present (new devices). */
function readBootBranding() {
  if (typeof window !== 'undefined' && window.__bashayerLiveBranding) {
    return { ...DEFAULT_BRANDING, ...window.__bashayerLiveBranding };
  }
  return readCachedBranding();
}

const bootCached = typeof window !== 'undefined' ? readBootBranding() : null;
const bootBranding = bootCached || DEFAULT_BRANDING;
if (typeof document !== 'undefined' && bootCached) {
  applyBrandingToDom(bootBranding, window.location.pathname.startsWith('/admin'));
}

export function BrandingProvider({ children }) {
  // Instant paint from last live cache / HTML bootstrap; server revalidates immediately.
  const [branding, setBranding] = useState(bootBranding);
  const [loading, setLoading] = useState(!bootCached);
  const [ready, setReady] = useState(Boolean(bootCached));
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const brandingRef = useRef(branding);
  brandingRef.current = branding;
  const hasServerBrandRef = useRef(
    typeof window !== 'undefined' && Boolean(window.__bashayerLiveBranding),
  );
  const sigRef = useRef(brandingSignature(bootBranding));

  const applyBranding = useCallback((partial) => {
    setBranding((prev) => {
      const next = { ...prev, ...partial };
      sigRef.current = brandingSignature(next);
      return next;
    });
  }, []);

  const commitBranding = useCallback((data) => {
    const sig = brandingSignature(data);
    if (sig === sigRef.current && hasServerBrandRef.current) return;
    sigRef.current = sig;
    setBranding(data);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveBranding();
      hasServerBrandRef.current = true;
      commitBranding(data);
      setReady(true);
      return data;
    } catch {
      setReady(true);
      return brandingRef.current;
    } finally {
      setLoading(false);
    }
  }, [commitBranding]);

  useEffect(() => {
    let cancelled = false;

    // ALWAYS revalidate — even with local cache — so new colors/images land fast
    // on every device (incl. Google profiles). Never wait only on Firestore cache.
    fetchLiveBranding().then((data) => {
      if (cancelled) return;
      hasServerBrandRef.current = true;
      commitBranding(data);
      setLoading(false);
      setReady(true);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      setReady(true);
    });

    const unsub = subscribeBrandingSettings((data, meta) => {
      if (cancelled) return;
      // Ignore stale IndexedDB when we already have a live server read.
      if (meta?.fromCache && hasServerBrandRef.current) return;
      if (!meta?.fromCache) hasServerBrandRef.current = true;
      commitBranding(data);
      setLoading(false);
      setReady(true);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [commitBranding]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(BRANDING_SYNC_CHANNEL);
    channel.onmessage = (event) => {
      const type = event?.data?.type;
      if (type !== 'branding' && type !== 'invalidate' && type !== 'soft') return;
      clearBrandingCache();
      hasServerBrandRef.current = false;
      refresh();
    };
    return () => channel.close();
  }, [refresh]);

  useEffect(() => {
    applyBrandingToDom(branding, isAdminRoute);
    if (hasServerBrandRef.current || bootCached) {
      persistBrandingCache(branding);
    }
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
    <BrandingContext.Provider value={{ branding, loading, ready, refresh, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      loading: false,
      ready: true,
      refresh: () => {},
      applyBranding: () => {},
    };
  }
  return ctx;
}
