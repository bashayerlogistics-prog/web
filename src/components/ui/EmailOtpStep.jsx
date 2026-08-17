import { useEffect, useState } from 'react';
import { Clock, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function EmailOtpStep({
  email,
  code,
  onCodeChange,
  onVerify,
  onResend,
  onBack,
  loading,
  resendKey,
  lang,
  expiresIn = 300,
  resendAfter = 60,
}) {
  const [resendSeconds, setResendSeconds] = useState(resendAfter);
  const [expireSeconds, setExpireSeconds] = useState(expiresIn);
  const isArabic = lang === 'ar';

  useEffect(() => {
    setResendSeconds(resendAfter);
    setExpireSeconds(expiresIn);

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
      setExpireSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendKey, expiresIn, resendAfter]);

  return (
    <form onSubmit={onVerify} className="space-y-5">
      <div className="auth-info-note">
        <Mail className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {isArabic ? 'أرسلنا رمزاً من 6 أرقام إلى' : 'We sent a 6-digit code to'}{' '}
          <strong dir="ltr">{email}</strong>
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/10 bg-brand/[0.03] px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2 text-brand font-semibold">
          <Clock className="w-4 h-4" />
          {isArabic ? 'صالح حتى' : 'Valid for'}
        </div>
        <span
          className={`font-mono font-bold tracking-wider ${expireSeconds <= 60 ? 'text-red-600' : 'text-brand'}`}
          dir="ltr"
        >
          {formatClock(expireSeconds)}
        </span>
      </div>

      {expireSeconds === 0 && (
        <p className="text-xs text-red-600">
          {isArabic
            ? 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.'
            : 'This code expired. Request a new OTP.'}
        </p>
      )}

      <div>
        <label htmlFor="email-otp" className="block text-sm font-semibold text-brand mb-1.5">
          {isArabic ? 'رمز التحقق' : 'Verification code'}
        </label>
        <div className="relative group">
          <KeyRound className="auth-input-icon" />
          <input
            id="email-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="auth-input tracking-[0.45em] font-bold text-center"
            placeholder="000000"
            dir="ltr"
            maxLength={6}
            required
            autoFocus
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || code.length !== 6 || expireSeconds === 0}
        className="auth-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <ShieldCheck className="w-5 h-5" />
        {loading
          ? (isArabic ? 'جاري التحقق…' : 'Verifying…')
          : (isArabic ? 'تحقق وسجّل الدخول' : 'Verify and sign in')}
      </button>

      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} disabled={loading} className="text-gray-500 hover:text-brand">
          {isArabic ? 'تغيير البريد' : 'Change email'}
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={loading || resendSeconds > 0}
          className="flex items-center gap-1.5 font-semibold text-brand disabled:text-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
          {resendSeconds > 0
            ? (isArabic
              ? `رمز جديد بعد ${resendSeconds}ث`
              : `New OTP in ${resendSeconds}s`)
            : (isArabic ? 'إرسال رمز جديد' : 'Send a new OTP')}
        </button>
      </div>
    </form>
  );
}
