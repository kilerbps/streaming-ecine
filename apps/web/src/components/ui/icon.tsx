import type { SVGProps } from 'react';

/**
 * Icônes maison (trait 1,5 px, angles francs, grille 24) : pas d'emoji ni de bibliothèque lourde.
 * Toujours décoratives (`aria-hidden`) : le libellé est porté par le bouton ou le lien.
 */
const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5',
  film: 'M3 5h18v14H3zM7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21',
  news: 'M4 5h13v14H5a1 1 0 0 1-1-1zM17 9h3v9a1 1 0 0 1-2 0V9M7 9h7M7 12.5h7M7 16h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.8-4 4-6 8-6s7.2 2 8 6',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z',
  bookmark: 'M6 3.5h12V21l-6-4.5L6 21z',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  volume: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  volumeOff: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5',
  fullscreen: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  exitFullscreen: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  settings: 'M4 7h9M17 7h3M15 4.5v5M4 17h3M11 17h9M9 14.5v5',
  close: 'M5 5l14 14M19 5 5 19',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  back10: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M10 9.5v5M13 9.5h2.5v5H13z',
  forward10: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4M9 9.5v5M12 9.5h2.5v5H12z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  captions: 'M3 5h18v14H3zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3',
  surprise: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4',
  pin: 'M9 3h6l-1 6 4 4H6l4-4zM12 13v8',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  alert: 'M12 3 2.5 20h19zM12 9.5v5M12 17v.5',
  menu: 'M3 6h18M3 12h18M3 18h18',
  plus: 'M12 4v16M4 12h16',
  trash: 'M4 6.5h16M9 6.5V4h6v2.5M6 6.5 7 21h10l1-14.5',
  upload: 'M12 16V4M7 9l5-5 5 5M4 15v5h16v-5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  logout: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h11',
  mail: 'M3 5.5h18v13H3zM3 6l9 7 9-7',
  phone: 'M6.5 3.5 9.5 4l1.5 4.5-2 1.5a11 11 0 0 0 5 5l1.5-2 4.5 1.5.5 3-2.5 2.5C10 20 4 14 4 6z',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  calendar: 'M4 5.5h16V20H4zM4 10h16M8 3v4M16 3v4',
  location:
    'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  dataSaver: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  // Administration
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2 .7 3.2 2.5 3.5 5.2',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M17 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  tag: 'M3 3h8.5L21 12.5 12.5 21 3 11.5zM8 8h.5',
  document: 'M5 3h10l4 4v14H5zM15 3v4h4M8 11h8M8 14.5h8M8 18h5',
  redirect: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  chart: 'M4 20h16M7 20v-6M12 20V6M17 20v-9',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  arrowUp: 'M12 20V5M6 11l6-6 6 6',
  arrowDown: 'M12 4v15M6 13l6 6 6-6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM4 4l16 16',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  download: 'M12 4v12M7 11l5 5 5-5M4 15v5h16v-5',
} as const;

export type IconName = keyof typeof PATHS;

const FILLABLE: ReadonlySet<IconName> = new Set(['heart', 'bookmark', 'play', 'pause']);

export function Icon({
  name,
  size = 24,
  filled = false,
  ...rest
}: { name: IconName; size?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const fill = filled && FILLABLE.has(name) ? 'currentColor' : 'none';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
