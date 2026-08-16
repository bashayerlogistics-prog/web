import { useState, useEffect, Children } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Monitor } from 'lucide-react';
import { getHeroSettings, updateHeroSettings } from '../../firebase/admin';
import { DEFAULT_HERO } from '../../firebase/content';
import { HERO_AI_SUGGESTIONS } from '../../data/aiContentSuggestions';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import AiSuggestionsTable from '../../components/admin/AiSuggestionsTable';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const inputClass = 'admin-input w-full text-sm py-2.5';

const textareaClass = `${inputClass} resize-none min-h-[4.5rem]`;

function FieldGroup({ labelEn, labelAr, children }) {
  const [enField, arField] = Children.toArray(children);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="min-w-0">
        <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
          {labelEn}
        </label>
        {enField}
      </div>
      <div className="min-w-0">
        <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
          {labelAr}
        </label>
        {arField}
      </div>
    </div>
  );
}

export default function AdminHero() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const [form, setForm] = useState({ ...DEFAULT_HERO });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getHeroSettings();
        setForm({ ...DEFAULT_HERO, ...(data || {}) });
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t, toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateHeroSettings(form);
      await publishSite();
      toast.success(t('admin.hero.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.hero')} subtitle={t('admin.hero.subtitle')}>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 font-bold text-brand hover:bg-brand/5"
        >
          <Eye className="w-4 h-4" />
          {t('admin.media.preview')}
        </button>
      </AdminPageHeader>

      <AiSuggestionsTable
        suggestions={HERO_AI_SUGGESTIONS}
        onApply={(item) => {
          setForm((f) => ({ ...f, ...item }));
          toast.success(t('admin.ai.applied'));
        }}
        getTitle={(item, lang) => (lang === 'ar' ? item.titleAr : item.titleEn)}
        getSubtitle={(item, lang) => (lang === 'ar' ? item.subtitleAr : item.subtitleEn)}
      />

      <form onSubmit={handleSave} className="space-y-6">
        <GlassCard>
          <h2 className="font-black text-lg mb-5 flex items-center gap-2 text-brand">
            <Monitor className="w-5 h-5 text-primary-500 shrink-0" />
            {t('admin.hero.content')}
          </h2>

          <div className="space-y-5">
            <FieldGroup labelEn="Title (EN)" labelAr="العنوان (AR)">
              <input
                value={form.titleEn}
                onChange={(e) => set('titleEn', e.target.value)}
                placeholder="Premium transport services"
                className={inputClass}
              />
              <input
                value={form.titleAr}
                onChange={(e) => set('titleAr', e.target.value)}
                placeholder="خدمات نقل متميزة"
                dir="rtl"
                className={inputClass}
              />
            </FieldGroup>

            <FieldGroup labelEn="Subtitle (EN)" labelAr="الوصف (AR)">
              <textarea
                value={form.subtitleEn}
                onChange={(e) => set('subtitleEn', e.target.value)}
                placeholder="Short description for hero section"
                rows={2}
                className={textareaClass}
              />
              <textarea
                value={form.subtitleAr}
                onChange={(e) => set('subtitleAr', e.target.value)}
                placeholder="وصف قصير لقسم الهيرو"
                rows={2}
                dir="rtl"
                className={textareaClass}
              />
            </FieldGroup>

            <FieldGroup labelEn="Badge — Licensed (EN)" labelAr="شارة — مرخص (AR)">
              <input
                value={form.badgeLicensedEn}
                onChange={(e) => set('badgeLicensedEn', e.target.value)}
                placeholder="Licensed & Insured"
                className={inputClass}
              />
              <input
                value={form.badgeLicensedAr}
                onChange={(e) => set('badgeLicensedAr', e.target.value)}
                placeholder="مرخص ومؤمن"
                dir="rtl"
                className={inputClass}
              />
            </FieldGroup>

            <FieldGroup labelEn="Badge — Cities (EN)" labelAr="شارة — المدن (AR)">
              <input
                value={form.badgeCitiesEn}
                onChange={(e) => set('badgeCitiesEn', e.target.value)}
                placeholder="Jeddah · Makkah · Madinah"
                className={inputClass}
              />
              <input
                value={form.badgeCitiesAr}
                onChange={(e) => set('badgeCitiesAr', e.target.value)}
                placeholder="جدة · مكة · المدينة"
                dir="rtl"
                className={inputClass}
              />
            </FieldGroup>
          </div>
        </GlassCard>

        <AdminApplyButton
          type="submit"
          loading={saving}
          label={t('admin.hero.applyLive')}
        />
      </form>

      {showPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video rounded-2xl overflow-hidden relative bg-brand-dark">
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                <div className="text-white">
                  <h3 className="text-2xl font-black">{form.titleEn || 'Hero Title'}</h3>
                  <p className="text-white/80 mt-1">{form.subtitleEn}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-4 w-full py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
