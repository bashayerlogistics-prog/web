import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { MOBILE_SWIPER_DEFAULTS, useSwiperDirection } from '../../hooks/useSwiperDirection';
import 'swiper/css';
import 'swiper/css/pagination';
import {
  Calendar,
  Car,
  CreditCard,
  Check,
  Globe,
  MessageCircle,
  Phone,
  ArrowLeft,
  Clock,
  Zap,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { BOOKING_STEPS, CONTACT } from '../../data/staticData';
import AppNavLink from '../ui/AppNavLink';

const stepIconMap = {
  calendar: Calendar,
  car: Car,
  'credit-card': CreditCard,
  check: Check,
};

const colorMap = {
  secondary: {
    bg: 'bg-secondary-500/10',
    text: 'text-secondary-500',
    border: 'border-secondary-500/30',
    badge: 'bg-secondary-500',
    tag: 'bg-secondary-500/10 text-secondary-700',
  },
  primary: {
    bg: 'bg-primary-500/10',
    text: 'text-primary-500',
    border: 'border-primary-500/30',
    badge: 'bg-primary-500',
    tag: 'bg-primary-500/10 text-primary-700',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500',
    tag: 'bg-blue-500/10 text-blue-700',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    border: 'border-green-500/30',
    badge: 'bg-green-500',
    tag: 'bg-green-500/10 text-green-700',
  },
};

function StepCard({ step, lang }) {
  const Icon = stepIconMap[step.icon] || Calendar;
  const colors = colorMap[step.color] || colorMap.primary;

  return (
    <div className="group relative bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden h-full">
      <div className={`absolute top-0 inset-x-0 h-1 ${colors.badge}`} />
      <div className="p-4 md:p-5 lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 md:w-14 md:h-14 ${colors.bg} ${colors.text} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className={`text-3xl md:text-4xl font-black ${colors.text} opacity-20`}>{step.number}</span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-dark-800 mb-2">{step.title[lang]}</h3>
        <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-4">{step.description[lang]}</p>

        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
          {step.tags.map((tag, i) => (
            <span key={i} className={`text-[10px] md:text-xs font-semibold px-2 py-1 rounded-full ${colors.tag}`}>
              {tag[lang]}
            </span>
          ))}
        </div>

        <div className={`flex items-start gap-2 p-2.5 md:p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
          <Lightbulb className={`w-4 h-4 ${colors.text} shrink-0 mt-0.5`} />
          <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{step.tip[lang]}</p>
        </div>
      </div>
    </div>
  );
}

export default function HowToBookSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRtl = useSwiperDirection();
  const swiperRef = useRef(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed || typeof swiper.changeLanguageDirection !== 'function') return;
    const dir = isRtl ? 'rtl' : 'ltr';
    if (swiper.rtlTranslate !== isRtl) swiper.changeLanguageDirection(dir);
  }, [isRtl]);

  return (
    <section id="how-to-book" className="py-12 md:py-16 lg:py-20 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-10 end-10 w-72 h-72 bg-primary-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 start-10 w-64 h-64 bg-secondary-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-3 py-1.5 md:px-4 md:py-2 mb-3 md:mb-4">
            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-primary-500" />
            <span className="text-xs md:text-sm font-semibold text-primary-700">{t('howToBook.badge')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-dark-800 mb-3 md:mb-4 leading-tight">
            {t('howToBook.title1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-500 to-secondary-500 rtl:bg-gradient-to-r">
              {t('howToBook.titleHighlight')}
            </span>
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-gray-500 leading-relaxed">{t('howToBook.subtitle')}</p>
        </div>

        <div className="mb-10 md:mb-14" data-aos="fade-up" data-aos-delay="100">
          <div className="block lg:hidden mobile-swiper-wrap premium-swiper-wrap--mobile-center" dir={isRtl ? 'rtl' : 'ltr'}>
            <Swiper
              dir={isRtl ? 'rtl' : 'ltr'}
              modules={[Pagination, Autoplay]}
              slidesPerView={MOBILE_SWIPER_DEFAULTS.slidesPerView}
              centeredSlides={MOBILE_SWIPER_DEFAULTS.centeredSlides}
              centeredSlidesBounds={MOBILE_SWIPER_DEFAULTS.centeredSlidesBounds}
              spaceBetween={MOBILE_SWIPER_DEFAULTS.spaceBetween}
              roundLengths
              watchOverflow
              autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
              pagination={{ el: '.steps-pagination', clickable: true }}
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              className="steps-swiper section-swiper"
            >
              {BOOKING_STEPS.map((step) => (
                <SwiperSlide key={step.number}>
                  <StepCard step={step} lang={lang} />
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="steps-pagination flex items-center justify-center gap-2 mt-4" />
          </div>

          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
            {BOOKING_STEPS.map((step) => (
              <StepCard key={step.number} step={step} lang={lang} />
            ))}
          </div>
        </div>

        <div className="mb-10 md:mb-14" data-aos="fade-up" data-aos-delay="200">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-dark-800 mb-2">{t('howToBook.methodsTitle')}</h3>
            <p className="text-gray-500 text-sm md:text-base">{t('howToBook.methodsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <AppNavLink
              to="#pricing-calculator"
              className="group flex flex-col items-center text-center p-5 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-primary-500/20 hover:border-primary-500 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-primary-500/10 text-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1">{t('howToBook.website')}</h4>
              <p className="text-gray-500 text-sm mb-4">{t('howToBook.websiteDesc')}</p>
              <span className="inline-flex items-center gap-1 text-primary-500 font-semibold text-sm">
                {t('nav.bookNow')}
                <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
              </span>
            </AppNavLink>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center text-center p-5 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-green-500/20 hover:border-green-500 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1">{t('howToBook.whatsapp')}</h4>
              <p className="text-gray-500 text-sm mb-4">{t('howToBook.availableNow')}</p>
              <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-sm">
                WhatsApp
                <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
              </span>
            </a>

            <a
              href={`tel:${CONTACT.phone}`}
              className="group flex flex-col items-center text-center p-5 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-secondary-500/20 hover:border-secondary-500 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-secondary-500/10 text-secondary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Phone className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1">{t('howToBook.phone')}</h4>
              <p className="text-gray-500 text-sm mb-4 direction-ltr">{CONTACT.phone}</p>
              <span className="inline-flex items-center gap-1 text-secondary-600 font-semibold text-sm">
                {t('howToBook.callNow')}
                <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
              </span>
            </a>
          </div>
        </div>

        <div
          className="relative bg-gradient-to-l from-primary-600 via-primary-500 to-primary-700 rtl:bg-gradient-to-r rounded-xl md:rounded-2xl overflow-hidden shadow-2xl"
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 end-0 w-64 h-64 bg-secondary-400 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 start-0 w-48 h-48 bg-white rounded-full blur-[60px]" />
          </div>

          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
              <div className="text-center lg:text-start">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-white mb-2">{t('howToBook.readyTitle')}</h3>
                <p className="text-white/80 text-sm md:text-base">{t('howToBook.readySubtitle')}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <AppNavLink
                  to="#pricing-calculator"
                  className="inline-flex items-center gap-2 bg-white text-primary-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all duration-300 hover:scale-105 text-sm md:text-base whitespace-nowrap"
                >
                  {t('howToBook.bookTripNow')}
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </AppNavLink>
                <AppNavLink
                  to="#vehicles"
                  className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 text-sm md:text-base whitespace-nowrap"
                >
                  {t('howToBook.viewFleet')}
                </AppNavLink>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 md:mt-8 pt-6 border-t border-white/20">
              {[
                { icon: Clock, value: t('howToBook.twoMinutes'), label: t('howToBook.bookingTime') },
                { icon: Zap, value: t('howToBook.instant'), label: t('howToBook.instantConfirm') },
                { icon: ShieldCheck, value: t('howToBook.free'), label: t('howToBook.freeCancel') },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <item.icon className="w-5 h-5 text-secondary-300 mx-auto mb-1" />
                  <div className="text-white font-black text-sm md:text-base">{item.value}</div>
                  <div className="text-white/60 text-[10px] md:text-xs">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
