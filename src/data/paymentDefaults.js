import { CONTACT, BRAND } from './staticData';

export const DEFAULT_CURRENCY = 'SAR';

export const createEmptySaudiBank = () => ({
  id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  bankName: { ar: '', en: '' },
  accountHolder: { ar: '', en: '' },
  iban: '',
  accountNumber: '',
  swiftBic: '',
  isDefault: false,
  active: true,
});

/** Default Saudi banking & payment configuration (super admin can override). */
export const DEFAULT_PAYMENT_SETTINGS = {
  bankName: { ar: 'البنك الأهلي السعودي', en: 'Al Ahli Bank (SNB)' },
  accountHolder: { ar: 'شركة بشاير العطاء للنقل البري', en: 'Bashayer Al-Ataa Land Transport Company' },
  iban: '',
  accountNumber: '',
  banks: [
    {
      id: 'snb',
      bankName: { ar: 'البنك الأهلي السعودي', en: 'Saudi National Bank (SNB)' },
      accountHolder: { ar: 'شركة بشاير العطاء للنقل البري', en: 'Bashayer Al-Ataa Land Transport Company' },
      iban: '',
      accountNumber: '',
      isDefault: true,
      active: true,
    },
  ],
  whatsappNumber: CONTACT.phone,
  methods: {
    whatsapp: true,
    bankTransfer: true,
    onlineGateway: false,
  },
  instructions: {
    ar: 'بعد التحويل، يرجى رفع صورة إيصال الدفع. سيتم تأكيد حجزك بعد مراجعة الإدارة.',
    en: 'After transferring, please upload a screenshot of your payment receipt. Your booking will be confirmed once reviewed by our team.',
  },
  email: {
    brandName: BRAND.shortName,
    fromEmail: CONTACT.email,
    fromName: { ar: 'بشاير العطاء', en: 'Bashayer Al-Ataa' },
    replyTo: CONTACT.email,
    webhookUrl: '',
  },
  gateway: {
    provider: 'moyasar',
    publishableKey: '',
  },
  moyasar: {
    enabled: false,
    visa: true,
    mastercard: true,
    mada: true,
    applePay: true,
    stcPay: true,
  },
};

export const PAYMENT_METHODS = {
  WHATSAPP: 'whatsapp',
  BANK_TRANSFER: 'bank_transfer',
  ONLINE_GATEWAY: 'online_gateway',
  MOYASAR: 'moyasar',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROOF_SUBMITTED: 'proof_submitted',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  REFUNDED: 'refunded',
};
