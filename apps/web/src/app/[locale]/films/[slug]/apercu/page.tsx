import type { Metadata } from 'next';
import FilmPage, { generateMetadata as filmMetadata } from '../page';

/**
 * Visite directe de l'aperçu (lien partagé, rechargement) : la fiche complète, dont l'adresse
 * canonique reste celle de la fiche.
 */
export default function FilmPreviewPage(props: PageProps<'/[locale]/films/[slug]/apercu'>) {
  return <FilmPage params={props.params} searchParams={props.searchParams} />;
}

export function generateMetadata(
  props: PageProps<'/[locale]/films/[slug]/apercu'>,
): Promise<Metadata> {
  return filmMetadata({ params: props.params, searchParams: props.searchParams });
}
