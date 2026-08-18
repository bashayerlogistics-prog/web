import { useEffect, useState } from 'react';
import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import MediaUpload from '../../components/admin/MediaUpload';
import GlassCard from '../../components/ui/GlassCard';
import { DEFAULT_RELIGIOUS_TOURS } from '../../data/religiousTours';
import {
  getReligiousToursSettings,
  updateReligiousToursSettings,
} from '../../firebase/admin';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';

const CITIES = [
  { key: 'makkah', en: 'Makkah', ar: 'مكة المكرمة' },
  { key: 'madinah', en: 'Madinah', ar: 'المدينة المنورة' },
  { key: 'jeddah', en: 'Jeddah', ar: 'جدة' },
  { key: 'riyadh', en: 'Riyadh', ar: 'الرياض' },
];

/** Homepage Religious Tours city photos — not fleet car prices. */
export default function AdminZiyarat() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [cityImages, setCityImages] = useState(DEFAULT_RELIGIOUS_TOURS.cityImages);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getReligiousToursSettings().then((settings) => {
      if (!active || !settings?.cityImages) return;
      setCityImages({
        ...DEFAULT_RELIGIOUS_TOURS.cityImages,
        ...settings.cityImages,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveImages = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateReligiousToursSettings({ cityImages });
      await publishSite();
      toast.success(t('admin.homeFleet.ziyaratImagesSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t('admin.homeFleet.ziyaratImages')}
        purposeKey="ziyaratImages"
        subtitle={t('admin.homeFleet.ziyaratImagesHint')}
      />

      <form onSubmit={handleSaveImages}>
        <GlassCard hover={false} className="border border-gold/25 overflow-hidden">
          <div className="flex items-start gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-amber-500 text-white shrink-0">
              <Image className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-brand dark:text-white">
                {t('admin.homeFleet.ziyaratImages')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
                {t('admin.homeFleet.ziyaratImagesPageHint')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CITIES.map((city) => (
              <MediaUpload
                key={city.key}
                label={lang === 'ar' ? city.ar : city.en}
                value={cityImages[city.key] || ''}
                onChange={(url) =>
                  setCityImages((current) => ({ ...current, [city.key]: url }))
                }
                folder={`ziyarat/${city.key}`}
                allowUrl
                maxSizeKB={200}
                previewClassName="w-full aspect-video object-cover rounded-xl shadow-none"
              />
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-white/60">
            {t('admin.homeFleet.ziyaratImagesSize')}
          </p>

          <AdminApplyButton
            type="submit"
            loading={saving}
            label={t('admin.homeFleet.ziyaratImagesSave')}
            className="mt-5 shadow-none"
          />
        </GlassCard>
      </form>
    </div>
  );
}
