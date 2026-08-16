function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandName(settings, lang) {
  const fromSettings = settings?.email?.brandName?.[lang] || settings?.email?.brandName?.ar;
  return fromSettings || (lang === 'ar' ? 'بشاير العطاء' : 'Bashayer Al-Ataa');
}

function wrapEmail({ lang, settings, title, bodyHtml, orderId }) {
  const name = brandName(settings, lang);
  const primary = settings?.primaryColor || '#0B5345';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${primary};padding:28px 32px;text-align:${align};">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">${esc(name)}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${esc(title)}</p>
        </td></tr>
        <tr><td style="padding:32px;text-align:${align};color:#333;line-height:1.7;font-size:15px;">
          ${bodyHtml}
          ${orderId ? `<p style="margin-top:24px;padding:12px 16px;background:#f8faf9;border-radius:10px;font-size:13px;color:#666;">
            ${lang === 'ar' ? 'رقم الطلب' : 'Order ID'}: <strong>#${esc(orderId)}</strong>
          </p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8faf9;text-align:center;font-size:12px;color:#888;">
          © ${new Date().getFullYear()} ${esc(name)} — ${lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildOrderPlacedEmail({ booking, orderDisplayId, settings, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const body = isAr
    ? `<p>مرحباً ${esc(booking.customerName || '')}،</p>
       <p>تم استلام طلبك بنجاح. حالة الدفع: <strong>${esc(booking.paymentStatus || 'pending')}</strong>.</p>
       <p>المبلغ: <strong>${esc(booking.totalPrice)} ${isAr ? 'ريال' : 'SAR'}</strong></p>
       <p>سنراجع طلبك ونؤكد الحجز بعد التحقق من الدفع.</p>`
    : `<p>Hello ${esc(booking.customerName || '')},</p>
       <p>Your order has been received. Payment status: <strong>${esc(booking.paymentStatus || 'pending')}</strong>.</p>
       <p>Amount: <strong>${esc(booking.totalPrice)} SAR</strong></p>
       <p>We will review your order and confirm your booking after payment verification.</p>`;

  return {
    subject: isAr ? `تأكيد استلام الطلب #${orderDisplayId}` : `Order Received #${orderDisplayId}`,
    html: wrapEmail({
      lang,
      settings,
      title: isAr ? 'تم استلام طلبك' : 'Order Received',
      bodyHtml: body,
      orderId: orderDisplayId,
    }),
  };
}

export function buildPaymentPendingEmail({ booking, orderDisplayId, settings, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const body = isAr
    ? `<p>مرحباً ${esc(booking.customerName || '')}،</p>
       <p>طلبك #${esc(orderDisplayId)} بانتظار الدفع أو مراجعة إيصال التحويل.</p>
       <p>يرجى إتمام الدفع أو رفع صورة الإيصال لإكمال الحجز.</p>`
    : `<p>Hello ${esc(booking.customerName || '')},</p>
       <p>Your order #${esc(orderDisplayId)} is awaiting payment or transfer receipt review.</p>
       <p>Please complete payment or upload your transfer receipt to finalize your booking.</p>`;

  return {
    subject: isAr ? `الدفع معلق — طلب #${orderDisplayId}` : `Payment Pending — Order #${orderDisplayId}`,
    html: wrapEmail({
      lang,
      settings,
      title: isAr ? 'الدفع معلق' : 'Payment Pending',
      bodyHtml: body,
      orderId: orderDisplayId,
    }),
  };
}

export function buildPaymentConfirmedEmail({ booking, orderDisplayId, settings, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const body = isAr
    ? `<p>مرحباً ${esc(booking.customerName || '')}،</p>
       <p>تم تأكيد دفعتك بنجاح! 🎉</p>
       <p>حجزك الآن <strong>مؤكد</strong>. سيتواصل معك فريقنا قريباً بتفاصيل الاستلام.</p>`
    : `<p>Hello ${esc(booking.customerName || '')},</p>
       <p>Your payment has been confirmed successfully!</p>
       <p>Your booking is now <strong>confirmed</strong>. Our team will contact you shortly with pickup details.</p>`;

  return {
    subject: isAr ? `تم تأكيد الدفع والحجز #${orderDisplayId}` : `Payment & Booking Confirmed #${orderDisplayId}`,
    html: wrapEmail({
      lang,
      settings,
      title: isAr ? 'تم تأكيد الدفع والحجز' : 'Payment & Booking Confirmed',
      bodyHtml: body,
      orderId: orderDisplayId,
    }),
  };
}

export function buildBookingConfirmedEmail({ booking, orderDisplayId, settings, lang = 'ar' }) {
  return buildPaymentConfirmedEmail({ booking, orderDisplayId, settings, lang });
}
