import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { BRAND } from '../../utils/constants';

/**
 * Shared auth shell for Login + Sign Up — BookVerse branded.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelTitle = 'Run your bookstore beautifully',
  panelCopy = 'Inventory, orders, billing, reviews, and branding — managed from one calm Management Console.',
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 20%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(ellipse at 85% 80%, rgba(232,230,248,0.18), transparent 40%)',
          }}
        />
        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{BRAND.name}</span>
          </Link>
          <h1 className="mt-16 max-w-md text-4xl font-extrabold leading-tight text-white">{panelTitle}</h1>
          <p className="mt-4 max-w-md text-base text-white/70">{panelCopy}</p>
        </div>
        <p className="relative z-10 text-sm text-white/45">{BRAND.tagline}</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <BookOpen className="h-5 w-5" />
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
