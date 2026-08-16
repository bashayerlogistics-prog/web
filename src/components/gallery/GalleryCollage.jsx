import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  Building2,
  Plane,
  Store,
  Route,
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { filterPlacesGalleryItems } from '../../utils/galleryPlaces';
import { galleryCardSrc, gallerySrcSet, lightenMediaUrl, optimizedImageUrl } from '../../utils/mediaPerf';
import { HERO_IMAGE_MOBILE } from '../../data/staticData';

const FILTERS = [
  { key: 'all', icon: LayoutGrid },
  { key: 'city', icon: Building2 },
  { key: 'airport', icon: Plane },
  { key: 'market', icon: Store },
  { key: 'route', icon: Route },
];

const BATCH_SIZE = 8;

export default function GalleryCollage() {
  const { t, i18n } = useTranslation();
  const { galleryItems } = useSiteContent();
  const lang = i18n.language;
  const sentinelRef = useRef(null);

  const allItems = useMemo(
    () => filterPlacesGalleryItems(galleryItems?.length ? galleryItems : []),
    [galleryItems],
  );

  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [active, setActive] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenIds, setBrokenIds] = useState(() => new Set());

  const items = useMemo(() => {
    if (filter === 'all') return allItems;
    return allItems.filter((item) => (item.category || 'city') === filter);
  }, [allItems, filter]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const hasMore = visibleCount < items.length;

  const filterCounts = useMemo(() => {
    const counts = { all: allItems.length };
    FILTERS.forEach(({ key }) => {
      if (key === 'all') return;
      counts[key] = allItems.filter((item) => (item.category || 'city') === key).length;
    });
    return counts;
  }, [allItems]);

  const setFilterFast = useCallback((key) => {
    startTransition(() => {
      setFilter(key);
      setVisibleCount(BATCH_SIZE);
    });
  }, []);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filter, allItems]);

  useEffect(() => {
    if (!hasMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        startTransition(() => {
          setVisibleCount((n) => Math.min(n + BATCH_SIZE, items.length));
        });
      },
      { rootMargin: '280px 0px' },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, items.length, visibleCount]);

  const openItem = useCallback((item, index) => {
    const fullIndex = items.findIndex((row) => row.id === item.id);
    setActive(item);
    setActiveIndex(fullIndex >= 0 ? fullIndex : index);
  }, [items]);

  const closeLightbox = useCallback(() => setActive(null), []);

  const goPrev = useCallback(() => {
    if (!items.length) return;
    const next = (activeIndex - 1 + items.length) % items.length;
    setActiveIndex(next);
    setActive(items[next]);
  }, [activeIndex, items]);

  const goNext = useCallback(() => {
    if (!items.length) return;
    const next = (activeIndex + 1) % items.length;
    setActiveIndex(next);
    setActive(items[next]);
  }, [activeIndex, items]);

  const markBroken = useCallback((id) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const filterLabel = useCallback((key) => {
    const map = {
      all: t('gallery.filterAll'),
      city: t('gallery.filterCity'),
      airport: t('gallery.filterAirport'),
      market: t('gallery.filterMarket'),
      route: t('gallery.filterRoute'),
    };
    return map[key] || key;
  }, [t]);

  if (!allItems.length) {
    return (
      <section id="gallery-collage" className="gallery-collage">
        <div className="gallery-showcase__empty">{t('gallery.empty')}</div>
      </section>
    );
  }

  const activePoster = optimizedImageUrl(
    lightenMediaUrl(active?.posterUrl || active?.imageUrl),
    960,
    75,
  );
  const activeVideo = lightenMediaUrl(active?.videoUrl);

  return (
    <section id="gallery-collage" className="gallery-collage">
      <div className="gallery-collage__intro">
        <p className="gallery-showcase__eyebrow">{t('gallery.eyebrow')}</p>
        <h2 className="gallery-showcase__heading">
          {t('gallery.sectionTitle')}
        </h2>
        <p className="gallery-showcase__lead">
          {t('gallery.sectionLead')}
        </p>
      </div>

      <div className="gallery-filter" role="tablist" aria-label={t('gallery.filterLabel')}>
        {FILTERS.map(({ key, icon: Icon }) => {
          const count = filterCounts[key] || 0;
          if (key !== 'all' && count === 0) return null;
          const isActive = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`gallery-filter__chip${isActive ? ' is-active' : ''}`}
              onClick={() => setFilterFast(key)}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden />
              <span>{filterLabel(key)}</span>
              <span className="gallery-filter__count">{count}</span>
            </button>
          );
        })}
      </div>

      {!items.length ? (
        <div className="gallery-showcase__empty">{t('gallery.filterEmpty')}</div>
      ) : (
        <>
          <div className="gallery-collage__masonry" key={filter}>
            {visibleItems.map((item, index) => {
              const title = lang === 'ar' ? (item.titleAr || item.titleEn) : (item.titleEn || item.titleAr);
              const location = lang === 'ar'
                ? (item.locationAr || item.locationEn)
                : (item.locationEn || item.locationAr);
              const raw = item.posterUrl || item.imageUrl || '';
              const src = brokenIds.has(item.id)
                ? HERO_IMAGE_MOBILE
                : (galleryCardSrc(item, index < 4 ? 560 : 420) || HERO_IMAGE_MOBILE);
              const srcSet = brokenIds.has(item.id) ? undefined : gallerySrcSet(raw, [320, 480, 640]);
              const eager = index < 4;

              return (
                <article
                  key={item.id}
                  className="gallery-collage__tile"
                  style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                >
                  <button
                    type="button"
                    className="gallery-collage__media-btn"
                    onClick={() => openItem(item, index)}
                    aria-label={title}
                  >
                    <img
                      src={src}
                      srcSet={srcSet}
                      sizes="(max-width: 767px) 48vw, (max-width: 1199px) 30vw, 280px"
                      alt={title}
                      className="gallery-collage__img"
                      loading={eager ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      width={560}
                      height={420}
                      onError={() => markBroken(item.id)}
                    />
                    <span className="gallery-collage__shade" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gallery-collage__meta gallery-collage__meta--link"
                    onClick={() => openItem(item, index)}
                  >
                    {location && <span className="gallery-collage__loc">{location}</span>}
                    <span className="gallery-collage__name">{title}</span>
                  </button>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="gallery-showcase__sentinel" aria-hidden>
              <span className="gallery-showcase__loading">{t('gallery.loadingMore', { defaultValue: '…' })}</span>
            </div>
          )}
        </>
      )}

      {active && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={t('gallery.lightbox')}>
          <button type="button" className="gallery-lightbox__backdrop" onClick={closeLightbox} aria-label={t('common.close')} />
          <div className="gallery-lightbox__panel">
            <button type="button" className="gallery-lightbox__close" onClick={closeLightbox} aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
            <button type="button" className="gallery-lightbox__nav gallery-lightbox__nav--prev" onClick={goPrev} aria-label={t('gallery.prev')}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" className="gallery-lightbox__nav gallery-lightbox__nav--next" onClick={goNext} aria-label={t('gallery.next')}>
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="gallery-lightbox__media">
              {active.mediaType === 'video' && activeVideo ? (
                <video
                  key={activeVideo}
                  src={activeVideo}
                  poster={activePoster}
                  controls
                  playsInline
                  preload="metadata"
                  className="gallery-lightbox__asset"
                />
              ) : (
                <img
                  src={brokenIds.has(active.id) ? HERO_IMAGE_MOBILE : (activePoster || active?.imageUrl || HERO_IMAGE_MOBILE)}
                  alt={lang === 'ar' ? active.titleAr : active.titleEn}
                  className="gallery-lightbox__asset"
                  decoding="async"
                  onError={() => markBroken(active.id)}
                />
              )}
            </div>
            <div className="gallery-lightbox__caption">
              <h3>
                {lang === 'ar' ? active.titleAr : active.titleEn}
              </h3>
              <p>{lang === 'ar' ? active.subtitleAr : active.subtitleEn}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
