'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore, NotificationType } from '@/lib/notificationStore';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, storeNotification?: boolean) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addNotification = useNotificationStore(state => state.addNotification);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000, storeNotification: boolean = true) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 11);
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Also store in notification bell (unless explicitly disabled)
    if (storeNotification) {
      addNotification(type as NotificationType, message);
    }

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, [addNotification]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-md">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          index={index}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
  index: number;
}

function ToastItem({ toast, onClose, index }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/40',
      border: 'border-emerald-200 dark:border-emerald-600/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      text: 'text-emerald-800 dark:text-emerald-100',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/40',
      border: 'border-red-200 dark:border-red-600/40',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-800 dark:text-red-100',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/40',
      border: 'border-amber-200 dark:border-amber-600/40',
      icon: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-800 dark:text-amber-100',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/40',
      border: 'border-blue-200 dark:border-blue-600/40',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-800 dark:text-blue-100',
    },
  };

  const style = styles[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-xl
        ${style.bg} ${style.border}
        animate-slide-in-right
        transform transition-all duration-300 ease-out
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {icons[toast.type]}
      </div>
      <p className={`flex-1 text-sm font-medium ${style.text}`}>
        {toast.message}
      </p>
      <button
        onClick={onClose}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${style.icon}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
