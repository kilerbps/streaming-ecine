import type { Role } from '@ecine/contracts';

/** Utilisateur authentifié attaché à la requête (issu du jeton d'accès vérifié). */
export interface AuthUser {
  id: string;
  role: Role;
  /** Famille de session (refresh tournant) : permet la révocation immédiate. */
  family: string;
  /** Vrai si la connexion a validé un second facteur (TOTP). */
  mfa: boolean;
}
