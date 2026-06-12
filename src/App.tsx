import { Navigate, Route, Routes } from 'react-router-dom';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { DashboardPage } from '@/routes/DashboardPage';
import { ArchivesPage } from '@/routes/ArchivesPage';
import { AboutPage } from '@/routes/AboutPage';
import { EconomyPage } from '@/routes/EconomyPage';
import { ForgotPasswordPage } from '@/routes/ForgotPasswordPage';
import { LoginPage } from '@/routes/LoginPage';
import { ProductDetails } from '@/routes/ProductDetails';
import { ProductsPage } from '@/routes/ProductsPage';
import { RegisterPage } from '@/routes/RegisterPage';
import { ReportingPage } from '@/routes/ReportingPage';
import { ScannerPage } from '@/routes/ScannerPage';
import { ProfilePage } from '@/routes/ProfilePage';
import { SettingsPage } from '@/routes/SettingsPage';
import { StockPage } from '@/routes/StockPage';
import { WorkersPage } from '@/routes/WorkersPage';

export const App = () => {
  return (
    <ToastProvider>
      <KeyboardShortcuts />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dev" element={<Navigate to="/about" replace />} />
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
            <Route path="/archives" element={<ArchivesPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </ToastProvider>
  );
};
