import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

/**
 * Table of AI content suggestions — click Apply to use in manual form.
 * @param {Array} suggestions
 * @param {Function} onApply — (item) => void
 * @param {Function} getTitle — (item, lang) => string
 * @param {Function} getSubtitle — (item, lang) => string | undefined
 */
export default function AiSuggestionsTable({
  suggestions,
  onApply,
  getTitle,
  getSubtitle,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  if (!suggestions?.length) return null;

  return (
    <GlassCard className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-gold" />
        <h2 className="font-black text-base text-brand dark:text-white">
          {t('admin.ai.suggestions')}
        </h2>
        <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
          {suggestions.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand/5 dark:bg-brand/10">
              <th className="text-start px-4 py-3 font-bold text-xs uppercase tracking-wide text-gray-500">
                {t('admin.ai.title')}
              </th>
              <th className="text-start px-4 py-3 font-bold text-xs uppercase tracking-wide text-gray-500 hidden md:table-cell">
                {t('admin.ai.preview')}
              </th>
              <th className="text-end px-4 py-3 font-bold text-xs uppercase tracking-wide text-gray-500 w-28">
                {t('admin.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-brand/10">
            {suggestions.map((item) => (
              <tr key={item.id} className="hover:bg-brand/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-dark-800 dark:text-white">
                    {getTitle(item, lang)}
                  </p>
                  {getSubtitle && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {getSubtitle(item, lang)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {lang === 'ar'
                      ? (item.subtitleAr || item.descriptionAr || item.excerptAr || '')
                      : (item.subtitleEn || item.descriptionEn || item.excerptEn || '')}
                  </p>
                </td>
                <td className="px-4 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => onApply(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold hover:scale-[1.02] transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {t('admin.ai.apply')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
