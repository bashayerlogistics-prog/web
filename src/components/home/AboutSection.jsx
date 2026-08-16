import { useTranslation } from 'react-i18next';
import { Shield, Headphones, BadgeDollarSign, Car } from 'lucide-react';
import { CONTACT } from '../../data/staticData';
import AppNavLink from '../ui/AppNavLink';

const features = [
  { icon: Shield, key: 'safety' },
  { icon: Headphones, key: 'support' },
  { icon: BadgeDollarSign, key: 'pricing' },
  { icon: Car, key: 'modernCars' },
];

export default function AboutSection() {
  const { t } = useTranslation();

  return (
    <section id="about" className="section-padding overflow-hidden">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16" data-aos="fade-up">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('about.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-4 mb-3 sm:mb-4 section-heading">{t('about.title')}</h2>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base leading-relaxed">{t('about.subtitle')}</p>
        </div>

        <div className="mb-10 sm:mb-12 md:mb-16" data-aos="fade-up" data-aos-delay="80">
          <h3 className="text-base sm:text-lg md:text-2xl font-extrabold text-brand-dark text-center mb-5 sm:mb-8 section-heading px-2">{t('about.whyTitle')}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {features.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="text-center p-4 sm:p-5 md:p-6 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100 hover:border-gold/30 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-gold/10 text-gold rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-brand-dark text-sm md:text-base mb-1">{t(`services.${key}`)}</h4>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{t(`services.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-gradient-to-l from-brand-dark via-brand to-brand-light rtl:bg-gradient-to-r rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center"
          data-aos="fade-up"
          data-aos-delay="120"
        >
          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white mb-2 section-heading">{t('about.ctaTitle')}</h3>
          <p className="text-white/70 text-xs sm:text-sm mb-5 sm:mb-6">{t('about.ctaSubtitle')}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <AppNavLink
              to="#pricing-calculator"
              className="bg-gradient-to-r from-gold to-gold-dark text-brand-dark font-bold px-6 sm:px-8 py-3 rounded-full hover:from-gold-light hover:to-gold transition-all shadow-lg touch-target flex items-center justify-center"
            >
              {t('nav.bookNow')}
            </AppNavLink>
            <a
              href={`tel:${CONTACT.phone}`}
              className="border border-white/20 text-white font-semibold px-6 sm:px-8 py-3 rounded-full hover:bg-white/5 transition-all touch-target flex items-center justify-center"
            >
              {t('nav.callUs')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
