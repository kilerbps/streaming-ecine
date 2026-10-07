import { headers } from 'next/headers';

/**
 * Données structurées schema.org. Le JSON est sérialisé avec échappement de « < » (aucune injection
 * possible depuis le contenu éditorial) et porte le nonce CSP de la requête.
 */
export async function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />
  );
}
