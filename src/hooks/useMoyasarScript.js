import { useEffect, useState } from 'react';

const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';

let loadPromise = null;

function loadMoyasarAssets() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Moyasar?.init) return Promise.resolve(window.Moyasar);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOYASAR_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MOYASAR_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${MOYASAR_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Moyasar));
      existing.addEventListener('error', () => reject(new Error('Moyasar script failed')));
      if (window.Moyasar?.init) resolve(window.Moyasar);
      return;
    }

    const script = document.createElement('script');
    script.src = MOYASAR_JS;
    script.async = true;
    script.onload = () => {
      if (window.Moyasar?.init) resolve(window.Moyasar);
      else reject(new Error('Moyasar not available'));
    };
    script.onerror = () => reject(new Error('Moyasar script failed'));
    document.body.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function useMoyasarScript(enabled = true) {
  const [ready, setReady] = useState(Boolean(typeof window !== 'undefined' && window.Moyasar?.init));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadMoyasarAssets()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  return { ready, error, loadMoyasarAssets };
}
