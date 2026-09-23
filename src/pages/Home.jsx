import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Hero from '../components/home/Hero';
import BookingForm from '../components/home/BookingForm';
// Near-fold fleet UI — static import so cards/images paint without a chunk wait.
import CarCategoriesSection from '../components/home/CarCategoriesSection';
import FleetSection from '../components/home/FleetSection';
import { useSiteContent } from '../context/SiteContentContext';
import { BOOKING_CAR_TYPES } from '../data/staticData';
import { optimizedImageUrl } from '../utils/mediaPerf';
import { APP_CACHE_BUILD } from '../utils/siteContentRefresh';

const TravelReservationsSection = lazy(() => import('../components/home/TravelReservationsSection'));
const InstantPriceSection = lazy(() => import('../components/home/InstantPriceSection'));
const ReligiousToursSection = lazy(() => import('../components/home/ReligiousToursSection'));
const ServicesCatalogSection = lazy(() => import('../components/home/ServicesCatalogSection'));
const FAQSection = lazy(() => import('../components/home/FAQSection'));
const StatsSection = lazy(() => import('../components/home/StatsSection'));
const AboutSection = lazy(() => import('../components/home/AboutSection'));
const BlogSection = lazy(() => import('../components/home/BlogSection'));

/** Warm live CMS category images once Firestore is ready (never bundled seed). */
function usePrefetchFleetImages() {
  const { carCatalog, fleetHydrated } = useSiteContent();

  useEffect(() => {
    if (!fleetHydrated || !carCatalog?.length) return undefined;

    const urls = BOOKING_CAR_TYPES.map((id) => {
      const car = carCatalog.find((c) => c.id === id);
      const raw = car?.imageUrl;
      if (!raw) return null;
      const bust = String(car?.updatedAt?.seconds || car?.updatedAt || APP_CACHE_BUILD);
      return optimizedImageUrl(raw, 360, 68, bust);
    }).filter(Boolean);

    const links = urls.map((href) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => link.remove());
    };
  }, [carCatalog, fleetHydrated]);
}

function SectionFallback() {
  return (
    <div className="section-skeleton py-8 sm:py-12" aria-hidden>
      <div className="section-container">
        <div className="section-skeleton__grid">
          <div className="section-skeleton__card h-28 sm:h-40 rounded-2xl bg-gray-100/80 animate-pulse" />
          <div className="section-skeleton__card section-skeleton__card--hide-mobile h-40 rounded-2xl bg-gray-100/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Immediate Suspense — no IntersectionObserver delay (categories / fleet). */
function EagerSection({ when = true, children }) {
  if (!when) return null;
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
}

/**
 * Defer below-fold sections until near viewport.
 * Large rootMargin so chunks start loading well before the user reaches them.
 */
function LazySection({ when = true, children, rootMargin = '900px 0px' }) {
  const slotRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!when || visible) return undefined;
    const el = slotRef.current;
    if (!el) return undefined;

    // Mobile: paint sooner — less “blank then pop” while scrolling.
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const margin = isMobile ? '1100px 0px' : rootMargin;

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
      { rootMargin: margin, threshold: 0.01 },
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

function usePrefetchBelowFold() {
  useEffect(() => {
    const run = () => {
      void import('../components/home/TravelReservationsSection');
      void import('../components/home/InstantPriceSection');
      void import('../components/home/ServicesCatalogSection');
      void import('../components/home/FAQSection');
    };
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 600));
    const id = idle(run, { timeout: 1500 });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
}

export default function Home() {
  const { isSectionActive } = useSiteContent();
  const showInstant = isSectionActive('instantPrice');
  const showBooking = isSectionActive('booking');
  const heroActive = isSectionActive('hero');
  const showFleet = isSectionActive('fleet');
  usePrefetchBelowFold();
  usePrefetchFleetImages();

  return (
    <>
      {heroActive && <Hero withBookingOverlap={showBooking} />}
      {showBooking && (
        <div className="relative z-30">
          <BookingForm overlapHero={heroActive} />
        </div>
      )}

      {/* Plan Your Journey — right after hero/booking (matches homeSections order) */}
      <EagerSection when={isSectionActive('travelReservations')}>
        <TravelReservationsSection />
      </EagerSection>

      {/* Categories + Fleet: sync modules — live CMS images + cache bust */}
      {showFleet && <CarCategoriesSection />}
      {showFleet && <FleetSection />}

      <LazySection when={showInstant}>
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
