import { useEffect, useState } from 'react';
import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminFleetServicePage from '../../components/admin/AdminFleetServicePage';
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

/** Ziyarat — Makkah & Madinah within-city hourly packages (real fleet prices). */
export default function AdminZiyarat() {
  const { i18n } = useTranslation();
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
      toast.success(lang === 'ar' ? 'تم حفظ صور جولات المزارات' : 'Ziyarat images saved');
    } catch (error) {
      toast.error(error?.message || (lang === 'ar' ? 'تعذر حفظ الصور' : 'Could not save images'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveImages}>
        <GlassCard>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Image className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand dark:text-white">
                {lang === 'ar' ? 'صور مدن جولات المزارات' : 'Ziyarat city images'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
                {lang === 'ar'
                  ? 'غيّر صور مكة والمدينة وجدة والرياض الظاهرة في الصفحة الرئيسية.'
                  : 'Change the Makkah, Madinah, Jeddah and Riyadh images shown on the home page.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CITIES.map((city) => (
              <MediaUpload
                key={city.key}
                label={city[lang]}
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
            {lang === 'ar'
              ? 'المقاس المقترح 1280×720 بصيغة WebP، وحجم أقل من 200 KB.'
              : 'Recommended: 1280×720 WebP, under 200 KB.'}
          </p>

          <AdminApplyButton
            type="submit"
            loading={saving}
            label={lang === 'ar' ? 'حفظ ونشر الصور' : 'Save and publish images'}
            className="mt-5 shadow-none"
          />
        </GlassCard>
      </form>

      <AdminFleetServicePage serviceId="ziyarat" />
    </div>
  );
}
