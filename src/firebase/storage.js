import { uploadToImgbb } from './imgbb';
import { uploadToFirebaseStorage } from './uploadFirebase';
import {
  compressImageFile,
  DEFAULT_IMAGE_MAX_KB,
  SOURCE_IMAGE_MAX_MB,
} from '../utils/compressImage';

/** Kept for UI hints — video file upload is disabled (ImgBB images only). */
export const VIDEO_MAX_MB = 100;

export { DEFAULT_IMAGE_MAX_KB, SOURCE_IMAGE_MAX_MB };

function isVideoFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('video/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(file.name || '');
}

function isNetworkFetchError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('network error')
    || msg.includes('load failed')
    || err?.name === 'TypeError'
  );
}

/**
 * Images only → compress, then Firebase Storage (reliable on LAN).
 * ImgBB used as secondary when Firebase rejects (rules / not signed in).
 * @param {File} file
 * @param {string} [folder]
 * @param {{ maxSizeKB?: number }} [opts]
 */
export async function uploadMedia(file, folder = 'uploads', opts = {}) {
  if (isVideoFile(file)) {
    throw new Error('Video upload needs a direct URL (Paste URL). Image hosts are images-only.');
  }

  const maxSizeKB = opts.maxSizeKB ?? DEFAULT_IMAGE_MAX_KB;
  const maxBytes = maxSizeKB * 1024;
  const sourceCap = SOURCE_IMAGE_MAX_MB * 1024 * 1024;

  if (file.size > sourceCap) {
    const err = new Error(`SOURCE_TOO_LARGE:${SOURCE_IMAGE_MAX_MB}`);
    err.code = 'SOURCE_TOO_LARGE';
    throw err;
  }

  const compressed = await compressImageFile(file, {
    maxEdge: opts.maxEdge ?? 1400,
    minEdge: opts.minEdge,
    quality: opts.quality ?? 0.76,
    maxBytes,
  });

  if (compressed.size > maxBytes) {
    const err = new Error(`STILL_TOO_LARGE:${maxSizeKB}:${compressed.size}`);
    err.code = 'STILL_TOO_LARGE';
    err.maxSizeKB = maxSizeKB;
    err.optimizedBytes = compressed.size;
    throw err;
  }

  // Prefer Firebase — works when ImgBB is blocked (common on LAN / KSA networks).
  try {
    return await uploadToFirebaseStorage(compressed, folder);
  } catch (firebaseErr) {
    console.warn('Firebase Storage upload failed, trying ImgBB:', firebaseErr?.code || firebaseErr?.message);
    try {
      return await uploadToImgbb(compressed);
    } catch (imgbbErr) {
      const fbMsg = firebaseErr?.code || firebaseErr?.message || 'Firebase upload failed';
      const ibMsg = imgbbErr?.message || 'ImgBB upload failed';
      if (isNetworkFetchError(imgbbErr) || isNetworkFetchError(firebaseErr)) {
        throw new Error(
          `Upload failed (network). Sign in as SuperAdmin and check Storage rules. Details: ${fbMsg} / ${ibMsg}`,
        );
      }
      throw new Error(`${fbMsg} · ${ibMsg}`);
    }
  }
}

export async function uploadImage(file, folder = 'uploads', opts = {}) {
  return uploadMedia(file, folder, opts);
}

export async function deleteImageByUrl(_url) {
  // Client-side delete not used — no-op
}

export { isVideoFile };
