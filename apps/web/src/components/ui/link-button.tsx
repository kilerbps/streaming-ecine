import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonClasses, type ButtonVariant } from './button-styles';
import { Icon, type IconName } from './icon';

/** Lien présenté comme un bouton (navigation). `primary` = le CTA unique de l'écran. */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
}) {
  return (
    <Link
      data-cta={variant === 'primary' ? 'primary' : undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </Link>
  );
}
