import { Menu, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { setMobileNavOpen } from '../../store/uiSlice';
import { useLogoutMutation } from '../../features/auth/useAuth';
import { storeApi } from '../../services/api';
import Button from '../common/Button';
import { BRAND } from '../../utils/constants';
import { unwrap } from '../../utils/helpers';

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
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

  const onLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      /* demo/local logout still clears client state */
    }
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 backdrop-blur-md lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-lavender"
            onClick={() => dispatch(setMobileNavOpen(true))}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {storeLogo ? (
            <img
              src={storeLogo}
              alt=""
              className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-border"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-primary">{storeName}</p>
            {user?.name ? (
              <p className="truncate text-[11px] text-text-secondary">{user.name}</p>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} loading={logoutMutation.isPending}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
