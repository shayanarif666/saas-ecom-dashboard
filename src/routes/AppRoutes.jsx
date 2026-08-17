import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardHomePage from '../pages/DashboardHomePage';
import InventoryPage from '../pages/InventoryPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import BillingPage from '../pages/BillingPage';
import BillingDetailPage from '../pages/BillingDetailPage';
import DiscountsPage from '../pages/DiscountsPage';
import ReviewsPage from '../pages/ReviewsPage';
import CategoriesPage from '../pages/CategoriesPage';
import SettingsPage from '../pages/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHomePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/new" element={<ProductDetailPage />} />
          <Route path="inventory/:id" element={<ProductDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/:id" element={<BillingDetailPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="discounts" element={<DiscountsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
