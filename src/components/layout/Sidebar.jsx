import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Receipt,
  Percent,
  Settings,
  Star,
  X,
  BookOpen,
  Layers,
} from 'lucide-react';
import { BRAND, NAV_ITEMS } from '../../utils/constants';
import { cn, initials, unwrap } from '../../utils/helpers';
import { setMobileNavOpen } from '../../store/uiSlice';
import { storeApi } from '../../services/api';

const ICONS = {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Receipt,
  Percent,
  Settings,
  Star,
  Layers,
};

export default function Sidebar() {
  const dispatch = useDispatch();
  const { mobileNavOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);

  const storeQuery = useQuery({
    queryKey: ['store', 'me'],
    queryFn: () => storeApi.getMine(),
    staleTime: 60_000,
  });

  const store = (() => {
    if (!storeQuery.data) return null;
    const data = unwrap(storeQuery.data);
    return data?.store || data || null;
  })();

  const storeName = store?.name || BRAND.name;
  const storeLogo = store?.logoUrl || '';
  const storeSubtitle =
    store?.customDomain || store?.businessType || BRAND.tagline;

  const userName = user?.name || user?.email || 'User';
  const userSubtitle = user?.email || user?.role || 'Management Console';

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-6 pb-2 pt-7">
        <div className="flex min-w-0 items-center gap-3">
          {storeLogo ? (
            <img
              src={storeLogo}
              alt={storeName}
              className="max-w-[200px] object-contain"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </span>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 text-text-secondary hover:bg-lavender lg:hidden"
          onClick={() => dispatch(setMobileNavOpen(false))}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => dispatch(setMobileNavOpen(false))}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-lavender text-brand'
                    : 'text-text-secondary hover:bg-lavender-soft hover:text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {Icon ? (
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                  ) : null}
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-brand" />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mx-4 mb-5 rounded-2xl border border-border bg-surface p-3 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender text-sm font-bold text-brand">
            {initials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">{userName}</p>
            <p className="truncate text-xs text-text-secondary">{userSubtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-border bg-lavender-soft lg:block">
        {content}
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-primary/40"
            aria-label="Close"
            onClick={() => dispatch(setMobileNavOpen(false))}
          />
          <aside className="relative z-10 h-full w-72 animate-fade-in bg-lavender-soft shadow-modal">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
