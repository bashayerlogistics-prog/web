import { CONTACT } from '../data/staticData';

export function formatPrice(price, sarLabel) {
  return `${price} ${sarLabel}`;
}

export function buildWhatsAppUrl(message) {
  return `${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function buildVehicleWhatsAppMessage({
  lang,
  sarLabel,
  vehicleName,
  routeTitle,
  price,
  pickup,
  destination,
  passengers,
  date,
  time,
  notes,
}) {
  const lines = [
    vehicleName,
    routeTitle,
    pickup && destination ? `${pickup} → ${destination}` : null,
    date && time ? `${date} ${time}` : null,
    passengers ? `${passengers} passengers` : null,
    price ? formatPrice(price, sarLabel) : null,
    notes || null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildCartWhatsAppMessage({ lang, sarLabel, items, customerName, customerPhone, notes }) {
  const header = lang === 'ar' ? 'طلب حجز من الموقع' : 'Booking request from website';
  const lines = [header, ''];

  items.forEach((item, i) => {
    const name = item.shortName?.[lang] || item.vehicleName?.[lang] || item.vehicleName?.ar;
    const route = item.routeTitle?.[lang] || item.routeTitle?.ar;
    lines.push(`${i + 1}. ${name}`);
    lines.push(route);
    if (item.pickupLabel && item.destinationLabel) {
      lines.push(`${item.pickupLabel} → ${item.destinationLabel}`);
    }
    if (item.date && item.time) lines.push(`${item.date} ${item.time}`);
    if (item.passengers) lines.push(`${item.passengers} ${lang === 'ar' ? 'ركاب' : 'passengers'}`);
    lines.push(formatPrice(item.price, sarLabel));
    lines.push('');
  });

  const total = items.reduce((sum, item) => sum + item.price, 0);
  lines.push(lang === 'ar' ? `الإجمالي: ${formatPrice(total, sarLabel)}` : `Total: ${formatPrice(total, sarLabel)}`);
  lines.push('');
  if (customerName) lines.push(lang === 'ar' ? `الاسم: ${customerName}` : `Name: ${customerName}`);
  if (customerPhone) lines.push(lang === 'ar' ? `الجوال: ${customerPhone}` : `Phone: ${customerPhone}`);
  if (notes) lines.push(lang === 'ar' ? `ملاحظات: ${notes}` : `Notes: ${notes}`);

  return lines.join('\n');
}
