import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../ui/GlassCard';

/**
 * Superadmin hint linking EN/AR pricing docs for locations + prices.
 * @param {{ titleKey?: string, hintKey?: string, files: { en: string, ar: string, labelEn?: string, labelAr?: string }[] }} props
 */
export default function AdminDocsHint({ titleKey = 'admin.docsTitle', hintKey, files = [] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 dark:text-white/70 space-y-2 min-w-0">
          <p className="font-bold text-brand dark:text-gold">{t(titleKey)}</p>
          {hintKey ? <p>{t(hintKey)}</p> : null}
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.en} className="font-mono text-xs text-gray-500 dark:text-white/45" dir="ltr">
                <span className="text-gray-700 dark:text-white/70 font-sans font-semibold me-2">
                  {lang === 'ar' ? (f.labelAr || f.labelEn || 'Doc') : (f.labelEn || f.labelAr || 'Doc')}:
                </span>
                {f.en}
                {f.ar ? ` · ${f.ar}` : ''}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 dark:text-white/45" dir="ltr">
            Index: docs/README.md · docs/README-ar.md
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
