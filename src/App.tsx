import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { useAuth } from '@/store/AuthContext';
import { Dev } from '@/routes/Dev';
import { ForgotPassword } from '@/routes/ForgotPassword';
import { Login } from '@/routes/Login';
import { Page } from '@/routes/Page';
import { ProductDetails } from '@/routes/ProductDetails';

const ProtectedRoute = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

export const App = () => {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Page title="Dashboard" />} />
          <Route path="/products" element={<Page title="Products" />} />
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
      </Routes>
    </ToastProvider>
  );
};
