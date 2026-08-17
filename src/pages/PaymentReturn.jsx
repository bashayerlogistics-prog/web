import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { verifyMoyasarPayment } from '../firebase/moyasarPayment';
import { formatOrderNumber } from '../utils/orderHelpers';
import AlertBanner from '../components/ui/AlertBanner';

export default function PaymentReturn() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';
  const paymentId = searchParams.get('id') || searchParams.get('payment_id') || '';
  const [state, setState] = useState({ phase: 'loading', message: '' });

  useEffect(() => {
    if (!bookingId || !paymentId) {
      setState({
        phase: 'error',
        message: lang === 'ar'
          ? 'رابط الدفع غير صالح. تواصل معنا إذا تم خصم المبلغ.'
          : 'Invalid payment link. Contact us if you were charged.',
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await verifyMoyasarPayment({ bookingId, paymentId });
        if (cancelled) return;
        if (result?.status === 'paid') {
          setState({ phase: 'success', orderNumber: result.orderNumber });
        } else if (result?.status === 'pending') {
          setState({
            phase: 'pending',
            message: t('payment.moyasarPendingVerification'),
          });
        } else {
          setState({
            phase: 'error',
            message: t('payment.moyasarFailed'),
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Payment verification failed:', err);
        const code = err?.code || '';
        let message = t('payment.moyasarVerifyError');
        if (code === 'functions/failed-precondition') {
          message = err.message || t('payment.moyasarAlreadyPaid');
        } else if (code === 'functions/permission-denied') {
          message = lang === 'ar' ? 'غير مصرح بالتحقق من هذا الطلب.' : 'Not allowed to verify this order.';
        }
        setState({ phase: 'error', message });
      }
    })();

    return () => { cancelled = true; };
  }, [bookingId, paymentId, lang, t]);

  const orderLabel = state.orderNumber ? formatOrderNumber(state.orderNumber) : bookingId.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#EDEFF2]/50 pt-24 pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center">
          {state.phase === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-black text-brand mb-2">{t('payment.moyasarVerifying')}</h1>
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            </>
          )}

          {state.phase === 'success' && (
            <>
              <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
              <h1 className="text-xl font-black text-brand mb-2">{t('payment.moyasarSuccessTitle')}</h1>
              <p className="text-sm text-gray-600 mb-6">
                {t('payment.moyasarSuccessDesc', { id: orderLabel })}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to={`/track?booking=${bookingId}`}
                  className="px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark transition-colors"
                >
                  {t('nav.track')}
                </Link>
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-xl border border-gray-200 font-bold text-brand hover:bg-gray-50 transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
              </div>
            </>
          )}

          {state.phase === 'pending' && (
            <>
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-black text-brand mb-2">{t('payment.moyasarPendingTitle')}</h1>
              <p className="text-sm text-gray-600 mb-4">{state.message}</p>
              <Link to="/dashboard" className="text-brand font-bold text-sm hover:underline">
                {t('nav.dashboard')}
              </Link>
            </>
          )}

          {state.phase === 'error' && (
            <>
              <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-black text-brand mb-2">{t('payment.moyasarFailedTitle')}</h1>
              <div className="mb-6 text-start">
                <AlertBanner type="error" message={state.message} />
              </div>
              <Link
                to="/"
                className="inline-block px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark transition-colors"
              >
                {t('nav.home')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
