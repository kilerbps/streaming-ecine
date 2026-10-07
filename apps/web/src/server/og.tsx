import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Images de partage 1200×630 (docs/07 §A7) : aplats, titre, type de contenu, marque. */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';

// Le moteur de rendu des images ne lit pas les variables CSS : valeurs reprises des tokens (thème sombre).
const COLORS = {
  bg: '#121110',
  surface: '#1b1917',
  text: '#f2ede6',
  muted: '#b3aa9f',
  highlight: '#ff5a5f',
  border: '#3a3531',
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
      <div style={{ width: 16, height: '100%', background: COLORS.highlight }} />
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
            color: COLORS.highlight,
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
