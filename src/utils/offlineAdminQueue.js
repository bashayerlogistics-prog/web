const DB_NAME = 'bashayer-offline';
const DB_VERSION = 2;
const STORE_NAME = 'pendingAdminWrites';
const CHANGE_EVENT = 'bashayer:pending-admin-writes-changed';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('pendingOrders')) {
        database.createObjectStore('pendingOrders', { keyPath: 'bookingId' });
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function announceChange() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function createQueueId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function queueAdminWrite(entry) {
  const payload = {
    id: entry.id || createQueueId(),
    type: entry.type,
    payload: entry.payload,
    queuedAt: entry.queuedAt || new Date().toISOString(),
  };
  await withStore('readwrite', (store) => store.put(payload));
  announceChange();
  return payload;
}

export async function getPendingAdminWrites() {
  const items = await withStore('readonly', (store) => store.getAll());
  return items.sort((a, b) => (a.queuedAt || '').localeCompare(b.queuedAt || ''));
}

export async function removePendingAdminWrite(id) {
  await withStore('readwrite', (store) => store.delete(id));
  announceChange();
}

export function subscribeToPendingAdminWrites(callback) {
  let active = true;
  const emit = async () => {
    try {
      const items = await getPendingAdminWrites();
      if (active) callback(items);
    } catch (err) {
      console.warn('Pending admin writes cache unavailable:', err?.message);
    }
  };
  const onChange = () => emit();
  window.addEventListener(CHANGE_EVENT, onChange);
  emit();
  return () => {
    active = false;
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
