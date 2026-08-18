import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './db';
import { DEFAULT_BRANDING } from '../data/brandingDefaults';

function normalizeBranding(data) {
  return {
    ...DEFAULT_BRANDING,
    ...data,
    userFontAr: data?.userFontAr || data?.userFont || DEFAULT_BRANDING.userFontAr,
    userFontEn: data?.userFontEn || DEFAULT_BRANDING.userFontEn,
  };
}

export async function getBrandingSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'branding'));
    if (!snap.exists()) return { ...DEFAULT_BRANDING };
    return normalizeBranding(snap.data());
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function subscribeBrandingSettings(onData) {
  try {
    return onSnapshot(
      doc(db, 'siteSettings', 'branding'),
      (snap) => {
        if (!snap.exists()) {
          onData({ ...DEFAULT_BRANDING });
          return;
        }
        onData(normalizeBranding(snap.data()));
      },
      () => onData({ ...DEFAULT_BRANDING }),
    );
  } catch {
    onData({ ...DEFAULT_BRANDING });
    return () => {};
  }
}

export async function updateBrandingSettings(data) {
  await setDoc(doc(db, 'siteSettings', 'branding'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
