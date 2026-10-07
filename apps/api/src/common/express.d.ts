import type { AuthUser } from '../auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Utilisateur authentifié (AuthGuard). */
      user?: AuthUser;
      /** IP réelle du visiteur (transmise par Next.js) ou IP de connexion (ClientIpMiddleware). */
      clientIp?: string;
      /** Agent utilisateur réel du visiteur. */
      clientUserAgent?: string;
      /** Vrai si la requête vient du serveur Next.js (clé de service valide). */
      fromService?: boolean;
    }
  }
}

export {};
