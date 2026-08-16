import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Bell, Send } from 'lucide-react';

export default function SendNotificationModal({ open, onClose, user, booking, onSend, orderDisplayId }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [message, setMessage] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && booking) {
      const id = orderDisplayId || booking.orderNumber || '';
      setTitle(`Booking #${id} Update`);
      setTitleAr(`تحديث الحجز #${id}`);
      setMessage(`Your booking status: ${booking.status}`);
      setMessageAr(`حالة حجزك: ${booking.status}`);
    }
  }, [open, booking, orderDisplayId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSend({ title, titleAr, message, messageAr, bookingId: booking?.id });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 animate-modal-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-dark-800 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            {t('admin.sendNotification')}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"><X className="w-5 h-5" /></button>
        </div>
        {user && <p className="text-sm text-gray-500 mb-4">{t('admin.sendTo')}: <strong>{user.displayName || user.email}</strong></p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (EN)" required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 outline-none focus:ring-2 focus:ring-primary-500" />
          <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="العنوان (AR)" required dir="rtl"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 outline-none focus:ring-2 focus:ring-primary-500" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (EN)" required rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          <textarea value={messageAr} onChange={(e) => setMessageAr(e.target.value)} placeholder="الرسالة (AR)" required rows={2} dir="rtl"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-60">
            <Send className="w-5 h-5" />
            {loading ? t('common.loading') : t('admin.sendNotification')}
          </button>
        </form>
      </div>
    </div>
  );
}
