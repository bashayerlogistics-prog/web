export default function GlassCard({
  children,
  className = '',
  hover = true,
  padding = 'p-5 md:p-6',
  as: Tag = 'div',
  variant = 'default',
}) {
  const baseClass = variant === 'panel' ? 'overview-panel' : 'glass-card-3d';
  const hoverClass = hover && variant !== 'panel' ? 'glass-card-hover' : '';

  return (
    <Tag
      className={`${baseClass} ${padding} ${hoverClass} ${className}`}
    >
      {children}
    </Tag>
  );
}
