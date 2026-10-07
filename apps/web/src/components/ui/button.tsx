'use client';

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles';
import { Icon, type IconName } from './icon';

export type { ButtonVariant } from './button-styles';

/**
 * Un seul bouton principal par vue (docs/05 §5) : en développement, un avertissement est émis
 * si plusieurs boutons `primary` sont visibles en même temps.
 */
function useSingleCtaWarning(enabled: boolean) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV === 'production') return;
    const timer = window.setTimeout(() => {
      const visible = [...document.querySelectorAll<HTMLElement>('[data-cta="primary"]')].filter(
        (el) => el.offsetParent !== null,
      );
      if (visible.length > 1) {
        // eslint-disable-next-line no-console -- avertissement de développement uniquement (règle « un seul CTA »)
        console.warn(
          `[E-Ciné] ${visible.length} boutons principaux visibles dans la même vue : un seul CTA attendu.`,
          visible,
        );
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return ref;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconFilled?: boolean;
  pending?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconFilled,
    pending,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  forwarded,
) {
  const localRef = useSingleCtaWarning(variant === 'primary');
  return (
    <button
      ref={(node) => {
        localRef.current = node;
        if (typeof forwarded === 'function') forwarded(node);
        else if (forwarded) forwarded.current = node;
      }}
      type={type}
      data-cta={variant === 'primary' ? 'primary' : undefined}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {icon ? <Icon name={icon} filled={iconFilled} size={20} /> : null}
      {children}
    </button>
  );
});
