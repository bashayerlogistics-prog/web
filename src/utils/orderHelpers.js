function tsMillis(booking) {
  const ts = booking?.createdAt;
  if (!ts) return 0;
  return ts.toMillis?.() ?? ts.seconds * 1000 ?? 0;
}

function parseOrderNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

/** Build display order numbers (001, 002…) oldest booking = 001 */
export function buildOrderNumberMap(bookings) {
  const sorted = [...bookings].sort((a, b) => tsMillis(a) - tsMillis(b));
  const map = {};
  sorted.forEach((b, i) => {
    map[b.id] = parseOrderNumber(b.orderNumber) ?? i + 1;
  });
  return map;
}

export function formatOrderNumber(num) {
  if (num == null || num === '') return '—';
  return String(num).padStart(3, '0');
}

export function getOrderDisplayId(booking, orderNumberMap) {
  const num = parseOrderNumber(booking?.orderNumber) ?? orderNumberMap?.[booking?.id];
  return formatOrderNumber(num);
}

export function orderNumberMatches(booking, orderNumberMap, query) {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return true;
  const num = getOrderDisplayId(booking, orderNumberMap);
  return (
    num.includes(q)
    || booking.id?.toLowerCase().includes(q)
    || String(parseOrderNumber(booking?.orderNumber) || '').includes(q)
  );
}

/**
 * Merge booking snapshot + users collection so admin always has
 * name / phone / email even when the user doc is missing or incomplete.
 */
export function resolveOrderCustomer(booking, user) {
  const name = String(
    booking?.customerName
    || user?.displayName
    || user?.fullName
    || '',
  ).trim();
  const email = String(
    booking?.customerEmail
    || user?.email
    || '',
  ).trim();
  const phone = String(
    booking?.customerPhone
    || user?.phone
    || '',
  ).trim();
  const userId = booking?.userId || user?.id || user?.uid || null;
  const isGuest = Boolean(booking?.isGuest ?? !userId);

  return {
    name: name || '',
    email: email || '',
    phone: phone || '',
    userId,
    isGuest,
    hasAny: Boolean(name || email || phone || userId),
    label: name || email || phone || '',
  };
}
