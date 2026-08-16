import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateLoginForm } from '../utils/firebaseErrors';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import AuthAlertModal from '../components/ui/AuthAlertModal';
import PasswordInput from '../components/ui/PasswordInput';

const REMEMBER_KEY = 'bashayer_remember_email';
const SUCCESS_REDIRECT_MS = 900;

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language;
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [inlineError, setInlineError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const authAttemptRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    if (user && !authAttemptRef.current) navigate(from, { replace: true });
  }, [user, from, navigate]);

  useEffect(() => () => window.clearTimeout(redirectTimerRef.current), []);

  const showError = (message, code, type = 'error') => {
    setInlineError(message);
    setModal({ type, title: lang === 'ar' ? 'تعذر تسجيل الدخول' : 'Sign-in failed', message, code });
  };

  const showSuccess = ({ google = false, isNew = false } = {}) => {
    const title = google
      ? (isNew
        ? (lang === 'ar' ? 'تم إنشاء حسابك عبر Google!' : 'Google account ready!')
        : (lang === 'ar' ? 'تم الدخول عبر Google' : 'Signed in with Google'))
      : (lang === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!');

    const message = google
      ? (lang === 'ar'
        ? 'تم تسجيل دخولك بنجاح. جاري نقلك إلى لوحة التحكم…'
        : 'You are signed in. Taking you to your dashboard…')
      : (lang === 'ar'
        ? 'تم تسجيل دخولك بنجاح. سننقلك الآن إلى لوحة التحكم.'
        : 'You are signed in successfully. Taking you to your dashboard now.');

    setModal({ type: 'success', title, message });
    redirectTimerRef.current = window.setTimeout(() => navigate(from, { replace: true }), SUCCESS_REDIRECT_MS);
  };

  const closeModal = () => {
    const isSuccess = modal?.type === 'success';
    setModal(null);
    if (isSuccess) {
      window.clearTimeout(redirectTimerRef.current);
      navigate(from, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setModal(null);

    const validation = validateLoginForm({ email, password }, lang);
    if (!validation.valid) {
      showError(validation.errors[0], 'validation/error', validation.errors[0].includes('fake') || validation.errors[0].includes('Temporary') ? 'security' : 'error');
      return;
    }

    authAttemptRef.current = true;
    setLoading(true);
    try {
      await login(validation.email, password);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, validation.email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      showSuccess();
    } catch (err) {
      authAttemptRef.current = false;
      const { message, code } = handleAuthError(err, 'login', lang);
      const modalType = code === 'auth/too-many-requests' ? 'warning' : 'error';
      showError(message, code, modalType);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setInlineError('');
    setModal(null);
    authAttemptRef.current = true;
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result?.user) {
        showSuccess({ google: true, isNew: Boolean(result.isNew) });
      }
      // null = redirect fallback (browser navigates away)
    } catch (err) {
      authAttemptRef.current = false;
      const { message, code } = handleAuthError(err, 'google-login', lang);
      showError(message, code, code === 'auth/admin-account' ? 'warning' : 'error');
    } finally {
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

        <div className="auth-info-note mb-4">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('auth.googleHint')}</span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="auth-btn-google disabled:opacity-60"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 shrink-0" />
          {loading ? t('common.loading') : t('auth.loginWithGoogle')}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">{t('auth.orContinueWith')}</span>
          </div>
        </div>

        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>
            <div className="relative group">
              <Mail className="auth-input-icon" />
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                placeholder="you@email.com"
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.password')}</label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              lang={lang}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="auth-checkbox"
              />
              <span className="text-sm text-gray-600">{t('auth.rememberMe')}</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-brand hover:text-gold font-semibold transition-colors">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-brand hover:text-gold font-bold transition-colors">
            {t('auth.register')}
          </Link>
        </p>
      </AuthGlassCard>

      <AuthAlertModal
        open={!!modal}
        onClose={closeModal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        code={modal?.code}
        actionLabel={modal?.type === 'success' ? (lang === 'ar' ? 'الذهاب للوحة التحكم' : 'Go to dashboard') : undefined}
      />
    </>
  );
}
