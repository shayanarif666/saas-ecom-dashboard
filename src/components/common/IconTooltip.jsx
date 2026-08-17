import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/helpers';

/**
 * Icon button with a portal tooltip so labels are not clipped by table overflow.
 */
export default function IconTooltip({
  label,
  children,
  onClick,
  disabled,
  className,
  tone = 'default',
  'aria-label': ariaLabel,
}) {
  const tipId = useId();
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setStyle(null);
      return undefined;
    }

    const place = () => {
      const rect = btnRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        left: rect.left + rect.width / 2,
        top: rect.top - 8,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const tones = {
    default: 'text-text-secondary hover:bg-lavender-soft hover:text-primary',
    success: 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
    danger: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700',
    muted: 'text-text-secondary hover:bg-slate-100 hover:text-slate-700',
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-describedby={open ? tipId : undefined}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40',
          tones[tone] || tones.default,
          className
        )}
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open && label && style
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              style={style}
              className="pointer-events-none whitespace-nowrap rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
            >
              {label}
              <span
                aria-hidden
                className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-primary"
              />
            </span>,
            document.body
          )
        : null}
    </>
  );
}
