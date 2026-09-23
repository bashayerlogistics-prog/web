import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './db';
import { fsGetDoc } from './reads';
import { DEFAULT_BRANDING } from '../data/brandingDefaults';
import {
  isMysqlCmsEnabled,
  mysqlFetchSettings,
  mysqlUpsertSettings,
  mysqlBumpRevision,
} from '../api/mysqlApi';
import { bumpContentRevision } from './content';

function normalizeBranding(data) {
  return {
    ...DEFAULT_BRANDING,
    ...data,
    userFontAr: data?.userFontAr || data?.userFont || DEFAULT_BRANDING.userFontAr,
    userFontEn: data?.userFontEn || data?.userFont || DEFAULT_BRANDING.userFontEn,
    logoUrl: String(data?.logoUrl || '').trim() || DEFAULT_BRANDING.logoUrl,
    faviconUrl: String(data?.faviconUrl || '').trim() || DEFAULT_BRANDING.faviconUrl,
  };
}

async function getBrandingFromFirestore() {
  try {
    const snap = await fsGetDoc(doc(db, 'siteSettings', 'branding'));
    if (!snap.exists()) return null;
    return normalizeBranding(snap.data());
  } catch {
    return null;
  }
}

export async function getBrandingSettings() {
  // MySQL first — new devices / Google profiles get live colors without Firestore lag.
  if (isMysqlCmsEnabled()) {
    try {
      const data = await mysqlFetchSettings('branding');
      if (data && typeof data === 'object' && (data.primaryColor || data.secondaryColor)) {
        return normalizeBranding(data);
      }
    } catch {
      // fall through to Firestore
    }
  }

  const fromFs = await getBrandingFromFirestore();
  if (fromFs) {
    // One-time migrate live Firestore palette → MySQL so cold devices stop flashing defaults.
    if (isMysqlCmsEnabled()) {
      void mysqlUpsertSettings('branding', fromFs, { merge: true }).catch(() => {});
    }
    return fromFs;
  }
  return { ...DEFAULT_BRANDING };
}

/**
 * Live branding. onData(branding, meta) where meta.fromCache is true for
 * IndexedDB-first snapshots — callers should not let cache clobber a server read.
 */
export function subscribeBrandingSettings(onData) {
  try {
    return onSnapshot(
      doc(db, 'siteSettings', 'branding'),
      { includeMetadataChanges: true },
      (snap) => {
        const fromCache = Boolean(snap.metadata?.fromCache);
        if (!snap.exists()) {
          onData({ ...DEFAULT_BRANDING }, { fromCache });
          return;
        }
        onData(normalizeBranding(snap.data()), { fromCache });
      },
      () => onData({ ...DEFAULT_BRANDING }, { fromCache: false }),
    );
  } catch {
    onData({ ...DEFAULT_BRANDING }, { fromCache: false });
    return () => {};
  }
}

export async function updateBrandingSettings(data) {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // Dual-write so Hostinger visitors + Firebase both see the new palette immediately.
  if (isMysqlCmsEnabled()) {
    try {
      await mysqlUpsertSettings('branding', payload, { merge: true });
      await mysqlBumpRevision();
    } catch (err) {
      console.warn('MySQL branding upsert failed:', err?.message || err);
    }
  }

  await setDoc(doc(db, 'siteSettings', 'branding'), {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  try {
    await bumpContentRevision();
  } catch {
    // ignore
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rafiq_branding');
      localStorage.removeItem('rafiq_branding_at');
    }
  } catch {
    // ignore
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('bashayer-site-content');
      channel.postMessage({ type: 'branding' });
      channel.close();
    }
  } catch {
    // ignore
  }
}
