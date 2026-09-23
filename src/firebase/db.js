import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { app } from './app';

/** Must match SITE_CONTENT_DIRTY_KEY in siteContentRefresh (avoid circular import). */
const DIRTY_KEY = 'bashayer-site-content-dirty';

/**
 * After a deploy purge the dirty flag is set — use memory cache so IndexedDB
 * cannot revive yesterday's packages/car images for new or returning browsers.
 */
function shouldUseMemoryCache() {
  try {
    return Boolean(localStorage.getItem(DIRTY_KEY));
  } catch {
    return false;
  }
}

const useMemory = shouldUseMemoryCache();

export const db = initializeFirestore(app, {
  localCache: useMemory
    ? memoryLocalCache()
    : persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
});
