import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useMeQuery } from '../features/auth/useAuth';
import { clearAuth } from '../store/authSlice';
import { authApi } from '../services/api';
import { Skeleton } from '../components/common/States';
import { ROLES } from '../utils/constants';

const isDashboardRole = (role) =>
  role === ROLES.ADMINISTRATOR || role === ROLES.SUPERADMIN || role === 'administrator' || role === 'superadmin';

export default function ProtectedRoute({ roles }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, status, accessToken } = useSelector((s) => s.auth);
  const { isLoading, isFetching } = useMeQuery(
    Boolean(accessToken) && (status === 'idle' || status === 'loading')
  );

  const isCustomer = user?.role === ROLES.CUSTOMER || user?.role === 'customer';

  useEffect(() => {
    if (!isCustomer) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await authApi.logout();
      } catch {
        /* ignore */
      }
      if (!cancelled) dispatch(clearAuth());
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustomer, dispatch]);

  if (status === 'loading' || (status === 'idle' && (isLoading || isFetching))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!user || status === 'unauthenticated' || isCustomer) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isDashboardRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
