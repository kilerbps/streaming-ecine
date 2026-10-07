import { hasRole, ROLE_RANK, type Role } from '@ecine/contracts';

/**
 * Matrice d'autorisation de la gestion des comptes (docs/04-API-SPEC.md §3, ecine-admin-backoffice) :
 * - personne ne modifie son propre rôle ni son propre statut ;
 * - SUPER_ADMIN peut tout faire d'autre ;
 * - ADMIN n'agit que sur les comptes de rang strictement inférieur à ADMIN et n'attribue que ces rôles ;
 * - seul SUPER_ADMIN attribue SUPER_ADMIN ; en dessous d'ADMIN, rien n'est permis.
 * Fonction pure, testée de façon exhaustive (role-policy.spec.ts).
 */

export interface PolicyUser {
  id: string;
  role: Role;
}

export type PolicyDecision = { allowed: true } | { allowed: false; reason: string };

const ALLOW: PolicyDecision = { allowed: true };
const deny = (reason: string): PolicyDecision => ({ allowed: false, reason });

/** Peut-on modifier ce compte (rôle ou statut) ? */
export function canManageUser(actor: PolicyUser, target: PolicyUser): PolicyDecision {
  if (actor.id === target.id) return deny('Vous ne pouvez pas modifier votre propre compte.');
  if (actor.role === 'SUPER_ADMIN') return ALLOW;
  if (!hasRole(actor.role, 'ADMIN')) return deny('Action réservée aux administrateurs.');
  if (ROLE_RANK[target.role] >= ROLE_RANK.ADMIN) {
    return deny('Seul un super-administrateur peut modifier le compte d’un administrateur.');
  }
  return ALLOW;
}

/** Peut-on attribuer `role` à ce compte ? */
export function canAssignRole(actor: PolicyUser, target: PolicyUser, role: Role): PolicyDecision {
  const base = canManageUser(actor, target);
  if (!base.allowed) return base;
  if (actor.role === 'SUPER_ADMIN') return ALLOW;
  if (role === 'SUPER_ADMIN') return deny('Seul un super-administrateur peut attribuer ce rôle.');
  if (ROLE_RANK[role] >= ROLE_RANK.ADMIN)
    return deny('Vous ne pouvez attribuer qu’un rôle inférieur à administrateur.');
  return ALLOW;
}

/** Changer le statut (désactiver / réactiver) obéit aux mêmes règles que la gestion du compte. */
export const canChangeStatus = canManageUser;
