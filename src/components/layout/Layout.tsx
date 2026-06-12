import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const Layout = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <main className="page-content">
          <ErrorBoundary variant="section">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
