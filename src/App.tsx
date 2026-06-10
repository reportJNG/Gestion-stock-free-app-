import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { DashboardPage } from '@/routes/DashboardPage';
import { Dev } from '@/routes/Dev';
import { ForgotPasswordPage } from '@/routes/ForgotPasswordPage';
import { LoginPage } from '@/routes/LoginPage';
import { Page } from '@/routes/Page';
import { ProductDetails } from '@/routes/ProductDetails';
import { ProductsPage } from '@/routes/ProductsPage';
import { RegisterPage } from '@/routes/RegisterPage';

export const App = () => {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/home" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/stock" element={<Page title="Stock" />} />
            <Route path="/scan" element={<Page title="Scanner" />} />
            <Route path="/reporting" element={<Page title="Reports" />} />
            <Route path="/economy" element={<Page title="Economy" />} />
            <Route path="/profile" element={<Page title="Profile" />} />
            <Route path="/settings" element={<Page title="Settings" />} />
            <Route path="/contact" element={<Page title="Contact" />} />
            <Route path="/dev" element={<Dev />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
};
