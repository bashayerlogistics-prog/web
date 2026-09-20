const IMGBB_API_KEY = String(import.meta.env.VITE_IMGBB_API_KEY || '').trim();
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload image to imgbb.com (images only — not video)
 * @param {File} file
 * @returns {Promise<string>} public image URL
 */
export async function uploadToImgbb(file) {
  if (!IMGBB_API_KEY) {
    throw new Error('Missing VITE_IMGBB_API_KEY — set it in your env to upload images.');
  }

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', file, file.name || 'image.jpg');

  let res;
  try {
    res = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(err?.message || 'Network error reaching ImgBB');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`ImgBB HTTP ${res.status}`);
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.status_txt || `ImgBB HTTP ${res.status}`);
  }

  return json.data.url;
}

export const IMGBB_MAX_IMAGE_MB = 32;
