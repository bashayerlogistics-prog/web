import { uploadToImgbb } from './imgbb';
import { compressImageFile } from '../utils/compressImage';

/** Kept for UI hints — video file upload is disabled (ImgBB images only). */
export const VIDEO_MAX_MB = 100;

function isVideoFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('video/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(file.name || '');
}

/**
 * Images only → compress then ImgBB.
 * No Firebase Storage (not used — cost). Videos: paste a direct URL instead.
 */
export async function uploadMedia(file, folder = 'uploads') {
  void folder;
  if (isVideoFile(file)) {
    throw new Error('Video upload needs a direct URL (Paste URL). ImgBB is images-only.');
  }
  const compressed = await compressImageFile(file, { maxEdge: 1600, quality: 0.78 });
  return uploadToImgbb(compressed);
}

export async function uploadImage(file, folder = 'uploads') {
  return uploadMedia(file, folder);
}

export async function deleteImageByUrl(_url) {
  // imgbb has no client-side delete API — no-op
}

export { isVideoFile };
