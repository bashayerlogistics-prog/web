import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import ToastContainer from '../components/ui/ToastContainer';

const ToastContext = createContext(null);
let toastId = 0;
const DEDUPE_MS = 5000;
const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const recentKeys = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShown = recentKeys.current.get(key);
    if (lastShown && now - lastShown < DEDUPE_MS) return null;

    recentKeys.current.set(key, now);
    setTimeout(() => recentKeys.current.delete(key), DEDUPE_MS);

    const id = ++toastId;
    const safeDuration = duration > 0 ? duration : 4000;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, duration: safeDuration }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
