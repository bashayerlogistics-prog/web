/**
 * Client-side image compress for SuperAdmin uploads.
 * Outputs JPEG, optionally iterating quality/edge until under maxBytes.
 */

const DEFAULTS = {
  maxEdge: 1400,
  quality: 0.76,
  mime: 'image/jpeg',
  minQuality: 0.48,
  minEdge: 720,
};

export const DEFAULT_IMAGE_MAX_KB = 500;
export const SOURCE_IMAGE_MAX_MB = 12;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compress failed'))),
      mime,
      quality,
    );
  });
}

function drawScaled(img, maxEdge) {
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tw, th);
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas;
}

function toJpegFile(blob, file) {
  const base = (file.name || 'image').replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: DEFAULTS.mime, lastModified: Date.now() });
}

/**
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number, maxBytes?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function compressImageFile(file, opts = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file;

  const maxBytes = opts.maxBytes ?? null;
  const startEdge = opts.maxEdge ?? DEFAULTS.maxEdge;
  const startQuality = opts.quality ?? DEFAULTS.quality;
  const mime = DEFAULTS.mime;

  // Already small enough and no forced re-encode needed
  if (!maxBytes && file.size < 180 * 1024) return file;
  if (maxBytes && file.size <= maxBytes && file.type === 'image/jpeg' && file.size < 180 * 1024) {
    return file;
  }

  try {
    const img = await loadImage(file);
    if (!img.naturalWidth || !img.naturalHeight) return file;

    let edge = startEdge;
    let quality = startQuality;
    let bestBlob = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = drawScaled(img, edge);
      if (!canvas) return file;
      const blob = await canvasToBlob(canvas, mime, quality);
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;

      if (!maxBytes || blob.size <= maxBytes) {
        if (blob.size >= file.size * 0.98 && file.type === 'image/jpeg' && !maxBytes) {
          return file;
        }
        return toJpegFile(blob, file);
      }

      if (quality > DEFAULTS.minQuality + 0.06) {
        quality = Math.max(DEFAULTS.minQuality, quality - 0.1);
      } else if (edge > DEFAULTS.minEdge) {
        edge = Math.max(DEFAULTS.minEdge, Math.round(edge * 0.82));
        quality = Math.max(DEFAULTS.minQuality, startQuality - 0.12);
      } else {
        break;
      }
    }

    if (!bestBlob) return file;
    if (!maxBytes && bestBlob.size >= file.size * 0.95) return file;
    return toJpegFile(bestBlob, file);
  } catch {
    return file;
  }
}
