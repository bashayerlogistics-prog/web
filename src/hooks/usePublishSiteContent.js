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
import { isMysqlCmsEnabled, mysqlBumpRevision } from '../api/mysqlApi';

/**
 * Publish site content after SuperAdmin edits.
 * MySQL mode: bump Hostinger revision + soft refresh (ultra-fast).
 * Firebase mode: soft invalidate + non-blocking fleet refresh.
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
        if (isMysqlCmsEnabled()) await mysqlBumpRevision();
        else await bumpContentRevision();
      } catch (err) {
        console.warn('Content revision bump failed:', err?.code || err?.message || err);
      }
      void refresh({ silent: true, phase: 'fleet', forceServer: true }).catch((err) => {
        console.warn('Fleet refresh after publish failed:', err?.code || err?.message || err);
      });
      return;
    }

    purgeClientSessionCaches();
    clearSiteContentCache();

    try {
      if (isMysqlCmsEnabled()) await mysqlBumpRevision();
      else await bumpContentRevision();
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
