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
  if (bank.swiftBic) {
    lines.push({ label: 'SWIFT/BIC', value: bank.swiftBic, ltr: true });
  }
  return lines;
}

/** Convert SAR amount to Moyasar halalas (smallest currency unit). */
export function sarToHalalas(amountSar) {
  const n = Number(amountSar);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function getMoyasarPublishableKey(settings) {
  const fromEnv = import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY;
  if (fromEnv && String(fromEnv).startsWith('pk_')) return String(fromEnv).trim();
  const fromSettings = settings?.gateway?.publishableKey;
  if (fromSettings && String(fromSettings).startsWith('pk_')) return String(fromSettings).trim();
  return '';
}

export function buildMoyasarFormConfig(settings, lang = 'ar') {
  const moyasar = settings?.moyasar || {};
  const methods = [];
  const supportedNetworks = [];
  if (moyasar.visa) supportedNetworks.push('visa');
  if (moyasar.mastercard) supportedNetworks.push('mastercard');
  if (moyasar.mada) supportedNetworks.push('mada');
  if (supportedNetworks.length) methods.push('creditcard');
  if (moyasar.applePay) methods.push('applepay');
  if (moyasar.stcPay) methods.push('stcpay');
  return {
    methods,
    supported_networks: supportedNetworks.length ? supportedNetworks : ['mada', 'visa', 'mastercard'],
    language: lang === 'en' ? 'en' : 'ar',
    country: 'SA',
  };
}

export function isOnlinePaymentConfigured(settings) {
  if (!settings?.methods?.onlineGateway) return false;
  if (settings?.gateway?.provider && settings.gateway.provider !== 'moyasar') return false;
  const key = getMoyasarPublishableKey(settings);
  if (!key) return false;
  const { methods } = buildMoyasarFormConfig(settings);
  return methods.length > 0;
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
    moyasar: { ar: 'دفع إلكتروني', en: 'Online Payment' },
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
    failed: { ar: 'فشل', en: 'Failed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
    refunded: { ar: 'مسترد', en: 'Refunded' },
  };
  return labels[status]?.[lang] || labels[status]?.en || status;
}
