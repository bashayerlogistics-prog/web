import { useEffect } from 'react';

/**
 * Single shared observer — GPU-friendly scroll reveal (replaces AOS, zero library cost).
 * Honors existing data-aos / data-aos-delay attributes across home sections.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    const revealAll = (nodes) => {
      nodes.forEach((el) => el.classList.add('aos-inview'));
    };

    const collect = () => Array.from(document.querySelectorAll('[data-aos]'));

    let targets = collect();
    if (!targets.length) return undefined;

    // Mobile / reduced motion: show immediately — no wait for scroll intersection.
    if (prefersReduced || isMobile) {
      revealAll(targets);
      // One short catch-up for late-mounted sections — avoid permanent body MutationObserver (jank).
      const catchUp = window.setTimeout(() => {
        revealAll(collect().filter((el) => !el.classList.contains('aos-inview')));
      }, 400);
      return () => window.clearTimeout(catchUp);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Math.min(Number(el.getAttribute('data-aos-delay') || 0), 80);
          const show = () => el.classList.add('aos-inview');
          if (delay > 0) window.setTimeout(show, delay);
          else show();
          io.unobserve(el);
        });
      },
      // Reveal early — before the block is fully on screen (feels faster on laptop).
      { threshold: 0.01, rootMargin: '120px 0px 15% 0px' },
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
