import { cn } from '../../utils/helpers';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading,
  disabled,
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
    secondary: 'bg-brand text-white hover:opacity-90',
    outline: 'border border-border bg-surface text-primary hover:bg-lavender-soft',
    ghost: 'bg-transparent text-text-secondary hover:bg-lavender hover:text-primary',
    danger: 'bg-danger text-white hover:opacity-90',
    soft: 'bg-lavender text-brand hover:bg-lavender/80',
  };
  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-xl',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-11 px-5 text-sm rounded-xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
