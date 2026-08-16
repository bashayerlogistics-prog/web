import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

function collectOptions(children) {
  const options = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      options.push(...collectOptions(child.props.children));
      return;
    }
    if (child.type === 'optgroup') {
      options.push(...collectOptions(child.props.children));
      return;
    }
    if (child.type === 'option') {
      options.push({
        value: child.props.value ?? child.props.children,
        label: child.props.children,
        disabled: !!child.props.disabled,
      });
    }
  });

  return options;
}

export default function AdminSelect({
  children,
  value,
  onChange,
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  'aria-label': ariaLabel,
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-options`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const options = useMemo(() => collectOptions(children), [children]);
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value));
  const selected = options[selectedIndex] || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const placeMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(120, Math.min(320, window.innerHeight - rect.bottom - 18)),
      });
    };

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target) && !event.target.closest?.(`[data-admin-select-menu="${listId}"]`)) {
        setOpen(false);
      }
    };

    placeMenu();
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [listId, open]);

  const choose = (option) => {
    if (option.disabled) return;
    onChange?.({ target: { value: option.value, name } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let nextIndex = selectedIndex < 0 ? 0 : selectedIndex;
    do {
      nextIndex = (nextIndex + direction + options.length) % options.length;
    } while (options[nextIndex]?.disabled && nextIndex !== selectedIndex);
    if (options[nextIndex]) choose(options[nextIndex]);
  };

  return (
    <div ref={rootRef} className={`admin-select ${className}`}>
      <input
        type="text"
        name={name}
        value={value ?? ''}
        required={required}
        disabled={disabled}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="admin-select-native"
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
          setOpen(true);
        }}
      />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        className="admin-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="admin-select-value">{selected?.label ?? ''}</span>
        <ChevronDown className={`admin-select-chevron ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && createPortal(
        <div
          id={listId}
          role="listbox"
          data-admin-select-menu={listId}
          className="admin-select-menu"
          style={menuStyle}
        >
          {options.map((option, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={`${String(option.value)}-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                className={`admin-select-option ${active ? 'admin-select-option-active' : ''}`}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {active && <Check className="w-4 h-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
