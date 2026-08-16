/**
 * Client-side image compress: high visual quality, small upload/payload size.
 * Outputs JPEG (broad ImgBB support) capped by max edge + quality.
 */

const DEFAULTS = {
  maxEdge: 1600,
  quality: 0.78,
  mime: 'image/jpeg',
};

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

/**
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function compressImageFile(file, opts = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;
  // Skip tiny files / GIFs (animation)
  if (file.type === 'image/gif') return file;
  if (file.size < 180 * 1024) return file;

  const maxEdge = opts.maxEdge ?? DEFAULTS.maxEdge;
  const quality = opts.quality ?? DEFAULTS.quality;
  const mime = DEFAULTS.mime;

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, tw, th);

    const blob = await canvasToBlob(canvas, mime, quality);
    // Keep original if compression did not help
    if (blob.size >= file.size * 0.95) return file;

    const base = (file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}
