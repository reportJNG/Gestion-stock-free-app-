import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { DashboardPage } from '@/routes/DashboardPage';
import { ArchivesPage } from '@/routes/ArchivesPage';
import { Dev } from '@/routes/Dev';
import { EconomyPage } from '@/routes/EconomyPage';
import { ForgotPasswordPage } from '@/routes/ForgotPasswordPage';
import { LoginPage } from '@/routes/LoginPage';
import { Page } from '@/routes/Page';
import { ProductDetails } from '@/routes/ProductDetails';
import { ProductsPage } from '@/routes/ProductsPage';
import { RegisterPage } from '@/routes/RegisterPage';
import { ReportingPage } from '@/routes/ReportingPage';
import { ScannerPage } from '@/routes/ScannerPage';
import { ProfilePage } from '@/routes/ProfilePage';
import { SettingsPage } from '@/routes/SettingsPage';
import { StockPage } from '@/routes/StockPage';

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
            <Route path="/stock" element={<StockPage />} />
            <Route path="/scan" element={<ScannerPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/economy" element={<EconomyPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/contact" element={<Page title="Contact" />} />
            <Route path="/archives" element={<ArchivesPage />} />
            <Route path="/dev" element={<Dev />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
};
