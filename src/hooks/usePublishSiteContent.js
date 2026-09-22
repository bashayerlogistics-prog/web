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
 * Publish site content after SuperAdmin edits.
 * Soft (default): cheap — mark dirty + revision bump only. Open public tabs
 * refresh via contentRevision listener (no full CMS reload on every save).
 * Full: wipe caches + await site refresh (Settings → Clear cache).
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'soft') => {
    invalidateProductsCache();
    invalidatePaymentSettingsCache();

    if (mode === 'soft') {
      softInvalidateSiteContentCache();
      try {
        await bumpContentRevision();
      } catch (err) {
        console.warn('Content revision bump failed:', err?.code || err?.message || err);
      }
      // Non-blocking fleet paint only — never await full gallery/FAQ/CMS reload.
      void refresh({ silent: true, phase: 'fleet' });
      return;
    }

    clearAdminDataCache();
    clearAllAppCaches();
    clearSiteContentCache();

    try {
      await bumpContentRevision();
    } catch (err) {
      console.warn('Content revision bump failed:', err?.code || err?.message || err);
    }

    try {
      await refresh({ silent: false, phase: 'full' });
    } catch (err) {
      console.warn('Site content refresh after publish failed:', err?.code || err?.message || err);
    }
  }, [refresh]);
}
