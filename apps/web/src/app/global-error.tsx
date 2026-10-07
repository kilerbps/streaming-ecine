'use client';

import '@/app/globals.css';
import { buttonClasses } from '@/components/ui/button-styles';
import messages from '@/messages/fr.json';

/**
 * Erreur dans un layout racine (FR-132). Ce composant remplace tout le document : ni fournisseur de
 * traductions, ni thème choisi, ni polices. Les textes viennent donc directement du fichier de
 * messages et les couleurs suivent le thème du système (tokens de `globals.css`).
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body className="bg-bg text-text">
        <title>{messages.errors.serverTitle}</title>
        <main className="container-page py-12 md:py-24">
          <div role="alert">
            <h1 className="font-serif text-4xl md:text-5xl">{messages.errors.serverTitle}</h1>
            <p className="mt-4 max-w-lg text-lg text-muted">{messages.errors.serverBody}</p>
            <button
              type="button"
              className={buttonClasses('primary', 'lg', 'mt-8')}
              onClick={() => retry()}
            >
              {messages.common.retry}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
