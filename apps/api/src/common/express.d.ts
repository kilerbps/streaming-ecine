import type { DeviceClaims } from '@ecine/contracts';
import type { AuthUser } from '../auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Utilisateur authentifié (AuthGuard). */
      user?: AuthUser;
      /** IP réelle du visiteur (relais signé de Next.js) ou IP de connexion (RelayMiddleware). */
      clientIp?: string;
      /** Agent utilisateur réel du visiteur. */
      clientUserAgent?: string;
      /** Vrai si la requête vient du serveur Next.js (relais signé valide). */
      fromService?: boolean;
      /** Vrai si le relais porte un visiteur (IP transmise) : sinon, lecture interne du site. */
      relayedVisitor?: boolean;
      /** Appareil du visiteur (cookie signé par le site, relayé), absent hors relais. */
      device?: DeviceClaims;
    }
  }
}

export {};
