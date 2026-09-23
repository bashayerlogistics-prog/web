import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Users, Calendar, Clock, Trash2, MessageCircle, ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePaymentSettings } from '../hooks/usePaymentSettings';
import { DEFAULT_CURRENCY, PAYMENT_METHODS } from '../data/paymentDefaults';
import {
  buildCheckoutWhatsAppMessage,
  buildWhatsAppPaymentUrl,
  getPaymentMethodLabel,
} from '../utils/paymentHelpers';
import { formatOrderNumber } from '../utils/orderHelpers';
import { getAccountEntryPath, setAuthRedirect } from '../utils/authEntry';
import { prefetchRoute } from '../utils/prefetchRoutes';
import PaymentMethodSelector from '../components/ui/PaymentMethodSelector';
import SuccessModal from '../components/ui/SuccessModal';
import AlertBanner from '../components/ui/AlertBanner';

const MoyasarCheckoutForm = lazy(() => import('../components/ui/MoyasarCheckoutForm'));

export default function Cart() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const { user, clerkUser, isClerkSignedIn } = useAuth();
  const { items, removeItem, clearCart, cartCount, cartTotal } = useCart();
  const { toast } = useToast();
  // Payment methods paint from defaults/cache; WhatsApp number resolved on submit.
  const { settings: paymentSettings } = usePaymentSettings();

  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress
    || clerkUser?.emailAddresses?.[0]?.emailAddress
    || '';
  const clerkName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ')
    || clerkUser?.unsafeMetadata?.fullName
    || '';
  const clerkPhone = clerkUser?.unsafeMetadata?.phone || '';

  const [name, setName] = useState(user?.displayName || clerkName || '');
  const [phone, setPhone] = useState(clerkPhone || '');
  const [email, setEmail] = useState(user?.email || clerkEmail || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [proofUrl, setProofUrl] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [moyasarOrder, setMoyasarOrder] = useState(null);

  const isOnlinePayment = paymentMethod === PAYMENT_METHODS.ONLINE_GATEWAY;

  useEffect(() => {
    if (user?.email || clerkEmail) setEmail(user?.email || clerkEmail);
    if (user?.displayName || clerkName) setName((current) => current || user?.displayName || clerkName);
    if (clerkPhone) setPhone((current) => current || clerkPhone);
  }, [user, clerkEmail, clerkName, clerkPhone]);

  // Profile fill is nice-to-have — never block first paint on Firestore.
  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 600));
    const id = idle(() => {
      import('../firebase/bookings')
        .then(({ getUserProfile }) => getUserProfile(user.uid))
        .then((profile) => {
          if (cancelled || !profile) return;
          if (profile.displayName) setName((current) => current || profile.displayName);
          if (profile.email) setEmail((current) => current || profile.email);
          if (profile.phone) setPhone((current) => current || profile.phone);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [user?.uid]);

  /* Warm checkout chunks only when cart has items */
  useEffect(() => {
    if (items.length === 0) return undefined;
    const idle = window.requestIdleCallback
      || ((cb) => window.setTimeout(cb, 800));
    const id = idle(() => {
      import('../firebase/payment').catch(() => {});
      import('../components/ui/MoyasarCheckoutForm').catch(() => {});
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [items.length]);

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

    if (!user?.uid) {
      if (isClerkSignedIn) {
        setError(lang === 'ar'
          ? 'جارٍ ربط الحساب… ثانية واحدةً أعد المحاولة.'
          : 'Linking your account… tap confirm again in a moment.');
        return;
      }
      navigate(getAccountEntryPath(), { state: { from: { pathname: '/cart' } } });
      setAuthRedirect('/cart');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const { createOrderWithPayment } = await import('../firebase/payment');

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

      const resolvedMethod = isOnlinePayment ? PAYMENT_METHODS.MOYASAR : paymentMethod;
      const bookingData = {
        orderItems,
        totalPrice: cartTotal,
        amount: cartTotal,
        currency: DEFAULT_CURRENCY,
        paymentMethod: resolvedMethod,
        paymentProvider: isOnlinePayment ? 'moyasar' : null,
        paymentStatus: paymentMethod === PAYMENT_METHODS.BANK_TRANSFER ? 'proof_submitted' : 'pending',
        orderSource: paymentMethod === PAYMENT_METHODS.WHATSAPP ? 'whatsapp' : 'website',
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || user?.email || '',
        language: lang,
        notes: notes.trim(),
        tripType: 'cart',
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

      if (isOnlinePayment) {
        if (queued) {
          toast.info(
            lang === 'ar'
              ? 'تم حفظ الطلب. أكمل الدفع عند عودة الاتصال.'
              : 'Order saved. Complete payment when you are back online.',
          );
        }
        setMoyasarOrder({ id, orderNumber, amount: cartTotal });
        setSubmitting(false);
        return;
      }

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

  return (
    <>
      <SuccessModal
        open={!!success}
        bookingId={success?.id || success}
        booking={{ routeLabel: t('cart.title') }}
        onClose={() => setSuccess(null)}
      />

      <div className="cart-page min-h-screen bg-[#F4F6F8] pt-[calc(var(--site-header-height,4.75rem)+0.25rem)] pb-[calc(5.5rem+var(--mobile-bottom-nav-offset,0px))] md:pb-12">
        <div className="bg-brand text-white py-5 sm:py-7">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="text-white/60 text-xs mb-1.5 flex items-center gap-2">
              <Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>
              <span>/</span>
              <span className="text-white">{t('cart.title')}</span>
            </nav>
            <div className="flex items-end justify-between gap-3">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight">{t('cart.title')}</h1>
              {cartCount > 0 && (
                <span className="text-xs sm:text-sm font-bold bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
                  {cartCount} · {cartTotal} {t('booking.sar')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-sm border border-gray-100">
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8 items-start">
              <div className="lg:col-span-3 space-y-3 order-1 lg:order-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-black text-brand flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-gold rounded-full shrink-0" />
                    {t('cart.tripsTitle')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => items.length > 0 && clearCart()}
                    className="text-red-500 text-xs font-bold hover:text-red-600 transition-colors"
                  >
                    {t('cart.clearAll')}
                  </button>
                </div>

                {items.map((item) => {
                  const itemName = item.shortName?.[lang] || item.vehicleName?.[lang] || item.vehicleName?.ar;
                  const route = item.routeTitle?.[lang] || item.routeTitle?.ar;
                  return (
                    <article
                      key={item.id}
                      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-black text-brand text-sm sm:text-base leading-snug flex-1 min-w-0">
                          {itemName}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-brand text-sm tabular-nums">
                            {item.price}
                            <span className="text-[10px] font-bold ms-0.5">{t('booking.sar')}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2 -m-1 text-gray-400 hover:text-red-500 transition-colors touch-target"
                            aria-label={t('cart.remove')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-600">
                        <div className="flex items-start gap-2 col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-semibold">{t('vehicle.destination')}</p>
                            <p className="font-medium text-gray-700 break-words">{route}</p>
                          </div>
                        </div>
                        {item.pickupLabel && (
                          <div className="flex items-start gap-2 col-span-2">
                            <MapPin className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-gray-400 font-semibold">{t('vehicle.pickupArea')}</p>
                              <p className="font-medium text-gray-700 break-words">{item.pickupLabel}</p>
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
                    </article>
                  );
                })}
              </div>

              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm order-2 lg:order-1 lg:sticky lg:top-24">
                <h2 className="text-lg font-black text-brand mb-1">{t('cart.confirmTitle')}</h2>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">{t('cart.confirmSubtitle')}</p>
                {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

                <form id="cart-checkout-form" onSubmit={handleSubmit} className="space-y-3.5">
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
                      rows={2}
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

                  <div className="pt-3 border-t border-gray-100 space-y-1.5 text-sm hidden lg:block">
                    <div className="flex justify-between text-gray-600">
                      <span>{t('cart.totalTrips')}</span>
                      <span className="font-black text-brand">{cartCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('cart.finalTotal')}</span>
                      <span className="font-black text-xl text-brand tabular-nums">
                        {cartTotal}
                        <span className="text-xs font-bold ms-1">{t('booking.sar')}</span>
                      </span>
                    </div>
                  </div>

                  {moyasarOrder ? (
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <h3 className="font-black text-brand text-sm mb-3">{t('payment.moyasarPayNow')}</h3>
                      <Suspense fallback={<div className="h-40 rounded-xl bg-gray-100 animate-pulse" />}>
                        <MoyasarCheckoutForm
                          bookingId={moyasarOrder.id}
                          orderNumber={moyasarOrder.orderNumber}
                          amountSar={moyasarOrder.amount}
                          customerName={name.trim()}
                          customerEmail={email.trim()}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !phone.trim() || !paymentMethod}
                      className="hidden lg:flex w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold py-4 rounded-xl items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 mt-1"
                    >
                      <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                      {submitting
                        ? t('common.loading')
                        : (isOnlinePayment ? t('payment.continueToPayment') : t('checkout.confirmBooking'))}
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Mobile sticky checkout bar */}
        {items.length > 0 && !moyasarOrder && (
          <div className="lg:hidden fixed inset-x-0 bottom-[var(--mobile-bottom-nav-offset,4.75rem)] z-40 border-t border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 safe-area-pb shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-500 font-semibold">{t('cart.finalTotal')}</p>
                <p className="font-black text-brand text-lg tabular-nums leading-tight">
                  {cartTotal} <span className="text-xs">{t('booking.sar')}</span>
                </p>
              </div>
              <button
                type="submit"
                form="cart-checkout-form"
                disabled={submitting || !name.trim() || !phone.trim() || !paymentMethod}
                onMouseEnter={() => prefetchRoute('/login')}
                className="shrink-0 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold px-5 py-3.5 rounded-xl text-sm shadow-lg shadow-brand/20"
              >
                {submitting ? t('common.loading') : t('checkout.confirmBooking')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
