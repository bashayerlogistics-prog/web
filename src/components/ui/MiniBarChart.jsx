import { useEffect, useState } from 'react';

export default function MiniBarChart({ data, height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className="flex items-end justify-between gap-1.5 sm:gap-2 chart-card-3d"
      style={{ height }}
    >
      {data.map((item, i) => {
        const pct = Math.max((item.value / max) * 100, item.value > 0 ? 10 : 4);
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-2 min-w-0 group">
            <span className="text-xs font-black admin-heading opacity-90 group-hover:scale-110 transition-transform">
              {item.value}
            </span>
            <div
              className="w-full flex items-end justify-center"
              style={{ height: height - 40 }}
            >
              <div
                className={`bar-3d w-full max-w-[52px] bg-gradient-to-t ${item.gradient || 'from-primary-500 to-primary-400'} ${
                  mounted ? 'bar-3d-animate' : 'opacity-0'
                }`}
                style={{
                  height: mounted ? `${pct}%` : '0%',
                  minHeight: item.value > 0 ? 10 : 4,
                  animationDelay: `${i * 80}ms`,
                }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className="text-[10px] sm:text-xs admin-text-muted font-semibold text-center truncate w-full leading-tight">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
