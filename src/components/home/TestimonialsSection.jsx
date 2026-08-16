import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, Navigation } from 'swiper/modules';
import { MOBILE_SWIPER_DEFAULTS, useSwiperDirection } from '../../hooks/useSwiperDirection';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import {
  Star,
  Quote,
  MapPin,
  Route,
  Calendar,
  BadgeCheck,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TESTIMONIALS, CONTACT } from '../../data/staticData';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 md:w-4 md:h-4 ${i < rating ? 'text-secondary-400 fill-secondary-400' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, lang }) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/10 p-4 md:p-6 h-full flex flex-col">
      <Quote className="w-8 h-8 text-primary-400/40 mb-3" />

      <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4 flex-1 line-clamp-4">
        &ldquo;{testimonial.text[lang]}&rdquo;
      </p>

      <div className="flex items-center gap-1 mb-4">
        <StarRating rating={testimonial.rating} />
        <span className="text-gray-400 text-xs ms-1">({testimonial.rating}/5)</span>
      </div>

      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
          {testimonial.name[lang].charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-white font-bold text-sm md:text-base truncate">{testimonial.name[lang]}</h4>
            {testimonial.verified && (
              <BadgeCheck className="w-4 h-4 text-primary-400 shrink-0" />
            )}
          </div>
          <p className="text-gray-500 text-xs">{testimonial.role[lang]}</p>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
            <MapPin className="w-3 h-3" />
            <span>{testimonial.location[lang]}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Route className="w-3 h-3 text-primary-400" />
          <span>{testimonial.route[lang]}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{testimonial.date[lang]}</span>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
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

  const stats = [
    { value: '4.8', label: t('testimonials.overallRating'), icon: Star },
    { value: '1,500+', label: t('testimonials.reviews'), icon: MessageCircle },
    { value: '98%', label: t('testimonials.satisfaction'), icon: BadgeCheck },
  ];

  return (
    <section id="testimonials" className="py-12 md:py-16 lg:py-20 bg-dark-900 relative overflow-x-clip">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 start-20 w-96 h-96 bg-primary-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-20 end-20 w-80 h-80 bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-6 md:mb-10" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 md:px-4 md:py-2 mb-3 md:mb-4">
            <Star className="w-3 h-3 md:w-4 md:h-4 text-secondary-400" />
            <span className="text-xs md:text-sm font-semibold text-white/90">{t('testimonials.badge')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 md:mb-4 leading-tight">
            {t('testimonials.title1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-secondary-400 to-primary-400 rtl:bg-gradient-to-r">
              {t('testimonials.titleHighlight')}
            </span>{' '}
            {t('testimonials.title2')}
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-gray-400 leading-relaxed">{t('testimonials.subtitle')}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-8 md:mb-12" data-aos="fade-up" data-aos-delay="100">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-primary-400 mx-auto mb-1 md:mb-2" />
              <div className="text-xl md:text-2xl lg:text-3xl font-black text-white mb-0.5">{stat.value}</div>
              <div className="text-gray-400 text-[10px] md:text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="relative mb-8 md:mb-12 mobile-swiper-wrap premium-swiper-wrap--mobile-center" data-aos="fade-up" data-aos-delay="200" dir={isRtl ? 'rtl' : 'ltr'}>
          <Swiper
            dir={isRtl ? 'rtl' : 'ltr'}
            modules={[Pagination, Autoplay, Navigation]}
            slidesPerView={MOBILE_SWIPER_DEFAULTS.slidesPerView}
            centeredSlides={MOBILE_SWIPER_DEFAULTS.centeredSlides}
            centeredSlidesBounds={MOBILE_SWIPER_DEFAULTS.centeredSlidesBounds}
            spaceBetween={MOBILE_SWIPER_DEFAULTS.spaceBetween}
            roundLengths
            watchOverflow
            autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ el: '.testimonials-pagination', clickable: true }}
            navigation={{ prevEl: '.testimonials-prev', nextEl: '.testimonials-next' }}
            breakpoints={{ 1024: { slidesPerView: 3, centeredSlides: false, centeredSlidesBounds: false, spaceBetween: 20 } }}
            onSwiper={(swiper) => { swiperRef.current = swiper; }}
            className="section-swiper"
          >
            {TESTIMONIALS.map((testimonial) => (
              <SwiperSlide key={testimonial.id}>
                <TestimonialCard testimonial={testimonial} lang={lang} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="flex items-center justify-center gap-4 mt-4">
            <button type="button" className="testimonials-prev w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary-500 hover:border-primary-500 transition-all duration-300 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <div className="testimonials-pagination flex items-center justify-center gap-2" />
            <button type="button" className="testimonials-next w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary-500 hover:border-primary-500 transition-all duration-300 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        <div
          className="text-center bg-gradient-to-l from-primary-600/20 via-secondary-600/10 to-primary-600/20 rtl:bg-gradient-to-r backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/10 p-6 md:p-8"
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <h3 className="text-lg md:text-xl font-bold text-white mb-2">{t('testimonials.enjoyed')}</h3>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 text-sm md:text-base mt-2"
          >
            <MessageCircle className="w-4 h-4" />
            {t('testimonials.shareReview')}
          </a>
        </div>
      </div>
    </section>
  );
}
