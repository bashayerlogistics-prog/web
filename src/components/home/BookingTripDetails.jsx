/**
 * Labeled trip details block shown under homepage booking forms.
 * Renders only rows that have a value and whose field is enabled.
 */
export default function BookingTripDetails({ rows = [], className = '', tone = 'light' }) {
  const visible = rows.filter((row) => row?.show !== false && row?.value);

  if (!visible.length) return null;

  const isDark = tone === 'dark';

  return (
    <div
      className={`booking-trip-details rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5 ${
        isDark
          ? 'border-white/15 bg-white/5 text-white'
          : 'border-gray-200 bg-gray-50 text-brand'
      } ${className}`}
      role="region"
      aria-live="polite"
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {visible.map((row) => (
          <div key={row.key} className="min-w-0">
            <dt
              className={`text-[11px] sm:text-xs font-bold uppercase tracking-wide ${
                isDark ? 'text-white/55' : 'text-gray-500'
              }`}
            >
              {row.label}
            </dt>
            <dd
              className={`text-sm sm:text-[0.9375rem] font-semibold truncate ${
                isDark ? 'text-white' : 'text-brand'
              }`}
              dir={row.ltr ? 'ltr' : undefined}
              title={String(row.value)}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
