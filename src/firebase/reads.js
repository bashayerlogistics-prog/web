import {
  getDocs,
  getDocsFromServer,
  getDoc,
  getDocFromServer,
} from 'firebase/firestore';

/**
 * When > 0, CMS/admin list reads bypass IndexedDB and hit the server.
 * Fixes "old data for a long time, then new" with persistentLocalCache.
 */
let serverReadDepth = 0;

export function runWithServerReads(fn) {
  serverReadDepth += 1;
  return Promise.resolve()
    .then(() => fn())
    .finally(() => {
      serverReadDepth = Math.max(0, serverReadDepth - 1);
    });
}

export function fsGetDocs(q) {
  return serverReadDepth > 0 ? getDocsFromServer(q) : getDocs(q);
}

export function fsGetDoc(ref) {
  return serverReadDepth > 0 ? getDocFromServer(ref) : getDoc(ref);
}
