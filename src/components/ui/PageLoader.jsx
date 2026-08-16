import { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';

export default function PageLoader({ visible }) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return undefined;
    }

    const timeout = window.setTimeout(() => setMounted(false), 150);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      className={`page-loader${visible ? '' : ' page-loader--hide'}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="page-loader__inner">
        <div className="page-loader__logo-wrap">
          <BrandLogo
            variant="badge"
            tone="light"
            alt=""
            className="page-loader__logo"
            width={56}
            height={56}
            decoding="sync"
          />
          <div className="page-loader__ring" aria-hidden />
        </div>
        <div className="page-loader__bar" aria-hidden>
          <span className="page-loader__bar-fill" />
        </div>
      </div>
    </div>
  );
}
