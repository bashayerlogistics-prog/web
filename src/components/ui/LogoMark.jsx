/**
 * Brand icon mark — route path between two points (transport / logistics).
 * @param {'light' | 'dark'} tone — light = gold badge for dark backgrounds; dark = purple badge for light backgrounds
 */
export default function LogoMark({ tone = 'light', className = '', ...props }) {
  const isLight = tone === 'light';

  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect
        width="56"
        height="56"
        rx="14"
        fill={isLight ? 'var(--color-gold)' : 'var(--color-brand)'}
      />
      <rect
        x="4"
        y="4"
        width="48"
        height="48"
        rx="11"
        fill="none"
        stroke={isLight ? '#ffffff' : 'var(--color-gold)'}
        strokeWidth="1.25"
        opacity={isLight ? 0.4 : 0.45}
      />
      <path
        d="M17 37.5C20 31 24 28.5 28 28.5C32 28.5 36 24 39 17.5"
        stroke={isLight ? '#ffffff' : 'var(--color-gold)'}
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="17"
        cy="37.5"
        r="3.75"
        fill={isLight ? '#ffffff' : 'var(--color-gold)'}
      />
      <circle
        cx="39"
        cy="17.5"
        r="3.75"
        fill={isLight ? 'var(--color-brand)' : 'var(--color-gold-light)'}
      />
    </svg>
  );
}
