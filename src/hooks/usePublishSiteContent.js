import { useCallback } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { bumpContentRevision } from '../firebase/content';
import { invalidateProductsCache } from '../firebase/admin';
import { clearAdminDataCache } from '../utils/adminDataCache';
import { invalidatePaymentSettingsCache } from './usePaymentSettings';
import {
  clearAllAppCaches,
  clearSiteContentCache,
  softInvalidateSiteContentCache,
} from '../utils/siteContentRefresh';

/**
 * Publish site content after SuperAdmin edits — all sections / pages.
 * Soft: mark dirty + BroadcastChannel + revision bump (open public tabs refresh).
 * Full: wipe CMS/admin caches then revision bump (Settings → Clear cache).
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'soft') => {
    invalidateProductsCache();
    invalidatePaymentSettingsCache();
    clearAdminDataCache();

    if (mode === 'soft') {
      softInvalidateSiteContentCache();
    } else {
      clearAllAppCaches();
      clearSiteContentCache();
    }

    try {
      await bumpContentRevision();
    } catch (err) {
      console.warn('Content revision bump failed:', err?.code || err?.message || err);
    }

    if (mode !== 'soft') {
      await refresh();
    }
  }, [refresh]);
}
