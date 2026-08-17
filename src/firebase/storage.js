import { uploadToImgbb } from './imgbb';
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

/**
 * Images only → compress to target KB, then ImgBB.
 * Folder kept for call-site compatibility (ImgBB has no folders).
 * @param {File} file
 * @param {string} [folder]
 * @param {{ maxSizeKB?: number }} [opts]
 */
export async function uploadMedia(file, folder = 'uploads', opts = {}) {
  void folder;
  if (isVideoFile(file)) {
    throw new Error('Video upload needs a direct URL (Paste URL). ImgBB is images-only.');
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
    maxEdge: 1400,
    quality: 0.76,
    maxBytes,
  });

  if (compressed.size > maxBytes) {
    const err = new Error(`STILL_TOO_LARGE:${maxSizeKB}:${compressed.size}`);
    err.code = 'STILL_TOO_LARGE';
    err.maxSizeKB = maxSizeKB;
    err.optimizedBytes = compressed.size;
    throw err;
  }

  return uploadToImgbb(compressed);
}

export async function uploadImage(file, folder = 'uploads', opts = {}) {
  return uploadMedia(file, folder, opts);
}

export async function deleteImageByUrl(_url) {
  // imgbb has no client-side delete API — no-op
}

export { isVideoFile };
