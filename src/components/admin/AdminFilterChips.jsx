const VARIANTS = {
  green: {
    active: 'admin-filter-toggle-btn--green',
    idle: 'admin-filter-toggle-btn--idle',
  },
  red: {
    active: 'admin-filter-toggle-btn--red',
    idle: 'admin-filter-toggle-btn--idle-red',
  },
  amber: {
    active: 'admin-filter-toggle-btn--amber',
    idle: 'admin-filter-toggle-btn--idle-amber',
  },
  gold: {
    active: 'admin-filter-toggle-btn--gold',
    idle: 'admin-filter-toggle-btn--idle-gold',
  },
  default: {
    active: 'admin-filter-toggle-btn--green',
    idle: 'admin-filter-toggle-btn--idle',
  },
};

/**
 * Modern segmented filter chips for SuperAdmin — scroll on mobile, wrap on desktop.
 */
export default function AdminFilterChips({ options, value, onChange, className = '', label }) {
  return (
    <div className={label ? 'space-y-2' : ''}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-wider text-brand/55 dark:text-gold/55 px-0.5">
          {label}
        </p>
      )}
      <div className={`admin-filter-toggle-track scrollbar-hide ${className}`} role="group">
        {options.map((opt) => {
          const active = value === opt.key;
          const variant = VARIANTS[opt.variant] || VARIANTS.default;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              aria-pressed={active}
              className={`admin-filter-toggle-btn touch-manipulation active:scale-[0.97] ${active ? variant.active : variant.idle}`}
            >
              <span className="whitespace-nowrap">{opt.label}</span>
              {opt.count != null && (
                <span className={`admin-filter-toggle-count ${active ? 'admin-filter-toggle-count--active' : ''}`}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
