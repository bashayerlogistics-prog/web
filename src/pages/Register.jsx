import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, User, Phone, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateRegisterForm } from '../utils/firebaseErrors';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import AuthAlertModal from '../components/ui/AuthAlertModal';
import PasswordInput from '../components/ui/PasswordInput';

const SUCCESS_REDIRECT_MS = 900;

export default function Register() {
  const { t, i18n } = useTranslation();
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [inlineError, setInlineError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const authAttemptRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    if (user && !authAttemptRef.current) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => () => window.clearTimeout(redirectTimerRef.current), []);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const showError = (message, code, type = 'error') => {
    setInlineError(message);
    const isSecurity = code?.includes('disposable') || code?.includes('weak') || code === 'validation/error';
    setModal({
      type: isSecurity ? 'security' : type,
      title: lang === 'ar' ? 'تعذر إكمال العملية' : 'We could not continue',
      message,
      code,
    });
  };

  const showSuccess = ({ google = false, isNew = false } = {}) => {
    const title = google
      ? (isNew
        ? (lang === 'ar' ? 'أهلاً بك! تم التسجيل عبر Google' : 'Welcome! Signed up with Google')
        : (lang === 'ar' ? 'تم الدخول عبر Google' : 'Signed in with Google'))
      : (lang === 'ar' ? 'أهلاً بك معنا!' : 'Welcome aboard!');

    const message = google
      ? (lang === 'ar'
        ? 'حسابك جاهز وتم تسجيل دخولك تلقائياً. جاري نقلك إلى لوحة التحكم…'
        : 'Your account is ready and you are signed in. Taking you to the dashboard…')
      : (lang === 'ar'
        ? 'تم إنشاء حسابك بنجاح. سننقلك الآن إلى لوحة التحكم.'
        : 'Your account is ready. Taking you to your dashboard now.');

    setModal({ type: 'success', title, message });
    redirectTimerRef.current = window.setTimeout(() => navigate('/dashboard', { replace: true }), SUCCESS_REDIRECT_MS);
  };

  const closeModal = () => {
    const isSuccess = modal?.type === 'success';
    setModal(null);
    if (isSuccess) {
      window.clearTimeout(redirectTimerRef.current);
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setModal(null);

    if (!agreed) {
      const msg = lang === 'ar' ? 'يرجى الموافقة على شروط الخدمة وسياسة الخصوصية' : 'Please accept the terms and privacy policy';
      showError(msg, 'validation/terms');
      return;
    }

    const validation = validateRegisterForm(form, lang);
    if (!validation.valid) {
      showError(validation.errors[0], 'validation/error');
      return;
    }

    authAttemptRef.current = true;
    setLoading(true);
    try {
      await register(validation.email, form.password, form.name.trim(), form.phone.trim());
      showSuccess();
    } catch (err) {
      authAttemptRef.current = false;
      const { message, code } = handleAuthError(err, 'register', lang);
      const modalType = code === 'auth/email-already-in-use' ? 'warning' : 'error';
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
      // Google = register + login in one step
      const result = await loginWithGoogle();
      if (result?.user) {
        showSuccess({ google: true, isNew: Boolean(result.isNew) });
      }
    } catch (err) {
      authAttemptRef.current = false;
      const { message, code } = handleAuthError(err, 'google-login', lang);
      showError(message, code, code === 'auth/admin-account' ? 'warning' : 'error');
    } finally {
      setLoading(false);
    }
  };

  const textFields = [
    { key: 'name', type: 'text', icon: User, label: t('auth.name') },
    { key: 'email', type: 'email', icon: Mail, label: t('auth.email'), dir: 'ltr' },
    { key: 'phone', type: 'tel', icon: Phone, label: t('auth.phone'), dir: 'ltr' },
  ];

  return (
    <>
      <AuthGlassCard icon={UserPlus} title={t('auth.register')} subtitle={t('auth.registerSubtitle')} activeTab="register">
        {inlineError && (
          <div className="auth-error-banner mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{inlineError}</span>
          </div>
        )}

        <div className="auth-info-note mb-4">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('auth.googleSignupHint')}</span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="auth-btn-google disabled:opacity-60"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
          {loading ? t('common.loading') : t('auth.registerWithGoogle')}
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-2 leading-relaxed">
          {t('auth.googleTermsNote')}
        </p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/60 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-transparent text-gray-400">{t('auth.orContinueWith')}</span>
          </div>
        </div>

        <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
          {textFields.map(({ key, type, icon: Icon, label, dir }) => (
            <div key={key}>
              <label htmlFor={`register-${key}`} className="block text-sm font-semibold text-brand mb-1.5">{label}</label>
              <div className="relative group">
                <Icon className="auth-input-icon" />
                <input
                  type={type}
                  id={`register-${key}`}
                  value={form[key]}
                  onChange={update(key)}
                  required
                  dir={dir}
                  className="auth-input"
                />
              </div>
            </div>
          ))}

          <div>
            <label htmlFor="register-password" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.password')}</label>
            <PasswordInput
              id="register-password"
              value={form.password}
              onChange={update('password')}
              required
              showStrength
              lang={lang}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-semibold text-brand mb-1.5">{t('auth.confirmPassword')}</label>
            <PasswordInput
              id="register-confirm-password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              autoComplete="new-password"
              lang={lang}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">{t('auth.passwordHint')}</p>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="auth-checkbox mt-0.5"
            />
            <span className="text-xs text-gray-500 leading-relaxed">{t('auth.termsAgree')}</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-5 h-5 shrink-0" />
            {loading ? t('common.loading') : t('auth.register')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-brand hover:text-gold font-bold transition-colors">
            {t('auth.login')}
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
