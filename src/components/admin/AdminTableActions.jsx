import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

const VARIANTS = {
  view: 'admin-action-btn--view',
  toggleOn: 'admin-action-btn--toggle-on',
  toggleOff: 'admin-action-btn--toggle-off',
  edit: 'admin-action-btn--edit',
  delete: 'admin-action-btn--delete',
};

export function AdminTableAction({
  icon: Icon,
  onClick,
  variant = 'view',
  label,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`admin-action-btn ${VARIANTS[variant] || VARIANTS.view} ${className}`}
      {...props}
    >
      <Icon className="w-4 h-4" strokeWidth={2.25} />
    </button>
  );
}

export default function AdminTableActions({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-1.5 ${className}`} role="group">
      {children}
    </div>
  );
}

export function AdminCrudActions({ active, onToggle, onEdit, onDelete, className = '' }) {
  const { t } = useTranslation();

  return (
    <AdminTableActions className={className}>
      <AdminTableAction
        icon={active ? EyeOff : Eye}
        variant={active ? 'toggleOn' : 'toggleOff'}
        onClick={onToggle}
        label={active ? t('admin.table.hide') : t('admin.table.show')}
      />
      <AdminTableAction
        icon={Pencil}
        variant="edit"
        onClick={onEdit}
        label={t('admin.edit')}
      />
      <AdminTableAction
        icon={Trash2}
        variant="delete"
        onClick={onDelete}
        label={t('admin.table.delete')}
      />
    </AdminTableActions>
  );
}
