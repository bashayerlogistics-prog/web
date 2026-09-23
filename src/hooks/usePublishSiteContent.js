import { useCallback } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { bumpContentRevision } from '../firebase/content';
import { invalidateProductsCache } from '../firebase/admin';
import { clearAdminDataCache } from '../utils/adminDataCache';
import { invalidatePaymentSettingsCache } from './usePaymentSettings';
import {
  clearSiteContentCache,
  softInvalidateSiteContentCache,
} from '../utils/siteContentRefresh';
import { purgeClientSessionCaches } from '../utils/purgeClientSessionCaches';

/**
 * Publish site content after SuperAdmin edits.
 * Soft (default): mark dirty + revision bump + non-blocking fleet refresh
 * so Save buttons return instantly (no 1200-package hang).
 * Full: wipe caches + await site refresh (Settings → Clear cache).
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'soft') => {
    invalidateProductsCache();
    invalidatePaymentSettingsCache();
    clearAdminDataCache();

    if (mode === 'soft') {
      softInvalidateSiteContentCache();
      try {
        await bumpContentRevision();
      } catch (err) {
        console.warn('Content revision bump failed:', err?.code || err?.message || err);
      }
      // Fire-and-forget — never block SuperAdmin Save on full fleet fetch.
      void refresh({ silent: true, phase: 'fleet', forceServer: true }).catch((err) => {
        console.warn('Fleet refresh after publish failed:', err?.code || err?.message || err);
      });
      return;
    }

    purgeClientSessionCaches();
    clearSiteContentCache();

    try {
      await bumpContentRevision();
    } catch (err) {
      console.warn('Content revision bump failed:', err?.code || err?.message || err);
    }

    try {
      await refresh({ silent: false, phase: 'full', forceServer: true });
    } catch (err) {
      console.warn('Site content refresh after publish failed:', err?.code || err?.message || err);
    }
  }, [refresh]);
}
