const DB_NAME = 'bashayer-offline';
const DB_VERSION = 2;
const STORE_NAME = 'pendingOrders';
const ADMIN_STORE_NAME = 'pendingAdminWrites';
const CHANGE_EVENT = 'bashayer:pending-orders-changed';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'bookingId' });
      }
      if (!database.objectStoreNames.contains(ADMIN_STORE_NAME)) {
        database.createObjectStore(ADMIN_STORE_NAME, { keyPath: 'id' });
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

export async function queuePendingOrder(order) {
  await withStore('readwrite', (store) => store.put(order));
  announceChange();
  return order;
}

export async function getPendingOrders() {
  const orders = await withStore('readonly', (store) => store.getAll());
  return orders.sort((a, b) => (a.queuedAt || '').localeCompare(b.queuedAt || ''));
}

export async function removePendingOrder(bookingId) {
  await withStore('readwrite', (store) => store.delete(bookingId));
  announceChange();
}

export function subscribeToPendingOrders(callback) {
  let active = true;
  const emit = async () => {
    try {
      const orders = await getPendingOrders();
      if (active) callback(orders);
    } catch (err) {
      console.warn('Pending orders cache unavailable:', err?.message);
    }
  };
  const onChange = () => emit();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  emit();
  return () => {
    active = false;
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function isRetryableFirebaseError(err) {
  const code = String(err?.code || '');
  const message = String(err?.message || '');
  return (
    !navigator.onLine
    || code === 'resource-exhausted'
    || code === 'unavailable'
    || code === 'deadline-exceeded'
    || code === 'network-request-failed'
    || /429|offline|network|resource-exhausted|unavailable/i.test(message)
  );
}
