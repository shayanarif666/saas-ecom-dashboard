import { Link } from 'react-router-dom';
import { BRAND } from '../../utils/constants';

export default function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-primary">{BRAND.name}</p>
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} {BRAND.name}. Premium Literary Discovery.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-text-secondary">
          {['About', 'Contact', 'Terms', 'Shipping', 'Privacy'].map((label) => (
            <Link key={label} to="/settings" className="hover:text-brand">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
