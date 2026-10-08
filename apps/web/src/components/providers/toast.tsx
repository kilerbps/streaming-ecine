'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type Tone = 'info' | 'success' | 'error';
export interface ToastAction {
  label: string;
  onAction: () => void;
}
interface Toast {
  id: number;
  message: string;
  tone: Tone;
  action?: ToastAction;
}
type Show = (message: string, tone?: Tone, action?: ToastAction) => void;

const ToastContext = createContext<Show | null>(null);

/** 4,5 s ; 6 s avec une action « Annuler » (le temps de changer d'avis). */
const DURATION_MS = 4_500;
const DURATION_WITH_ACTION_MS = 6_000;
const DISMISS_DISTANCE = 64;

const ICONS: Record<Tone, IconName> = { info: 'alert', success: 'check', error: 'alert' };
const ICON_COLORS: Record<Tone, string> = {
  info: 'text-muted',
  success: 'text-success',
  error: 'text-danger',
};

/**
 * Notification courte (une à la fois), annoncée aux lecteurs d'écran : pastille `--surface-3` au-dessus
 * de la barre d'onglets, icône, texte et action facultative (« Annuler »). Glisser pour la fermer.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const show = useCallback<Show>((message, tone = 'info', action) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, message, tone, action });
    timer.current = window.setTimeout(
      () => setToast(null),
      action ? DURATION_WITH_ACTION_MS : DURATION_MS,
    );
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { x: event.clientX, dx: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !card.current) return;
    drag.current.dx = event.clientX - drag.current.x;
    card.current.style.transform = `translateX(${drag.current.dx}px)`;
    card.current.style.opacity = String(1 - Math.min(1, Math.abs(drag.current.dx) / 200));
  };
  const onPointerUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!card.current) return;
    card.current.style.transform = '';
    card.current.style.opacity = '';
    if (state && Math.abs(state.dx) > DISMISS_DISTANCE) {
      window.clearTimeout(timer.current);
      setToast(null);
    }
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-height)+var(--safe-bottom)+12px)] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast ? (
          <div
            key={toast.id}
            ref={card}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="pointer-events-auto flex min-h-12 max-w-md touch-pan-y items-center gap-3 rounded-full bg-surface-3 py-2 pl-4 pr-2 text-[15px] leading-5 text-text shadow-[var(--shadow-menu)] animate-[ecine-toast-in_var(--dur-base)_var(--ease-standard)]"
          >
            <Icon
              name={ICONS[toast.tone]}
              size={20}
              className={`shrink-0 ${ICON_COLORS[toast.tone]}`}
            />
            <span className={toast.action ? '' : 'pr-2'}>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  window.clearTimeout(timer.current);
                  toast.action?.onAction();
                  setToast(null);
                }}
                className="press min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold text-accent-text hover:bg-surface-2"
              >
                {toast.action.label}
              </button>
            ) : null}
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
