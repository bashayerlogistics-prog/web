import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Landmark, MessageCircle, Mail, Globe, Plus, Trash2, RotateCcw, X } from 'lucide-react';
import { usePaymentSettings, invalidatePaymentSettingsCache } from '../../hooks/usePaymentSettings';
import { updatePaymentSettings } from '../../firebase/payment';
import { DEFAULT_PAYMENT_SETTINGS, createEmptySaudiBank } from '../../data/paymentDefaults';
import { useToast } from '../../context/ToastContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand/20 bg-white dark:admin-input text-sm outline-none focus:ring-2 focus:ring-primary-500/40';

export default function AdminPaymentSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings, loading, refresh } = usePaymentSettings();
  const [form, setForm] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [newBank, setNewBank] = useState(null);

  useEffect(() => {
    setForm(settings || DEFAULT_PAYMENT_SETTINGS);
  }, [settings]);

  useEffect(() => {
    if (!bankModalOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setBankModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [bankModalOpen]);

  const setNested = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      let cur = next;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i += 1) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        gateway: {
          ...form.gateway,
          provider: form.methods?.onlineGateway ? (form.gateway?.provider || 'moyasar') : form.gateway?.provider,
        },
        moyasar: {
          ...DEFAULT_PAYMENT_SETTINGS.moyasar,
          ...(form.moyasar || {}),
          enabled: Boolean(form.methods?.onlineGateway),
        },
      };
      await updatePaymentSettings(payload);
      invalidatePaymentSettingsCache();
      await refresh();
      toast.success(t('payment.settings.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const updateBank = (id, path, value) => {
    setForm((prev) => ({
      ...prev,
      banks: prev.banks.map((bank) => {
        if (bank.id !== id) return bank;
        const [group, key] = path.split('.');
        return key ? { ...bank, [group]: { ...bank[group], [key]: value } } : { ...bank, [group]: value };
      }),
    }));
  };

  const addBank = () => {
    setNewBank({
      ...createEmptySaudiBank(),
      isDefault: !(form.banks || []).length,
    });
    setBankModalOpen(true);
  };

  const saveNewBank = () => {
    if (!newBank) return;
    setForm((prev) => ({
      ...prev,
      banks: [...(prev.banks || []), newBank],
    }));
    setBankModalOpen(false);
    setNewBank(null);
  };

  const setDefaultBank = (id) => {
    setForm((prev) => ({
      ...prev,
      banks: prev.banks.map((bank) => ({ ...bank, isDefault: bank.id === id })),
    }));
  };

  const deleteBank = (id) => {
    if (form.banks.length === 1) {
      toast.error(t('payment.settings.lastBank'));
      return;
    }
    const remaining = form.banks.filter((bank) => bank.id !== id);
    const hasDefault = remaining.some((bank) => bank.isDefault);
    setForm({
      ...form,
      banks: remaining.map((bank, index) => ({ ...bank, isDefault: hasDefault ? bank.isDefault : index === 0 })),
    });
  };

  const restoreDefaults = () => {
    if (!window.confirm(t('payment.settings.restoreConfirm'))) return;
    setForm(DEFAULT_PAYMENT_SETTINGS);
    toast.success(t('payment.settings.defaultsRestored'));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('payment.settings.title')}
        subtitle={t('payment.settings.subtitle')}
      >
        <button
          type="button"
          onClick={restoreDefaults}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-brand/30 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <RotateCcw className="w-4 h-4" />
          {t('payment.settings.restoreDefaults')}
        </button>
      </AdminPageHeader>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-primary-500" />
          <h2 className="font-black text-dark-800 dark:text-white">{t('payment.settings.methodsTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'whatsapp', icon: MessageCircle, label: t('payment.settings.whatsappPayment') },
            { key: 'bankTransfer', icon: Landmark, label: t('payment.settings.bankTransfer') },
            { key: 'onlineGateway', icon: Globe, label: t('payment.settings.onlineGateway') },
          ].map(({ key, icon: Icon, label }) => (
            <label key={key} className="flex items-center gap-3 p-4 rounded-xl border border-white/50 dark:admin-surface cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.methods?.[key]}
                onChange={(e) => setNested(`methods.${key}`, e.target.checked)}
                className="w-4 h-4"
              />
              <Icon className="w-5 h-5 text-brand" />
              <span className="font-semibold text-sm">{label}</span>
            </label>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <Landmark className="w-5 h-5 text-primary-500" />
          <div className="flex-1">
            <h2 className="font-black text-dark-800 dark:text-white">{t('payment.settings.bankTitle')}</h2>
            <p className="text-xs text-gray-500 mt-1">{t('payment.settings.bankHint')}</p>
          </div>
          <button type="button" onClick={addBank} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-white text-sm font-bold">
            <Plus className="w-4 h-4" />
            {t('payment.settings.addBank')}
          </button>
        </div>
        <div className="space-y-4">
          {(form.banks || []).map((bank, index) => (
            <div key={bank.id} className="rounded-2xl border border-gray-200 dark:border-brand/20 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-bold text-sm flex-1">{t('payment.settings.bankAccount')} {index + 1}</p>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={bank.active !== false} onChange={(e) => updateBank(bank.id, 'active', e.target.checked)} />
                  {t('payment.settings.active')}
                </label>
                <button type="button" onClick={() => setDefaultBank(bank.id)} disabled={bank.isDefault} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-brand/30 text-brand disabled:bg-brand/10 disabled:cursor-default">
                  {bank.isDefault ? t('payment.settings.defaultBank') : t('payment.settings.setDefault')}
                </button>
                <button type="button" onClick={() => deleteBank(bank.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50" aria-label={t('payment.settings.deleteBank')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={bank.bankName?.en || ''} onChange={(e) => updateBank(bank.id, 'bankName.en', e.target.value)} placeholder={t('payment.settings.bankNameEn')} className={inputClass} />
                <input value={bank.bankName?.ar || ''} onChange={(e) => updateBank(bank.id, 'bankName.ar', e.target.value)} placeholder={t('payment.settings.bankNameAr')} dir="rtl" className={inputClass} />
                <input value={bank.accountHolder?.en || ''} onChange={(e) => updateBank(bank.id, 'accountHolder.en', e.target.value)} placeholder={t('payment.settings.accountHolderEn')} className={inputClass} />
                <input value={bank.accountHolder?.ar || ''} onChange={(e) => updateBank(bank.id, 'accountHolder.ar', e.target.value)} placeholder={t('payment.settings.accountHolderAr')} dir="rtl" className={inputClass} />
                <input value={bank.iban || ''} onChange={(e) => updateBank(bank.id, 'iban', e.target.value.toUpperCase())} placeholder="IBAN (SA...)" dir="ltr" className={inputClass} />
                <input value={bank.accountNumber || ''} onChange={(e) => updateBank(bank.id, 'accountNumber', e.target.value)} placeholder={t('payment.settings.accountNumber')} dir="ltr" className={inputClass} />
                <input value={bank.swiftBic || ''} onChange={(e) => updateBank(bank.id, 'swiftBic', e.target.value.toUpperCase())} placeholder={t('payment.settings.swiftBic')} dir="ltr" className={inputClass} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <h2 className="font-black text-dark-800 dark:text-white">{t('payment.settings.whatsappTitle')}</h2>
        </div>
        <input
          value={form.whatsappNumber || ''}
          onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
          placeholder="+966577469103"
          dir="ltr"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-2">{t('payment.settings.whatsappHint')}</p>
      </GlassCard>

      <GlassCard>
        <h2 className="font-black text-dark-800 dark:text-white mb-4">{t('payment.settings.instructionsTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            value={form.instructions?.en || ''}
            onChange={(e) => setNested('instructions.en', e.target.value)}
            rows={4}
            placeholder={t('payment.settings.instructionsEn')}
            className={inputClass}
          />
          <textarea
            value={form.instructions?.ar || ''}
            onChange={(e) => setNested('instructions.ar', e.target.value)}
            rows={4}
            placeholder={t('payment.settings.instructionsAr')}
            dir="rtl"
            className={inputClass}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <Mail className="w-5 h-5 text-primary-500" />
          <h2 className="font-black text-dark-800 dark:text-white">{t('payment.settings.emailTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={form.email?.brandName?.en || ''}
            onChange={(e) => setNested('email.brandName.en', e.target.value)}
            placeholder={t('payment.settings.brandNameEn')}
            className={inputClass}
          />
          <input
            value={form.email?.brandName?.ar || ''}
            onChange={(e) => setNested('email.brandName.ar', e.target.value)}
            placeholder={t('payment.settings.brandNameAr')}
            dir="rtl"
            className={inputClass}
          />
          <input
            type="email"
            value={form.email?.fromEmail || ''}
            onChange={(e) => setNested('email.fromEmail', e.target.value)}
            placeholder={t('payment.settings.fromEmail')}
            dir="ltr"
            className={inputClass}
          />
          <input
            value={form.email?.replyTo || ''}
            onChange={(e) => setNested('email.replyTo', e.target.value)}
            placeholder={t('payment.settings.replyTo')}
            dir="ltr"
            className={inputClass}
          />
          <input
            value={form.email?.webhookUrl || ''}
            onChange={(e) => setNested('email.webhookUrl', e.target.value)}
            placeholder={t('payment.settings.webhookUrl')}
            dir="ltr"
            className={`${inputClass} md:col-span-2`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-3">{t('payment.settings.emailHint')}</p>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <Globe className="w-5 h-5 text-violet-500" />
          <h2 className="font-black text-dark-800 dark:text-white">{t('payment.settings.gatewayTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <AdminSelect
            value={form.gateway?.provider || 'moyasar'}
            onChange={(e) => setNested('gateway.provider', e.target.value)}
            className={inputClass}
          >
            <option value="moyasar">Moyasar</option>
          </AdminSelect>
          <input
            value={form.gateway?.publishableKey || ''}
            onChange={(e) => setNested('gateway.publishableKey', e.target.value)}
            placeholder={t('payment.settings.publishableKey')}
            dir="ltr"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-gray-500 mb-4">{t('payment.settings.gatewayEnvHint')}</p>
        <h3 className="font-bold text-sm mb-3">{t('payment.settings.moyasarMethodsTitle')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { key: 'visa', label: 'Visa' },
            { key: 'mastercard', label: 'Mastercard' },
            { key: 'mada', label: 'Mada' },
            { key: 'applePay', label: 'Apple Pay' },
            { key: 'stcPay', label: 'STC Pay' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-brand/20 cursor-pointer text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.moyasar?.[key] !== false}
                onChange={(e) => setNested(`moyasar.${key}`, e.target.checked)}
                className="w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="admin-gateway-warning text-xs mt-4 rounded-lg p-3">
          {t('payment.settings.gatewayHint')}
        </p>
        <p className="text-xs text-gray-500 mt-2">{t('payment.settings.applePayHint')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('payment.settings.stcPayHint')}</p>
      </GlassCard>

      <AdminApplyButton
        type="button"
        onClick={handleSave}
        loading={saving}
        label={t('payment.settings.save')}
      />

      {bankModalOpen && newBank && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-dark-900/65 backdrop-blur-sm"
            onClick={() => setBankModalOpen(false)}
            aria-label={t('common.cancel')}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bank-title"
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-brand/15 dark:border-gold/20 bg-white dark:bg-[#180b2a] shadow-2xl animate-modal-in"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-brand/10 dark:border-gold/15 bg-white/95 dark:bg-[#180b2a]/95 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-gold/10 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-brand dark:text-gold" />
                </div>
                <h2 id="add-bank-title" className="font-black text-lg text-dark-900 dark:text-white">
                  {t('payment.settings.addBank')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-brand/5 dark:hover:bg-white/10"
                aria-label={t('common.cancel')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={newBank.bankName.en} onChange={(e) => setNewBank({ ...newBank, bankName: { ...newBank.bankName, en: e.target.value } })} placeholder={t('payment.settings.bankNameEn')} className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.bankName.ar} onChange={(e) => setNewBank({ ...newBank, bankName: { ...newBank.bankName, ar: e.target.value } })} placeholder={t('payment.settings.bankNameAr')} dir="rtl" className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.accountHolder.en} onChange={(e) => setNewBank({ ...newBank, accountHolder: { ...newBank.accountHolder, en: e.target.value } })} placeholder={t('payment.settings.accountHolderEn')} className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.accountHolder.ar} onChange={(e) => setNewBank({ ...newBank, accountHolder: { ...newBank.accountHolder, ar: e.target.value } })} placeholder={t('payment.settings.accountHolderAr')} dir="rtl" className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.iban} onChange={(e) => setNewBank({ ...newBank, iban: e.target.value.toUpperCase() })} placeholder="IBAN (SA...)" dir="ltr" className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} placeholder={t('payment.settings.accountNumber')} dir="ltr" className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
                <input value={newBank.swiftBic || ''} onChange={(e) => setNewBank({ ...newBank, swiftBic: e.target.value.toUpperCase() })} placeholder={t('payment.settings.swiftBic')} dir="ltr" className="admin-input w-full px-4 py-2.5 rounded-xl text-sm" />
              </div>

              <label className="admin-surface flex items-center gap-2 p-3 rounded-xl border border-brand/10 dark:border-gold/15 text-sm font-bold cursor-pointer">
                <input type="checkbox" checked={newBank.active} onChange={(e) => setNewBank({ ...newBank, active: e.target.checked })} />
                {t('payment.settings.active')}
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 px-5 py-4 border-t border-brand/10 dark:border-gold/15 bg-white/95 dark:bg-[#180b2a]/95 backdrop-blur-xl">
              <button type="button" onClick={() => setBankModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-brand/20 dark:border-gold/20 font-bold text-brand dark:text-gray-100">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={saveNewBank} className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold">
                {t('payment.settings.addBank')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
