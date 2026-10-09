import { LinkButton } from '@/components/ui/link-button';
import { Illustration } from '@/components/ui/illustration';

/** Élément introuvable dans l'administration (identifiant inconnu, contenu effacé). */
export default function AdminNotFound() {
  return (
    <div className="grid gap-8 py-8 md:grid-cols-[160px_1fr] md:items-start md:py-12">
      <Illustration variant="missing" className="h-auto w-32 md:w-40" />
      <div className="max-w-2xl">
        <h1 className="font-display text-[28px] font-extrabold leading-8">Élément introuvable</h1>
        <p className="mt-4 text-muted">
          Ce contenu n’existe pas ou plus. Vérifiez le lien, ou retrouvez-le depuis la liste
          correspondante.
        </p>
        <LinkButton href="/admin" variant="primary" className="mt-8">
          Retour au tableau de bord
        </LinkButton>
      </div>
    </div>
  );
}
