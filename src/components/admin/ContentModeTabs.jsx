import { useTranslation } from 'react-i18next';
import { PenLine, Sparkles } from 'lucide-react';

export default function ContentModeTabs({ mode, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="flex rounded-xl overflow-hidden border border-brand/15 w-fit">
      <button
        type="button"
        onClick={() => onChange('manual')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-colors ${
          mode === 'manual'
            ? 'bg-brand text-white'
            : 'bg-white/50 dark:admin-surface text-gray-600 hover:bg-brand/5'
        }`}
      >
        <PenLine className="w-4 h-4" />
        {t('admin.ai.manual')}
      </button>
      <button
        type="button"
        onClick={() => onChange('ai')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-colors ${
          mode === 'ai'
            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
            : 'bg-white/50 dark:admin-surface text-gray-600 hover:bg-brand/5'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {t('admin.ai.aiSuggest')}
      </button>
    </div>
  );
}
