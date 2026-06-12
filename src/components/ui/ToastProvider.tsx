import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
}

const DISMISS_MS: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
};

const ICONS = {
  success: Check,
  error: AlertCircle,
  info: Info,
} as const;

interface ToastContextValue {
  add: (toast: Omit<ToastItem, 'id'>) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ToastCard = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) => {
  const duration = DISMISS_MS[toast.variant];
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    const timer = window.setTimeout(() => setExiting(true), duration);
    return () => window.clearTimeout(timer);
  }, [duration, toast.id]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), 200);
    return () => window.clearTimeout(timer);
  }, [exiting, onDismiss, toast.id]);

  return (
    <div className={clsx('toast', `toast-${toast.variant}`, exiting ? 'toast-exit' : 'toast-enter')} role="status">
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-body">
        <strong>{toast.title}</strong>
        {toast.message ? <span>{toast.message}</span> : null}
      </div>
      <button
        className="toast-close icon-button"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setExiting(true)}
      >
        <X size={16} />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ add }), [add]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-region" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={remove} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
