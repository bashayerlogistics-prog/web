import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scrollToSectionWhenReady } from '../../utils/scroll';

/** Handles post-navigation scroll: section targets on home, otherwise top of page. */
export default function ScrollManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledKeyRef = useRef('');

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    const key = `${location.pathname}:${location.hash}:${scrollTo || ''}:${location.key}`;
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    // Home section deep-link via router state (e.g. Categories → All)
    if (scrollTo && location.pathname === '/') {
      scrollToSectionWhenReady(scrollTo, true);
      navigate('/', { replace: true, state: null });
      return;
    }

    // Hash targets (home sections or in-page anchors)
    if (location.hash) {
      scrollToSectionWhenReady(location.hash, true);
      return;
    }

    // Default: new route opens at the top (not leftover footer scroll)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash, location.state, location.key, navigate]);

  return null;
}
