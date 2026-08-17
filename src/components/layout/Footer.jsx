import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail, Phone, MapPin, Clock, ArrowUp, ShieldCheck,
} from 'lucide-react';
import { CONTACT } from '../../data/staticData';
import BrandLogo from '../ui/BrandLogo';
import AppNavLink from '../ui/AppNavLink';
import { SocialBrandLink } from '../ui/SocialIcon';
import { useSiteContent } from '../../context/SiteContentContext';

const quickLinks = [
  { key: 'home', href: '/' },
  { key: 'routes', href: '/#routes' },
  { key: 'fleet', href: '/#vehicles' },
  { key: 'gallery', href: '/gallery' },
  { key: 'faq', href: '/#faq' },
];

const popularRoutes = [
  { ar: 'توصيل من مطار جدة إلى مكة المكرمة', en: 'Jeddah Airport to Makkah', href: '/#routes' },
  { ar: 'نقل من مكة المكرمة إلى المدينة المنورة', en: 'Makkah to Madinah', href: '/#routes' },
  { ar: 'نقل من مدينة جدة إلى مكة المكرمة', en: 'Jeddah to Makkah', href: '/#routes' },
  { ar: 'توصيل من المدينة المنورة إلى مطار جدة', en: 'Madinah to Jeddah Airport', href: '/#routes' },
];

export default function Footer() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isAr = lang === 'ar';
  const { socialLinks, footerCredit } = useSiteContent();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const credit = footerCredit || {};
  const copyrightText = (isAr ? credit.copyrightAr : credit.copyrightEn)
    || t('footer.copyright');
  const designedByLabel = (isAr ? credit.designedByAr : credit.designedByEn)
    || t('footer.designedBy');
  const designerName = (isAr ? credit.designerNameAr : credit.designerNameEn)
    || credit.designerNameEn
    || credit.designerNameAr
    || '';
  const designerUrl = String(credit.designerUrl || '').trim();
  const designerLogoUrl = String(credit.designerLogoUrl || '').trim();
  const showCredit = credit.showCredit !== false && Boolean(designerName || designerLogoUrl);

  const designerHref = (() => {
    if (!designerUrl) return '';
    if (/^(https?:|mailto:|tel:)/i.test(designerUrl)) return designerUrl;
    if (designerUrl.startsWith('//')) return `https:${designerUrl}`;
    return `https://${designerUrl}`;
  })();

  const designerContent = (
    <>
      {designerLogoUrl ? (
        <img
          src={designerLogoUrl}
          alt=""
          className="h-9 sm:h-10 w-auto max-w-[140px] object-contain opacity-95"
        />
      ) : null}
      {designerName ? <span>{designerName}</span> : null}
    </>
  );

  return (
    <footer className="bg-brand-dark text-white border-t border-gold/10 pt-10 sm:pt-14 md:pt-16 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 overflow-hidden">
      <div className="section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 pb-10 sm:pb-12 border-b border-white/5">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <BrandLogo variant="full" tone="light" alt={t('brand.name')} className="h-10 max-w-[200px]" />
            <p className="text-white/60 text-sm leading-relaxed">{t('footer.description')}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-gold bg-gold/5 border border-gold/20 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                <span>{t('footer.licensed')}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-gold bg-gold/5 border border-gold/20 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-gold" />
                <span>{t('footer.service247')}</span>
              </span>
            </div>
          </div>

          {/* Quick links + social */}
          <div>
            <h4 className="text-lg font-bold text-gold border-s-2 border-gold ps-3 mb-6">{t('footer.quickLinks')}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {quickLinks.map((link) => (
                <li key={link.key}>
                  {link.href.startsWith('/#') ? (
                    <AppNavLink to={link.href} className="text-white/60 hover:text-gold hover:underline transition-colors">
                      {t(`nav.${link.key}`)}
                    </AppNavLink>
                  ) : (
                    <Link to={link.href} className="text-white/60 hover:text-gold hover:underline transition-colors">
                      {t(`nav.${link.key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {socialLinks?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/5">
                <p className="text-xs font-semibold text-gold/80 mb-3">{t('footer.followUs')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {socialLinks.map((s) => {
                    const label = s.name?.[lang] || s.name?.en || s.platform || 'Social';
                    return (
                      <SocialBrandLink
                        key={s.id || s.url}
                        href={s.url}
                        platform={s.platform || s.icon}
                        iconUrl={s.iconUrl}
                        label={label}
                        size="md"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Popular routes */}
          <div>
            <h4 className="text-lg font-bold text-gold border-s-2 border-gold ps-3 mb-6">{t('footer.popularRoutes')}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {popularRoutes.map((route) => (
                <li key={route.en}>
                  <AppNavLink to={route.href} className="text-white/60 hover:text-gold hover:underline transition-colors">
                    {route[lang] || route.ar}
                  </AppNavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold text-gold border-s-2 border-gold ps-3 mb-6">{t('footer.contactUs')}</h4>
            <ul className="flex flex-col gap-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <span className="text-white/60">
                  {lang === 'ar' ? 'جدة، مكة المكرمة، المملكة العربية السعودية' : 'Jeddah, Makkah, Saudi Arabia'}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold shrink-0" />
                <a href={`tel:${CONTACT.phone}`} className="text-white/60 hover:text-white transition-colors" dir="ltr">
                  {CONTACT.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold shrink-0" />
                <a href={`mailto:${CONTACT.email}`} className="text-white/60 hover:text-white transition-colors">
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-sm text-white/40">
          <div className="flex flex-col gap-1.5 text-center sm:text-start">
            <p className="text-base sm:text-lg text-white/55">{copyrightText}</p>
            {showCredit && (
              <p className="text-sm inline-flex flex-wrap items-center justify-center sm:justify-start gap-x-1.5 gap-y-1">
                <span>{designedByLabel}</span>
                {designerHref ? (
                  <a
                    href={designerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-gold/80 hover:text-gold underline underline-offset-2 transition-colors"
                  >
                    {designerContent}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gold/80">
                    {designerContent}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <button type="button" className="hover:text-white transition-colors">{t('footer.privacy')}</button>
            <span className="text-white/20">|</span>
            <button type="button" className="hover:text-white transition-colors">{t('footer.terms')}</button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 start-4 z-40 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gold hover:bg-gold-light text-brand rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </footer>
  );
}
