import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Images de partage 1200×630 (docs/07 §A7) : aplats, titre, type de contenu, marque. */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';

// Le moteur de rendu des images ne lit pas les variables CSS : valeurs reprises des jetons du thème
// Nuit (packages/design-tokens/tokens.css), la zone d'image restant toujours en Nuit.
const COLORS = {
  bg: '#0a0f16',
  surface: '#111823',
  text: '#f4f6fa',
  muted: '#a7b1c2',
  accent: '#1e76bc',
  accentText: '#6ab0f3',
  onAccent: '#ffffff',
};

let iconDataUri: string | null = null;
async function icon(): Promise<string> {
  iconDataUri ??= `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), 'src/app/icon.svg'))).toString('base64')}`;
  return iconDataUri;
}

export async function ogCard({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}): Promise<ImageResponse> {
  const mark = await icon();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: COLORS.bg,
        color: COLORS.text,
      }}
    >
      <div style={{ width: 16, height: '100%', background: COLORS.accent }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: COLORS.accentText,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 40 ? 64 : 84,
              lineHeight: 1.05,
              fontWeight: 700,
            }}
          >
            {title}
          </div>
          {meta ? (
            <div style={{ display: 'flex', fontSize: 30, color: COLORS.muted }}>{meta}</div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontSize: 30,
            color: COLORS.muted,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendu d'image Open Graph, pas une page */}
          <img src={mark} width={72} height={72} alt="" />
          E-Ciné · le cinéma congolais, en streaming
        </div>
      </div>
    </div>,
    ogSize,
  );
}

/**
 * Image de partage d'une fiche film (dette n° 13) : l'affiche à gauche (JPEG 2:3 préparé par l'API),
 * le type, le titre, l'accroche et les informations à droite, la marque en haut.
 */
export async function ogFilmCard({
  poster,
  eyebrow,
  title,
  tagline,
  meta,
  cta,
}: {
  /** Affiche en data URL JPEG, ou `null` pour la carte sans affiche. */
  poster: string | null;
  eyebrow: string;
  title: string;
  tagline?: string | null;
  meta?: string;
  cta: string;
}): Promise<ImageResponse> {
  if (!poster) return ogCard({ eyebrow, title, meta });
  const mark = await icon();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: COLORS.bg,
        color: COLORS.text,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu d'image Open Graph, pas une page */}
      <img src={poster} width={420} height={630} alt="" />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendu d'image Open Graph, pas une page */}
          <img src={mark} width={56} height={56} alt="" />
          E-Ciné
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 26, color: COLORS.accentText }}>{eyebrow}</div>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 30 ? 58 : 74,
              lineHeight: 1.05,
              fontWeight: 800,
            }}
          >
            {title}
          </div>
          {tagline ? (
            <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, color: COLORS.text }}>
              {tagline}
            </div>
          ) : null}
          {meta ? (
            <div style={{ display: 'flex', fontSize: 28, color: COLORS.muted }}>{meta}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              padding: '14px 28px',
              borderRadius: 12,
              background: COLORS.accent,
              color: COLORS.onAccent,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    </div>,
    ogSize,
  );
}
