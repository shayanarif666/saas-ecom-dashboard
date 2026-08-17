import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const Input = forwardRef(function Input(
  { label, error, helperText, className, id, required, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text-primary">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-primary',
          'placeholder:text-text-secondary/70 transition',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15',
          'disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      {!error && helperText ? <p className="mt-1 text-xs text-text-secondary">{helperText}</p> : null}
    </div>
  );
});

export default Input;
