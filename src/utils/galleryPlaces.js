/** Place categories only — exclude fleet / product tiles from public gallery views. */
export const PLACE_CATEGORIES = new Set(['city', 'airport', 'market', 'route']);

function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://gallery.local');
    return `${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return trimmed.split('?')[0].toLowerCase();
  }
}

function isProductMedia(item) {
  const category = String(item.category || '').toLowerCase();
  if (category === 'fleet') return true;

  const url = `${item.imageUrl || ''} ${item.posterUrl || ''}`;
  if (/vehicle-images|\/vehicles\/|supabase\.co\/storage\/v1\/object\/public\/vehicles/i.test(url)) {
    return true;
  }

  const copy = [
    item.titleEn,
    item.titleAr,
    item.subtitleEn,
    item.subtitleAr,
    item.metaEn,
    item.metaAr,
  ].filter(Boolean).join(' ');

  // Promo / product flyers often embed contact CTAs
  if (/\+?966[\d\s-]{8,}|\bQR\b|واتساب|whats?\s*app/i.test(copy)) {
    return true;
  }

  return false;
}

/**
 * Active place tiles only, unique by image URL (first wins).
 */
export function filterPlacesGalleryItems(items = []) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item || item.active === false) continue;
    if (isProductMedia(item)) continue;

    const category = String(item.category || 'city').toLowerCase();
    if (!PLACE_CATEGORIES.has(category)) continue;

    const key = normalizeMediaUrl(item.imageUrl || item.posterUrl);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    result.push(item);
  }

  return result;
}
