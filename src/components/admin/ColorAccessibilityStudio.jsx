import { ArrowLeftRight, CheckCircle2, Eye, Sparkles, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ensureContrast,
  generateColorScale,
  getContrastRatio,
  getReadableTextColor,
} from '../../utils/colorUtils';

const DARK_TEXT = '#111827';
const LIGHT_TEXT = '#ffffff';

function ContrastCard({ label, color }) {
  const { t } = useTranslation();
  const textColor = getReadableTextColor(color);
  const ratio = getContrastRatio(color, textColor);
  const passesAAA = ratio >= 7;
  const passesAA = ratio >= 4.5;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/70 dark:border-brand/20 dark:admin-surface">
      <div
        className="flex min-h-28 flex-col justify-between p-4"
        style={{ backgroundColor: color, color: textColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wider opacity-80">{label}</span>
          <Eye className="h-4 w-4" />
        </div>
        <p className="text-lg font-black">{t('admin.settings.readableSample')}</p>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {t('admin.settings.contrastRatio')}
          </p>
          <p className="font-black text-dark-800 dark:text-white">{ratio.toFixed(2)}:1</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
          passesAA
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
        }`}>
          {passesAA ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
          {passesAAA ? 'AAA' : passesAA ? 'AA' : t('admin.settings.needsContrast')}
        </span>
      </div>
    </div>
  );
}

function ShadeRamp({ label, color }) {
  const scale = generateColorScale(color);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-dark-700 dark:text-gray-200">{label}</p>
        <code className="text-[10px] font-bold text-gray-400">{color.toUpperCase()}</code>
      </div>
      <div className="flex h-10 overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10">
        {Object.entries(scale).map(([shade, value]) => (
          <div
            key={shade}
            className="group relative flex-1"
            style={{ backgroundColor: value }}
            title={`${shade}: ${value}`}
          >
            <span
              className="absolute inset-x-0 bottom-0 hidden py-0.5 text-center text-[8px] font-black group-hover:block"
              style={{ color: getReadableTextColor(value) }}
            >
              {shade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ColorAccessibilityStudio({ colors, onChange }) {
  const { t } = useTranslation();
  const primary = colors.primaryColor;
  const secondary = colors.secondaryColor;
  const primarySafe = getContrastRatio(primary, LIGHT_TEXT) >= 4.5;
  const secondarySafe = getContrastRatio(secondary, DARK_TEXT) >= 4.5;
  const allSafe = primarySafe && secondarySafe;

  const handleSwap = () => {
    onChange({
      primaryColor: secondary,
      secondaryColor: primary,
    });
  };

  const handleAutoImprove = () => {
    onChange({
      primaryColor: ensureContrast(primary, LIGHT_TEXT),
      secondaryColor: ensureContrast(secondary, DARK_TEXT),
    });
  };

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-primary-500/15 bg-gradient-to-br from-white/90 via-primary-50/40 to-secondary-50/60 p-4 shadow-sm dark:from-brand/10 dark:via-brand/5 dark:to-amber-500/5 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-black text-dark-800 dark:text-white">
                {t('admin.settings.advancedColorStudio')}
              </h3>
              <p className="text-xs text-gray-500">{t('admin.settings.advancedColorStudioDesc')}</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
          allSafe
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
        }`}>
          {allSafe ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
          {allSafe ? t('admin.settings.wcagReady') : t('admin.settings.contrastWarning')}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ContrastCard label={t('admin.settings.primaryColor')} color={primary} />
        <ContrastCard label={t('admin.settings.secondaryColor')} color={secondary} />
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-white/60 bg-white/55 p-4 dark:border-brand/15 dark:bg-black/10">
        <ShadeRamp label={t('admin.settings.primaryScale')} color={primary} />
        <ShadeRamp label={t('admin.settings.secondaryScale')} color={secondary} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAutoImprove}
          disabled={allSafe}
          className="inline-flex items-center gap-2 rounded-xl bg-dark-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-dark-900"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t('admin.settings.autoImproveContrast')}
        </button>
        <button
          type="button"
          onClick={handleSwap}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/75 px-4 py-2.5 text-xs font-black text-dark-700 transition hover:-translate-y-0.5 hover:border-primary-500/30 dark:border-brand/20 dark:bg-brand/10 dark:text-white"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {t('admin.settings.swapColors')}
        </button>
      </div>
      {!allSafe && (
        <p className="mt-3 text-[11px] leading-5 text-gray-500">
          {t('admin.settings.contrastHelp')}
        </p>
      )}
    </section>
  );
}
