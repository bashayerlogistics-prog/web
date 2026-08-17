import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { queueOrRunAdminWrite } from '../../firebase/offlineAdminSync';
import { useToast } from '../../context/ToastContext';
import AdminApplyButton from './AdminApplyButton';
import AdminSelect from './AdminSelect';
import GlassCard from '../ui/GlassCard';

const emptyForm = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  from: '',
  to: '',
  date: '',
  time: '',
  totalPrice: '',
  paymentMethod: 'whatsapp',
  paymentStatus: 'pending',
  notes: '',
};

export default function ManualOrderModal({ open, onClose, onCreated }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderPayload = {
        ...form,
        totalPrice: Number(form.totalPrice) || 0,
        orderSource: 'manual',
        status: 'pending',
      };
      const { queued, result } = await queueOrRunAdminWrite('createManualOrder', { data: orderPayload });
      setForm(emptyForm);
      if (queued) {
        toast.info(i18n.language === 'ar'
          ? 'تم حفظ الطلب محلياً وسيتم إرساله عند عودة الخدمة.'
          : 'Order saved locally and will sync when service returns.');
      } else {
        toast.success(t('payment.manualOrderCreated', { id: result?.orderNumber || '' }));
      }
      onCreated?.({ queued, result });
      onClose?.();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto m-0 sm:m-4 rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-500" />
            {t('payment.manualOrder')}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            ['customerName', t('booking.fullName'), 'text'],
            ['customerEmail', t('auth.email'), 'email'],
            ['customerPhone', t('cart.phoneWhatsApp'), 'tel'],
            ['from', t('payment.manualFrom'), 'text'],
            ['to', t('payment.manualTo'), 'text'],
            ['date', t('dashboard.date'), 'date'],
            ['time', t('booking.pickupTime'), 'time'],
            ['totalPrice', t('dashboard.price'), 'number'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={['customerName', 'customerPhone', 'totalPrice'].includes(key)}
                className="admin-input w-full"
                dir={type === 'tel' || type === 'email' || type === 'number' ? 'ltr' : undefined}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('admin.paymentMethod')}</label>
            <AdminSelect
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="admin-input w-full"
            >
              <option value="whatsapp">{t('payment.settings.whatsappPayment')}</option>
              <option value="bank_transfer">{t('payment.settings.bankTransfer')}</option>
            </AdminSelect>
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder={t('cart.notes')}
            className="admin-input w-full"
          />

          <AdminApplyButton type="submit" loading={loading} label={t('payment.createManualOrder')} fullWidth />
        </form>
      </GlassCard>
    </div>
  );
}
