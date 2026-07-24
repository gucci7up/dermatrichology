import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtx { notify: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ notify: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const color = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-900' };
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`${color[t.type]} text-white px-5 py-3 rounded-xl shadow-2xl font-bold text-sm max-w-sm motion-safe:animate-in motion-safe:slide-in-from-right-4`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
