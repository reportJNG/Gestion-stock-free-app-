import { useAuth } from '@/store/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export const KeyboardShortcuts = () => {
  const { isAuthenticated } = useAuth();
  useKeyboardShortcuts(isAuthenticated);
  return null;
};
