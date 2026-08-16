import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { app } from './app';

// IndexedDB-backed cache keeps previously loaded orders/content available
// across reloads and lets multiple tabs share the same local Firestore cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
