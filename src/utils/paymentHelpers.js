import { CONTACT } from '../data/staticData';

export function buildWhatsAppPaymentUrl(message, whatsappNumber) {
  const raw = String(whatsappNumber || CONTACT.phone).replace(/\D/g, '');
  const phone = raw.startsWith('966') ? raw : `966${raw.replace(/^0/, '')}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function formatBankDetails(settings, lang = 'ar') {
  const bank = settings?.banks?.find((item) => item.isDefault && item.active !== false)
    || settings?.banks?.find((item) => item.active !== false)
    || settings;
  if (!bank) return [];
  const lines = [];
  if (bank.bankName?.[lang] || bank.bankName?.ar) {
    lines.push({ label: lang === 'ar' ? 'البنك' : 'Bank', value: bank.bankName[lang] || bank.bankName.ar });
  }
  if (bank.accountHolder?.[lang] || bank.accountHolder?.ar) {
    lines.push({ label: lang === 'ar' ? 'اسم الحساب' : 'Account Holder', value: bank.accountHolder[lang] || bank.accountHolder.ar });
  }
  if (bank.iban) {
    lines.push({ label: 'IBAN', value: bank.iban, ltr: true });
  }
  if (bank.accountNumber) {
    lines.push({ label: lang === 'ar' ? 'رقم الحساب' : 'Account Number', value: bank.accountNumber, ltr: true });
  }
  return lines;
}

export function buildCheckoutWhatsAppMessage({
  lang,
  sarLabel,
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  total,
  paymentMethod,
  routeLabel,
  date,
  time,
  items,
}) {
  const header = lang === 'ar' ? 'طلب دفع جديد من الموقع' : 'New payment request from website';
  const lines = [header, ''];

  if (orderNumber) {
    lines.push(lang === 'ar' ? `رقم الطلب: #${orderNumber}` : `Order: #${orderNumber}`);
  }
  if (routeLabel) lines.push(routeLabel);
  if (date && time) lines.push(`${date} ${time}`);
  if (items?.length) {
    items.forEach((item, i) => {
      const name = item.shortName?.[lang] || item.vehicleName?.[lang] || item.vehicleName?.ar || item.name;
      lines.push(`${i + 1}. ${name} — ${item.price} ${sarLabel}`);
    });
  }
  if (total != null) {
    lines.push(lang === 'ar' ? `الإجمالي: ${total} ${sarLabel}` : `Total: ${total} ${sarLabel}`);
  }
  lines.push('');
  if (customerName) lines.push(lang === 'ar' ? `الاسم: ${customerName}` : `Name: ${customerName}`);
  if (customerPhone) lines.push(lang === 'ar' ? `الجوال: ${customerPhone}` : `Phone: ${customerPhone}`);
  if (customerEmail) lines.push(lang === 'ar' ? `البريد: ${customerEmail}` : `Email: ${customerEmail}`);
  if (paymentMethod) {
    lines.push(lang === 'ar' ? `طريقة الدفع: ${paymentMethod}` : `Payment: ${paymentMethod}`);
  }
  lines.push('');
  lines.push(lang === 'ar' ? 'يرجى إرسال إيصال الدفع.' : 'Please send payment receipt.');

  return lines.join('\n');
}

export function getPaymentMethodLabel(method, lang = 'ar') {
  const labels = {
    whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    online_gateway: { ar: 'دفع إلكتروني', en: 'Online Payment' },
    card: { ar: 'بطاقة', en: 'Card' },
    cash: { ar: 'نقداً', en: 'Cash' },
  };
  return labels[method]?.[lang] || labels[method]?.ar || method;
}

export function getPaymentStatusLabel(status, lang = 'ar') {
  const labels = {
    pending: { ar: 'معلق', en: 'Pending' },
    proof_submitted: { ar: 'بانتظار المراجعة', en: 'Awaiting Review' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
    refunded: { ar: 'مسترد', en: 'Refunded' },
  };
  return labels[status]?.[lang] || labels[status]?.en || status;
}
