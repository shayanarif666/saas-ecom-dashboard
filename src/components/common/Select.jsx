import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Beautiful reusable Select used across the Dashboard.
 * Compatible with native-style handlers: onChange({ target: { value, name } })
 * Menu renders in a portal so it is not clipped by table overflow.
 */
export default function Select({
  label,
  error,
  helperText,
  options = [],
  className,
  triggerClassName,
  id,
  required,
  placeholder = 'Select…',
  value,
  onChange,
  name,
  disabled,
  leadingIcon: LeadingIcon,
  size = 'md',
}) {
  const autoId = useId();
  const inputId = id || name || autoId;
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value ?? '')),
    [options, value]
  );

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setMenuStyle(null);
      return undefined;
    }

    const place = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const menuHeight = Math.min(240, (options.length + (placeholder ? 1 : 0)) * 44 + 16);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;
      const width = Math.max(rect.width, 160);

      setMenuStyle({
        position: 'fixed',
        left: Math.min(rect.left, window.innerWidth - width - 8),
        width,
        zIndex: 9999,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 8, top: 'auto' }
          : { top: rect.bottom + 8, bottom: 'auto' }),
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, options.length, placeholder]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const inTrigger = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const emit = (next) => {
    onChange?.({ target: { value: next, name: name || '' } });
    setOpen(false);
  };

  const heights = {
    sm: 'h-9 text-xs',
    md: 'h-11 text-sm',
  };

  const menu = open && menuStyle ? (
    <ul
      ref={menuRef}
      role="listbox"
      style={menuStyle}
      className="max-h-60 overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-elevated animate-fade-in"
    >
      {placeholder ? (
        <li>
          <button
            type="button"
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-lavender-soft"
            onClick={() => emit('')}
          >
            {placeholder}
          </button>
        </li>
      ) : null}
      {options.map((opt) => {
        const active = String(opt.value) === String(value ?? '');
        return (
          <li key={String(opt.value)}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
                active
                  ? 'bg-lavender font-semibold text-brand'
                  : 'text-primary hover:bg-lavender-soft'
              )}
              onClick={() => emit(opt.value)}
            >
              <span className="truncate capitalize">{opt.label}</span>
              {active ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div className={cn('relative w-full', className)} ref={rootRef}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-primary">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}

      <button
        id={inputId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left transition',
          'hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15',
          'disabled:cursor-not-allowed disabled:bg-lavender-soft disabled:opacity-60',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          heights[size] || heights.md,
          triggerClassName
        )}
      >
        {LeadingIcon ? <LeadingIcon className="h-4 w-4 shrink-0 text-text-secondary" /> : null}
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-medium capitalize',
            selected ? 'text-primary' : 'text-text-secondary'
          )}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-text-secondary transition', open && 'rotate-180')}
        />
      </button>

      {menu ? createPortal(menu, document.body) : null}

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      {!error && helperText ? <p className="mt-1 text-xs text-text-secondary">{helperText}</p> : null}
    </div>
  );
}
