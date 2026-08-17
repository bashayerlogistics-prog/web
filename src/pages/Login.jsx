import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignIn } from '@clerk/clerk-react';
import { AlertCircle, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateEmail } from '../utils/firebaseErrors';
import AuthAlertModal from '../components/ui/AuthAlertModal';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import EmailOtpStep from '../components/ui/EmailOtpStep';

const REMEMBER_KEY = 'bashayer_remember_email';
const SUCCESS_REDIRECT_MS = 900;

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, syncFirebaseSession } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language;
  const redirectFrom = location.state?.from;
  const from = redirectFrom
    ? `${redirectFrom.pathname || '/dashboard'}${redirectFrom.search || ''}`
    : '/dashboard';

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [modal, setModal] = useState(null);
  const [resendKey, setResendKey] = useState(0);
  const authAttemptRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    if (user && !authAttemptRef.current) navigate(from, { replace: true });
  }, [user, from, navigate]);

  useEffect(() => () => window.clearTimeout(redirectTimerRef.current), []);

  const showError = (error) => {
    authAttemptRef.current = false;
    const message = error?.errors?.[0]?.longMessage
      || error?.errors?.[0]?.message
      || handleAuthError(error, 'login', lang).message;
    const codeValue = error?.errors?.[0]?.code || error?.code || 'auth/unknown';
    setInlineError(message);
    setModal({
      type: 'error',
      title: lang === 'ar' ? 'تعذر تسجيل الدخول' : 'Sign-in failed',
      message,
      code: codeValue,
    });
  };

  const sendCode = async ({ resend = false } = {}) => {
    if (!isLoaded || !signIn) return;
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
        await signIn.create({ identifier: validation.email });
      }
      const emailCodeFactor = signIn.supportedFirstFactors?.find((factor) => factor.strategy === 'email_code');
      if (!emailCodeFactor?.emailAddressId) {
        throw { errors: [{ message: lang === 'ar' ? 'رمز البريد غير متاح لهذا الحساب.' : 'Email OTP is not available for this account.' }] };
      }
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailCodeFactor.emailAddressId,
      });
      setEmail(validation.email);
      localStorage.setItem(REMEMBER_KEY, validation.email);
      setCode('');
      setStep('otp');
      setResendKey((value) => value + 1);
      if (resend) {
        setModal({
          type: 'success',
          title: lang === 'ar' ? 'تم إرسال رمز جديد' : 'New OTP sent',
          message: lang === 'ar'
            ? 'تحقق من صندوق الوارد.'
            : 'Check your inbox for the new code.',
        });
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;
    authAttemptRef.current = true;
    setInlineError('');
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status !== 'complete') {
        throw { errors: [{ message: lang === 'ar' ? 'تعذر إكمال التحقق.' : 'Could not complete verification.' }] };
      }
      await setActive({ session: result.createdSessionId });
      await syncFirebaseSession({ authProvider: 'clerk_email', language: lang });
      setModal({
        type: 'success',
        title: lang === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!',
        message: lang === 'ar'
          ? 'تم تسجيل دخولك بنجاح. ستبقى جلستك محفوظة على هذا الجهاز.'
          : 'You are signed in. Your session will stay active on this device.',
      });
      redirectTimerRef.current = window.setTimeout(
        () => navigate(from, { replace: true }),
        SUCCESS_REDIRECT_MS,
      );
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return;
    setInlineError('');
    setLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: from,
      });
    } catch (error) {
      showError(error);
      setLoading(false);
    }
  };

  return (
    <>
      <AuthGlassCard icon={LogIn} title={t('auth.login')} subtitle={t('auth.loginSubtitle')} activeTab="login">
        {inlineError && (
          <div className="auth-error-banner mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{inlineError}</span>
          </div>
        )}

        {step === 'email' ? (
          <>
            <div className="auth-info-note mb-4">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('auth.otpSentHint')}</span>
            </div>
            <button type="button" onClick={handleGoogle} disabled={loading || !isLoaded} className="auth-btn-google disabled:opacity-60 mb-4">
              <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 shrink-0" />
              {loading ? t('common.loading') : t('auth.loginWithGoogle')}
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">{t('auth.orContinueWith')}</span>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); sendCode(); }} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>
                <div className="relative group">
                  <Mail className="auth-input-icon" />
                  <input
                    type="email"
                    id="login-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    dir="ltr"
                    placeholder="you@email.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || !isLoaded} className="auth-btn-primary w-full flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                {loading ? t('common.loading') : (lang === 'ar' ? 'إرسال رمز الدخول' : 'Send sign-in code')}
              </button>
            </form>
          </>
        ) : (
          <EmailOtpStep
            email={email}
            code={code}
            onCodeChange={setCode}
            onVerify={handleVerify}
            onResend={() => sendCode({ resend: true })}
            onBack={() => { setStep('email'); setInlineError(''); }}
            loading={loading}
            resendKey={resendKey}
            lang={lang}
            expiresIn={600}
            resendAfter={30}
          />
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            state={redirectFrom ? { from: redirectFrom } : undefined}
            className="text-brand hover:text-gold font-bold transition-colors"
          >
            {t('auth.register')}
          </Link>
        </p>
      </AuthGlassCard>

      <AuthAlertModal
        open={!!modal}
        onClose={() => setModal(null)}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        code={modal?.code}
      />
    </>
  );
}
