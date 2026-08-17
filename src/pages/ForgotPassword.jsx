import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck } from 'lucide-react';
import AuthGlassCard from '../components/ui/AuthGlassCard';

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <AuthGlassCard icon={KeyRound} title={t('auth.forgotPassword')} subtitle={t('auth.loginSubtitle')} activeTab="login">
      <div className="auth-info-note mb-6">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {lang === 'ar'
            ? 'لا توجد كلمة مرور. سجّل الدخول برمز OTP على البريد أو عبر Google.'
            : 'There is no password. Sign in with an email OTP or Google.'}
        </span>
      </div>
      <Link to="/login" className="auth-btn-primary w-full flex items-center justify-center gap-2">
        {t('auth.backToLogin')}
      </Link>
    </AuthGlassCard>
  );
}
