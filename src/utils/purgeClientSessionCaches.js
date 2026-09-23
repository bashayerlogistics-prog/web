import { clearAllAppCaches, softInvalidateSiteContentCache, broadcastSiteContentInvalidate } from './siteContentRefresh';
import { clearAdminDataCache } from './adminDataCache';

/**
 * Drop every CMS / admin / branding browser cache so the next paint is live Firestore.
 * Call on SuperAdmin login + logout (and after hard publish).
 */
export function purgeClientSessionCaches() {
  try {
    clearAllAppCaches();
  } catch {
    // ignore
  }
  try {
    clearAdminDataCache();
  } catch {
    // ignore
  }
  try {
    softInvalidateSiteContentCache();
  } catch {
    // ignore
  }
  try {
    broadcastSiteContentInvalidate('invalidate');
  } catch {
    // ignore
  }
  try {
    import('../firebase/admin').then((mod) => mod.invalidateProductsCache?.()).catch(() => {});
  } catch {
    // ignore
  }
}
