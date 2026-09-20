import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignIn } from '@clerk/clerk-react';
import { AlertCircle, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateEmail } from '../utils/firebaseErrors';
import { isSessionExistsError, markHasAccount, resolveRedirectTarget, setAuthRedirect } from '../utils/authEntry';
import { useCart } from '../context/CartContext';
import AuthAlertModal from '../components/ui/AuthAlertModal';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import EmailOtpStep from '../components/ui/EmailOtpStep';

const REMEMBER_KEY = 'bashayer_remember_email';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading, isClerkSignedIn, syncFirebaseSession, logout } = useAuth();
  const { cartCount } = useCart();
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language;
  const redirectFrom = location.state?.from;
  const from = resolveRedirectTarget(redirectFrom, { cartCount });

  useEffect(() => {
    setAuthRedirect(from);
  }, [from]);

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [modal, setModal] = useState(null);
  const [resendKey, setResendKey] = useState(0);
  const resumeRef = useRef(false);
  const navigatedRef = useRef(false);

  const goToAccount = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    markHasAccount();
    navigate(from, { replace: true });
  };

  const finishWithSync = async (authProvider = 'clerk_email') => {
    let result;
    try {
      result = await syncFirebaseSession({ authProvider, language: lang });
    } catch (error) {
      if (!error?.code) error.code = 'auth/bridge-failed';
      throw error;
    }
    if (!result?.user) {
      const err = new Error(lang === 'ar' ? 'تعذر ربط الحساب.' : 'Could not link your account.');
      err.code = 'auth/bridge-failed';
      throw err;
    }
    markHasAccount();
    setModal({
      type: 'success',
      title: lang === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!',
      message: lang === 'ar'
        ? 'تم تسجيل دخولك بنجاح.'
        : 'You are signed in.',
    });
    goToAccount();
    return result;
  };

  const resumeExistingSession = async () => {
    if (resumeRef.current) return;
    resumeRef.current = true;
    setResuming(true);
    setInlineError('');
    setModal(null);
    try {
      await finishWithSync('clerk_email');
    } catch (error) {
      resumeRef.current = false;
      setResuming(false);
      console.error('Login resume session failed:', error);
      const code = String(error?.code || '');
      const detail = String(error?.message || '').trim();
      const bridgeHint = code.includes('failed-precondition')
        || code.includes('bridge')
        || code.includes('internal')
        || code.includes('not-found')
        || code.includes('unauthenticated')
        || /clerk|bridge|firebase|token|link/i.test(detail);
      const fallback = lang === 'ar'
        ? (bridgeHint
          ? 'تعذر ربط الحساب بالخادم. اضغط «متابعة» مجدداً، أو سجّل الخروج وأعد المحاولة.'
          : 'تعذر استكمال الجلسة. حاول مرة أخرى.')
        : (bridgeHint
          ? 'Could not link your account to the server. Tap Continue again, or sign out and retry.'
          : 'Could not resume your session. Try again.');
      /* Prefer server/bridge detail when it is not our generic wrapper */
      const generic = /could not link your account|تعذر ربط الحساب/i.test(detail);
      setInlineError(!generic && detail && detail.length < 180 ? detail : fallback);
    }
  };

  useEffect(() => {
    if (user) goToAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from]);

  useEffect(() => {
    if (!isClerkSignedIn || user || authLoading || resumeRef.current) return undefined;
    resumeExistingSession();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClerkSignedIn, user, authLoading]);

  const showError = (error) => {
    if (isSessionExistsError(error)) {
      resumeExistingSession();
      return;
    }
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
    if (isClerkSignedIn) {
      resumeExistingSession();
      return;
    }
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
    if (isClerkSignedIn) {
      resumeExistingSession();
      return;
    }
    setInlineError('');
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status !== 'complete') {
        throw { errors: [{ message: lang === 'ar' ? 'تعذر إكمال التحقق.' : 'Could not complete verification.' }] };
      }
      await setActive({ session: result.createdSessionId });
      await finishWithSync('clerk_email');
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return;
    if (isClerkSignedIn) {
      resumeExistingSession();
      return;
    }
    setInlineError('');
    setLoading(true);
    try {
      setAuthRedirect(from);
      const complete = `${window.location.origin}${from.startsWith('/') ? from : `/${from}`}`;
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: complete,
      });
    } catch (error) {
      showError(error);
      setLoading(false);
    }
  };

  if (authLoading || resuming || user) {
    return (
      <main className="auth-page-shell">
        <div className="relative z-10 w-full max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-10 h-10 border-4 border-brand/25 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">
            {lang === 'ar' ? 'جارٍ فتح حسابك…' : 'Opening your account…'}
          </p>
        </div>
      </main>
    );
  }

  if (isClerkSignedIn && !user) {
    return (
      <>
        <AuthGlassCard icon={LogIn} title={t('auth.login')} subtitle={t('auth.loginSubtitle')} activeTab="login">
          {inlineError && (
            <div className="auth-error-banner mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{inlineError}</span>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            {lang === 'ar'
              ? 'جلسة الدخول نشطة. اضغط للمتابعة إلى حسابك.'
              : 'Your sign-in session is active. Continue to open your account.'}
          </p>
          <button
            type="button"
            onClick={() => {
              resumeRef.current = false;
              navigatedRef.current = false;
              resumeExistingSession();
            }}
            className="auth-btn-primary w-full"
          >
            {lang === 'ar' ? 'متابعة إلى الحساب' : 'Continue to account'}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Sign-out failed:', error);
              } finally {
                resumeRef.current = false;
                navigatedRef.current = false;
                setInlineError('');
                setResuming(false);
              }
            }}
            className="mt-3 w-full text-sm font-semibold text-brand/80 hover:text-brand underline-offset-2 hover:underline"
          >
            {lang === 'ar' ? 'تسجيل الخروج والمحاولة بحساب آخر' : 'Sign out and try another account'}
          </button>
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
