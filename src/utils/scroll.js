function getHeaderOffset() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--site-header-height')
    .trim();
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed + 8;
  return 72;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll to a section id or hash (e.g. "#routes" or "routes"). */
export function scrollToSection(hash, smooth = true, { force = false } = {}) {
  const id = (hash || '').replace(/^#/, '');
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  const headerOffset = getHeaderOffset();
  const rect = el.getBoundingClientRect();
  const targetTop = rect.top + window.scrollY - headerOffset;

  if (!force) {
    const delta = targetTop - window.scrollY;
    // Already aligned with the section — skip jump
    if (Math.abs(delta) < 48) return true;
    // Section is already visible in the upper viewport
    if (rect.top >= headerOffset - 8 && rect.bottom <= window.innerHeight + 40) return true;
  }

  const behavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto';
  window.scrollTo({ top: Math.max(0, targetTop), behavior });
  return true;
}

/** Retry scroll until target section exists (after route change). */
export function scrollToSectionWhenReady(hash, smooth = true, maxAttempts = 24) {
  let attempts = 0;

  const run = () => {
    if (scrollToSection(hash, smooth)) return;
    attempts += 1;
    if (attempts < maxAttempts) {
      requestAnimationFrame(run);
    }
  };

  requestAnimationFrame(run);
}
