import { useEffect, useRef, useState } from 'react';

/** Animated counter hook - triggers when element enters viewport */
export function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px 100px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.ceil(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

/** Header shadow effect on scroll — hysteresis avoids flicker at threshold */
export function useScrollHeader(threshold = 100, syncKey) {
  const [scrolled, setScrolled] = useState(
    () => (typeof window !== 'undefined' ? window.scrollY > threshold : false),
  );
  useEffect(() => {
    const enter = threshold;
    const exit = Math.max(threshold - 40, 0);
    const onScroll = () => {
      setScrolled((prev) => (prev ? window.scrollY > exit : window.scrollY > enter));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  useEffect(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold, syncKey]);

  return scrolled;
}

/** Sync real header height to --site-header-height for hero offset */
export function useSiteHeaderHeight() {
  useEffect(() => {
    const el = document.getElementById('main-header');
    if (!el) return undefined;

    const sync = () => {
      document.documentElement.style.setProperty('--site-header-height', `${el.offsetHeight}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('orientationchange', sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
}

/** Get localized field from { ar, en } object */
export function useLocalized() {
  const lang = document.documentElement.lang || 'ar';
  return (obj) => (typeof obj === 'object' ? obj[lang] || obj.ar : obj);
}
