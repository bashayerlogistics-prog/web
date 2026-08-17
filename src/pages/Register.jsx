import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { AlertCircle, Mail, Phone, ShieldCheck, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateEmail } from '../utils/firebaseErrors';
import AuthAlertModal from '../components/ui/AuthAlertModal';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import EmailOtpStep from '../components/ui/EmailOtpStep';

const SUCCESS_REDIRECT_MS = 900;

export default function Register() {
  const { t, i18n } = useTranslation();
  const { user, completeProfile } = useAuth();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [step, setStep] = useState('email');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [modal, setModal] = useState(null);
  const [resendKey, setResendKey] = useState(0);
  const authAttemptRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    if (user && !authAttemptRef.current && step !== 'details') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, step]);

  useEffect(() => () => window.clearTimeout(redirectTimerRef.current), []);

  const showError = (error, keepOpen = false) => {
    if (!keepOpen) authAttemptRef.current = false;
    const message = error?.errors?.[0]?.longMessage
      || error?.errors?.[0]?.message
      || handleAuthError(error, 'register', lang).message;
    setInlineError(message);
    setModal({
      type: 'error',
      title: lang === 'ar' ? 'تعذر إنشاء الحساب' : 'Registration failed',
      message,
      code: error?.errors?.[0]?.code || error?.code,
    });
  };

  const sendCode = async ({ resend = false } = {}) => {
    if (!signUpLoaded || !signUp) return;
    setInlineError('');
    setModal(null);
    const validation = validateEmail(email, lang);
    if (!validation.valid) {
      setInlineError(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      if (!resend) {
        await signUp.create({ emailAddress: validation.email });
      }
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setEmail(validation.email);
      setCode('');
      setStep('otp');
      setResendKey((value) => value + 1);
      if (resend) {
        setModal({
          type: 'success',
          title: lang === 'ar' ? 'تم إرسال رمز جديد' : 'New OTP sent',
          message: lang === 'ar' ? 'تحقق من صندوق الوارد.' : 'Check your inbox for the new code.',
        });
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!signUpLoaded || !signUp) return;
    authAttemptRef.current = true;
    setInlineError('');
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setStep('details');
      } else if (result.status === 'missing_requirements') {
        await setActive({ session: result.createdSessionId || signUp.createdSessionId });
        setStep('details');
      } else {
        throw { errors: [{ message: lang === 'ar' ? 'تعذر إكمال التحقق.' : 'Could not complete verification.' }] };
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const finishRegistration = async (event) => {
    event.preventDefault();
    const name = form.name.trim().replace(/\s+/g, ' ');
    const phone = form.phone.trim();
    const digits = phone.replace(/\D/g, '');
    if (!name || name.length > 100) {
      setInlineError(lang === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Full name is required.');
      return;
    }
    if (digits.length < 8 || digits.length > 15) {
      setInlineError(lang === 'ar' ? 'يرجى إدخال رقم جوال صحيح' : 'Enter a valid mobile number.');
      return;
    }
    if (!agreed) {
      setInlineError(lang === 'ar' ? 'يرجى الموافقة على الشروط وسياسة الخصوصية' : 'Please accept the terms and privacy policy.');
      return;
    }

    setInlineError('');
    setLoading(true);
    try {
      await completeProfile({ name, phone });
      setModal({
        type: 'success',
        title: lang === 'ar' ? 'أهلاً بك معنا!' : 'Welcome aboard!',
        message: lang === 'ar'
          ? 'تم حفظ بياناتك وإنشاء حسابك بنجاح.'
          : 'Your details are saved and your account is ready.',
      });
      redirectTimerRef.current = window.setTimeout(
        () => navigate('/dashboard', { replace: true }),
        SUCCESS_REDIRECT_MS,
      );
    } catch (error) {
      showError(error, true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: '/dashboard',
      });
    } catch (error) {
      showError(error);
      setLoading(false);
    }
  };

  return (
    <>
      <AuthGlassCard icon={UserPlus} title={t('auth.register')} subtitle={t('auth.registerSubtitle')} activeTab="register">
        {inlineError && (
          <div className="auth-error-banner mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{inlineError}</span>
          </div>
        )}

        {step === 'email' && (
          <>
            <div className="auth-info-note mb-4">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('auth.otpSentHint')}</span>
            </div>
            <button type="button" onClick={handleGoogle} disabled={loading || !signInLoaded} className="auth-btn-google disabled:opacity-60 mb-4">
              <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
              {loading ? t('common.loading') : t('auth.registerWithGoogle')}
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">{t('auth.orContinueWith')}</span>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); sendCode(); }} className="space-y-4">
              <div>
                <label htmlFor="register-email" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>
                <div className="relative group">
                  <Mail className="auth-input-icon" />
                  <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" dir="ltr" autoComplete="email" required />
                </div>
              </div>
              <div id="clerk-captcha" />
              <button type="submit" disabled={loading || !signUpLoaded} className="auth-btn-primary w-full flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                {loading ? t('common.loading') : (lang === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code')}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <EmailOtpStep
            email={email}
            code={code}
            onCodeChange={setCode}
            onVerify={verifyCode}
            onResend={() => sendCode({ resend: true })}
            onBack={() => { setStep('email'); setInlineError(''); }}
            loading={loading}
            resendKey={resendKey}
            lang={lang}
            expiresIn={600}
            resendAfter={30}
          />
        )}

        {step === 'details' && (
          <form onSubmit={finishRegistration} className="space-y-4">
            <div className="auth-info-note">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{lang === 'ar' ? 'تم تأكيد البريد. أكمل الاسم والجوال لحفظ الحساب في لوحة الإدارة.' : 'Email verified. Add name and mobile so the account is saved for admin.'}</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>
              <div className="relative group">
                <Mail className="auth-input-icon" />
                <input type="email" value={email} className="auth-input opacity-70" dir="ltr" disabled />
              </div>
            </div>
            <div>
              <label htmlFor="register-name" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.name')}</label>
              <div className="relative group">
                <User className="auth-input-icon" />
                <input id="register-name" type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="auth-input" autoComplete="name" required />
              </div>
            </div>
            <div>
              <label htmlFor="register-phone" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.phone')}</label>
              <div className="relative group">
                <Phone className="auth-input-icon" />
                <input id="register-phone" type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="auth-input" autoComplete="tel" dir="ltr" required />
              </div>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="auth-checkbox mt-0.5" />
              <span className="text-xs text-gray-500 leading-relaxed">{t('auth.termsAgree')}</span>
            </label>
            <button type="submit" disabled={loading} className="auth-btn-primary w-full flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              {loading ? t('common.loading') : (lang === 'ar' ? 'إنشاء الحساب' : 'Create account')}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-brand hover:text-gold font-bold transition-colors">{t('auth.login')}</Link>
        </p>
      </AuthGlassCard>

      <AuthAlertModal open={!!modal} onClose={() => setModal(null)} type={modal?.type} title={modal?.title} message={modal?.message} code={modal?.code} />
    </>
  );
}
