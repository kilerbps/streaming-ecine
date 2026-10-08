/** Classes des boutons, partagées par Button (client) et LinkButton (serveur). Charte, Composants. */
export type ButtonVariant = 'primary' | 'secondary' | 'on-image' | 'ghost' | 'danger';
/** `lg` 52 px (affiche à la une, aperçu), `md` 44 px, `sm` 36 px (administration). */
export type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-pressed active:bg-accent-pressed',
  secondary: 'bg-surface-2 text-text hover:bg-surface-3',
  // Sur une image : blanc à 16 % + flou ; plein en mode allégé et en économie de données.
  'on-image':
    'bg-[var(--on-image)] text-[var(--on-image-text)] backdrop-blur-md [[data-perf=lite]_&]:backdrop-blur-none [[data-savedata=on]_&]:backdrop-blur-none',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  danger: 'bg-transparent text-danger border border-danger hover:bg-surface-2',
};

const SIZES: Record<ButtonSize, string> = {
  lg: 'min-h-[52px] px-6 text-base gap-2',
  md: 'min-h-11 px-5 text-base gap-2',
  sm: 'min-h-9 px-4 text-sm gap-2',
};

export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [
    'press inline-flex items-center justify-center rounded-md font-semibold select-none',
    'disabled:opacity-40 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}
