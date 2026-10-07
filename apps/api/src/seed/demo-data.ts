import type { ArticleKind, CreditRole, FilmKind } from '../generated/prisma/enums.js';
import { type Motif, type Palette, PALETTES } from './artwork.js';

/**
 * Données de DÉMONSTRATION entièrement fictives (personnes, films, actualités) : aucun lien avec
 * des personnes ou œuvres réelles. Les textes juridiques ne sont PAS rédigés : structure + `[À COMPLÉTER]`.
 */

export const DEMO_RIGHTS_NOTE = 'Données de démonstration — aucune diffusion réelle';
export const PLACEHOLDER = '[À COMPLÉTER]';
export const LEGAL_PLACEHOLDER = '[À COMPLÉTER — validation juridique]';
const FICTION = 'Profil fictif (données de démonstration).';

export interface DemoCategory {
  slug: string;
  name: string;
}

export const DEMO_CATEGORIES: DemoCategory[] = [
  { slug: 'drame', name: 'Drame' },
  { slug: 'comedie', name: 'Comédie' },
  { slug: 'documentaire', name: 'Documentaire' },
  { slug: 'animation', name: 'Animation' },
  { slug: 'thriller', name: 'Thriller' },
  { slug: 'musique', name: 'Musique' },
];

export interface DemoPerson {
  slug: string;
  name: string;
  initials: string;
  bio: string;
  birthYear?: number;
  palette: Palette;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    slug: 'grace-mbuyi',
    name: 'Grâce Mbuyi',
    initials: 'GM',
    birthYear: 1996,
    palette: PALETTES.brique,
    bio: `Réalisatrice attachée aux récits de famille et aux paysages du fleuve, elle filme au plus près des visages. ${FICTION}`,
  },
  {
    slug: 'bienvenu-lukusa',
    name: 'Bienvenu Lukusa',
    initials: 'BL',
    birthYear: 1994,
    palette: PALETTES.nuit,
    bio: `Réalisateur de courts-métrages nerveux, il aime les histoires qui se déroulent en une seule nuit. ${FICTION}`,
  },
  {
    slug: 'divine-nsimba',
    name: 'Divine Nsimba',
    initials: 'DN',
    birthYear: 1999,
    palette: PALETTES.ocre,
    bio: `Comédienne venue du théâtre, elle passe avec aisance de la comédie au drame. ${FICTION}`,
  },
  {
    slug: 'heritier-kabeya',
    name: 'Héritier Kabeya',
    initials: 'HK',
    birthYear: 1991,
    palette: PALETTES.foret,
    bio: `Acteur au jeu tout en retenue, souvent choisi pour des rôles de pères et de mentors. ${FICTION}`,
  },
  {
    slug: 'patience-ilunga',
    name: 'Patience Ilunga',
    initials: 'PI',
    palette: PALETTES.fleuve,
    bio: `Productrice, elle accompagne les jeunes équipes de la préparation jusqu’à la première projection. ${FICTION}`,
  },
  {
    slug: 'junior-mavungu',
    name: 'Junior Mavungu',
    initials: 'JM',
    birthYear: 2000,
    palette: PALETTES.ardoise,
    bio: `Jeune acteur révélé par les courts-métrages, à l’aise dans les rôles physiques comme dans la comédie. ${FICTION}`,
  },
  {
    slug: 'esther-bolamba',
    name: 'Esther Bolamba',
    initials: 'EB',
    birthYear: 1988,
    palette: PALETTES.ivoire,
    bio: `Actrice et chanteuse, elle apporte sa voix et son humour aux personnages hauts en couleur. ${FICTION}`,
  },
  {
    slug: 'christian-ngoyi',
    name: 'Christian Ngoyi',
    initials: 'CN',
    birthYear: 1993,
    palette: PALETTES.nuit,
    bio: `Directeur de la photographie, il travaille surtout en lumière naturelle et caméra à l’épaule. ${FICTION}`,
  },
  {
    slug: 'merveille-kanku',
    name: 'Merveille Kanku',
    initials: 'MK',
    birthYear: 1997,
    palette: PALETTES.foret,
    bio: `Compositrice et réalisatrice d’animation, elle mêle guitare, percussions et sons de la ville. ${FICTION}`,
  },
  {
    slug: 'daniel-tshimanga',
    name: 'Daniel Tshimanga',
    initials: 'DT',
    birthYear: 1990,
    palette: PALETTES.brique,
    bio: `Documentariste, il observe les métiers et les savoir-faire transmis de génération en génération. ${FICTION}`,
  },
];

export interface DemoCredit {
  person: string;
  role: CreditRole;
  character?: string;
}

export interface DemoFilm {
  slug: string;
  kind: FilmKind;
  title: string;
  synopsis: string;
  year: number;
  runtimeSec: number;
  ageRating?: string;
  categories: string[];
  credits: DemoCredit[];
  /** Publication échelonnée sur les 60 derniers jours. */
  daysAgo: number;
  palette: Palette;
  motif: Motif;
}

export const DEMO_FILMS: DemoFilm[] = [
  {
    slug: 'le-fleuve-en-silence',
    kind: 'FEATURE',
    title: 'Le Fleuve en silence',
    synopsis:
      'Néné revient dans son village au bord du fleuve après dix ans d’absence pour enterrer son grand-père. Entre les silences de sa mère et les rumeurs du voisinage, elle découvre que la pirogue familiale cache une promesse jamais tenue. Un drame intime sur l’héritage et le pardon.',
    year: 2025,
    runtimeSec: 97 * 60,
    ageRating: '10+',
    categories: ['drame'],
    credits: [
      { person: 'grace-mbuyi', role: 'DIRECTOR' },
      { person: 'divine-nsimba', role: 'ACTOR', character: 'Néné' },
      { person: 'heritier-kabeya', role: 'ACTOR', character: 'Tonton Bosco' },
      { person: 'christian-ngoyi', role: 'CINEMATOGRAPHER' },
      { person: 'patience-ilunga', role: 'PRODUCER' },
    ],
    daysAgo: 58,
    palette: PALETTES.fleuve,
    motif: 'fleuve',
  },
  {
    slug: 'matonge-minuit',
    kind: 'SHORT',
    title: 'Matonge, minuit',
    synopsis:
      'Fiston, livreur à moto, accepte une dernière course avant la fermeture des bars. Le colis qu’il transporte n’est pas celui qu’on lui a annoncé. En dix-huit minutes, une nuit ordinaire bascule.',
    year: 2026,
    runtimeSec: 18 * 60,
    ageRating: '12+',
    categories: ['thriller'],
    credits: [
      { person: 'bienvenu-lukusa', role: 'DIRECTOR' },
      { person: 'junior-mavungu', role: 'ACTOR', character: 'Fiston' },
      { person: 'esther-bolamba', role: 'ACTOR', character: 'Sandra' },
      { person: 'christian-ngoyi', role: 'CINEMATOGRAPHER' },
    ],
    daysAgo: 52,
    palette: PALETTES.nuit,
    motif: 'points',
  },
  {
    slug: 'les-mains-du-tisserand',
    kind: 'DOCUMENTARY',
    title: 'Les Mains du tisserand',
    synopsis:
      'Dans un atelier de quartier, un maître tisserand forme deux apprentis au tissage du raphia. Le film suit leurs gestes pendant une saison, du choix des fibres à la vente au marché. Un portrait patient d’un savoir-faire qui se transmet sans livre.',
    year: 2024,
    runtimeSec: 52 * 60,
    categories: ['documentaire'],
    credits: [
      { person: 'daniel-tshimanga', role: 'DIRECTOR' },
      { person: 'christian-ngoyi', role: 'CINEMATOGRAPHER' },
      { person: 'merveille-kanku', role: 'COMPOSER' },
    ],
    daysAgo: 47,
    palette: PALETTES.ocre,
    motif: 'points',
  },
  {
    slug: 'la-rumba-de-mama-kiese',
    kind: 'FEATURE',
    title: 'La Rumba de Mama Kiese',
    synopsis:
      'Mama Kiese, vendeuse de beignets, a toujours rêvé de chanter avec un orchestre. Quand un groupe de jeunes musiciens perd sa chanteuse à la veille d’un concours, elle saisit sa chance malgré les moqueries de son quartier. Une comédie musicale pleine d’énergie et de tendresse.',
    year: 2025,
    runtimeSec: 90 * 60,
    categories: ['comedie', 'musique'],
    credits: [
      { person: 'grace-mbuyi', role: 'DIRECTOR' },
      { person: 'esther-bolamba', role: 'ACTOR', character: 'Mama Kiese' },
      { person: 'junior-mavungu', role: 'ACTOR', character: 'Toto' },
      { person: 'merveille-kanku', role: 'COMPOSER' },
      { person: 'patience-ilunga', role: 'PRODUCER' },
    ],
    daysAgo: 41,
    palette: PALETTES.brique,
    motif: 'arcs',
  },
  {
    slug: 'bus-12-pour-kintambo',
    kind: 'SHORT',
    title: 'Bus 12 pour Kintambo',
    synopsis:
      'Un receveur de bus bavard et une passagère pressée se disputent la monnaie d’un billet tout au long du trajet. Les embouteillages transforment le différend en véritable feuilleton pour tous les passagers. Une comédie de quatorze minutes sur la vie quotidienne.',
    year: 2024,
    runtimeSec: 14 * 60,
    categories: ['comedie'],
    credits: [
      { person: 'bienvenu-lukusa', role: 'DIRECTOR' },
      { person: 'heritier-kabeya', role: 'ACTOR', character: 'Le receveur' },
      { person: 'divine-nsimba', role: 'ACTOR', character: 'La passagère' },
    ],
    daysAgo: 36,
    palette: PALETTES.ocre,
    motif: 'toits',
  },
  {
    slug: 'les-couleurs-du-marche',
    kind: 'DOCUMENTARY',
    title: 'Les Couleurs du marché',
    synopsis:
      'De l’aube à la tombée de la nuit, le film parcourt les allées d’un grand marché et écoute ceux qui le font vivre. Commerçantes, porteurs et musiciens de rue racontent leurs journées et leurs espoirs. Un documentaire sensoriel rythmé par les sons du lieu.',
    year: 2025,
    runtimeSec: 45 * 60,
    categories: ['documentaire', 'musique'],
    credits: [
      { person: 'daniel-tshimanga', role: 'DIRECTOR' },
      { person: 'merveille-kanku', role: 'COMPOSER' },
      { person: 'patience-ilunga', role: 'PRODUCER' },
    ],
    daysAgo: 30,
    palette: PALETTES.foret,
    motif: 'points',
  },
  {
    slug: 'kimia-et-le-baobab',
    kind: 'SHORT',
    title: 'Kimia et le baobab',
    synopsis:
      'Kimia, une petite fille curieuse, découvre que le vieux baobab de sa cour peut parler. L’arbre lui confie les histoires de tous les enfants qui ont joué sous ses branches. Un court-métrage d’animation pour toute la famille.',
    year: 2026,
    runtimeSec: 12 * 60,
    categories: ['animation'],
    credits: [
      { person: 'merveille-kanku', role: 'DIRECTOR' },
      { person: 'divine-nsimba', role: 'ACTOR', character: 'Kimia (voix)' },
      { person: 'heritier-kabeya', role: 'ACTOR', character: 'Le baobab (voix)' },
      { person: 'merveille-kanku', role: 'COMPOSER' },
    ],
    daysAgo: 24,
    palette: PALETTES.foret,
    motif: 'soleil',
  },
  {
    slug: 'la-derniere-bobine',
    kind: 'FEATURE',
    title: 'La Dernière Bobine',
    synopsis:
      'Papa Lutete, projectionniste à la retraite, garde dans son salon la dernière copie d’un film que tout le monde croit perdu. Lorsque sa petite-fille veut l’organiser en projection publique, il doit affronter les souvenirs liés à ce tournage. Un drame sur la mémoire du cinéma et la transmission.',
    year: 2024,
    runtimeSec: 101 * 60,
    ageRating: '10+',
    categories: ['drame'],
    credits: [
      { person: 'daniel-tshimanga', role: 'DIRECTOR' },
      { person: 'heritier-kabeya', role: 'ACTOR', character: 'Papa Lutete' },
      { person: 'esther-bolamba', role: 'ACTOR', character: 'Mireille' },
      { person: 'christian-ngoyi', role: 'CINEMATOGRAPHER' },
      { person: 'patience-ilunga', role: 'PRODUCER' },
    ],
    daysAgo: 17,
    palette: PALETTES.ardoise,
    motif: 'bobine',
  },
  {
    slug: 'ombres-sur-le-boulevard',
    kind: 'FEATURE',
    title: 'Ombres sur le boulevard',
    synopsis:
      'L’inspecteur Kalala enquête sur une série de vols dans les bureaux d’un grand boulevard. Chaque piste le ramène vers une ancienne camarade d’école devenue témoin clé. Un thriller urbain où personne ne dit toute la vérité.',
    year: 2026,
    runtimeSec: 94 * 60,
    ageRating: '12+',
    categories: ['thriller', 'drame'],
    credits: [
      { person: 'bienvenu-lukusa', role: 'DIRECTOR' },
      { person: 'junior-mavungu', role: 'ACTOR', character: 'Inspecteur Kalala' },
      { person: 'divine-nsimba', role: 'ACTOR', character: 'Ruth' },
      { person: 'christian-ngoyi', role: 'CINEMATOGRAPHER' },
    ],
    daysAgo: 10,
    palette: PALETTES.nuit,
    motif: 'toits',
  },
  {
    slug: 'le-chant-des-pirogues',
    kind: 'DOCUMENTARY',
    title: 'Le Chant des pirogues',
    synopsis:
      'Sur le fleuve, les piroguiers chantent pour garder le rythme et se donner du courage. Le film accompagne un équipage pendant un long trajet et recueille ces chants rarement enregistrés. Un documentaire musical au fil de l’eau.',
    year: 2023,
    runtimeSec: 58 * 60,
    categories: ['documentaire', 'musique'],
    credits: [
      { person: 'grace-mbuyi', role: 'DIRECTOR' },
      { person: 'merveille-kanku', role: 'COMPOSER' },
    ],
    daysAgo: 4,
    palette: PALETTES.fleuve,
    motif: 'arcs',
  },
];

export interface DemoArticle {
  slug: string;
  kind: ArticleKind;
  title: string;
  excerpt: string;
  body: string;
  label: string;
  daysAgo: number;
  palette: Palette;
  motif: Motif;
  /** Événement : date dans N jours à partir d'aujourd'hui. */
  eventInDays?: number;
  eventPlace?: string;
  featuredFilm?: string;
}

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    slug: 'dix-films-pour-decouvrir-e-cine',
    kind: 'NEWS',
    title: 'Dix films pour découvrir E-Ciné',
    excerpt:
      'Drames, comédies, documentaires et animation : un premier catalogue pour explorer la plateforme. Contenu de démonstration.',
    label: 'Actualité',
    daysAgo: 55,
    palette: PALETTES.brique,
    motif: 'bobine',
    body: [
      'E-Ciné rassemble des films, des courts-métrages et des publications autour du cinéma congolais.',
      '',
      '## Ce que vous trouverez',
      '',
      '- des **longs-métrages** de fiction ;',
      '- des **courts-métrages** à regarder en quelques minutes ;',
      '- des **documentaires** sur les métiers, la musique et la ville.',
      '',
      '## Une note importante',
      '',
      'Les films, personnes et textes présentés ici sont **fictifs** : ils servent uniquement à tester la plateforme avant l’arrivée du vrai catalogue.',
    ].join('\n'),
  },
  {
    slug: 'coulisses-tourner-la-nuit',
    kind: 'NEWS',
    title: 'Coulisses : tourner la nuit en ville',
    excerpt:
      'Lumière, son et sécurité : comment une petite équipe prépare un tournage de nuit. Contenu de démonstration.',
    label: 'Coulisses',
    daysAgo: 33,
    palette: PALETTES.nuit,
    motif: 'points',
    featuredFilm: 'matonge-minuit',
    body: [
      'Tourner la nuit demande une préparation particulière. L’équipe fictive de *Matonge, minuit* raconte ses choix.',
      '',
      '## La lumière',
      '',
      'Les enseignes et les phares des motos servent de sources principales ; quelques panneaux légers complètent l’éclairage.',
      '',
      '## Le son',
      '',
      'Les ambiances sont enregistrées séparément, après le tournage, pour garder des dialogues lisibles.',
      '',
      '## La sécurité',
      '',
      'Chaque prise est préparée avec les habitants du quartier et un responsable de plateau dédié.',
    ].join('\n'),
  },
  {
    slug: 'exemple-appel-a-courts-metrages',
    kind: 'ANNOUNCEMENT',
    title: 'Exemple d’annonce : appel à courts-métrages',
    excerpt:
      'Modèle d’annonce pour un futur appel à films étudiants. Aucune candidature n’est ouverte. Contenu de démonstration.',
    label: 'Annonce',
    daysAgo: 20,
    palette: PALETTES.ocre,
    motif: 'toits',
    body: [
      'Cette annonce est un **exemple** destiné à tester la mise en page. Aucun appel n’est ouvert.',
      '',
      '## Qui peut participer',
      '',
      PLACEHOLDER,
      '',
      '## Comment envoyer son film',
      '',
      PLACEHOLDER,
      '',
      '## Calendrier',
      '',
      PLACEHOLDER,
    ].join('\n'),
  },
  {
    slug: 'projection-plein-air-mama-kiese',
    kind: 'EVENT',
    title: 'Projection en plein air : La Rumba de Mama Kiese',
    excerpt:
      'Une soirée de projection fictive pour tester l’affichage des événements. Contenu de démonstration.',
    label: 'Événement',
    daysAgo: 6,
    palette: PALETTES.foret,
    motif: 'arcs',
    eventInDays: 14,
    eventPlace: 'Lieu fictif — données de démonstration',
    featuredFilm: 'la-rumba-de-mama-kiese',
    body: [
      'Exemple d’événement : une projection en plein air suivie d’un échange avec l’équipe du film.',
      '',
      '## Programme',
      '',
      '1. Accueil et installation ;',
      '2. Projection de *La Rumba de Mama Kiese* ;',
      '3. Échange avec l’équipe.',
      '',
      'Cet événement est **fictif** et n’aura pas lieu.',
    ].join('\n'),
  },
];

export interface DemoPostImage {
  caption: string;
  alt: string;
  palette: Palette;
  motif: Motif;
}

export interface DemoPost {
  key: string;
  caption: string;
  daysAgo: number;
  images: DemoPostImage[];
}

export const DEMO_POSTS: DemoPost[] = [
  {
    key: 'reperages-fleuve',
    caption:
      'Repérages au bord du fleuve pour « Le Fleuve en silence » : trouver la bonne lumière du matin. (Publication de démonstration)',
    daysAgo: 59,
    images: [
      {
        caption: 'Repérages',
        alt: 'Illustration bleu nuit : bandes horizontales orange et ivoire évoquant un fleuve, mot « Repérages ».',
        palette: PALETTES.fleuve,
        motif: 'fleuve',
      },
      {
        caption: 'Lumière du matin',
        alt: 'Illustration ocre : grand disque orange entouré d’anneaux, comme un soleil levant, texte « Lumière du matin ».',
        palette: PALETTES.ocre,
        motif: 'soleil',
      },
    ],
  },
  {
    key: 'atelier-son',
    caption:
      'Atelier de prise de son : trois micros, une rue animée et beaucoup d’écoute. (Publication de démonstration)',
    daysAgo: 38,
    images: [
      {
        caption: 'Atelier son',
        alt: 'Illustration anthracite : grille de points verts et ivoire, texte « Atelier son ».',
        palette: PALETTES.ardoise,
        motif: 'points',
      },
    ],
  },
  {
    key: 'affiches-maison',
    caption:
      'Nos affiches sont dessinées avec des aplats de couleur et des formes simples. Laquelle préférez-vous ? (Publication de démonstration)',
    daysAgo: 21,
    images: [
      {
        caption: 'Affiche A',
        alt: 'Illustration orange brique : demi-cercles superposés ivoire et noirs, texte « Affiche A ».',
        palette: PALETTES.brique,
        motif: 'arcs',
      },
      {
        caption: 'Affiche B',
        alt: 'Illustration vert forêt : rangée de toits triangulaires ocre, texte « Affiche B ».',
        palette: PALETTES.foret,
        motif: 'toits',
      },
      {
        caption: 'Affiche C',
        alt: 'Illustration ivoire : bobine de film rouge brique stylisée, texte « Affiche C ».',
        palette: PALETTES.ivoire,
        motif: 'bobine',
      },
    ],
  },
  {
    key: 'derniere-bobine-montage',
    caption:
      'Dernière semaine de montage pour « La Dernière Bobine ». (Publication de démonstration)',
    daysAgo: 8,
    images: [
      {
        caption: 'Montage',
        alt: 'Illustration noire : bobine de film orange stylisée, texte « Montage ».',
        palette: PALETTES.nuit,
        motif: 'bobine',
      },
      {
        caption: 'Bientôt',
        alt: 'Illustration bleu nuit : demi-cercles orange et ivoire, texte « Bientôt ».',
        palette: PALETTES.fleuve,
        motif: 'arcs',
      },
    ],
  },
];

export interface DemoPage {
  slug: string;
  title: string;
  /** Avertissement en tête de page. */
  notice: string;
  sections: Array<{ heading: string; body?: string }>;
}

const legalNotice = `> Document en préparation : chaque section doit être rédigée puis validée par un juriste. ${LEGAL_PLACEHOLDER}`;

/** Plans de docs/07-CHECKLIST-SEO-LEGAL-QUALITE.md §C1–C4 : titres seulement, aucun texte juridique inventé. */
export const DEMO_PAGES: DemoPage[] = [
  {
    slug: 'a-propos',
    title: 'À propos d’E-Ciné',
    notice: '> Page à rédiger par l’équipe E-Ciné.',
    sections: [
      { heading: 'Bienvenue', body: PLACEHOLDER },
      { heading: 'Notre vision', body: PLACEHOLDER },
      { heading: 'Notre histoire', body: PLACEHOLDER },
      {
        heading: 'L’équipe',
        body: 'Les membres de l’équipe sont présentés depuis l’administration (rubrique Équipe).',
      },
    ],
  },
  {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    notice: legalNotice,
    sections: [
      { heading: 'Responsable du traitement' },
      { heading: 'Délégué à la protection des données' },
      { heading: 'Données collectées et finalités' },
      { heading: 'Bases légales' },
      { heading: 'Destinataires et sous-traitants' },
      { heading: 'Transferts hors de la RDC et garanties' },
      { heading: 'Durées de conservation' },
      { heading: 'Vos droits' },
      { heading: 'Comment exercer vos droits' },
      { heading: 'Sécurité' },
      { heading: 'Mineurs' },
      { heading: 'Cookies' },
      { heading: 'Modification de la politique' },
      { heading: 'Date de version' },
    ],
  },
  {
    slug: 'conditions-generales',
    title: 'Conditions générales d’utilisation',
    notice: legalNotice,
    sections: [
      { heading: 'Objet' },
      { heading: 'Accès au service et comptes' },
      { heading: 'Règles de conduite' },
      { heading: 'Propriété intellectuelle et usage des films' },
      { heading: 'Contenus des créateurs et licence accordée' },
      { heading: 'Signalement et procédure de retrait' },
      { heading: 'Responsabilité' },
      { heading: 'Suspension de compte' },
      { heading: 'Publicités' },
      { heading: 'Droit applicable et juridiction' },
      { heading: 'Contact' },
      { heading: 'Date de version' },
    ],
  },
  {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    notice: legalNotice,
    sections: [
      { heading: 'Éditeur' },
      { heading: 'Directeur de la publication' },
      { heading: 'Hébergeurs' },
      { heading: 'Crédits' },
    ],
  },
  {
    slug: 'cookies',
    title: 'Politique cookies',
    notice: legalNotice,
    sections: [
      { heading: 'Qu’est-ce qu’un cookie ?' },
      { heading: 'Cookies nécessaires' },
      { heading: 'Mesure d’audience' },
      { heading: 'Publicité' },
      { heading: 'Gérer vos choix' },
      { heading: 'Durée de conservation de votre choix' },
      { heading: 'Date de version' },
    ],
  },
];

/** Corps Markdown d'une page : avertissement puis sections `##` (placeholder juridique par défaut). */
export function pageBody(page: DemoPage): string {
  const sections = page.sections.map((s) => `## ${s.heading}\n\n${s.body ?? LEGAL_PLACEHOLDER}`);
  return [page.notice, ...sections].join('\n\n');
}
