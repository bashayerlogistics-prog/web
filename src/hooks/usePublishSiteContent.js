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
 * Soft (default): drop CMS snapshot + revision bump + fast fleet refresh
 * so public tabs never keep old category/product images.
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
      // Await fleet refresh so this tab + subsequent paints use new images.
      try {
        await refresh({ silent: true, phase: 'fleet' });
      } catch (err) {
        console.warn('Fleet refresh after publish failed:', err?.code || err?.message || err);
      }
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
