import { useEffect } from 'react';

export default function AppShell({ children }) {
  useEffect(() => {
    document.getElementById('initial-splash')?.classList.add('is-hidden');
    document.body.classList.remove('splash-active');

    const timeout = window.setTimeout(() => {
      document.getElementById('initial-splash')?.remove();
    }, 200);

    return () => window.clearTimeout(timeout);
  }, []);

  return children;
}
