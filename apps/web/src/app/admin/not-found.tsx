import { LinkButton } from '@/components/ui/link-button';
import { Motif } from '@/components/ui/motif';

/** Élément introuvable dans l'administration (identifiant inconnu, contenu effacé). */
export default function AdminNotFound() {
  return (
    <div className="grid gap-8 py-8 md:grid-cols-[160px_1fr] md:items-start md:py-12">
      <div className="h-24 w-full max-w-40 md:h-40">
        <Motif name="losanges" tone="border" />
      </div>
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl md:text-4xl">Élément introuvable</h1>
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
