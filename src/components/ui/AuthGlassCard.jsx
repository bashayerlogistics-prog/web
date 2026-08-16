import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Headphones, ShieldCheck, Sparkles } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';

export default function AuthGlassCard({
  icon: Icon,
  title,
  subtitle,
  activeTab = 'login',
  children,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const benefits = isArabic
    ? [
        { icon: ShieldCheck, text: 'بياناتك محمية بأعلى معايير الأمان' },
        { icon: BadgeCheck, text: 'إدارة حجوزاتك بسهولة من مكان واحد' },
        { icon: Headphones, text: 'دعم متواصل قبل رحلتك وبعدها' },
      ]
    : [
        { icon: ShieldCheck, text: 'Your data is protected with secure sign-in' },
        { icon: BadgeCheck, text: 'Manage every booking in one simple place' },
        { icon: Headphones, text: 'Dedicated support before and after your trip' },
      ];

  return (
    <main className="auth-page-shell">
      <div className="auth-page-orb auth-page-orb-one" aria-hidden="true" />
      <div className="auth-page-orb auth-page-orb-two" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <div className="auth-layout">
          <aside className="auth-welcome-panel">
            <div className="relative z-10">
              <BrandLogo variant="full" tone="light" alt="" className="h-11 sm:h-14 w-auto mb-8" />
              <span className="auth-eyebrow">
                <Sparkles className="w-4 h-4" />
                {isArabic ? 'رحلتك تبدأ من هنا' : 'Your journey starts here'}
              </span>
              <h2 className="mt-5 text-3xl lg:text-4xl font-black leading-tight">
                {isArabic ? 'سافر براحة، ونحن نهتم بالتفاصيل' : 'Travel with confidence. We handle the details.'}
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/70 leading-7 max-w-md">
                {isArabic
                  ? 'سجّل دخولك للوصول إلى حجوزاتك وتحديثات رحلاتك وخدماتك في أي وقت.'
                  : 'Sign in for instant access to bookings, trip updates, and travel services whenever you need them.'}
              </p>
              <div className="mt-8 space-y-4">
                {benefits.map(({ icon: BenefitIcon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-white/85">
                    <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      <BenefitIcon className="w-4 h-4 text-gold-light" />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="auth-welcome-glow" aria-hidden="true" />
          </aside>

          <section className="auth-form-panel">
            <div className="mb-5 sm:mb-6">
              <span className="auth-mobile-brand">
                <BrandLogo variant="full" alt="" className="h-9 w-auto" />
              </span>
              <div className="flex items-start gap-3">
                {Icon && (
                  <span className="auth-title-icon">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-dark-900">{title}</h1>
                  {subtitle && <p className="text-gray-500 mt-1.5 text-sm leading-6">{subtitle}</p>}
                </div>
              </div>
            </div>

            <nav className="auth-tabs" aria-label={isArabic ? 'خيارات الحساب' : 'Account options'}>
              <Link
                to="/login"
                aria-current={activeTab === 'login' ? 'page' : undefined}
                className={`auth-tab ${activeTab === 'login' ? 'auth-tab-active' : ''}`}
              >
                {t('auth.login')}
              </Link>
              <Link
                to="/register"
                aria-current={activeTab === 'register' ? 'page' : undefined}
                className={`auth-tab ${activeTab === 'register' ? 'auth-tab-active' : ''}`}
              >
                {t('auth.register')}
              </Link>
            </nav>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
