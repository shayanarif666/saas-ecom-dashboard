import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import AuthShell from '../components/auth/AuthShell';
import AuthForm from '../components/auth/AuthForm';
import Button from '../components/common/Button';
import { useLoginMutation } from '../features/auth/useAuth';
import { DEMO_MODE, ROLES } from '../utils/constants';
import { DEMO_CREDENTIALS } from '../demo/demoData';
import { getApiError } from '../utils/helpers';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const loginMutation = useLoginMutation();
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === ROLES.CUSTOMER || user.role === 'customer') return;
    navigate(location.state?.from?.pathname || '/', { replace: true });
  }, [user, navigate, location.state]);

  if (user && user.role !== ROLES.CUSTOMER && user.role !== 'customer') {
    return <Navigate to="/" replace />;
  }

  const finishLogin = (loggedIn) => {
    if (loggedIn?.role === ROLES.CUSTOMER) {
      toast.error('Customer accounts cannot access the dashboard');
      return;
    }
    toast.success(`Welcome back, ${loggedIn?.name || 'Admin'}`);
    navigate('/', { replace: true });
  };

  const onSubmit = async (values) => {
    try {
      const res = await loginMutation.mutateAsync(values);
      const loggedIn = res?.data?.user ?? res?.data ?? res?.user;
      finishLogin(loggedIn);
    } catch (err) {
      toast.error(getApiError(err, 'Invalid email or password'));
    }
  };

  const enterDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await loginMutation.mutateAsync(DEMO_CREDENTIALS);
      const loggedIn = res?.data?.user ?? res?.data ?? res?.user;
      finishLogin(loggedIn);
    } catch (err) {
      toast.error(getApiError(err, 'Demo login failed'));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle={
        DEMO_MODE
          ? 'Demo mode is on — no Backend needed. Use the button below or the demo credentials.'
          : 'Sign in with your administrator account.'
      }
      footer={
        <>
          New merchant?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create your store
          </Link>
        </>
      }
    >
      <AuthForm mode="login" onSubmit={onSubmit} loading={loginMutation.isPending && !demoLoading} />
    </AuthShell>
  );
}
