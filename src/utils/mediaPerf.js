/**
 * Keep gallery/hero media light: strip UHD/4K sources that blank the page
 * and prefer smaller display-friendly URLs when we can rewrite them.
 */

const UNSPLASH_HOST = /images\.unsplash\.com/i;
const PEXELS_IMG = /images\.pexels\.com/i;
const FIREBASE_STORAGE = /firebasestorage\.googleapis\.com/i;
const IMGBB_HOST = /i\.ibb\.co/i;

function withUnsplashParams(url, { w, q = 72 } = {}) {
  try {
    const u = new URL(url);
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    if (w) u.searchParams.set('w', String(w));
    u.searchParams.set('q', String(q));
    return u.toString();
  } catch {
    return url;
  }
}

function withPexelsParams(url, { w } = {}) {
  try {
    const u = new URL(url);
    if (w) u.searchParams.set('w', String(w));
    u.searchParams.set('auto', 'compress');
    u.searchParams.set('cs', 'tinysrgb');
    return u.toString();
  } catch {
    return url;
  }
}

/** Firebase Storage / ImgBB — cap width query when missing. */
function withGenericWidth(url, width) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('w=') || url.includes('width=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}`;
}

export function lightenMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // Pexels UHD/HD → SD when the same file id pattern is present
  if (/videos\.pexels\.com/i.test(url) && /uhd_|4k_/i.test(url)) {
    return url
      .replace(/-uhd_\d+_\d+_\d+fps/i, '-sd_640_360_25fps')
      .replace(/-4k_\d+_\d+_\d+fps/i, '-sd_640_360_25fps');
  }

  if (/videos\.pexels\.com/i.test(url) && /-hd_\d+_\d+_\d+fps/i.test(url)) {
    return url.replace(/-hd_\d+_\d+_\d+fps/i, '-sd_640_360_25fps');
  }

  return url;
}

/**
 * Resize-friendly URL for cards / lightbox (CDN hosts only).
 * Local `/images/...` paths are returned as-is (already webp in repo).
 */
export function optimizedImageUrl(url, width = 640, quality = 72) {
  if (!url || typeof url !== 'string') return url;
  const light = lightenMediaUrl(url);
  if (UNSPLASH_HOST.test(light)) return withUnsplashParams(light, { w: width, q: quality });
  if (PEXELS_IMG.test(light)) return withPexelsParams(light, { w: width });
  if (FIREBASE_STORAGE.test(light) || IMGBB_HOST.test(light)) {
    return withGenericWidth(light, width);
  }
  return light;
}

/** Prefer a compact poster/image over a video for list cards. */
export function galleryCardSrc(item, width = 640) {
  const raw = item?.posterUrl || item?.imageUrl || '';
  return optimizedImageUrl(raw, width, 72);
}

/** Responsive srcset for Unsplash/Pexels; empty for local assets. */
export function gallerySrcSet(url, widths = [320, 480, 640, 960]) {
  if (!url || typeof url !== 'string') return undefined;
  if (!UNSPLASH_HOST.test(url) && !PEXELS_IMG.test(url)) return undefined;
  return widths
    .map((w) => `${optimizedImageUrl(url, w)} ${w}w`)
    .join(', ');
}
