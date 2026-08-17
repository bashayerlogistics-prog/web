import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Landmark, Globe, Upload, Copy, Check, CreditCard, Smartphone } from 'lucide-react';
import { usePaymentSettings } from '../../hooks/usePaymentSettings';
import {
  formatBankDetails,
  getPaymentMethodLabel,
  isOnlinePaymentConfigured,
} from '../../utils/paymentHelpers';
import { uploadImage } from '../../firebase/storage';
import { PAYMENT_METHODS } from '../../data/paymentDefaults';
import LoadingSpinner from '../ui/LoadingSpinner';

const METHOD_CONFIG = [
  { id: PAYMENT_METHODS.WHATSAPP, icon: MessageCircle, enabledKey: 'whatsapp' },
  { id: PAYMENT_METHODS.BANK_TRANSFER, icon: Landmark, enabledKey: 'bankTransfer' },
  { id: PAYMENT_METHODS.ONLINE_GATEWAY, icon: Globe, enabledKey: 'onlineGateway' },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  proofFile,
  onProofChange,
  showProofUpload = false,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { settings, loading } = usePaymentSettings();
  const [copied, setCopied] = useState('');
  const [uploading, setUploading] = useState(false);

  const onlineReady = isOnlinePaymentConfigured(settings);

  const enabledMethods = METHOD_CONFIG.filter((m) => {
    if (m.id === PAYMENT_METHODS.ONLINE_GATEWAY) {
      return settings.methods?.onlineGateway && onlineReady;
    }
    return settings.methods?.[m.enabledKey];
  });

  useEffect(() => {
    if (!value && enabledMethods.length > 0) {
      onChange?.(enabledMethods[0].id);
    }
  }, [enabledMethods, value, onChange]);

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'payment-proofs');
      onProofChange?.(url, file);
    } catch {
      onProofChange?.(null, file);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner text={t('common.loading')} />;

  if (enabledMethods.length === 0) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
        {t('payment.noMethodsEnabled')}
      </p>
    );
  }

  const bankLines = formatBankDetails(settings, lang);
  const instructions = settings.instructions?.[lang] || settings.instructions?.ar;
  const moyasar = settings.moyasar || {};

  const onlineOptions = [
    { key: 'visa', label: 'Visa', icon: CreditCard, enabled: moyasar.visa },
    { key: 'mastercard', label: 'Mastercard', icon: CreditCard, enabled: moyasar.mastercard },
    { key: 'mada', label: 'Mada', icon: CreditCard, enabled: moyasar.mada },
    { key: 'applePay', label: 'Apple Pay', icon: Smartphone, enabled: moyasar.applePay },
    { key: 'stcPay', label: 'STC Pay', icon: Smartphone, enabled: moyasar.stcPay },
  ].filter((opt) => opt.enabled);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className={`grid gap-2 ${enabledMethods.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {enabledMethods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange?.(m.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-start transition-all ${
              value === m.id
                ? 'border-brand bg-brand/5 text-brand shadow-md shadow-brand/10'
                : 'border-gray-100 hover:border-brand/30'
            }`}
          >
            <m.icon className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold text-sm">{getPaymentMethodLabel(m.id, lang)}</p>
            </div>
          </button>
        ))}
      </div>

      {value === PAYMENT_METHODS.BANK_TRANSFER && (
        <div className="p-4 rounded-2xl border border-brand/15 bg-brand/5 space-y-3">
          <h3 className="font-black text-brand text-sm">{t('payment.bankDetails')}</h3>
          {bankLines.length === 0 ? (
            <p className="text-xs text-amber-700">{t('payment.bankNotConfigured')}</p>
          ) : (
            bankLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{line.label}</p>
                  <p className="font-bold text-brand truncate" dir={line.ltr ? 'ltr' : undefined}>{line.value}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(line.value, line.label)}
                  className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shrink-0"
                  aria-label={t('payment.copy')}
                >
                  {copied === line.label ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            ))
          )}
          {instructions && (
            <p className="text-xs text-gray-600 leading-relaxed pt-2 border-t border-brand/10">{instructions}</p>
          )}

          {showProofUpload && (
            <div className="pt-2">
              <label className="block text-sm font-semibold text-brand mb-2">{t('payment.uploadProof')}</label>
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-brand/30 rounded-xl cursor-pointer hover:bg-white/60 transition-colors">
                <Upload className="w-6 h-6 text-brand" />
                <span className="text-xs font-semibold text-gray-600">
                  {uploading ? t('common.loading') : t('payment.uploadProofHint')}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} disabled={uploading} />
              </label>
              {proofFile && (
                <div className="mt-3">
                  <img src={proofFile} alt="" className="max-h-40 rounded-xl border border-gray-200 object-contain" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {value === PAYMENT_METHODS.WHATSAPP && (
        <p className="text-xs text-gray-600 p-3 rounded-xl bg-green-50 border border-green-100">
          {t('payment.whatsappHint')}
        </p>
      )}

      {value === PAYMENT_METHODS.ONLINE_GATEWAY && onlineOptions.length > 0 && (
        <div className="p-4 rounded-2xl border border-violet-200 bg-violet-50/50 space-y-3">
          <h3 className="font-black text-brand text-sm">{t('payment.onlineOptionsTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            {onlineOptions.map(({ key, label, icon: Icon }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-100 text-xs font-bold text-brand"
              >
                <Icon className="w-3.5 h-3.5 text-violet-600" />
                {label}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600">{t('payment.moyasarSecureHint')}</p>
        </div>
      )}
    </div>
  );
}
