import { useEffect } from 'react';

/**
 * Single shared observer — GPU-friendly scroll reveal (replaces AOS, zero library cost).
 * Honors existing data-aos / data-aos-delay attributes across home sections.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealAll = (nodes) => {
      nodes.forEach((el) => el.classList.add('aos-inview'));
    };

    const collect = () => Array.from(document.querySelectorAll('[data-aos]'));

    let targets = collect();
    if (!targets.length) return undefined;

    if (prefersReduced) {
      revealAll(targets);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Number(el.getAttribute('data-aos-delay') || 0);
          const show = () => el.classList.add('aos-inview');
          if (delay > 0) window.setTimeout(show, delay);
          else show();
          io.unobserve(el);
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
    );

    targets.forEach((el) => io.observe(el));

    const mo = new MutationObserver(() => {
      const next = collect().filter((el) => !el.classList.contains('aos-inview'));
      next.forEach((el) => io.observe(el));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
