import { useCallback } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { bumpContentRevision } from '../firebase/content';
import { invalidateProductsCache } from '../firebase/admin';
import {
  clearAllAppCaches,
  clearSiteContentCache,
  softInvalidateSiteContentCache,
} from '../utils/siteContentRefresh';

/**
 * Publish site content after SuperAdmin edits.
 * - Clears admin list + products memory cache so the panel reloads fresh data.
 * - Always awaits revision bump so laptop / KSA / UAE clients get the same signal.
 * - Soft: also BroadcastChannel for same-browser tabs.
 * - Full: reload SiteContent in this tab.
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'soft') => {
    clearAllAppCaches();
    invalidateProductsCache();

    if (mode === 'soft') {
      softInvalidateSiteContentCache();
    } else {
      clearSiteContentCache();
    }

    try {
      // Must await so every region sees the new contentRevision (1 write).
      await bumpContentRevision();
    } catch (err) {
      console.warn('Content revision bump failed:', err?.code || err?.message || err);
    }

    if (mode !== 'soft') {
      await refresh();
    }
  }, [refresh]);
}
