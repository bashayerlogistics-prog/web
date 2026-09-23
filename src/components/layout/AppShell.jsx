import { useEffect } from 'react';

/** Hide splash as soon as React mounts — branding/CMS update in place (no hang). */
export default function AppShell({ children }) {
  useEffect(() => {
    document.getElementById('initial-splash')?.classList.add('is-hidden');
    document.body.classList.remove('splash-active');

    const timeout = window.setTimeout(() => {
      document.getElementById('initial-splash')?.remove();
    }, 120);

    return () => window.clearTimeout(timeout);
  }, []);

  return children;
}
