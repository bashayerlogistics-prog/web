import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Calendar, Clock, CreditCard, User, Tag, Bell, Truck, CheckCircle, XCircle, ExternalLink, FileText } from 'lucide-react';
import { CITIES } from '../../data/staticData';
import { getCityName, getStatusLabel, formatBookingDateTime } from '../../utils/bookingHelpers';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../../utils/paymentHelpers';
import StatusBadge from '../ui/StatusBadge';
import BookingTracker from '../ui/BookingTracker';
import OrderInvoiceModal from './OrderInvoiceModal';
import AdminSelect from './AdminSelect';

export default function OrderDetailModal({
  booking,
  user,
  open,
  onClose,
  onStatusChange,
  onPaymentChange,
  onConfirmPayment,
  onRejectPayment,
  onSendNotification,
  orderDisplayId,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !booking) return null;

  const timeline = booking.trackingTimeline || [];

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-in flex flex-col">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-primary-200 font-mono">#{orderDisplayId || booking.orderNumber || '—'}</p>
            <h2 className="text-lg font-black">{t('admin.orderDetail')}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} label={getStatusLabel(booking.status, lang)} size="lg" />
            <AdminSelect value={booking.status || 'pending'} onChange={(e) => onStatusChange(booking.id, e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500">
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="confirmed">{t('admin.status.confirmed')}</option>
              <option value="completed">{t('admin.status.completed')}</option>
              <option value="cancelled">{t('admin.status.cancelled')}</option>
            </AdminSelect>
          </div>

          <BookingTracker status={booking.status} />

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: MapPin, label: t('dashboard.route'), value: `${getCityName(CITIES, booking.from, lang)} → ${getCityName(CITIES, booking.to, lang)}` },
              { icon: Calendar, label: t('dashboard.date'), value: booking.date },
              { icon: Clock, label: t('booking.pickupTime'), value: booking.time },
              { icon: Tag, label: t('dashboard.price'), value: `${booking.totalPrice || booking.price} ${t('booking.sar')}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1"><Icon className="w-3.5 h-3.5" />{label}</div>
                <p className="font-semibold text-dark-800 dark:text-white">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-dark-700 bg-gradient-to-br from-gray-50 to-white dark:from-dark-700/50 dark:to-dark-800">
            <h3 className="font-black text-dark-800 dark:text-white flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary-500" />
              {t('admin.paymentSection')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div><span className="text-gray-500">{t('admin.paymentMethod')}:</span> <span className="font-semibold ms-1">{getPaymentMethodLabel(booking.paymentMethod, lang)}</span></div>
              <div><span className="text-gray-500">{t('admin.paymentStatus')}:</span> <span className="font-bold text-primary-600 ms-1">{getPaymentStatusLabel(booking.paymentStatus || 'pending', lang)}</span></div>
              {booking.paymentProvider && (
                <div><span className="text-gray-500">{t('payment.provider')}:</span> <span className="font-semibold ms-1 capitalize">{booking.paymentProvider}</span></div>
              )}
              {(booking.amount != null || booking.totalPrice != null) && (
                <div><span className="text-gray-500">{t('admin.orders.amount')}:</span> <span className="font-semibold ms-1">{booking.amount ?? booking.totalPrice ?? booking.price} {booking.currency || t('booking.sar')}</span></div>
              )}
              {booking.paymentId && (
                <div className="col-span-2" dir="ltr"><span className="text-gray-500">{t('payment.transactionId')}:</span> <span className="font-mono text-xs font-semibold ms-1 break-all">{booking.paymentId}</span></div>
              )}
              {booking.transactionReference && booking.transactionReference !== booking.paymentId && (
                <div className="col-span-2" dir="ltr"><span className="text-gray-500">{t('payment.transactionReference')}:</span> <span className="font-mono text-xs font-semibold ms-1 break-all">{booking.transactionReference}</span></div>
              )}
              {booking.paidAt && (
                <div className="col-span-2"><span className="text-gray-500">{t('payment.paidAt')}:</span> <span className="font-semibold ms-1">{formatBookingDateTime({ toDate: () => new Date(booking.paidAt) }, lang)}</span></div>
              )}
              {booking.orderSource && (
                <div className="col-span-2"><span className="text-gray-500">{t('payment.orderSource')}:</span> <span className="font-semibold ms-1 capitalize">{booking.orderSource}</span></div>
              )}
              {booking.customerPhone && (
                <div className="col-span-2" dir="ltr"><span className="text-gray-500">{t('cart.phoneWhatsApp')}:</span> <span className="font-semibold ms-1">{booking.customerPhone}</span></div>
              )}
            </div>

            {booking.paymentProofUrl && (
              <div className="mb-4 p-3 rounded-xl bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-600">
                <p className="text-xs font-bold text-gray-500 mb-2">{t('payment.proofScreenshot')}</p>
                <a href={booking.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={booking.paymentProofUrl} alt="" className="max-h-48 rounded-lg border border-gray-200 object-contain w-full" />
                </a>
                <a href={booking.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 font-bold mt-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('payment.viewProof')}
                </a>
              </div>
            )}

            {(booking.paymentStatus === 'proof_submitted' || booking.paymentStatus === 'pending')
              && onConfirmPayment
              && booking.paymentProvider !== 'moyasar' && (
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    try { await onConfirmPayment(booking.id); } finally { setActionLoading(false); }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('payment.confirmPayment')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    try { await onRejectPayment(booking.id, rejectReason); } finally { setActionLoading(false); }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  {t('payment.rejectPayment')}
                </button>
              </div>
            )}

            {booking.paymentProvider === 'moyasar' && booking.paymentStatus === 'pending' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                {t('payment.moyasarAdminPending')}
              </p>
            )}

            {onRejectPayment && booking.paymentProvider !== 'moyasar' && (
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('payment.rejectReasonPlaceholder')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm mb-3"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {['pending', 'proof_submitted', 'paid', 'failed', 'cancelled', 'rejected', 'refunded'].map((ps) => (
                <button key={ps} type="button" onClick={() => onPaymentChange(booking.id, ps)}
                  className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 ${
                    (booking.paymentStatus || 'pending') === ps
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
                  }`}>
                  {getPaymentStatusLabel(ps, lang)}
                </button>
              ))}
            </div>

            {booking.orderItems?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-600">
                <p className="text-xs font-bold text-gray-500 mb-2">{t('payment.orderItems')} ({booking.orderItems.length})</p>
                <ul className="space-y-1 text-xs">
                  {booking.orderItems.map((item, i) => (
                    <li key={item.id || i} className="flex justify-between gap-2">
                      <span className="truncate">{item.shortName?.[lang] || item.routeTitle?.[lang] || item.routeTitle?.ar}</span>
                      <span className="font-bold shrink-0">{item.price} {t('booking.sar')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Customer */}
          {user && (
            <div className="p-4 rounded-2xl border border-gray-100 dark:border-dark-700">
              <h3 className="font-black flex items-center gap-2 mb-2"><User className="w-5 h-5 text-primary-500" />{t('admin.customer')}</h3>
              <p className="font-bold">{user.displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <h3 className="font-black flex items-center gap-2 mb-3"><Truck className="w-5 h-5 text-primary-500" />{t('admin.trackingHistory')}</h3>
              <ul className="space-y-2">
                {timeline.map((entry, i) => (
                  <li key={i} className="flex gap-3 text-sm p-2 rounded-lg bg-gray-50 dark:bg-dark-700/50">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                    <div>
                      <p className="font-semibold">{entry.label || entry.status}</p>
                      <p className="text-xs text-gray-400">{entry.at ? formatBookingDateTime({ toDate: () => new Date(entry.at) }, lang) : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-dark-700 flex gap-3 flex-shrink-0">
          <button type="button" onClick={() => setInvoiceOpen(true)}
            className="px-4 py-3 rounded-xl border border-primary-200 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
            aria-label={lang === 'ar' ? 'الفاتورة' : 'Invoice'}
          >
            <FileText className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => onSendNotification(booking, user)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/25">
            <Bell className="w-5 h-5" />
            {t('admin.notifyUser')}
          </button>
          <button type="button" onClick={onClose}
            className="px-6 py-3 rounded-xl border border-gray-200 dark:border-dark-600 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            {t('common.cancel')}
          </button>
        </div>
        <OrderInvoiceModal
          booking={booking}
          orderDisplayId={orderDisplayId || booking.orderNumber}
          open={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
        />
      </div>
    </div>
  );
}
