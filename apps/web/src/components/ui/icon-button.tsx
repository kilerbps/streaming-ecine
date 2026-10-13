import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icon';

type Tone = 'plain' | 'surface' | 'on-image';

/** Fond et couleur séparés : une seule classe de couleur de texte à la fois (actif ou repos). */
const TONES: Record<Tone, { surface: string; ink: string }> = {
  plain: { surface: 'bg-transparent hover:bg-surface-2', ink: 'text-text' },
  surface: { surface: 'bg-surface-2 hover:bg-surface-3', ink: 'text-text' },
  'on-image': {
    surface:
      'bg-[var(--on-image)] backdrop-blur-md [[data-perf=lite]_&]:backdrop-blur-none [[data-savedata=on]_&]:backdrop-blur-none',
    ink: 'text-[var(--on-image-text)]',
  },
};

/**
 * Bouton icône rond de 44 px (icône de 24). Toujours un libellé : visible dessous dans les rangées
 * d'actions (`showLabel`), sinon porté par `aria-label`. Actif = `pressed` (`aria-pressed`, icône pleine).
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
    icon: IconName;
    label: string;
    showLabel?: boolean;
    pressed?: boolean;
    tone?: Tone;
    /** Couleur de l'icône active (J'aime = signal, Ma liste = accent). */
    activeClassName?: string;
  }
>(function IconButton(
  {
    icon,
    label,
    showLabel = false,
    pressed,
    tone = 'plain',
    activeClassName = 'text-accent-text',
    className = '',
    type = 'button',
    ...rest
  },
  ref,
) {
  const circle = `press-icon grid size-11 shrink-0 place-items-center rounded-full ${TONES[tone].surface} ${
    pressed ? activeClassName : TONES[tone].ink
  }`;
  if (!showLabel) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={pressed}
        className={`${circle} ${className}`}
        {...rest}
      >
        <Icon name={icon} filled={pressed} />
      </button>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={`group inline-flex min-w-16 flex-col items-center gap-1 text-[13px] leading-[18px] text-muted ${className}`}
      {...rest}
    >
      <span className={circle}>
        <Icon name={icon} filled={pressed} />
      </span>
      <span>{label}</span>
    </button>
  );
});

/** Lien en forme de bouton d'action (rond de 44, libellé visible dessous), ex. bande-annonce externe. */
export function ActionLink({
  icon,
  label,
  className = '',
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { icon: IconName; label: string }) {
  return (
    <a
      className={`group inline-flex min-w-16 flex-col items-center gap-1 text-[13px] leading-[18px] text-muted ${className}`}
      {...rest}
    >
      <span
        className={`press-icon grid size-11 shrink-0 place-items-center rounded-full ${TONES.surface.surface} ${TONES.surface.ink}`}
      >
        <Icon name={icon} />
      </span>
      <span>{label}</span>
      {children}
    </a>
  );
}
