import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const Textarea = forwardRef(function Textarea(
  { label, error, helperText, className, id, required, rows = 4, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cn(
          'w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-text-primary',
          'placeholder:text-text-secondary/70 transition resize-y min-h-24',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      {!error && helperText ? <p className="mt-1 text-xs text-text-secondary">{helperText}</p> : null}
    </div>
  );
});

export default Textarea;
