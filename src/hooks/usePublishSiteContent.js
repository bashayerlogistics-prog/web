import { useCallback } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import {
  clearSiteContentCache,
  softInvalidateSiteContentCache,
} from '../utils/siteContentRefresh';

/**
 * Publish site content after SuperAdmin edits.
 * - publishSite() or publishSite('full') → clear cache + reload CMS docs (hero, sections, …)
 * - publishSite('soft') → clear cache only (packages/fleet already live via onSnapshot) — instant
 */
export function usePublishSiteContent() {
  const { refresh } = useSiteContent();

  return useCallback(async (mode = 'full') => {
    if (mode === 'soft') {
      softInvalidateSiteContentCache();
      return;
    }
    clearSiteContentCache();
    await refresh();
  }, [refresh]);
}
