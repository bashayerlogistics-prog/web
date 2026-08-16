import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleAuthError, validateEmail } from '../utils/firebaseErrors';
import AuthGlassCard from '../components/ui/AuthGlassCard';
import AuthAlertModal from '../components/ui/AuthAlertModal';

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const { resetPassword } = useAuth();
  const lang = i18n.language;

  const [email, setEmail] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setModal(null);

    const validation = validateEmail(email, lang);
    if (!validation.valid) {
      setInlineError(validation.errors[0]);
      setModal({ type: 'error', title: lang === 'ar' ? 'خطأ' : 'Error', message: validation.errors[0] });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(validation.email);
      setModal({
        type: 'success',
        title: lang === 'ar' ? 'تم إرسال البريد!' : 'Email Sent!',
        message: lang === 'ar' ? 'تم إرسال رابط إعادة التعيين إلى بريدك.' : 'A reset link has been sent to your email.',
      });
    } catch (err) {
      const { message, code } = handleAuthError(err, 'reset-password', lang);
      setInlineError(message);
      const isGoogleOnly = code === 'auth/google-only-account';
      setModal({
        type: isGoogleOnly ? 'warning' : 'error',
        title: isGoogleOnly
          ? (lang === 'ar' ? 'حساب Google' : 'Google Account')
          : (lang === 'ar' ? 'خطأ' : 'Error'),
        message,
        code,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthGlassCard icon={KeyRound} title={t('auth.resetPassword')} subtitle={t('auth.resetSubtitle')} activeTab="login">
        {inlineError && (
          <div className="auth-error-banner mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{inlineError}</span>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-800">
          {t('auth.resetGoogleHint')}
        </div>

        <form id="forgot-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand mb-1.5">{t('auth.email')}</label>
            <div className="relative group">
              <Mail className="auth-input-icon" />
              <input
                type="email"
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

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary w-full flex items-center justify-center gap-2"
          >
            <KeyRound className="w-5 h-5 shrink-0" />
            {loading ? t('common.loading') : t('auth.sendReset')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          <Link to="/login" className="text-brand hover:text-gold font-bold transition-colors">
            {t('auth.backToLogin')}
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
