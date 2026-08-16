import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Hero from '../components/home/Hero';
import BookingForm from '../components/home/BookingForm';
import { useSiteContent } from '../context/SiteContentContext';

const CarCategoriesSection = lazy(() => import('../components/home/CarCategoriesSection'));
const InstantPriceSection = lazy(() => import('../components/home/InstantPriceSection'));
const ReligiousToursSection = lazy(() => import('../components/home/ReligiousToursSection'));
const FleetSection = lazy(() => import('../components/home/FleetSection'));
const ServicesCatalogSection = lazy(() => import('../components/home/ServicesCatalogSection'));
const FAQSection = lazy(() => import('../components/home/FAQSection'));
const StatsSection = lazy(() => import('../components/home/StatsSection'));
const AboutSection = lazy(() => import('../components/home/AboutSection'));
const BlogSection = lazy(() => import('../components/home/BlogSection'));

function SectionFallback() {
  return (
    <div className="section-skeleton py-12 sm:py-16" aria-hidden>
      <div className="section-container">
        <div className="section-skeleton__grid">
          <div className="section-skeleton__card h-40 rounded-2xl bg-gray-100/80 animate-pulse" />
          <div className="section-skeleton__card section-skeleton__card--hide-mobile h-40 rounded-2xl bg-gray-100/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Load section JS/CSS only when near the viewport — keeps first paint to Hero + Booking. */
function LazySection({ when = true, children, rootMargin = '480px 0px' }) {
  const slotRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!when || visible) return undefined;
    const el = slotRef.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        io.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [when, visible, rootMargin]);

  if (!when) return null;

  return (
    <div ref={slotRef} className="home-defer-slot">
      {visible ? (
        <Suspense fallback={<SectionFallback />}>{children}</Suspense>
      ) : (
        <div className="home-defer-slot__placeholder" aria-hidden />
      )}
    </div>
  );
}

export default function Home() {
  const { isSectionActive } = useSiteContent();
  const showInstant = isSectionActive('instantPrice');
  const showBooking = isSectionActive('booking');
  const heroActive = isSectionActive('hero');

  return (
    <>
      {heroActive && <Hero withBookingOverlap={showBooking} />}
      {showBooking && (
        <div className="relative z-30">
          <BookingForm overlapHero={heroActive} />
        </div>
      )}
      <LazySection when={isSectionActive('fleet')} rootMargin="640px 0px">
        <CarCategoriesSection />
      </LazySection>
      <LazySection when={isSectionActive('fleet')} rootMargin="560px 0px">
        <FleetSection />
      </LazySection>
      <LazySection when={showInstant} rootMargin="400px 0px">
        <InstantPriceSection />
      </LazySection>
      <LazySection when={isSectionActive('religiousTours')}>
        <ReligiousToursSection />
      </LazySection>
      <LazySection when={isSectionActive('servicesCatalog')}>
        <ServicesCatalogSection />
      </LazySection>
      <LazySection when={isSectionActive('faq')}>
        <FAQSection />
      </LazySection>
      <LazySection when={isSectionActive('stats')}>
        <StatsSection />
      </LazySection>
      <LazySection when={isSectionActive('about')}>
        <AboutSection />
      </LazySection>
      <LazySection when={isSectionActive('blog')}>
        <BlogSection />
      </LazySection>
    </>
  );
}
