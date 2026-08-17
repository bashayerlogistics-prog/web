import { useEffect, useMemo, useState } from 'react';
import { Image, Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getAllCars,
  getGalleryHeroSettings,
  getHeroSettings,
  getInstantPriceSettings,
  getReligiousToursSettings,
  updateGalleryHeroSettings,
  updateHeroSettings,
  updateInstantPriceSettings,
  updateReligiousToursSettings,
  upsertCar,
} from '../../firebase/admin';
import { DEFAULT_HERO, DEFAULT_INSTANT_PRICE } from '../../firebase/content';
import { DEFAULT_RELIGIOUS_TOURS } from '../../data/religiousTours';
import {
  DEFAULT_GALLERY_HERO,
  getCategoryHeroImage,
  getDefaultCarCatalog,
} from '../../data/staticData';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSelect from '../../components/admin/AdminSelect';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import MediaUpload from '../../components/admin/MediaUpload';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CAR_KEYS = ['taurus', 'camry', 'staria', 'yukon', 'hiace'];

const ZIYARAT_CITIES = [
  { key: 'makkah', en: 'Makkah', ar: 'مكة المكرمة' },
  { key: 'madinah', en: 'Madinah', ar: 'المدينة المنورة' },
  { key: 'jeddah', en: 'Jeddah', ar: 'جدة' },
  { key: 'riyadh', en: 'Riyadh', ar: 'الرياض' },
];

const BACKGROUND_OPTIONS = [
  {
    id: 'home-hero-desktop',
    pageEn: 'Home page',
    pageAr: 'الصفحة الرئيسية',
    sectionEn: 'Hero — desktop',
    sectionAr: 'الهيرو — كمبيوتر',
    source: 'hero',
    field: 'imageUrl',
    width: 1600,
    height: 900,
    folder: 'backgrounds/home-hero',
    device: 'desktop',
  },
  {
    id: 'home-hero-mobile',
    pageEn: 'Home page',
    pageAr: 'الصفحة الرئيسية',
    sectionEn: 'Hero — mobile',
    sectionAr: 'الهيرو — جوال',
    source: 'hero',
    field: 'imageMobileUrl',
    width: 768,
    height: 1024,
    folder: 'backgrounds/home-hero',
    device: 'mobile',
  },
  {
    id: 'home-instant-price',
    pageEn: 'Home page',
    pageAr: 'الصفحة الرئيسية',
    sectionEn: 'Instant price form',
    sectionAr: 'نموذج السعر الفوري',
    source: 'instantPrice',
    field: 'backgroundImageUrl',
    width: 1536,
    height: 1024,
    folder: 'backgrounds/instant-price',
    device: 'desktop',
  },
  ...ZIYARAT_CITIES.map((city) => ({
    id: `ziyarat-${city.key}`,
    pageEn: 'Home page',
    pageAr: 'الصفحة الرئيسية',
    sectionEn: `Ziyarat — ${city.en}`,
    sectionAr: `الزيارات — ${city.ar}`,
    source: 'religiousTours',
    field: city.key,
    width: 1280,
    height: 720,
    folder: `ziyarat/${city.key}`,
    device: 'desktop',
  })),
  {
    id: 'gallery-hero-desktop',
    pageEn: 'Gallery page',
    pageAr: 'صفحة المعرض',
    sectionEn: 'Hero — desktop',
    sectionAr: 'الهيرو — كمبيوتر',
    source: 'galleryHero',
    field: 'posterUrl',
    width: 1920,
    height: 800,
    folder: 'backgrounds/gallery-hero',
    device: 'desktop',
  },
  {
    id: 'gallery-hero-mobile',
    pageEn: 'Gallery page',
    pageAr: 'صفحة المعرض',
    sectionEn: 'Hero — mobile',
    sectionAr: 'الهيرو — جوال',
    source: 'galleryHero',
    field: 'posterMobileUrl',
    width: 768,
    height: 1024,
    folder: 'backgrounds/gallery-hero',
    device: 'mobile',
  },
  ...CAR_KEYS.map((carId) => ({
    id: `category-${carId}`,
    pageEn: 'Category page',
    pageAr: 'صفحة التصنيف',
    sectionEn: `${carId[0].toUpperCase()}${carId.slice(1)} hero`,
    sectionAr: `هيرو ${carId}`,
    source: 'car',
    carId,
    field: 'categoryHeroImageUrl',
    width: 1280,
    height: 720,
    folder: `backgrounds/categories/${carId}`,
    device: 'desktop',
  })),
];

function optionLabel(option, lang) {
  return lang === 'ar'
    ? `${option.pageAr} — ${option.sectionAr}`
    : `${option.pageEn} — ${option.sectionEn}`;
}

export default function AdminBackgrounds() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [selectedId, setSelectedId] = useState(BACKGROUND_OPTIONS[0].id);
  const [content, setContent] = useState({
    hero: { ...DEFAULT_HERO },
    instantPrice: { ...DEFAULT_INSTANT_PRICE },
    galleryHero: { ...DEFAULT_GALLERY_HERO },
    religiousTours: {
      cityImages: { ...DEFAULT_RELIGIOUS_TOURS.cityImages },
    },
    cars: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [hero, instantPrice, galleryHero, religiousTours, dbCars] = await Promise.all([
          getHeroSettings(),
          getInstantPriceSettings(),
          getGalleryHeroSettings(),
          getReligiousToursSettings(),
          getAllCars(),
        ]);
        if (cancelled) return;
        const cars = Object.fromEntries(
          getDefaultCarCatalog().map((car) => [car.id, { ...car }]),
        );
        (dbCars || []).forEach((car) => {
          cars[car.id] = { ...(cars[car.id] || {}), ...car };
        });
        setContent({
          hero: { ...DEFAULT_HERO, ...(hero || {}) },
          instantPrice: { ...DEFAULT_INSTANT_PRICE, ...(instantPrice || {}) },
          galleryHero: { ...DEFAULT_GALLERY_HERO, ...(galleryHero || {}) },
          religiousTours: {
            cityImages: {
              ...DEFAULT_RELIGIOUS_TOURS.cityImages,
              ...(religiousTours?.cityImages || {}),
            },
          },
          cars,
        });
      } catch {
        toast.error(t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, toast]);

  const selected = useMemo(
    () => BACKGROUND_OPTIONS.find((option) => option.id === selectedId) || BACKGROUND_OPTIONS[0],
    [selectedId],
  );

  const value = selected.source === 'car'
    ? content.cars[selected.carId]?.[selected.field] || getCategoryHeroImage(selected.carId)
    : selected.source === 'religiousTours'
      ? content.religiousTours?.cityImages?.[selected.field]
        || DEFAULT_RELIGIOUS_TOURS.cityImages[selected.field]
        || ''
      : content[selected.source]?.[selected.field] || '';

  const setValue = (url) => {
    if (selected.source === 'car') {
      setContent((current) => ({
        ...current,
        cars: {
          ...current.cars,
          [selected.carId]: {
            ...current.cars[selected.carId],
            [selected.field]: url,
          },
        },
      }));
      return;
    }
    if (selected.source === 'religiousTours') {
      setContent((current) => ({
        ...current,
        religiousTours: {
          ...current.religiousTours,
          cityImages: {
            ...current.religiousTours?.cityImages,
            [selected.field]: url,
          },
        },
      }));
      return;
    }
    setContent((current) => ({
      ...current,
      [selected.source]: {
        ...current[selected.source],
        [selected.field]: url,
      },
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (selected.source === 'hero') {
        await updateHeroSettings({ [selected.field]: value });
      } else if (selected.source === 'instantPrice') {
        await updateInstantPriceSettings({ [selected.field]: value });
      } else if (selected.source === 'galleryHero') {
        await updateGalleryHeroSettings({ [selected.field]: value });
      } else if (selected.source === 'religiousTours') {
        await updateReligiousToursSettings({
          cityImages: {
            ...DEFAULT_RELIGIOUS_TOURS.cityImages,
            ...content.religiousTours?.cityImages,
            [selected.field]: value,
          },
        });
      } else {
        await upsertCar(selected.carId, {
          ...content.cars[selected.carId],
          [selected.field]: value,
        });
      }
      await publishSite();
      toast.success(
        lang === 'ar' ? 'تم تحديث صورة الخلفية' : 'Background image updated',
      );
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const DeviceIcon = selected.device === 'mobile' ? Smartphone : Monitor;
  const ratio = `${selected.width}:${selected.height}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={lang === 'ar' ? 'صور الخلفيات' : 'Background images'}
        subtitle={
          lang === 'ar'
            ? 'غيّر خلفيات الصفحات والأقسام من مكان واحد.'
            : 'Change page & section background images.'
        }
      />

      <GlassCard>
        <label className="block text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gold-light mb-2">
          {lang === 'ar' ? 'الصفحة والقسم' : 'Page and section'}
        </label>
        <AdminSelect
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="admin-input w-full"
        >
          {BACKGROUND_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {optionLabel(option, lang)}
            </option>
          ))}
        </AdminSelect>
      </GlassCard>

      <form onSubmit={handleSave} className="space-y-6">
        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-gold">
                {lang === 'ar' ? selected.pageAr : selected.pageEn}
              </p>
              <h2 className="mt-1 text-xl font-black text-brand dark:text-white">
                {lang === 'ar' ? selected.sectionAr : selected.sectionEn}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-brand/5 dark:bg-white/5 border border-brand/10 px-3 py-2">
              <DeviceIcon className="w-4 h-4 text-primary-500" />
              <div className="text-xs">
                <p className="font-black text-brand dark:text-white">
                  {selected.width} × {selected.height} px
                </p>
                <p className="text-gray-500 dark:text-white/60">
                  {lang === 'ar' ? `النسبة المقترحة ${ratio}` : `Recommended ratio ${ratio}`}
                </p>
              </div>
            </div>
          </div>

          <MediaUpload
            key={selected.id}
            label={lang === 'ar' ? 'صورة الخلفية' : 'Background image'}
            value={value}
            onChange={setValue}
            folder={selected.folder}
            allowUrl
            previewClassName="w-full max-h-[28rem] object-cover rounded-xl"
          />

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-200">
            <Image className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {lang === 'ar'
                ? 'استخدم WebP أو JPG مضغوطة وبنفس المقاس المقترح حتى لا يتم قص الجزء المهم من الصورة.'
                : 'Use a compressed WebP or JPG at the recommended size so important parts are not cropped.'}
            </p>
          </div>
        </GlassCard>

        <AdminApplyButton
          type="submit"
          loading={saving}
          label={lang === 'ar' ? 'حفظ ونشر الخلفية' : 'Save and publish background'}
        />
      </form>
    </div>
  );
}
