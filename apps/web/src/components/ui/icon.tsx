import type { ReactElement, SVGProps } from 'react';
import { ACTIVE_STYLE, SOLAR_ICONS, type IconName, type SolarStyle } from './icons/solar.generated';

export type { IconName };

/**
 * Icônes Solar (480 Design, CC BY 4.0), générées sans appel réseau par `pnpm icons:build` à partir de
 * packages/design-tokens/icons.json. Style Linear au repos ; `filled` = style actif de l'icône (Bold
 * Duotone pour la navigation et Ma liste, Bold pour J'aime et le lecteur). Toujours décoratives
 * (`aria-hidden`) : le libellé est porté par le bouton ou le lien.
 */
export function Icon({
  name,
  size = 24,
  filled = false,
  variant,
  ...rest
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  /** Style imposé (sinon : Linear, ou le style actif si `filled`). */
  variant?: SolarStyle;
} & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const styles: Partial<Record<SolarStyle, ReactElement>> = SOLAR_ICONS[name];
  const wanted = variant ?? (filled ? ACTIVE_STYLE[name] : 'linear');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {styles[wanted] ?? styles.linear}
    </svg>
  );
}
