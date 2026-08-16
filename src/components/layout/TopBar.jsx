import { useTranslation } from 'react-i18next';
import { Phone, Mail, Globe } from 'lucide-react';
import { setLanguage } from '../../i18n';
import { CONTACT } from '../../data/staticData';
import NavLoginButton from './NavLoginButton';
import { SocialBrandLink } from '../ui/SocialIcon';
import { useSiteContent } from '../../context/SiteContentContext';

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { socialLinks } = useSiteContent();

  const toggleLang = () => setLanguage(isAr ? 'en' : 'ar');

  return (
    <div className="bg-primary-500 text-white py-2">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center text-sm gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <NavLoginButton variant="topbar" />

            <button
              onClick={toggleLang}
              className="hidden sm:flex items-center gap-1.5 text-white/90 hover:text-secondary-300 transition-colors font-bold text-xs shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-secondary-300" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>

            {socialLinks?.length > 0 && (
              <div className="hidden md:flex items-center gap-3 border-s border-white/20 ps-3 ms-1">
                <span className="text-secondary-300 text-xs shrink-0">{t('nav.followUs')}</span>
                {socialLinks.map((s) => {
                  const label = s.name?.[isAr ? 'ar' : 'en'] || s.platform || 'Social';
                  return (
                    <SocialBrandLink
                      key={s.id || s.url}
                      href={s.url}
                      platform={s.platform || s.icon}
                      iconUrl={s.iconUrl}
                      label={label}
                      size="sm"
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <a
              href={`tel:${CONTACT.phone}`}
              className="flex items-center gap-1.5 hover:text-secondary-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span dir="ltr" className="hidden sm:inline">{CONTACT.phone}</span>
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="hidden lg:flex items-center gap-2 hover:text-secondary-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{CONTACT.email}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
