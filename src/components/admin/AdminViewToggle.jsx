import { useTranslation } from 'react-i18next';
import { LayoutGrid, Table2 } from 'lucide-react';

export default function AdminViewToggle({ value, onChange, className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`admin-view-toggle ${className}`} role="group" aria-label={t('admin.table.viewMode')}>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`admin-view-toggle-btn ${value === 'table' ? 'admin-view-toggle-btn--active' : ''}`}
        aria-pressed={value === 'table'}
      >
        <Table2 className="w-4 h-4" />
        <span className="hidden sm:inline">{t('admin.table.tableView')}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`admin-view-toggle-btn ${value === 'cards' ? 'admin-view-toggle-btn--active' : ''}`}
        aria-pressed={value === 'cards'}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">{t('admin.table.cardView')}</span>
      </button>
    </div>
  );
}
