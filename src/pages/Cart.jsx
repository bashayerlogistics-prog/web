import { useState } from 'react';

import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import {

  MapPin, Users, Calendar, Clock, Trash2, MessageCircle, ShoppingBag,

} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useCart } from '../context/CartContext';

import { useToast } from '../context/ToastContext';

import { usePaymentSettings } from '../hooks/usePaymentSettings';

import { createOrderWithPayment } from '../firebase/payment';

import { PAYMENT_METHODS } from '../data/paymentDefaults';

import {

  buildCheckoutWhatsAppMessage,

  buildWhatsAppPaymentUrl,

  getPaymentMethodLabel,

} from '../utils/paymentHelpers';

import { formatOrderNumber } from '../utils/orderHelpers';

import PaymentMethodSelector from '../components/ui/PaymentMethodSelector';

import SuccessModal from '../components/ui/SuccessModal';

import AlertBanner from '../components/ui/AlertBanner';



export default function Cart() {

  const { t, i18n } = useTranslation();

  const lang = i18n.language;

  const { user } = useAuth();

  const { items, removeItem, clearCart, cartCount, cartTotal } = useCart();

  const { toast } = useToast();

  const { settings: paymentSettings } = usePaymentSettings();



  const [name, setName] = useState(user?.displayName || '');

  const [phone, setPhone] = useState('');

  const [email, setEmail] = useState(user?.email || '');

  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('');

  const [proofUrl, setProofUrl] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState(null);



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!name.trim() || !phone.trim()) return;

    if (!paymentMethod) {

      setError(t('payment.selectMethod'));

      return;

    }

    if (paymentMethod === PAYMENT_METHODS.BANK_TRANSFER && !proofUrl && !proofFile) {

      setError(t('payment.proofRequired'));

      return;

    }



    setError('');

    setSubmitting(true);



    try {

      const orderItems = items.map((item) => ({

        id: item.id,

        vehicleName: item.vehicleName,

        shortName: item.shortName,

        routeTitle: item.routeTitle,

        price: item.price,

        date: item.date,

        time: item.time,

        passengers: item.passengers,

        pickupLabel: item.pickupLabel,

        destinationLabel: item.destinationLabel,

      }));



      const bookingData = {

        orderItems,

        totalPrice: cartTotal,

        paymentMethod,

        paymentStatus: paymentMethod === PAYMENT_METHODS.BANK_TRANSFER ? 'proof_submitted' : 'pending',

        orderSource: paymentMethod === PAYMENT_METHODS.WHATSAPP ? 'whatsapp' : 'website',

        customerName: name.trim(),

        customerPhone: phone.trim(),

        customerEmail: email.trim() || user?.email || '',

        notes: notes.trim(),

        tripType: 'cart',

        isGuest: false,

        ...(paymentMethod === PAYMENT_METHODS.BANK_TRANSFER && proofUrl
          ? { paymentProofUrl: proofUrl }
          : {}),

      };



      if (!user?.uid) {
        setError(lang === 'ar' ? 'يجب تسجيل الدخول لإتمام الطلب' : 'Please log in to place an order');
        setSubmitting(false);
        return;
      }

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

          customerName: name.trim(),

          customerPhone: phone.trim(),

          customerEmail: email.trim(),

          total: cartTotal,

          paymentMethod: getPaymentMethodLabel(paymentMethod, lang),

          items,

          notes: notes.trim(),

        });

        window.open(buildWhatsAppPaymentUrl(message, paymentSettings.whatsappNumber), '_blank', 'noopener,noreferrer');

      }



      clearCart();

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

      console.error('Cart order failed:', err);

      const msg = err?.code === 'permission-denied'

        ? (lang === 'ar' ? 'الطلب مرفوض من السيرفر. حاول مرة أخرى.' : 'Order blocked by server. Please try again.')

        : t('common.error');

      setError(msg);

      toast.error(msg);

    } finally {

      setSubmitting(false);

    }

  };



  const handleClear = () => {

    if (items.length === 0) return;

    clearCart();

  };



  return (

    <>

      <SuccessModal

        open={!!success}

        bookingId={success?.id || success}

        booking={{ routeLabel: t('cart.title') }}

        onClose={() => setSuccess(null)}

      />



      <div className="min-h-screen bg-[#EDEFF2]/50 pt-20 sm:pt-24 pb-12">

        <div className="bg-brand text-white py-6 sm:py-8">

          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            <nav className="text-white/60 text-xs mb-2 flex items-center gap-2">

              <Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>

              <span>/</span>

              <span className="text-white">{t('cart.title')}</span>

            </nav>

            <h1 className="text-2xl sm:text-3xl font-black">{t('cart.title')}</h1>

          </div>

        </div>



        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

          {items.length === 0 ? (

            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-gray-100">

              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />

              <p className="text-brand font-black text-lg mb-2">{t('cart.empty')}</p>

              <p className="text-gray-500 text-sm mb-6">{t('cart.emptyDesc')}</p>

              <Link

                to="/#vehicles"

                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl transition-all"

              >

                {t('cart.browseFleet')}

              </Link>

            </div>

          ) : (

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

              <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm">

                <h2 className="text-lg sm:text-xl font-black text-brand mb-1">{t('cart.confirmTitle')}</h2>

                <p className="text-gray-500 text-xs sm:text-sm mb-5">{t('cart.confirmSubtitle')}</p>

                {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}



                <form onSubmit={handleSubmit} className="space-y-4">

                  <div>

                    <label className="block text-sm font-semibold text-brand mb-1.5">{t('booking.fullName')}</label>

                    <input

                      type="text"

                      value={name}

                      onChange={(e) => setName(e.target.value)}

                      required

                      placeholder={t('cart.namePlaceholder')}

                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-semibold text-brand mb-1.5">{t('cart.phoneWhatsApp')}</label>

                    <input

                      type="tel"

                      value={phone}

                      onChange={(e) => setPhone(e.target.value)}

                      required

                      dir="ltr"

                      placeholder="+966577469103"

                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>

                    <input

                      type="email"

                      value={email}

                      onChange={(e) => setEmail(e.target.value)}

                      dir="ltr"

                      placeholder="you@email.com"

                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-semibold text-brand mb-1.5">{t('cart.notes')}</label>

                    <textarea

                      value={notes}

                      onChange={(e) => setNotes(e.target.value)}

                      rows={3}

                      placeholder={t('cart.notesPlaceholder')}

                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"

                    />

                  </div>



                  <div>

                    <label className="block text-sm font-semibold text-brand mb-2">{t('checkout.payment')}</label>

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

                  </div>



                  <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">

                    <div className="flex justify-between items-center text-gray-600">

                      <span>{t('cart.totalTrips')}</span>

                      <span className="font-black text-brand">{cartCount}</span>

                    </div>

                    <div className="flex justify-between items-center">

                      <span className="text-gray-600">{t('cart.finalTotal')}</span>

                      <span className="font-black text-xl text-brand">

                        {cartTotal}

                        <span className="text-xs font-bold ms-1">{t('booking.sar')}</span>

                      </span>

                    </div>

                  </div>



                  <button

                    type="submit"

                    disabled={submitting || !name.trim() || !phone.trim() || !paymentMethod}

                    className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 mt-2"

                  >

                    <MessageCircle className="w-5 h-5 fill-white shrink-0" />

                    {submitting ? t('common.loading') : t('checkout.confirmBooking')}

                  </button>

                </form>

              </div>



              <div className="space-y-4">

                <div className="flex items-center justify-between gap-3">

                  <h2 className="text-lg font-black text-brand flex items-center gap-2">

                    <span className="w-2 h-5 bg-gold rounded-full shrink-0" />

                    {t('cart.tripsTitle')}

                  </h2>

                  <button

                    type="button"

                    onClick={handleClear}

                    className="text-red-500 text-xs font-bold hover:text-red-600 transition-colors"

                  >

                    {t('cart.clearAll')}

                  </button>

                </div>



                {items.map((item) => {

                  const itemName = item.shortName?.[lang] || item.vehicleName?.[lang] || item.vehicleName?.ar;

                  const route = item.routeTitle?.[lang] || item.routeTitle?.ar;

                  return (

                    <div

                      key={item.id}

                      className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm"

                    >

                      <div className="flex items-start justify-between gap-3 mb-3">

                        <h3 className="font-black text-brand text-sm sm:text-base leading-snug flex-1 min-w-0">

                          {itemName}

                        </h3>

                        <div className="flex items-center gap-2 shrink-0">

                          <span className="font-black text-brand text-sm">

                            {item.price}

                            <span className="text-[10px] font-bold ms-0.5">{t('booking.sar')}</span>

                          </span>

                          <button

                            type="button"

                            onClick={() => removeItem(item.id)}

                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"

                            aria-label={t('cart.remove')}

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </div>

                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-600">

                        <div className="flex items-start gap-2">

                          <MapPin className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />

                          <div>

                            <p className="text-[10px] text-gray-400 font-semibold">{t('vehicle.destination')}</p>

                            <p className="font-medium text-gray-700">{route}</p>

                          </div>

                        </div>

                        {item.pickupLabel && (

                          <div className="flex items-start gap-2">

                            <MapPin className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />

                            <div>

                              <p className="text-[10px] text-gray-400 font-semibold">{t('vehicle.pickupArea')}</p>

                              <p className="font-medium text-gray-700">{item.pickupLabel}</p>

                            </div>

                          </div>

                        )}

                        <div className="flex items-start gap-2">

                          <Clock className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />

                          <div>

                            <p className="text-[10px] text-gray-400 font-semibold">{t('cart.receptionTime')}</p>

                            <p className="font-medium text-gray-700">{item.time || t('cart.notSet')}</p>

                          </div>

                        </div>

                        <div className="flex items-start gap-2">

                          <Calendar className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />

                          <div>

                            <p className="text-[10px] text-gray-400 font-semibold">{t('cart.tripDate')}</p>

                            <p className="font-medium text-gray-700">{item.date || t('cart.notSet')}</p>

                          </div>

                        </div>

                        <div className="flex items-start gap-2">

                          <Users className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />

                          <div>

                            <p className="text-[10px] text-gray-400 font-semibold">{t('fleet.passengers')}</p>

                            <p className="font-medium text-gray-700">{item.passengers || '1'}</p>

                          </div>

                        </div>

                      </div>

                    </div>

                  );

                })}

              </div>

            </div>

          )}

        </div>

      </div>

    </>

  );

}


