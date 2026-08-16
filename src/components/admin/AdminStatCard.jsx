import { Link } from 'react-router-dom';

export default function AdminStatCard({ icon: Icon, label, value, suffix, gradient, href, badge }) {
  const inner = (
    <div className={`overview-stat-card relative overflow-hidden p-4 md:p-5 group ${href ? 'cursor-pointer' : ''}`}>
      <div className={`absolute -top-12 -end-12 w-36 h-36 bg-gradient-to-br ${gradient} opacity-[0.18] rounded-full blur-3xl group-hover:opacity-30 group-hover:scale-110 transition-all duration-500`} />
      <div
        className={`absolute bottom-0 start-0 w-full h-[3px] bg-gradient-to-r ${gradient} group-hover:h-1 transition-all duration-300`}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-2">
        <div
          className={`overview-stat-icon w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
        </div>
        {badge != null && badge > 0 && (
          <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30 ring-2 ring-white/20 dark:ring-black/20">
            {badge}
          </span>
        )}
      </div>

      <p className="relative overview-stat-value text-xl sm:text-2xl md:text-3xl font-black admin-heading mt-3 sm:mt-4">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-xs md:text-sm font-semibold admin-text-muted ms-1.5">{suffix}</span>}
      </p>
      <p className="relative text-xs md:text-sm admin-text-muted mt-1.5 font-semibold line-clamp-2 leading-snug">{label}</p>
    </div>
  );

  if (href) return <Link to={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-[1.25rem]">{inner}</Link>;
  return inner;
}
