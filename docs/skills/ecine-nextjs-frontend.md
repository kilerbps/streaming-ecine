---
name: ecine-nextjs-frontend
description: Construire le frontend E-Ciné avec Next.js 16.3 (App Router, React 19). À utiliser pour toute page, layout, composant, Server Action, métadonnée, proxy.ts ou optimisation de navigation.
---

# Compétence : frontend Next.js 16.3

## Rappels vérifiés (02/10/2026)
- App Router, React 19. `middleware.ts` s'appelle `proxy.ts` depuis Next.js 16 (vérifier la doc installée).
- `params` / `searchParams` sont asynchrones (`await`).
- Instant Navigations + Cache Components pour une navigation immédiate, mises à jour optimistes, Suspense en streaming, View Transitions.
- Next.js publie des correctifs de sécurité fréquents : rester sur le dernier patch.

## Règles E-Ciné
1. **Le front ne fetch pas.** Données lues dans les Server Components via `src/server/api-client.ts` (`import 'server-only'`) et passées en props. Mutations = Server Actions validées par Zod. Pagination du feed = Server Action. Aucun `useEffect`/SWR/React Query pour charger des données.
2. **Une donnée = une source** : pas de copie dans un store global. L'état client ne porte que l'interface.
3. **Connexion à la demande** : un utilisateur anonyme peut tout consulter ; au clic sur une action protégée → feuille de connexion, puis reprise automatique de l'action.
4. **Déconnexion** : Server Action → API (révocation) → purge des caches privés, du stockage local lié au compte, redirection.
5. **Sauvegarde de l'état** : thème, son, langue → cookie (lu côté serveur pour éviter le flash) ; progression de lecture → API si connecté, sinon stockage local ; brouillons → stockage local chiffré non sensible.
6. **Un seul CTA principal par vue.**
7. **Pas de dégradé**, pas de couleur en dur : tokens CSS uniquement.
8. Skeleton **seulement si nécessaire** (`05` §7) ; loader fourni pour > ~300 ms.
9. Mobile d'abord ; tester 320 / 672 / 1056 px ; sombre et clair.

## Structure recommandée
```
apps/web/src/
├─ app/[locale]/(public)/ … films, personnes, actualités, feed
├─ app/[locale]/(account)/ … me, ma-liste
├─ app/[locale]/(legal)/ … confidentialité, cgu, mentions, cookies
├─ app/(admin)/ … backoffice (hôte dédié recommandé)
├─ components/ui/ … primitives (Button, Tile, Sheet…)
├─ components/features/ … Player, Feed, Search…
├─ server/ … api-client.ts, session.ts (server-only)
├─ lib/ … sound.ts, theme.ts, haptics.ts
├─ messages/fr.json
└─ proxy.ts
```

## `proxy.ts` — responsabilités
Domaine canonique et HTTPS, langue, garde légère de `/admin` (cookie présent), CSP avec nonce, en-têtes de sécurité. **Ne jamais** y mettre la vraie autorisation (elle est dans l'API).

## Métadonnées et SEO
`generateMetadata` par page ; `opengraph-image` ; `app/sitemap.ts` et `app/robots.ts` ; JSON-LD (Movie, Person, NewsArticle). Voir `ecine-seo-i18n`.

## Interdits
`fetch` client pour des données · `localStorage` pour un jeton · `dangerouslySetInnerHTML` sans nettoyage · `div` cliquable · `NEXT_PUBLIC_` pour un secret · `priority` sur toutes les images.

## Checklist
- [ ] Doc officielle de la version installée consultée
- [ ] Aucune donnée chargée côté client
- [ ] Métadonnées + 404 + erreurs
- [ ] Accessibilité clavier + contraste
- [ ] Mobile / tablette / PC, sombre / clair
- [ ] Budget JS respecté (analyse du bundle)
