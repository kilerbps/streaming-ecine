---
name: ecine-pwa-mobile-feel
description: Donner à E-Ciné la sensation d'une application mobile (PWA installable, barre d'onglets, gestes, sons, haptique, hors-ligne propre, fluidité sur réseaux lents). À utiliser pour navigation mobile, manifeste, service worker et performance perçue.
---

# Compétence : PWA et sensation d'application

## Objectif
Sur mobile, l'utilisateur doit avoir **une application en main**, pas un site dans un navigateur — avec des sons et des interactions, mais sans ressembler à un réseau social.

## Checklist PWA
- Manifeste : nom, `short_name`, `display: standalone`, `theme_color`/`background_color` alignés sur les tokens, icônes 192/512 + **maskable**, `start_url`, `lang: fr`.
- Service worker (Serwist) : cache de l'interface et des assets statiques ; page **hors-ligne** utile (message + contenus déjà vus si possible) ; stratégie « réseau d'abord » pour les pages, « cache d'abord » pour les assets versionnés ; mise à jour avec invite « Nouvelle version disponible ».
- **Ne jamais mettre en cache** : segments vidéo protégés, clés, réponses privées (`/me`, session). À la **déconnexion** : purge des caches privés.
- Installation : invite discrète et **non insistante** (après 2 visites ou une action de valeur), jamais bloquante.
- Notifications push : V2 (consentement explicite, sujets choisis).

## Sensation d'app
- Navigation **en bas** (5 onglets max), en-tête minimal, bottom sheets pour connexion/partage/options, retour par geste.
- `100dvh`, `env(safe-area-inset-*)`, `overscroll-behavior` maîtrisé, pas de zoom accidentel, cibles ≥ 44 px, `touch-action` adapté.
- Transitions de vue (View Transitions) et **Instant Navigations** : la page suivante apparaît immédiatement.
- **Sons et haptique** (`05` §8) : retour au tap, like, ajout, succès, erreur ; réglage visible, état sauvegardé, audio démarré après geste.
- Feed plein écran vertical avec aperçus **muets** ; son au tap.
- Orientation : lecteur en paysage au plein écran ; verrouillage non imposé.

## Réseaux lents (Kinshasa, 3G/4G variable)
- Qualité vidéo de départ basse, segments courts, pas de préchargement agressif ; option **« Économiser les données »** (images plus petites, aperçus du feed désactivés).
- Images AVIF/WebP, `sizes` exacts, polices auto-hébergées sous-ensemble latin.
- Budget JS initial < 170 Ko gz ; imports dynamiques pour lecteur et admin.
- Tester avec limitation réseau et un Android d'entrée de gamme.

## Tests
Lighthouse PWA + installation réelle sur Android (Chrome) et iOS (Safari, ajout à l'écran d'accueil) · mode avion · reprise après coupure · mise à jour du service worker · déconnexion = rien de privé en cache.

## Checklist
- [ ] Installable, icônes maskable
- [ ] Hors-ligne propre
- [ ] Rien de protégé en cache
- [ ] Sons/haptique avec réglage
- [ ] Testé sur appareil réel
