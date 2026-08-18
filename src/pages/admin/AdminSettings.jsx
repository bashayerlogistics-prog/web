import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Shield, Palette, Database, RotateCcw, Sparkles, Wand2, Image, Eraser, DatabaseBackup } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminData } from '../../context/AdminDataContext';
import { useToast } from '../../context/ToastContext';
import { useBranding } from '../../context/BrandingContext';
import { CONTACT } from '../../data/staticData';
import { DEFAULT_BRANDING, FONT_OPTIONS } from '../../data/brandingDefaults';
import { AI_COLOR_PALETTES } from '../../data/colorPalettes';
import { updateBrandingSettings } from '../../firebase/branding';
import { syncContentImagesFromDefaults } from '../../firebase/admin';
import { getContentCounts, seedAllSiteContent } from '../../firebase/seedContent';
import { extractColorsFromImage } from '../../utils/extractImageColors';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { clearAllAppCaches } from '../../utils/siteContentRefresh';
import BrandLogo from '../../components/ui/BrandLogo';
import MediaUpload from '../../components/admin/MediaUpload';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import AdminSelect from '../../components/admin/AdminSelect';
import ColorAccessibilityStudio from '../../components/admin/ColorAccessibilityStudio';
import GlassCard from '../../components/ui/GlassCard';
import AlertBanner from '../../components/ui/AlertBanner';
import { getReadableTextColor } from '../../utils/colorUtils';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand/20 bg-white dark:admin-input text-sm outline-none focus:ring-2 focus:ring-primary-500/40';

const isValidHexColor = (value) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);

export default function AdminSettings() {
  const { t } = useTranslation();
  const { changePassword, adminEmail } = useAdminAuth();
  const { stats, lastRefresh } = useAdminData();
  const { toast } = useToast();
  const { branding, refresh: refreshBranding, applyBranding } = useBranding();
  const publishSite = usePublishSiteContent();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingImages, setSyncingImages] = useState(false);
  const [seedingContent, setSeedingContent] = useState(false);
  const [contentCounts, setContentCounts] = useState({ products: 0, services: 0, blogs: 0, routeCards: 0, faqs: 0, socialLinks: 0 });

  const loadContentCounts = async () => {
    try {
      const counts = await getContentCounts();
      setContentCounts(counts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadContentCounts();
  }, []);

  const [colors, setColors] = useState({ ...DEFAULT_BRANDING });
  const [savingColors, setSavingColors] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const colorSaveTimerRef = useRef(null);
  const colorsRef = useRef(colors);

  useEffect(() => {
    setColors({ ...branding });
  }, [branding]);

  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  useEffect(() => () => {
    if (colorSaveTimerRef.current) clearTimeout(colorSaveTimerRef.current);
  }, []);

  const persistBranding = async (next, { silent = false } = {}) => {
    setSavingColors(true);
    try {
      await updateBrandingSettings(next);
      if (!silent) toast.success(t('admin.settings.brandingSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingColors(false);
    }
  };

  const scheduleColorAutoSave = (next, { silent = false } = {}) => {
    if (colorSaveTimerRef.current) clearTimeout(colorSaveTimerRef.current);
    colorSaveTimerRef.current = setTimeout(() => {
      persistBranding(next, { silent });
    }, 500);
  };

  const updateColors = (partial, { autoSave = false } = {}) => {
    setColors((c) => {
      const next = { ...c, ...partial };
      applyBranding(next);
      if (autoSave) scheduleColorAutoSave(next);
      return next;
    });
  };

  const handleColorChange = (key, value) => {
    const nextPartial = { [key]: value };
    setColors((c) => {
      const next = { ...c, ...nextPartial };
      applyBranding(next);
      if (isValidHexColor(value)) scheduleColorAutoSave(next);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError(t('admin.settings.passwordMismatch')); return; }
    if (newPassword.length < 6) { setError(t('admin.settings.weakPassword')); return; }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success(t('admin.settings.passwordChanged'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const msg = err.message === 'wrong-current-password' ? t('admin.settings.wrongPassword') : t('common.error');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (colorSaveTimerRef.current) clearTimeout(colorSaveTimerRef.current);
    await persistBranding(colorsRef.current);
    await refreshBranding();
  };

  const handleResetBranding = () => {
    const next = { ...DEFAULT_BRANDING };
    updateColors(next);
    scheduleColorAutoSave(next);
  };

  const handleApplyPalette = async (palette) => {
    if (colorSaveTimerRef.current) clearTimeout(colorSaveTimerRef.current);
    const updated = {
      ...colorsRef.current,
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
    };
    updateColors({
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
    });
    setSavingColors(true);
    try {
      await updateBrandingSettings(updated);
      toast.success(t('admin.settings.paletteApplied', { name: palette.name }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingColors(false);
    }
  };

  const handleSyncImages = async () => {
    setSyncingImages(true);
    try {
      const result = await syncContentImagesFromDefaults();
      publishSite();
      toast.success(
        t('admin.settings.imagesSynced', {
          products: result.products,
          services: result.services,
          blogs: result.blogs,
        }),
      );
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSyncingImages(false);
    }
  };

  const handleSeedAllContent = async () => {
    setSeedingContent(true);
    try {
      const result = await seedAllSiteContent();
      await loadContentCounts();
      publishSite();
      if (result.alreadyExists) {
        toast.info(t('admin.alreadyImported'));
      } else {
        toast.success(
          t('admin.settings.contentImported', {
            products: result.products,
            services: result.services,
            blogs: result.blogs,
          }),
        );
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSeedingContent(false);
    }
  };

  const handleClearSiteCache = async () => {
    clearAllAppCaches();
    try {
      sessionStorage.removeItem('bashayer-seed-once');
    } catch {
      // ignore
    }
    await publishSite('full');
    toast.success(t('admin.settings.cacheCleared'));
  };

  const handleExtractFromLogo = async () => {
    if (!colors.logoUrl) {
      toast.error(t('admin.settings.uploadLogoFirst'));
      return;
    }
    setExtractingColors(true);
    try {
      const extracted = await extractColorsFromImage(colors.logoUrl);
      if (extracted) {
        setColors((c) => {
          const next = { ...c, ...extracted };
          applyBranding(next);
          scheduleColorAutoSave(next, { silent: true });
          return next;
        });
        toast.success(t('admin.settings.colorsExtracted'));
      } else {
        toast.error(t('admin.settings.extractFailed'));
      }
    } catch {
      toast.error(t('admin.settings.extractFailed'));
    } finally {
      setExtractingColors(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.settings')} subtitle={t('admin.settings.subtitle')} />

      <GlassCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center glass-stat-icon overflow-hidden">
            <BrandLogo variant="badge" tone="auto" alt="" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h2 className="font-black text-dark-800 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              {t('admin.settings.branding')}
            </h2>
            <p className="text-xs text-gray-500">{t('admin.settings.brandingDesc')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary-50/80 to-emerald-50/50 dark:from-primary-900/20 dark:to-emerald-900/10 border border-primary-500/10 mb-6">
          <BrandLogo variant="badge" tone="auto" alt="" className="w-20 h-20 rounded-2xl object-contain ring-2 ring-primary-500/30 shadow-lg p-2 bg-white/80 dark:bg-brand/20" />
          <div>
            <p className="font-black text-lg shimmer-text">{t('brand.name')}</p>
            <p className="text-sm text-gray-500">{t('brand.tagline')}</p>
            <p className="text-xs text-gray-400 mt-2" dir="ltr">{CONTACT.email}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
            {t('admin.settings.logoUpload')}
          </label>
          <MediaUpload
            value={colors.logoUrl || ''}
            onChange={(url) => updateColors({ logoUrl: url })}
            folder="branding"
            allowUrl
            previewClassName="w-32 h-32 object-contain rounded-xl"
          />
          <p className="text-xs text-gray-400 mt-2">{t('admin.settings.logoUploadHint')}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <label className="text-sm font-semibold text-dark-700 dark:text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              {t('admin.settings.aiColorSuggestions')}
            </label>
            {colors.logoUrl && (
              <button
                type="button"
                onClick={handleExtractFromLogo}
                disabled={extractingColors}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold hover:scale-[1.02] transition-all disabled:opacity-60"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {extractingColors ? t('common.loading') : t('admin.settings.extractFromLogo')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {AI_COLOR_PALETTES.map((palette) => (
              <div
                key={palette.id}
                className={`p-3 rounded-xl border-2 transition-all text-start ${
                  colors.primaryColor === palette.primaryColor && colors.secondaryColor === palette.secondaryColor
                    ? 'border-brand shadow-md'
                    : 'border-gray-200 dark:border-brand/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex gap-1.5">
                    <span className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: palette.primaryColor }} />
                    <span className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: palette.secondaryColor }} />
                  </div>
                  {palette.tag === 'recommended' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-1 text-[9px] font-black text-gold-dark">
                      <Sparkles className="h-2.5 w-2.5" />
                      {t('admin.settings.recommendedPalette')}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-dark-800 dark:text-white truncate mb-2">{palette.name}</p>
                <button
                  type="button"
                  onClick={() => handleApplyPalette(palette)}
                  disabled={savingColors}
                  className="w-full px-2 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-emerald-600 text-white text-[10px] font-bold hover:scale-[1.02] disabled:opacity-60"
                >
                  {t('common.apply')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
              {t('admin.settings.primaryColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colors.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="w-12 h-12 rounded-xl border-0 cursor-pointer"
              />
              <input
                type="text"
                value={colors.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
              {t('admin.settings.secondaryColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colors.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="w-12 h-12 rounded-xl border-0 cursor-pointer"
              />
              <input
                type="text"
                value={colors.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
              {t('admin.settings.userFontAr')}
            </label>
            <AdminSelect
              value={colors.userFontAr || colors.userFont || 'Tajawal'}
              onChange={(e) => updateColors({ userFontAr: e.target.value })}
              className={inputClass}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
              {t('admin.settings.userFontEn')}
            </label>
            <AdminSelect
              value={colors.userFontEn || 'Inter'}
              onChange={(e) => updateColors({ userFontEn: e.target.value })}
              className={inputClass}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-2">
              {t('admin.settings.adminFont')}
            </label>
            <AdminSelect
              value={colors.adminFont}
              onChange={(e) => updateColors({ adminFont: e.target.value })}
              className={inputClass}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </AdminSelect>
          </div>
        </div>

        {isValidHexColor(colors.primaryColor) && isValidHexColor(colors.secondaryColor) && (
          <ColorAccessibilityStudio
            colors={colors}
            onChange={(partial) => updateColors(partial, { autoSave: true })}
          />
        )}

        <div className="mt-5 p-4 rounded-2xl border border-brand/10" style={{
          background: `linear-gradient(135deg, ${colors.primaryColor}15, ${colors.secondaryColor}15)`,
        }}>
          <p className="text-xs text-gray-500 mb-2">{t('admin.settings.colorPreview')}</p>
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                backgroundColor: colors.primaryColor,
                color: isValidHexColor(colors.primaryColor) ? getReadableTextColor(colors.primaryColor) : '#ffffff',
              }}
            >
              {t('admin.settings.primaryColor')}
            </div>
            <div
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                backgroundColor: colors.secondaryColor,
                color: isValidHexColor(colors.secondaryColor) ? getReadableTextColor(colors.secondaryColor) : '#ffffff',
              }}
            >
              {t('admin.settings.secondaryColor')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <AdminApplyButton
            type="button"
            onClick={handleSaveBranding}
            loading={savingColors}
            label={t('admin.settings.applyBranding')}
          />
          <button
            type="button"
            onClick={handleResetBranding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand/20 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-brand/5"
          >
            <RotateCcw className="w-4 h-4" />
            {t('admin.settings.resetBranding')}
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center glass-stat-icon">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-dark-800 dark:text-white">{t('admin.settings.databaseStatus')}</h2>
              <p className="text-xs text-emerald-600 font-semibold">{t('admin.settings.databaseConnected')}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              [t('admin.stats.totalOrders'), stats.totalOrders],
              [t('admin.stats.totalUsers'), stats.totalUsers],
              [t('admin.stats.pendingOrders'), stats.pending],
              [t('admin.stats.totalRevenue'), `${stats.revenue} ${t('booking.sar')}`],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-white/50 dark:admin-surface border border-white/40 dark:border-emerald-500/15">
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="font-black text-dark-800 dark:text-white mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="grid grid-cols-3 gap-3 mt-3">
            {[
              [t('admin.products.title'), contentCounts.products],
              [t('admin.nav.routes'), contentCounts.routeCards],
              [t('admin.nav.services'), contentCounts.services],
              [t('admin.nav.faq'), contentCounts.faqs],
              [t('admin.nav.blogs'), contentCounts.blogs],
              [t('admin.nav.social'), contentCounts.socialLinks],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-primary-50/50 dark:bg-primary-900/10 border border-primary-500/10">
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className={`font-black mt-0.5 ${value === 0 ? 'text-amber-600' : 'text-dark-800 dark:text-white'}`}>{value}</dd>
              </div>
            ))}
          </dl>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-3">{t('admin.settings.lastSync')}: {lastRefresh.toLocaleString()}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSeedAllContent}
              disabled={seedingContent}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-emerald-600 text-white text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              <Database className="w-4 h-4" />
              {seedingContent ? t('common.loading') : t('admin.settings.importAllContent')}
            </button>
            <button
              type="button"
              onClick={handleSyncImages}
              disabled={syncingImages}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              <Image className="w-4 h-4" />
              {syncingImages ? t('common.loading') : t('admin.settings.syncImages')}
            </button>
            <button
              type="button"
              onClick={handleClearSiteCache}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 text-sm font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <Eraser className="w-4 h-4" />
              {t('admin.settings.clearCache')}
            </button>
            <Link
              to="/admin/backup"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/5 text-brand text-sm font-bold hover:bg-brand/10 transition-colors"
            >
              <DatabaseBackup className="w-4 h-4" />
              {t('admin.nav.backup')}
            </Link>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-primary-500" />
            <h2 className="font-black text-dark-800 dark:text-white">{t('admin.settings.accountInfo')}</h2>
          </div>
          <dl className="space-y-3">
            {[
              [t('admin.login.username'), 'superadmin'],
              [t('auth.email'), adminEmail],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center p-3 rounded-xl bg-white/50 dark:admin-surface border border-white/40 dark:border-emerald-500/15 text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-bold text-dark-800 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 mb-2">
            <KeyRound className="w-5 h-5 text-primary-500" />
            <h2 className="font-black text-dark-800 dark:text-white">{t('admin.settings.changePassword')}</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">{t('admin.settings.firebasePasswordNote')}</p>
          <div className="space-y-4">
            {[
              { key: 'current', label: t('admin.settings.currentPassword'), value: currentPassword, set: setCurrentPassword },
              { key: 'new', label: t('admin.settings.newPassword'), value: newPassword, set: setNewPassword },
              { key: 'confirm', label: t('auth.confirmPassword'), value: confirmPassword, set: setConfirmPassword },
            ].map(({ key, label, value, set }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-dark-700 dark:text-gray-300 mb-1.5">{label}</label>
                <input type="password" value={value} onChange={(e) => set(e.target.value)} required minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-white/50 dark:border-emerald-500/25 bg-white/60 dark:admin-input outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
          </div>
          {error && <div className="mt-4"><AlertBanner type="error" message={error} onClose={() => setError('')} /></div>}
          <AdminApplyButton
            type="submit"
            loading={loading}
            label={t('admin.settings.applyPassword')}
            fullWidth
            className="mt-5"
          />
        </form>
      </GlassCard>
    </div>
  );
}
