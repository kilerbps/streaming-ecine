'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Tone = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/** Notifications courtes annoncées aux lecteurs d'écran (aria-live), au-dessus de la barre d'onglets. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Tone = 'info') => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    timer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const border =
    toast?.tone === 'error'
      ? 'border-danger'
      : toast?.tone === 'success'
        ? 'border-success'
        : 'border-border-strong';
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+12px)] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast ? (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-md border-l-4 ${border} bg-surface-2 px-4 py-3 text-sm text-text animate-[ecine-sheet-up_150ms_var(--ease)]`}
          >
            {toast.message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
  return ctx;
}
