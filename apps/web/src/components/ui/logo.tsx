/**
 * Logo E-Ciné redessiné en vectoriel à partir du fichier fourni (docs/logo-ecine.png).
 * Le badge rouge d'origine comporte un dégradé : il est ici en aplat (règle « aucun dégradé »).
 * À remplacer par le SVG officiel dès qu'il est fourni (Q1, docs/adr/0003-palette-logo.md).
 */
export function Logo({
  withBadge = true,
  className,
  title = 'E-Ciné',
}: {
  withBadge?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={withBadge ? '340 575 1255 780' : '340 575 1255 590'}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill="var(--brand-blue)">
        <path d="M347 661 793 622 805 757 493 785 496 819 352 831Z" />
        <path d="M817 620 1263 581 1278 748 1143 760 1140 728 963 744 966 776 831 788Z" />
        <path d="M352 850H800V985H487V1020H800V1155H352Z" />
        <path d="M824 850H959V1020H1137V986H1272V1155H824Z" />
        <path d="M1272 776 1559 610Q1585 597 1585 625V1106Q1585 1134 1559 1121L1272 955Z" />
      </g>
      {withBadge ? (
        <g>
          <path d="M824 1173H1272V1348H888L824 1296Z" fill="var(--brand-red)" />
          <text
            x="1048"
            y="1300"
            textAnchor="middle"
            fill="var(--brand-on-red)"
            fontFamily="var(--font-plex-sans), sans-serif"
            fontWeight="600"
            fontSize="118"
          >
            E-ciné
          </text>
        </g>
      ) : null}
    </svg>
  );
}
