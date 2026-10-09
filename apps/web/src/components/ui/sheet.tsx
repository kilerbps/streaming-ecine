'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { vibrate } from '@/lib/haptics';
import { useHistoryLayer } from '@/lib/use-history-layer';
import { Icon } from './icon';

/** Sortie de la feuille ouverte (retire son entrée d'historique, puis exécute la suite). */
const SheetLeaveContext = createContext<((after: () => void) => void) | null>(null);

/**
 * Lien placé dans une feuille : ferme la feuille et retire son entrée d'historique avant de
 * naviguer (sinon le retour d'Android ramènerait sur la feuille fermée).
 */
export function SheetLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const leave = useContext(SheetLeaveContext);
  const router = useRouter();
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
        if (event.defaultPrevented || modified || !leave) return;
        event.preventDefault();
        leave(() => router.push(String(props.href)));
      }}
    />
  );
}

/** Fermeture au-delà de 30 % de la hauteur, ou sur un geste plus rapide que 0,5 px/ms. */
const CLOSE_RATIO = 0.3;
const CLOSE_VELOCITY = 0.5;
/** Déplacement qui fait passer d'un point d'arrêt à l'autre (60 % ↔ 92 %). */
const DETENT_THRESHOLD = 48;

const isPhone = () => window.matchMedia('(width < 42rem)').matches;

/**
 * Feuille modale. Mobile : monte du bas en ressort, poignée, coins hauts de 24 px ; elle suit le doigt
 * et se ferme vers le bas (bouton Fermer toujours présent). `expandable` : points d'arrêt à 60 % et 92 %
 * (aperçu rapide). PC (≥ 672 px) : panneau centré de 560 px. Base Radix Dialog : focus piégé, Échap,
 * retour du focus au déclencheur. Seule `transform` s'anime.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  expandable = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  expandable?: boolean;
}) {
  const t = useTranslations('common');
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    startY: number;
    dy: number;
    lastY: number;
    lastT: number;
    v: number;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const leave = useHistoryLayer(open, () => onOpenChange(false));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPhone() || !panel.current) return;
    drag.current = {
      startY: event.clientY,
      dy: 0,
      lastY: event.clientY,
      lastT: event.timeStamp,
      v: 0,
    };
    panel.current.style.transition = 'none';
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const node = panel.current;
    if (!state || !node) return;
    const raw = event.clientY - state.startY;
    // Vers le haut : seulement pour déplier une feuille à deux points d'arrêt, avec résistance.
    const canRise = expandable && !expanded;
    state.dy = raw >= 0 ? raw : canRise ? raw : raw / 4;
    const elapsed = Math.max(1, event.timeStamp - state.lastT);
    state.v = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    // Le point d'arrêt est porté par la propriété `translate` (classe Tailwind) : on n'ajoute que le doigt.
    node.style.transform = `translateY(${state.dy}px)`;
  };

  const onPointerUp = () => {
    const state = drag.current;
    const node = panel.current;
    drag.current = null;
    if (!state || !node) return;
    node.style.transition = '';
    node.style.transform = '';
    const height = node.offsetHeight;
    if (state.dy > height * CLOSE_RATIO || state.v > CLOSE_VELOCITY) {
      if (expandable && expanded && state.dy < height * 0.6) setExpanded(false);
      else onOpenChange(false);
    } else if (expandable && !expanded && state.dy < -DETENT_THRESHOLD) {
      setExpanded(true);
      vibrate('detent');
    } else if (expandable && expanded && state.dy > DETENT_THRESHOLD) {
      setExpanded(false);
      vibrate('detent');
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setExpanded(false);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[ecine-fade_var(--dur-fast)_var(--ease-standard)] data-[state=closed]:animate-[ecine-fade-out_var(--dur-fast)_var(--ease-exit)]" />
        <Dialog.Content
          ref={panel}
          style={{ ['--sheet-collapsed' as string]: expandable ? '32dvh' : '0px' }}
          className={[
            'fixed z-50 flex flex-col bg-surface-1 text-text focus:outline-none',
            'inset-x-0 bottom-0 rounded-t-xl safe-bottom',
            expandable ? 'h-[92dvh]' : 'max-h-[92dvh]',
            expandable && !expanded ? 'translate-y-[var(--sheet-collapsed)]' : 'translate-y-0',
            'transition-transform duration-[var(--spring-smooth-dur)] ease-[var(--spring-smooth)]',
            'data-[state=open]:animate-[ecine-sheet-in_var(--spring-smooth-dur)_var(--spring-smooth)]',
            'data-[state=closed]:animate-[ecine-sheet-out_var(--dur-base)_var(--ease-exit)]',
            'md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85dvh] md:w-[min(560px,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:shadow-[var(--shadow-menu)]',
            'md:data-[state=open]:animate-[ecine-fade_var(--dur-fast)_var(--ease-standard)] md:data-[state=closed]:animate-[ecine-fade-out_var(--dur-fast)_var(--ease-exit)]',
          ].join(' ')}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="shrink-0 touch-none md:touch-auto"
          >
            <div
              aria-hidden="true"
              className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-border-strong md:hidden"
            />
            <div className="flex items-start justify-between gap-4 px-5 pt-3 md:px-6 md:pt-6">
              <div className="min-w-0">
                <Dialog.Title className="text-[17px] font-semibold leading-[22px]">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-[15px] leading-5 text-muted">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close
                className="press-icon -mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
                aria-label={t('close')}
              >
                <Icon name="close" />
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4 md:px-6">
            <SheetLeaveContext.Provider value={leave}>{children}</SheetLeaveContext.Provider>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
