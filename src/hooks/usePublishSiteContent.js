import { useCallback } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import { bumpContentRevision } from '../firebase/content';
import {
  clearSiteContentCache,
  softInvalidateSiteContentCache,
} from '../utils/siteContentRefresh';

/**
 * Publish site content after SuperAdmin edits.
 * - Always bumps siteSettings/contentRevision (1 write) so live + local clients refresh.
 * - publishSite() / 'full' → clear cache + reload CMS docs
 * - publishSite('soft') → clear cache only (fleet tabs already live via onSnapshot)
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'full') => {
    try {
      await bumpContentRevision();
    } catch (err) {
      console.warn('Content revision bump failed:', err?.code || err?.message || err);
    }

    if (mode === 'soft') {
      softInvalidateSiteContentCache();
      return;
    }
    clearSiteContentCache();
    await refresh();
  }, [refresh]);
}
