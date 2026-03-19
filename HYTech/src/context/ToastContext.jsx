import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const getToastStyle = (type) => {
  if (type === 'error') {
    return {
      icon: <AlertCircle className="w-4 h-4" />,
      className: 'bg-red-600 text-white',
    };
  }

  if (type === 'info') {
    return {
      icon: <Info className="w-4 h-4" />,
      className: 'bg-blue-600 text-white',
    };
  }

  return {
    icon: <CheckCircle2 className="w-4 h-4" />,
    className: 'bg-green-600 text-white',
  };
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 2600) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-20 right-4 z-[999] space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const { icon, className } = getToastStyle(toast.type);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto min-w-[240px] max-w-xs rounded-xl px-4 py-3 shadow-lg animate-slide-down flex items-center justify-between gap-3 ${className}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {icon}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
