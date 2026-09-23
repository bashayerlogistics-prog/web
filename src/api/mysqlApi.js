/**
 * Hostinger MySQL CMS API client — ultra-fast public + SuperAdmin path.
 * Auth (Clerk Google / email / register / profile) stays on Clerk — not here.
 */

const DEFAULT_API = 'https://bashayer-logistics.com/api/index.php';
const DEFAULT_SITE = 'https://bashayer-logistics.com';

export function isMysqlCmsEnabled() {
  const flag = String(import.meta.env.VITE_DATA_BACKEND || 'mysql').toLowerCase().trim();
  if (flag === 'firebase' || flag === 'off' || flag === '0' || flag === 'false') return false;
  return true;
}

export function mysqlApiUrl(action, extra = {}) {
  const base = (import.meta.env.VITE_MYSQL_API_URL || DEFAULT_API).replace(/\?.*$/, '');
  const qs = new URLSearchParams({ action, ...extra });
  return `${base}?${qs.toString()}`;
}

export function absoluteCmsUrl(path) {
  if (!path || typeof path !== 'string') return path || '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const origin = (import.meta.env.VITE_PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function adminKey() {
  return String(import.meta.env.VITE_MYSQL_ADMIN_KEY || '').trim();
}

async function getJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`MySQL API bad JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `MySQL API HTTP ${res.status}`);
  }
  return data;
}

export async function mysqlHealth() {
  return getJson(mysqlApiUrl('health'));
}

export async function mysqlFetchHome() {
  const data = await getJson(mysqlApiUrl('home'));
  return {
    revision: data.revision || 0,
    homepage: data.homepage || null,
    vehicles: (data.vehicles || []).map((v) => ({
      ...v,
      imageUrl: absoluteCmsUrl(v.imageUrl),
    })),
    packages: (data.packages || []).map((p) => ({
      ...p,
      imageUrl: absoluteCmsUrl(p.imageUrl),
    })),
  };
}

export async function mysqlFetchVehicles() {
  const data = await getJson(mysqlApiUrl('vehicles'));
  return (data.items || []).map((v) => ({
    ...v,
    imageUrl: absoluteCmsUrl(v.imageUrl),
  }));
}

export async function mysqlFetchPackages({ all = false } = {}) {
  const data = await getJson(mysqlApiUrl('packages', all ? { all: '1' } : {}));
  return (data.items || []).map((p) => ({
    ...p,
    imageUrl: absoluteCmsUrl(p.imageUrl),
  }));
}

export async function mysqlFetchSettings(id) {
  const data = await getJson(mysqlApiUrl('settings', id ? { id } : {}));
  return id ? data.data : data.settings;
}

export async function mysqlFetchCollection(name) {
  const data = await getJson(mysqlApiUrl('collection', { name }));
  return (data.items || []).map((item) => {
    const next = { ...item };
    if (next.imageUrl) next.imageUrl = absoluteCmsUrl(next.imageUrl);
    if (next.image) next.image = absoluteCmsUrl(next.image);
    return next;
  });
}

export async function mysqlBumpRevision() {
  return getJson(mysqlApiUrl('bump_revision'), {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey(), 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function mysqlUpsertVehicle(payload) {
  return getJson(mysqlApiUrl('vehicle_upsert'), {
    method: 'POST',
    headers: {
      'X-Admin-Key': adminKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      imageUrl: payload.imageUrl || '',
      syncPackages: payload.syncPackages !== false,
    }),
  });
}

export async function mysqlUpsertSettings(id, data, { merge = false } = {}) {
  return getJson(mysqlApiUrl('settings_upsert'), {
    method: 'POST',
    headers: {
      'X-Admin-Key': adminKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, data, merge: Boolean(merge) }),
  });
}

export async function mysqlUpsertPackage(payload) {
  return getJson(mysqlApiUrl('package_upsert'), {
    method: 'POST',
    headers: {
      'X-Admin-Key': adminKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function mysqlDeletePackage(id) {
  return getJson(mysqlApiUrl('package_delete'), {
    method: 'POST',
    headers: {
      'X-Admin-Key': adminKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: String(id || '').trim() }),
  });
}

/** Compress-ready File → Hostinger /uploads/cms/{folder}/… */
export async function uploadToHostinger(file, folder = 'cms') {
  const key = adminKey();
  if (!key) throw new Error('Missing VITE_MYSQL_ADMIN_KEY for Hostinger upload');
  const body = new FormData();
  body.append('file', file, file.name || 'upload.jpg');
  body.append('folder', folder || 'cms');
  const data = await getJson(mysqlApiUrl('upload'), {
    method: 'POST',
    headers: { 'X-Admin-Key': key },
    body,
  });
  return absoluteCmsUrl(data.url);
}
