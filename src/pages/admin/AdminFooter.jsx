import { useState, useEffect, Children } from 'react';
import { useTranslation } from 'react-i18next';
import { Copyright } from 'lucide-react';
import { getFooterCreditSettings, updateFooterCreditSettings } from '../../firebase/admin';
import { DEFAULT_FOOTER_CREDIT } from '../../firebase/content';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import MediaUpload from '../../components/admin/MediaUpload';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const inputClass = 'admin-input w-full text-sm py-2.5';

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

function normalizeExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|wa\.me)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `https://${value}`;
}

export default function AdminFooter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const [form, setForm] = useState({ ...DEFAULT_FOOTER_CREDIT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getFooterCreditSettings();
        setForm({ ...DEFAULT_FOOTER_CREDIT, ...(data || {}) });
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t, toast]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        designerUrl: normalizeExternalUrl(form.designerUrl),
        designerLogoUrl: String(form.designerLogoUrl || '').trim(),
        showCredit: form.showCredit !== false,
      };
      await updateFooterCreditSettings(payload);
      setForm(payload);
      await publishSite();
      toast.success(t('admin.footer.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const previewName = form.designerNameEn || form.designerNameAr || 'Designer';
  const previewUrl = normalizeExternalUrl(form.designerUrl);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.footer')} subtitle={t('admin.footer.subtitle')} />

      <form onSubmit={handleSave} className="space-y-6">
        <GlassCard>
          <h2 className="font-black text-lg mb-5 flex items-center gap-2 text-brand">
            <Copyright className="w-5 h-5 text-primary-500 shrink-0" />
            {t('admin.footer.copyrightSection')}
          </h2>
          <FieldGroup labelEn="Copyright (EN)" labelAr="حقوق النشر (AR)">
            <textarea
              value={form.copyrightEn}
              onChange={(e) => set('copyrightEn', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
            <textarea
              value={form.copyrightAr}
              onChange={(e) => set('copyrightAr', e.target.value)}
              rows={2}
              dir="rtl"
              className={`${inputClass} resize-none`}
            />
          </FieldGroup>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="font-black text-lg flex items-center gap-2 text-brand">
              {t('admin.footer.designBySection')}
            </h2>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-dark-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showCredit !== false}
                onChange={(e) => set('showCredit', e.target.checked)}
                className="rounded border-brand/30 text-brand focus:ring-brand"
              />
              {t('admin.footer.showCredit')}
            </label>
          </div>

          <div className="space-y-5">
            <FieldGroup labelEn="Label (EN)" labelAr="التسمية (AR)">
              <input
                value={form.designedByEn}
                onChange={(e) => set('designedByEn', e.target.value)}
                placeholder="Design by"
                className={inputClass}
              />
              <input
                value={form.designedByAr}
                onChange={(e) => set('designedByAr', e.target.value)}
                placeholder="تصميم بواسطة"
                dir="rtl"
                className={inputClass}
              />
            </FieldGroup>

            <FieldGroup labelEn="Name (EN)" labelAr="الاسم (AR)">
              <input
                value={form.designerNameEn}
                onChange={(e) => set('designerNameEn', e.target.value)}
                placeholder="Fahad"
                className={inputClass}
              />
              <input
                value={form.designerNameAr}
                onChange={(e) => set('designerNameAr', e.target.value)}
                placeholder="فهد"
                dir="rtl"
                className={inputClass}
              />
            </FieldGroup>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
                {t('admin.footer.url')}
              </label>
              <input
                value={form.designerUrl}
                onChange={(e) => set('designerUrl', e.target.value)}
                placeholder="https://wa.me/..."
                dir="ltr"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1.5">{t('admin.footer.urlHint')}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gold-light mb-1.5 uppercase tracking-wide">
                {t('admin.footer.logo')}
              </label>
              <MediaUpload
                value={form.designerLogoUrl || ''}
                onChange={(url) => set('designerLogoUrl', url)}
                folder="footer"
                allowUrl
                previewClassName="w-20 h-20 object-contain rounded-xl bg-brand-dark/90 p-2"
              />
              <p className="text-xs text-gray-400 mt-1.5">{t('admin.footer.logoHint')}</p>
            </div>

            {form.showCredit !== false && (
              <div className="rounded-2xl border border-brand/10 bg-brand-dark text-white p-4">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">{t('admin.media.preview')}</p>
                <p className="text-sm text-white/55 mb-1">{form.copyrightEn}</p>
                <p className="text-sm flex flex-wrap items-center gap-2">
                  <span className="text-white/50">{form.designedByEn}</span>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-gold/90 hover:text-gold underline underline-offset-2"
                    >
                      {form.designerLogoUrl ? (
                        <img src={form.designerLogoUrl} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
                      ) : null}
                      <span>{previewName}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gold/80">
                      {form.designerLogoUrl ? (
                        <img src={form.designerLogoUrl} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
                      ) : null}
                      <span>{previewName}</span>
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        <AdminApplyButton type="submit" loading={saving} label={t('admin.footer.applyLive')} />
      </form>
    </div>
  );
}
