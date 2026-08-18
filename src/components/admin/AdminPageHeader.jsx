import { Info } from 'lucide-react';
import { useAdminPagePurpose } from '../../hooks/useAdminPagePurpose';

export default function AdminPageHeader({ title, subtitle, purposeKey, showPurpose = true, children }) {
  const purpose = useAdminPagePurpose(purposeKey);

  return (
    <div className="admin-card-surface glass-card-3d p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-brand/[0.03] via-transparent to-gold/[0.04] pointer-events-none" aria-hidden />
      <div className="absolute -top-20 -end-20 w-48 h-48 bg-gradient-to-br from-brand/10 to-gold/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="min-w-0 flex-1 relative">
        <h1 className="admin-heading-gradient text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-brand via-brand-light to-gold bg-clip-text text-transparent break-words leading-tight">
          {title}
        </h1>
        {showPurpose && purpose ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-brand/15 bg-brand/[0.06] px-3 py-2.5">
            <Info className="w-4 h-4 shrink-0 text-brand mt-0.5" aria-hidden />
            <p className="text-xs sm:text-sm text-gray-700 dark:text-white/85 leading-relaxed font-medium">
              {purpose}
            </p>
          </div>
        ) : null}
        {subtitle ? (
          <p className={`admin-text-muted text-xs sm:text-sm font-medium break-words ${showPurpose && purpose ? 'mt-2' : 'mt-1.5'}`}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto relative shrink-0">{children}</div>
      ) : null}
    </div>
  );
}
