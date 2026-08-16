import { useEffect, useState } from 'react';

export default function StatusDonut({ segments, size = 130, stroke = 16, centerLabel = 'Total' }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className="relative inline-flex items-center justify-center donut-3d-wrap"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          {segments.map((seg) => (
            <linearGradient key={`grad-${seg.label}`} id={`donut-grad-${seg.label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
              <stop offset="100%" stopColor={seg.color} stopOpacity="0.65" />
            </linearGradient>
          ))}
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100 dark:text-white/10"
        />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          const dash = `${mounted ? len : 0} ${c - len}`;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#donut-grad-${seg.label})`}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{ transitionDelay: `${i * 100}ms` }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl sm:text-3xl font-black admin-heading">{total}</span>
        <span className="text-[10px] admin-text-muted uppercase tracking-widest font-bold">{centerLabel}</span>
      </div>
    </div>
  );
}
