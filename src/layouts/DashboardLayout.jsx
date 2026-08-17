import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import AppFooter from '../components/layout/AppFooter';
import Button from '../components/common/Button';
import { useLogoutMutation } from '../features/auth/useAuth';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      /* ignore */
    }
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="hidden items-center justify-end gap-2 px-8 pt-5 lg:flex">
          <Button variant="outline" size="sm" onClick={onLogout} loading={logoutMutation.isPending}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <main className="flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-2">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
            <AppFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
