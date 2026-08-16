export default function AdminPageHeader({ title, subtitle, children }) {
  return (
    <div className="admin-card-surface glass-card-3d p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-brand/[0.03] via-transparent to-gold/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute -top-20 -end-20 w-48 h-48 bg-gradient-to-br from-brand/10 to-gold/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="min-w-0 relative">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-brand via-brand-light to-gold bg-clip-text text-transparent truncate leading-tight">
          {title}
        </h1>
        {subtitle && <p className="admin-text-muted mt-1.5 text-xs sm:text-sm font-medium">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto relative">{children}</div>}
    </div>
  );
}
