import type { ArticleKind, CreditRole, FilmKind, PublishState, Role } from '@ecine/contracts';

/** Libellés français de l'administration (interface en français uniquement). */

export const STATE_LABELS: Record<PublishState, string> = {
  DRAFT: 'Brouillon',
  SCHEDULED: 'Planifié',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

export const FILM_KIND_LABELS: Record<FilmKind, string> = {
  FEATURE: 'Long-métrage',
  SHORT: 'Court-métrage',
  DOCUMENTARY: 'Documentaire',
  SERIES_EPISODE: 'Épisode',
};

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  NEWS: 'Actualité',
  ANNOUNCEMENT: 'Annonce',
  EVENT: 'Événement',
};

export const CREDIT_ROLE_LABELS: Record<CreditRole, string> = {
  ACTOR: 'Interprétation',
  DIRECTOR: 'Réalisation',
  PRODUCER: 'Production',
  WRITER: 'Scénario',
  CINEMATOGRAPHER: 'Image',
  EDITOR: 'Montage',
  COMPOSER: 'Musique',
  OTHER: 'Autre',
};

export const USER_ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
  EDITOR: 'Éditeur',
  MODERATOR: 'Modérateur',
  CREATOR: 'Créateur',
  MEMBER: 'Membre',
};

export const REPORT_TARGET_LABELS: Record<string, string> = {
  FILM: 'Film',
  POST: 'Publication',
  ARTICLE: 'Actualité',
  PERSON: 'Personne',
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  RIGHTS: 'Droits d’auteur',
  INAPPROPRIATE: 'Contenu inapproprié',
  SPAM: 'Indésirable (spam)',
  OTHER: 'Autre motif',
};

export const REPORT_STATE_LABELS = {
  OPEN: 'Ouverts',
  RESOLVED: 'Résolus',
  REJECTED: 'Rejetés',
} as const;

export const VIDEO_STATE_LABELS = {
  PENDING: 'En attente',
  PROCESSING: 'Transcodage',
  READY: 'Prête',
  FAILED: 'Échec',
} as const;

/** Verbes du journal d'audit (repli : le code technique). */
const AUDIT_VERBS: Record<string, string> = {
  create: 'création',
  update: 'modification',
  delete: 'suppression',
  restore: 'restauration',
  publish: 'publication',
  unpublish: 'dépublication',
  schedule: 'planification',
  archive: 'archivage',
  hide: 'masquage',
  login: 'connexion',
  logout: 'déconnexion',
  role: 'changement de rôle',
  disable: 'désactivation',
  enable: 'réactivation',
  resolve: 'résolution',
  reject: 'rejet',
  handle: 'traitement',
  image_upload: 'envoi d’image',
  image_alt: 'texte alternatif',
  upload_init: 'début d’envoi vidéo',
  upload_complete: 'fin d’envoi vidéo',
  retry: 'relance du transcodage',
};

const AUDIT_SUBJECTS: Record<string, string> = {
  film: 'Film',
  person: 'Personne',
  article: 'Actualité',
  post: 'Publication',
  page: 'Page',
  category: 'Catégorie',
  team: 'Équipe',
  redirect: 'Redirection',
  settings: 'Paramètres',
  user: 'Compte',
  auth: 'Session',
  report: 'Signalement',
  contact: 'Message',
  media: 'Média',
  video: 'Vidéo',
};

export function auditLabel(action: string): string {
  const [subject = '', verb = ''] = action.split('.');
  const s = AUDIT_SUBJECTS[subject];
  const v = AUDIT_VERBS[verb];
  return s && v ? `${s} · ${v}` : action;
}

/** Réseaux sociaux (même clés que socialsSchema du contrat). */
export const SOCIAL_FIELDS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['x', 'X (Twitter)'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
  ['linkedin', 'LinkedIn'],
  ['website', 'Site web'],
] as const;
