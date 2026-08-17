import {
  collection,
  getDocs,
  getCountFromServer,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './db';

/** App marker so restore rejects unrelated JSON dumps */
export const BACKUP_APP_ID = 'bashayer-saudia';
export const BACKUP_VERSION = 1;

/**
 * Selectable backup modules.
 * `ui` = all public site content + siteSettings (branding, hero, sections, forms).
 */
export const BACKUP_MODULES = {
  ui: {
    id: 'ui',
    collections: [
      'packages',
      'services',
      'blogs',
      'banners',
      'gallery',
      'routeCards',
      'faqs',
      'socialLinks',
      'vehicles',
      'products',
      'travelReservations',
    ],
    includeSiteSettings: true,
  },
  bookings: {
    id: 'bookings',
    collections: ['bookings', 'counters'],
    includeSiteSettings: false,
  },
  users: {
    id: 'users',
    collections: ['users'],
    includeSiteSettings: false,
  },
  priceRequests: {
    id: 'priceRequests',
    collections: ['priceRequests'],
    includeSiteSettings: false,
  },
  notifications: {
    id: 'notifications',
    collections: ['notifications'],
    includeSiteSettings: false,
  },
  activity: {
    id: 'activity',
    collections: ['activityLog'],
    includeSiteSettings: false,
  },
  chat: {
    id: 'chat',
    collections: ['chatMessages'],
    includeSiteSettings: false,
  },
};

export const ALL_MODULE_IDS = Object.keys(BACKUP_MODULES);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFirestoreTimestamp(value) {
  return (
    value instanceof Timestamp ||
    (isPlainObject(value) &&
      typeof value.toDate === 'function' &&
      typeof value.seconds === 'number')
  );
}

/** Convert Firestore Timestamps (and nested) into JSON-safe markers */
export function serializeForBackup(value) {
  if (value == null) return value;
  if (isFirestoreTimestamp(value)) {
    try {
      return { __type: 'timestamp', value: value.toDate().toISOString() };
    } catch {
      return { __type: 'timestamp', value: new Date(0).toISOString() };
    }
  }
  if (Array.isArray(value)) return value.map(serializeForBackup);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = serializeForBackup(val);
    }
    return out;
  }
  return value;
}

/** Revive timestamp markers (and ISO date strings in known fields) for Firestore writes */
export function deserializeFromBackup(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(deserializeFromBackup);
  if (isPlainObject(value)) {
    if (value.__type === 'timestamp' && typeof value.value === 'string') {
      const d = new Date(value.value);
      return Number.isNaN(d.getTime()) ? Timestamp.fromDate(new Date(0)) : Timestamp.fromDate(d);
    }
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = deserializeFromBackup(val);
    }
    return out;
  }
  return value;
}

async function exportCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...serializeForBackup(d.data()),
  }));
}

async function exportSiteSettings() {
  const snapshot = await getDocs(collection(db, 'siteSettings'));
  const out = {};
  snapshot.docs.forEach((d) => {
    out[d.id] = serializeForBackup(d.data());
  });
  return out;
}

function resolveCollections(moduleIds) {
  const set = new Set();
  let includeSiteSettings = false;
  for (const id of moduleIds) {
    const mod = BACKUP_MODULES[id];
    if (!mod) continue;
    mod.collections.forEach((c) => set.add(c));
    if (mod.includeSiteSettings) includeSiteSettings = true;
  }
  return { collections: [...set], includeSiteSettings };
}

/**
 * Export selected modules (or all) to a backup payload object.
 * @param {string[]} [moduleIds]
 * @param {(progress: { step: string, current: number, total: number }) => void} [onProgress]
 */
export async function createBackupPayload(moduleIds = ALL_MODULE_IDS, onProgress) {
  const selected = moduleIds.filter((id) => BACKUP_MODULES[id]);
  if (!selected.length) throw new Error('no-modules');

  const { collections, includeSiteSettings } = resolveCollections(selected);
  const total = collections.length + (includeSiteSettings ? 1 : 0);
  let current = 0;

  const collectionsData = {};
  for (const name of collections) {
    onProgress?.({ step: name, current, total });
    try {
      collectionsData[name] = await exportCollection(name);
    } catch (err) {
      console.warn(`Backup skipped collection ${name}:`, err.code || err.message);
      collectionsData[name] = [];
    }
    current += 1;
  }

  let siteSettings = null;
  if (includeSiteSettings) {
    onProgress?.({ step: 'siteSettings', current, total });
    try {
      siteSettings = await exportSiteSettings();
    } catch (err) {
      console.warn('Backup skipped siteSettings:', err.code || err.message);
      siteSettings = {};
    }
    current += 1;
  }

  onProgress?.({ step: 'done', current: total, total });

  const counts = {};
  for (const [name, docs] of Object.entries(collectionsData)) {
    counts[name] = docs.length;
  }
  if (siteSettings) counts.siteSettings = Object.keys(siteSettings).length;

  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    modules: selected,
    counts,
    collections: collectionsData,
    siteSettings,
  };
}

export function downloadBackupJson(payload, filename) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const name = filename || `bashayer-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return name;
}

export function parseBackupFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  if (!data || typeof data !== 'object') throw new Error('invalid-json');
  if (data.app && data.app !== BACKUP_APP_ID) throw new Error('wrong-app');
  if (!data.collections && !data.siteSettings) throw new Error('empty-backup');
  return data;
}

async function deleteAllInCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

async function writeDocs(collectionName, docs) {
  let written = 0;
  for (let i = 0; i < docs.length; i += 450) {
    const chunk = docs.slice(i, i + 450);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const { id, ...rest } = item;
      if (!id) continue;
      const data = deserializeFromBackup(rest);
      batch.set(doc(db, collectionName, id), data, { merge: true });
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

async function writeSiteSettings(settings, { replace }) {
  if (!settings || typeof settings !== 'object') return 0;
  if (replace) {
    await deleteAllInCollection('siteSettings');
  }
  let written = 0;
  const entries = Object.entries(settings);
  for (let i = 0; i < entries.length; i += 450) {
    const chunk = entries.slice(i, i + 450);
    const batch = writeBatch(db);
    for (const [id, data] of chunk) {
      batch.set(doc(db, 'siteSettings', id), deserializeFromBackup(data), { merge: !replace });
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

/**
 * Restore from a parsed backup payload.
 * @param {object} payload
 * @param {{ moduleIds?: string[], mode?: 'merge'|'replace', onProgress?: Function }} options
 */
export async function restoreBackupPayload(payload, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'merge';
  const onProgress = options.onProgress;

  const selected = (options.moduleIds?.length ? options.moduleIds : payload.modules || ALL_MODULE_IDS)
    .filter((id) => BACKUP_MODULES[id]);

  if (!selected.length) throw new Error('no-modules');

  const { collections, includeSiteSettings } = resolveCollections(selected);
  const availableCollections = collections.filter(
    (name) => Array.isArray(payload.collections?.[name]),
  );

  const total =
    availableCollections.length +
    (includeSiteSettings && payload.siteSettings ? 1 : 0);
  let current = 0;
  const result = { mode, written: {}, deleted: {} };

  for (const name of availableCollections) {
    onProgress?.({ step: name, current, total, phase: mode === 'replace' ? 'clear' : 'write' });
    if (mode === 'replace') {
      try {
        result.deleted[name] = await deleteAllInCollection(name);
      } catch (err) {
        console.warn(`Replace clear failed for ${name}:`, err.code || err.message);
        result.deleted[name] = 0;
      }
    }
    onProgress?.({ step: name, current, total, phase: 'write' });
    try {
      result.written[name] = await writeDocs(name, payload.collections[name]);
    } catch (err) {
      console.warn(`Restore write failed for ${name}:`, err.code || err.message);
      result.written[name] = 0;
    }
    current += 1;
  }

  if (includeSiteSettings && payload.siteSettings) {
    onProgress?.({ step: 'siteSettings', current, total, phase: 'write' });
    try {
      result.written.siteSettings = await writeSiteSettings(payload.siteSettings, {
        replace: mode === 'replace',
      });
    } catch (err) {
      console.warn('Restore siteSettings failed:', err.code || err.message);
      result.written.siteSettings = 0;
    }
    current += 1;
  }

  onProgress?.({ step: 'done', current: total, total, phase: 'done' });
  return result;
}

/** Quick counts for the backup UI without reading every document. */
export async function getBackupCollectionCounts() {
  const names = [
    ...new Set(ALL_MODULE_IDS.flatMap((id) => BACKUP_MODULES[id].collections)),
    'siteSettings',
  ];
  const counts = {};
  await Promise.all(
    names.map(async (name) => {
      try {
        const snap = await getCountFromServer(collection(db, name));
        counts[name] = snap.data().count;
      } catch {
        counts[name] = 0;
      }
    }),
  );
  return counts;
}

/** Unused helpers kept for single-doc tweaks */
export async function deleteSiteSettingDoc(id) {
  await deleteDoc(doc(db, 'siteSettings', id));
}

export async function upsertSiteSettingDoc(id, data) {
  await setDoc(doc(db, 'siteSettings', id), deserializeFromBackup(data), { merge: true });
}
