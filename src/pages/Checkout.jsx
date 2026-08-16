import { useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { Shield } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useToast } from '../context/ToastContext';

import { CITIES } from '../data/staticData';

import { useSiteContent } from '../context/SiteContentContext';

import { usePaymentSettings } from '../hooks/usePaymentSettings';

import { getCityName } from '../utils/bookingHelpers';

import { createOrderWithPayment } from '../firebase/payment';

import { PAYMENT_METHODS } from '../data/paymentDefaults';

import {

  buildCheckoutWhatsAppMessage,

  buildWhatsAppPaymentUrl,

  getPaymentMethodLabel,

} from '../utils/paymentHelpers';

import { formatOrderNumber } from '../utils/orderHelpers';

import SuccessModal from '../components/ui/SuccessModal';

import AlertBanner from '../components/ui/AlertBanner';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import PaymentMethodSelector from '../components/ui/PaymentMethodSelector';



export default function Checkout() {

  const { t, i18n } = useTranslation();

  const { user } = useAuth();

  const { toast } = useToast();

  const [searchParams] = useSearchParams();

  const { fleet } = useSiteContent();

  const { settings: paymentSettings } = usePaymentSettings();

  const lang = i18n.language;



  const [paymentMethod, setPaymentMethod] = useState('');

  const [customerName, setCustomerName] = useState(user?.displayName || '');

  const [customerPhone, setCustomerPhone] = useState('');

  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  const [proofUrl, setProofUrl] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState(null);



  const tripType = searchParams.get('trip_type') || 'one_way';

  const from = searchParams.get('from') || '';

  const to = searchParams.get('to') || '';

  const date = searchParams.get('date') || '';

  const time = searchParams.get('time') || '';

  const passengers = searchParams.get('passengers') || '1';

  const cars = searchParams.get('cars') || '1';

  const hours = searchParams.get('hours') || '';

  const vehicleId = searchParams.get('vehicle_id') || '1';

  const vehicleKey = searchParams.get('vehicle_key') || '';

  const basePrice = Number(searchParams.get('base_price') || 0);

  const total = Number(searchParams.get('total') || 0);

  const returnDate = searchParams.get('return_date') || '';

  const returnTime = searchParams.get('return_time') || '';

  const routeId = searchParams.get('route') || '';



  const vehicle = fleet.findVehicleById(vehicleKey || vehicleId);



  const routeDisplay = from && to

    ? `${getCityName(CITIES, from, lang)} → ${getCityName(CITIES, to, lang)}`

    : fleet.getRouteLabel(routeId, lang);



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {

      setError(lang === 'ar' ? 'الاسم ورقم الجوال مطلوبان' : 'Name and phone are required');

      return;

    }

    if (!paymentMethod) {

      setError(t('payment.selectMethod'));

      return;

    }

    if (paymentMethod === PAYMENT_METHODS.BANK_TRANSFER && !proofUrl && !proofFile) {

      setError(t('payment.proofRequired'));

      return;

    }



    setError('');

    setLoading(true);



    try {

      if (!user?.uid) {
        setError(lang === 'ar' ? 'يجب تسجيل الدخول لإتمام الطلب' : 'Please log in to place an order');
        setLoading(false);
        return;
      }

      const bookingData = {

        tripType,

        from,

        to,

        date,

        time,

        passengers: Number(passengers),

        cars: Number(cars),

        vehicleId: Number(vehicleId),

        vehicleName: vehicle?.name,

        basePrice,

        totalPrice: total,

        paymentMethod,

        paymentStatus: paymentMethod === PAYMENT_METHODS.BANK_TRANSFER ? 'proof_submitted' : 'pending',

        orderSource: 'website',

        customerName: customerName.trim() || user?.displayName || '',

        customerEmail: customerEmail.trim() || user?.email || '',

        customerPhone: customerPhone.trim(),

        returnDate: returnDate || null,

        returnTime: returnTime || null,

        hours: hours ? Number(hours) : null,

        routeLabel: routeDisplay,

        isGuest: false,

        ...(paymentMethod === PAYMENT_METHODS.BANK_TRANSFER && proofUrl
          ? { paymentProofUrl: proofUrl }
          : {}),

      };



      const { id, orderNumber, queued } = await createOrderWithPayment(
        bookingData,
        user.uid,
        { proofFile },
      );



      if (paymentMethod === PAYMENT_METHODS.WHATSAPP) {

        const message = buildCheckoutWhatsAppMessage({

          lang,

          sarLabel: t('booking.sar'),

          orderNumber: formatOrderNumber(orderNumber),

          customerName: bookingData.customerName,

          customerPhone: bookingData.customerPhone,

          customerEmail: bookingData.customerEmail,

          total: total || basePrice,

          paymentMethod: getPaymentMethodLabel(paymentMethod, lang),

          routeLabel: routeDisplay,

          date,

          time,

        });

        window.open(buildWhatsAppPaymentUrl(message, paymentSettings.whatsappNumber), '_blank', 'noopener,noreferrer');

      }



      setSuccess({ id });

      if (queued) {
        toast.info(
          lang === 'ar'
            ? 'تم حفظ الطلب على هذا الجهاز وسيتم إرساله تلقائياً عند عودة الخدمة.'
            : 'Order saved on this device and will sync automatically when service returns.',
        );
      } else {
        toast.success(t('ui.bookingSuccess'));
      }

    } catch (err) {

      console.error('Checkout order failed:', err);

      const msg = err?.code === 'permission-denied'

        ? (lang === 'ar' ? 'الطلب مرفوض من السيرفر. حاول مرة أخرى.' : 'Order blocked by server. Please try again.')

        : t('common.error');

      setError(msg);

      toast.error(msg);

    } finally {

      setLoading(false);

    }

  };



  const successBooking = success ? {

    date,

    time,

    routeLabel: routeDisplay,

  } : null;

  const successId = success?.id || null;



  return (

    <>

      <SuccessModal

        open={!!successId}

        bookingId={successId}

        booking={successBooking}

        onClose={() => setSuccess(null)}

      />



      <div className="min-h-screen bg-[#EDEFF2]/50 pt-24 pb-12">

        <div className="bg-brand text-white py-8 md:py-10">

          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            <h1 className="text-2xl md:text-3xl font-black">{t('checkout.title')}</h1>

            <p className="text-white/70 mt-1 text-sm flex items-center gap-2">

              <Shield className="w-4 h-4 text-gold" />

              {t('ui.secureCheckout')}

            </p>

          </div>

        </div>



        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">

          {loading && (

            <div className="fixed inset-0 z-50 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm flex items-center justify-center">

              <LoadingSpinner text={t('ui.processing')} />

            </div>

          )}



          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">

              <h2 className="text-lg font-black text-brand mb-5">{t('checkout.summary')}</h2>

              <div className="space-y-3 text-sm">

                {vehicle && (

                  <div className="p-3 bg-brand/5 rounded-xl font-bold text-brand border border-brand/10">

                    {vehicle.name?.[lang] || vehicle.name?.ar}

                  </div>

                )}

                {routeDisplay && (

                  <p className="text-gray-600">{routeDisplay}</p>

                )}

                <p className="text-gray-600" dir="ltr">{date} — {time}</p>

                <p className="text-gray-500">{passengers} {t('fleet.passengers')}</p>

              </div>

              <div className="mt-5 pt-5 border-t border-gray-100 space-y-2 text-sm">

                <div className="flex justify-between font-black text-xl text-brand">

                  <span>{t('checkout.total')}</span>

                  <span>{total || basePrice} {t('booking.sar')}</span>

                </div>

              </div>

            </div>



            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">

              <h2 className="text-lg font-black text-brand mb-5">{t('checkout.payment')}</h2>

              {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}



              <form onSubmit={handleSubmit} className="space-y-4">

                <div>

                  <label className="block text-sm font-semibold text-brand mb-1.5">{t('booking.fullName')}</label>

                  <input

                    type="text"

                    value={customerName}

                    onChange={(e) => setCustomerName(e.target.value)}

                    required

                    placeholder={t('cart.namePlaceholder')}

                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                  />

                </div>

                <div>

                  <label className="block text-sm font-semibold text-brand mb-1.5">{t('cart.phoneWhatsApp')}</label>

                  <input

                    type="tel"

                    value={customerPhone}

                    onChange={(e) => setCustomerPhone(e.target.value)}

                    required

                    dir="ltr"

                    placeholder="+966577469103"

                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                  />

                </div>

                <div>

                  <label className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>

                  <input

                    type="email"

                    value={customerEmail}

                    onChange={(e) => setCustomerEmail(e.target.value)}

                    dir="ltr"

                    placeholder="you@email.com"

                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                  />

                </div>



                <PaymentMethodSelector

                  value={paymentMethod}

                  onChange={setPaymentMethod}

                  proofFile={proofUrl || proofPreview}

                  onProofChange={(url, file) => {
                    setProofUrl(url);
                    setProofFile(file || null);
                    setProofPreview(!url && file ? URL.createObjectURL(file) : null);
                  }}

                  showProofUpload={paymentMethod === PAYMENT_METHODS.BANK_TRANSFER}

                />



                <button type="submit" disabled={loading || !paymentMethod || !customerName.trim() || !customerPhone.trim()}

                  className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand/20">

                  {loading ? t('common.loading') : t('checkout.confirmBooking')}

                </button>

              </form>

            </div>

          </div>

        </div>

      </div>

    </>

  );

}


