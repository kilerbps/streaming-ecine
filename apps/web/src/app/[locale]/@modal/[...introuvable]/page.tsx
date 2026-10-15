/**
 * Toute autre adresse vide l'emplacement : sans cela, une navigation par lien depuis l'aperçu
 * laisserait la feuille ouverte (comportement des routes parallèles).
 */
export default function ModalClosed() {
  return null;
}
