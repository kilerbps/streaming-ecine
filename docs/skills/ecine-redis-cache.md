---
name: ecine-redis-cache
description: Utiliser Redis dans E-Ciné pour le cache dérivé, le rate limiting, la révocation de sessions et les files BullMQ, sans jamais en faire une source de vérité.
---

# Compétence : Redis

## Principe
Redis est une **copie jetable**. PostgreSQL reste la source de vérité. L'application doit fonctionner (plus lentement) si Redis est vide.

## Préfixes et TTL
| Préfixe | Usage | TTL |
|---|---|---|
| `cache:` | Réponses dérivées (feed, listes, compteurs) | 30 s – 10 min |
| `rl:` | Rate limit (IP, compte, route) | fenêtre |
| `sess:` | Révocation / sessions actives | durée du token |
| `play:` | Compteurs de jetons de lecture | 5 min |
| `bull:` | Files BullMQ | géré par la lib |

## Règles
1. Toute clé a un préfixe **et** un TTL (sauf BullMQ).
2. **Invalidation explicite** à chaque écriture admin ; webhook signé (HMAC) pour revalider le cache de Next.js.
3. Jamais de réponse personnalisée en cache sans identifiant utilisateur dans la clé.
4. Rate limit : si Redis est indisponible → mode **prudent** (limites locales strictes), pas ouvert.
5. Sécurité : pas de port public, mot de passe/ACL, réseau Docker interne, `maxmemory` + politique d'éviction adaptée au cache, persistance selon besoin des jobs.
6. Éviter les grosses valeurs (> 100 Ko) et les clés « chaudes » sans stratégie.
7. Protection contre l'avalanche : TTL avec jitter ; verrou court pour reconstruire une entrée coûteuse.

## Feed et surprise
Le tirage « surprise » utilise une graine par session (stable pendant la visite) pour éviter de changer l'ordre au rechargement ; la graine peut vivre en cookie, jamais comme seule source.

## Checklist
- [ ] Préfixe + TTL
- [ ] Invalidation écrite et testée
- [ ] Comportement si Redis tombe testé
- [ ] Aucun secret ni PII non nécessaire
