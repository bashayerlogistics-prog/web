import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Eye, EyeOff, Sun, Moon, Languages, Lock, User, LogIn } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { setLanguage } from '../../i18n';
import BrandLogo from '../../components/ui/BrandLogo';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminLogin() {
  const { t, i18n } = useTranslation();
  const { login, isAdmin, loading: authLoading } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch {
      setError(t('admin.login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-bg">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-bg flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-brand text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 end-16 w-64 h-64 bg-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-16 start-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <BrandLogo variant="full" tone="light" alt="" className="h-12 w-auto" />
          <span className="text-lg font-black">{t('brand.name')}</span>
        </div>
        <div className="relative space-y-4 max-w-md">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-3xl xl:text-4xl font-black leading-tight">{t('admin.login.heroTitle')}</h2>
          <p className="text-white/75 text-base leading-relaxed">{t('admin.login.heroDesc')}</p>
        </div>
        <p className="relative text-white/50 text-sm">© 2026 {t('brand.name')}</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="absolute top-4 end-4 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-brand/5 hover:text-brand transition-colors shadow-sm"
            aria-label="Language"
          >
            <Languages className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-brand/5 transition-colors shadow-sm"
            aria-label="Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-gold" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-6 text-center">
            <BrandLogo variant="full" tone="auto" alt="" className="h-12 w-auto" />
            <h2 className="text-xl font-black text-brand">{t('admin.title')}</h2>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 text-center sm:text-start">
              <h1 className="text-2xl font-black text-brand">{t('admin.login.title')}</h1>
              <p className="text-gray-500 mt-1.5 text-sm">{t('admin.login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand mb-1.5">{t('admin.login.usernameOrEmail')}</label>
                <div className="relative group">
                  <User className="auth-input-icon" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="auth-input"
                    placeholder="superadmin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand mb-1.5">{t('auth.password')}</label>
                <div className="relative group">
                  <Lock className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="auth-input auth-input-with-toggle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1.5 rounded-lg text-gray-400 hover:text-brand transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="auth-error-banner">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="auth-btn-primary w-full flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5 shrink-0" />
                {loading ? t('common.loading') : t('auth.login')}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500">
              <Link to="/" className="text-brand hover:text-gold font-bold transition-colors">
                {t('nav.home')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
