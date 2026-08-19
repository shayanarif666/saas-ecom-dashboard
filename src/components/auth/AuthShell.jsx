import { cn } from '../../utils/helpers';

/**
 * Centered auth card for Login + Register — no brand split panel.
 */
export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(59,50,148,0.08), transparent 50%), #f4f5fb',
        }}
      />

      <div
        className={cn(
          'relative w-full animate-fade-up rounded-2xl border border-border bg-white p-8 shadow-elevated sm:p-10',
          wide ? 'max-w-lg' : 'max-w-[420px]'
        )}
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-primary">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div> : null}
      </div>
    </div>
  );
}
