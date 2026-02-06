'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, variant };

    setToasts((prev) => [...prev, newToast].slice(-3)); // Keep max 3 toasts

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const variants = {
    success: {
      bg: 'bg-accent-green/10 border-accent-green/30',
      icon: <CheckCircle className="w-5 h-5 text-accent-green" />,
      text: 'text-accent-green',
    },
    error: {
      bg: 'bg-accent-red/10 border-accent-red/30',
      icon: <AlertCircle className="w-5 h-5 text-accent-red" />,
      text: 'text-accent-red',
    },
    info: {
      bg: 'bg-accent-blue/10 border-accent-blue/30',
      icon: <Info className="w-5 h-5 text-accent-blue" />,
      text: 'text-accent-blue',
    },
  };

  const style = variants[toast.variant];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 duration-200 min-w-[280px] max-w-[400px]`}
    >
      {style.icon}
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${style.text}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
