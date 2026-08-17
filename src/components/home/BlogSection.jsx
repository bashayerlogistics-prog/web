import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ArrowUpLeft } from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import AppNavLink from '../ui/AppNavLink';
import PremiumSwiper from '../ui/PremiumSwiper';
import { optimizedImageUrl } from '../../utils/mediaPerf';

const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event) => setIsDesktop(event.matches);
    onChange(media);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

function BlogCard({ post, lang, t }) {
  const title = post.title?.[lang] || post.title?.ar || '';
  const excerpt = post.excerpt?.[lang] || post.excerpt?.ar || '';
  const badge = post.badge?.[lang] || post.badge?.ar || '';
  const date = post.date?.[lang] || post.date?.ar || '';
  const href = post.serviceId ? `#vehicles` : '#pricing-calculator';

  return (
    <article className="blog-card group h-full flex flex-col bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-gold/25 transition-all duration-300">
      <div className="relative aspect-[16/10] sm:aspect-[5/3] bg-gray-50 overflow-hidden">
        {post.image ? (
          <img
            src={optimizedImageUrl(post.image, 640, 72)}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            sizes="(max-width: 767px) 90vw, 380px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-gold/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/55 via-transparent to-transparent" aria-hidden />
        {badge && (
          <span className="absolute top-3 start-3 text-[10px] sm:text-[11px] font-bold tracking-wide text-brand-dark bg-white/95 border border-gold/30 px-2.5 py-1 rounded-full shadow-sm">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5 md:p-6 text-start">
        {date && (
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-semibold block mb-1.5">
            {date}
          </span>
        )}
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-brand-dark mb-2 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
          {title}
        </h3>
        <p className="text-gray-500 text-xs sm:text-[13px] leading-relaxed line-clamp-3 flex-1">
          {excerpt}
        </p>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <AppNavLink
            to={href}
            className="text-xs font-bold text-gold group-hover:text-brand transition-colors inline-flex items-center gap-1.5"
          >
            <span>{t('blog.readMore')}</span>
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </AppNavLink>
        </div>
      </div>
    </article>
  );
}

export default function BlogSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { blogs } = useSiteContent();
  const isDesktop = useIsDesktop();

  const posts = useMemo(() => (blogs || []).slice(0, 6), [blogs]);

  if (!posts.length) return null;

  return (
    <section id="blog" className="section-padding overflow-x-clip relative border-t border-gray-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-16 end-0 w-72 h-72 bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 start-0 w-64 h-64 bg-gold/8 rounded-full blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="section-header" data-aos="fade-up">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('blog.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-2 section-heading">
            {t('blog.title')}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
            {t('blog.subtitle')}
          </p>
        </div>

        {!isDesktop ? (
          <div data-aos="fade-up" data-aos-delay="80">
            <PremiumSwiper
              items={posts}
              renderSlide={(post) => <BlogCard post={post} lang={lang} t={t} />}
              paginationClass="blog-pagination"
              swiperClass="premium-swiper premium-swiper--wide"
              autoplayDelay={5000}
              swiperKey="home-blogs"
            />
          </div>
        ) : (
          <div
            className="grid grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6"
            data-aos="fade-up"
            data-aos-delay="80"
          >
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} lang={lang} t={t} />
            ))}
          </div>
        )}

        <div className="mt-8 sm:mt-10 flex justify-center" data-aos="fade-up" data-aos-delay="120">
          <AppNavLink
            to="#pricing-calculator"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand bg-brand/5 hover:bg-brand/10 border border-brand/15 px-5 py-2.5 rounded-xl transition-colors"
          >
            <ArrowUpLeft className="w-4 h-4 rtl:rotate-180" />
            {t('blog.bookCta')}
          </AppNavLink>
        </div>
      </div>
    </section>
  );
}
