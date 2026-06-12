import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';

const ROUTE_SHORTCUTS: Record<string, string> = {
  '1': '/home',
  '2': '/products',
  '3': '/stock',
  '4': '/scan',
  '5': '/reporting',
  '6': '/economy',
};

export const useKeyboardShortcuts = (enabled: boolean): void => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === ',') {
        event.preventDefault();
        navigate('/settings');
        return;
      }

      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        if (window.confirm('Log out of StockFlow?')) {
          logout();
        }
        return;
      }

      const route = ROUTE_SHORTCUTS[event.key];
      if (route) {
        event.preventDefault();
        navigate(route);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, logout, navigate]);
};
