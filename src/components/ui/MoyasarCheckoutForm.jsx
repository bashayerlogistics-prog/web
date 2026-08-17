import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentSettings } from '../../hooks/usePaymentSettings';
import { useMoyasarScript } from '../../hooks/useMoyasarScript';
import {
  buildMoyasarFormConfig,
  getMoyasarPublishableKey,
  sarToHalalas,
} from '../../utils/paymentHelpers';
import { verifyMoyasarPayment } from '../../firebase/moyasarPayment';
import { DEFAULT_CURRENCY } from '../../data/paymentDefaults';
import LoadingSpinner from './LoadingSpinner';
import AlertBanner from './AlertBanner';

export default function MoyasarCheckoutForm({
  bookingId,
  orderNumber,
  amountSar,
  customerName,
  customerEmail,
  onPaid,
  onFailed,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { settings } = usePaymentSettings();
  const formRef = useRef(null);
  const initRef = useRef(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);

  const publishableKey = getMoyasarPublishableKey(settings);
  const formConfig = buildMoyasarFormConfig(settings, lang);
  const { ready: scriptReady, error: scriptError } = useMoyasarScript(Boolean(bookingId && publishableKey));

  const halalas = sarToHalalas(amountSar);
  const callbackUrl = `${window.location.origin}/payment/return?bookingId=${encodeURIComponent(bookingId)}`;

  useEffect(() => {
    if (!scriptReady || !formRef.current || initRef.current || !publishableKey) return undefined;
    if (halalas < 100) {
      setError(t('payment.moyasarMinAmount'));
      setInitializing(false);
      return undefined;
    }
    if (!formConfig.methods.length) {
      setError(t('payment.moyasarNoMethods'));
      setInitializing(false);
      return undefined;
    }

    initRef.current = true;
    setInitializing(true);
    setError('');
    formRef.current.innerHTML = '';

    const description = orderNumber
      ? `Booking #${orderNumber} (${bookingId})`
      : `Booking ${bookingId}`;

    try {
      window.Moyasar.init({
        element: formRef.current,
        amount: halalas,
        currency: DEFAULT_CURRENCY,
        description,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        methods: formConfig.methods,
        supported_networks: formConfig.supported_networks,
        language: formConfig.language,
        country: formConfig.country,
        metadata: {
          bookingId,
          orderNumber: orderNumber ? String(orderNumber) : '',
          customerEmail: customerEmail || '',
          customerName: customerName || '',
        },
        on_completed: async (payment) => {
          if (!payment?.id) return;
          try {
            await verifyMoyasarPayment({ bookingId, paymentId: payment.id });
          } catch (err) {
            console.warn('Moyasar on_completed verify:', err?.message || err);
          }
        },
        on_failure: (err) => {
          console.warn('Moyasar payment failed:', err);
          onFailed?.(err);
        },
      });
    } catch (err) {
      console.error('Moyasar.init failed:', err);
      setError(t('payment.moyasarInitError'));
      initRef.current = false;
    } finally {
      setInitializing(false);
    }

    return () => {
      initRef.current = false;
      if (formRef.current) formRef.current.innerHTML = '';
    };
  }, [
    scriptReady,
    publishableKey,
    bookingId,
    orderNumber,
    halalas,
    callbackUrl,
    customerEmail,
    customerName,
    formConfig.methods,
    formConfig.supported_networks,
    formConfig.language,
    t,
    onFailed,
  ]);

  if (!publishableKey) {
    return (
      <AlertBanner
        type="warning"
        message={t('payment.moyasarNotConfigured')}
      />
    );
  }

  if (scriptError) {
    return <AlertBanner type="error" message={t('payment.moyasarLoadError')} />;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-xs text-gray-600">{t('payment.moyasarSecureHint')}</p>
      {error && <AlertBanner type="error" message={error} />}
      {(initializing || !scriptReady) && (
        <LoadingSpinner text={t('payment.moyasarLoading')} />
      )}
      <div ref={formRef} className="mysr-form min-h-[120px]" />
      <p className="text-[10px] text-gray-400 leading-relaxed">
        {t('payment.moyasarNetworksHint')}
      </p>
    </div>
  );
}
