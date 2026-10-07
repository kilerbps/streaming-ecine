/** Classes des boutons, partagées par Button (client) et LinkButton (serveur). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-text border border-accent hover:bg-text hover:border-text hover:text-bg',
  secondary: 'bg-transparent text-text border border-border-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-surface-2',
  danger: 'bg-transparent text-danger border border-danger hover:bg-danger hover:text-bg',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm gap-2',
  md: 'min-h-11 px-4 text-base gap-2',
  lg: 'min-h-12 px-6 text-base gap-3',
};

export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [
    'inline-flex items-center justify-center font-sans font-medium select-none',
    'transition-colors disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}
