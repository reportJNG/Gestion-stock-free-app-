import { useContext } from 'react';
import { ToastContext } from '@/components/ui/ToastProvider';

type ToastVariant = 'success' | 'error' | 'info';

interface NotifyInput {
  title: string;
  message?: string;
  variant: ToastVariant;
}

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  const { add } = context;

  const toast = {
    success: (title: string, message?: string) => add({ title, message, variant: 'success' }),
    error: (title: string, message?: string) => add({ title, message, variant: 'error' }),
    info: (title: string, message?: string) => add({ title, message, variant: 'info' }),
  };

  const notify = (input: NotifyInput) => add(input);

  return { toast, notify };
};
