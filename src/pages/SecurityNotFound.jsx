import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Home, Lock, ArrowLeft } from 'lucide-react';
import AppNavLink from '../components/ui/AppNavLink';

export default function SecurityNotFound({ variant = 'public' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = variant === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0f0618] via-brand-dark to-[#1a0a30] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 start-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 end-1/4 w-72 h-72 bg-brand/20 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/15 border border-red-500/30 mb-6 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>

        <p className="text-red-400/90 text-xs font-black uppercase tracking-[0.3em] mb-3">
          {t('security.errorCode')}
        </p>

        <h1 className="text-6xl sm:text-7xl font-black text-white mb-2 tabular-nums">404</h1>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white/90 mb-3">
          {isAdmin ? t('security.adminTitle') : t('security.publicTitle')}
        </h2>

        <p className="text-white/55 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          {isAdmin ? t('security.adminDesc') : t('security.publicDesc')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-bold text-sm shadow-lg shadow-brand/30 hover:scale-[1.02] transition-transform"
              >
                <Lock className="w-4 h-4" />
                {t('security.backToDashboard')}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl border border-white/20 text-white/80 font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t('security.goBack')}
              </button>
            </>
          ) : (
            <>
              <AppNavLink
                to="/"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-brand-dark font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform"
              >
                <Home className="w-4 h-4" />
                {t('security.backHome')}
              </AppNavLink>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl border border-white/20 text-white/80 font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t('security.goBack')}
              </button>
            </>
          )}
        </div>

        <p className="mt-10 text-[10px] text-white/25 font-mono tracking-wider">
          {t('security.footer')}
        </p>
      </div>
    </div>
  );
}
