import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { ChevronDown } from 'lucide-react';



const MENU_GAP_PX = 6;

const MENU_Z_INDEX = 10050;



/**

 * Custom select — menu portals to document.body and always opens downward

 * (avoids clipping inside overflow/stacking contexts on homepage forms).

 * @param {'dark'|'light'} variant

 */

export default function CustomSelect({

  value,

  onChange,

  options,

  icon: Icon,

  iconSide = 'end',

  required,

  disabled,

  variant = 'dark',

  'aria-label': ariaLabel,

  title,

}) {

  const listId = useId();

  const rootRef = useRef(null);

  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);

  const [menuStyle, setMenuStyle] = useState(null);



  const selected = options.find((o) => String(o.value) === String(value)) || options[0];



  const updateMenuPosition = () => {

    const trigger = rootRef.current?.querySelector('.ip-select__trigger');

    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();

    setMenuStyle({

      position: 'fixed',

      top: `${rect.bottom + MENU_GAP_PX}px`,

      left: `${rect.left}px`,

      width: `${rect.width}px`,

      minWidth: `${rect.width}px`,

      zIndex: MENU_Z_INDEX,

    });

  };



  useLayoutEffect(() => {

    if (!open || disabled || !options.length) {

      setMenuStyle(null);

      return undefined;

    }

    updateMenuPosition();

    window.addEventListener('scroll', updateMenuPosition, true);

    window.addEventListener('resize', updateMenuPosition);

    return () => {

      window.removeEventListener('scroll', updateMenuPosition, true);

      window.removeEventListener('resize', updateMenuPosition);

    };

  }, [open, disabled, options.length]);



  useEffect(() => {

    const scope = rootRef.current?.closest('[data-dropdown-scope]');

    if (!scope) return undefined;

    if (open && !disabled) {

      scope.classList.add('dropdown-scope--open');

      return () => scope.classList.remove('dropdown-scope--open');

    }

    scope.classList.remove('dropdown-scope--open');

    return undefined;

  }, [open, disabled]);



  useEffect(() => {

    if (!open) return undefined;

    const onDoc = (e) => {

      const target = e.target;

      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;

      setOpen(false);

    };

    const onKey = (e) => {

      if (e.key === 'Escape') setOpen(false);

    };

    document.addEventListener('pointerdown', onDoc);

    document.addEventListener('keydown', onKey);

    return () => {

      document.removeEventListener('pointerdown', onDoc);

      document.removeEventListener('keydown', onKey);

    };

  }, [open]);



  useEffect(() => {

    if (disabled) setOpen(false);

  }, [disabled]);



  const menu = open && !disabled && menuStyle && options.length > 0

    ? createPortal(

      <ul

        ref={menuRef}

        id={listId}

        role="listbox"

        className={`ip-select__menu ip-select__menu--portal ${

          variant === 'light' ? 'ip-select__menu--light' : 'ip-select__menu--dark'

        }`}

        style={menuStyle}

        tabIndex={-1}

      >

        {options.map((opt) => {

          const active = String(opt.value) === String(value);

          return (

            <li key={`${opt.value}-${opt.label}`} role="option" aria-selected={active}>

              <button

                type="button"

                className={`ip-select__option ${active ? 'ip-select__option--active' : ''}`}

                onPointerDown={(e) => {

                  e.preventDefault();

                  e.stopPropagation();

                  onChange(opt.value);

                  setOpen(false);

                }}

              >

                {opt.label}

              </button>

            </li>

          );

        })}

      </ul>,

      document.body,

    )

    : null;



  return (

    <div

      className={`ip-select ip-select--${variant} ${open ? 'ip-select--open' : ''} ${disabled ? 'ip-select--disabled' : ''}`}

      ref={rootRef}

      title={title}

    >

      <button

        type="button"

        className={`ip-select__trigger ${iconSide === 'start' ? 'ip-select__trigger--icon-start' : ''}`}

        aria-haspopup="listbox"

        aria-expanded={open}

        aria-controls={listId}

        aria-label={ariaLabel}

        aria-required={required || undefined}

        disabled={disabled || !options.length}

        onPointerDown={(e) => e.stopPropagation()}

        onClick={() => {

          if (!disabled && options.length) setOpen((v) => !v);

        }}

      >

        <span className="ip-select__value">{selected?.label ?? ''}</span>

        {Icon ? (

          <Icon className={`ip-select__icon ip-select__icon--${iconSide}`} aria-hidden />

        ) : (

          <ChevronDown className={`ip-select__icon ip-select__icon--${iconSide}`} aria-hidden />

        )}

      </button>



      {menu}

    </div>

  );

}


