export function normalizeActivityType(type) {
  if (type === 'payment_updated') return 'booking_payment_updated';
  return type;
}

export function getActivityTranslationData(data = {}) {
  return {
    ...data,
    status: data.status ?? data.paymentStatus,
    target: data.target ?? data.userId,
  };
}

export function getActivityLabel(item, t) {
  const type = normalizeActivityType(item.type);
  const data = getActivityTranslationData(item.data);
  const key = `admin.activityTypes.${type}`;
  const translated = t(key, data);
  return translated === key ? item.type.replace(/_/g, ' ') : translated;
}

export function getActivityDetails(item) {
  const d = item.data || {};
  const parts = [];

  if (d.orderNumber) parts.push(`#${d.orderNumber}`);
  else if (d.bookingId) parts.push(`#${d.bookingId.slice(0, 10)}`);
  if (d.paymentStatus) parts.push(d.paymentStatus);
  if (d.status && !d.paymentStatus) parts.push(d.status);
  if (d.email) parts.push(d.email);
  if (d.name) parts.push(d.name);
  if (d.username) parts.push(d.username);
  if (d.userId && !d.email) parts.push(d.userId.slice(0, 10));
  if (d.productId) parts.push(d.productId.slice(0, 10));
  if (d.requestId) parts.push(d.requestId.slice(0, 10));
  if (d.bannerId) parts.push(d.bannerId.slice(0, 10));
  if (item.type === 'notification_sent' && d.type) parts.push(d.type);

  return parts.length ? parts.join(' · ') : '—';
}
