import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layout, Calculator, Map, Car, Grid3x3, HelpCircle, BarChart3,
  Briefcase, Info, FileText, Eye, EyeOff, Power, Zap,
} from 'lucide-react';
import { getAdminHomeSections, updateHomeSection } from '../../firebase/admin';
import { useAdminDataLoader } from '../../hooks/useAdminDataLoader';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { HOME_SECTION_LIST } from '../../data/homeSections';

const SECTION_ICONS = {
  hero: Layout,
  instantPrice: Zap,
  booking: Calculator,
  routes: Map,
  fleet: Car,
  servicesCatalog: Grid3x3,
  faq: HelpCircle,
  stats: BarChart3,
  services: Briefcase,
  about: Info,
  blog: FileText,
};

export default function AdminSections() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [toggling, setToggling] = useState(null);

  const publishSite = usePublishSiteContent();
  const { data: sections, loading, refresh } = useAdminDataLoader(getAdminHomeSections);

  const activeCount = HOME_SECTION_LIST.filter((s) => sections?.[s.id]?.active).length;

  const toggleSection = async (sectionId) => {
    const current = sections?.[sectionId]?.active ?? true;
    setToggling(sectionId);
    try {
      await updateHomeSection(sectionId, !current);
      toast.success(!current ? t('admin.sections.turnedOn') : t('admin.sections.turnedOff'));
      refresh();
      await publishSite();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.nav.sections')} subtitle={t('admin.sectionsSubtitle')}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 border border-brand/20">
          <Power className="w-4 h-4 text-brand" />
          <span className="text-sm font-bold text-brand">
            {t('admin.sections.activeCount', { count: activeCount, total: HOME_SECTION_LIST.length })}
          </span>
        </div>
      </AdminPageHeader>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {HOME_SECTION_LIST.map((section, index) => {
            const Icon = SECTION_ICONS[section.id] || Layout;
            const isActive = sections?.[section.id]?.active ?? true;
            const isToggling = toggling === section.id;

            return (
              <GlassCard
                key={section.id}
                className={`relative transition-all duration-300 ${isActive ? 'ring-2 ring-emerald-500/30' : 'opacity-80'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isActive ? 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg' : 'bg-gray-100 dark:admin-surface text-gray-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        #{index + 1}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isActive ? t('admin.products.active') : t('admin.products.inactive')}
                      </span>
                    </div>
                    <h3 className="font-black text-base leading-tight">{t(section.labelKey)}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(section.descKey)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => toggleSection(section.id)}
                  className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 dark:admin-surface'
                  } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isToggling ? (
                    <span>{t('common.loading')}</span>
                  ) : isActive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      {t('admin.sections.turnOff')}
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      {t('admin.sections.turnOn')}
                    </>
                  )}
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}

      <GlassCard hover={false} className="bg-brand/5 border border-brand/10">
        <p className="text-sm text-gray-600 leading-relaxed">
          <strong className="text-brand">{t('admin.sections.noteTitle')}</strong>
          {' '}{t('admin.sections.noteDesc')}
        </p>
      </GlassCard>
    </div>
  );
}
