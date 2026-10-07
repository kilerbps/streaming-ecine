import { roleSchema, type Role } from '@ecine/contracts';
import { canAssignRole, canChangeStatus, canManageUser } from './role-policy.js';

const ROLES = roleSchema.options;
/** Rôles qu'un ADMIN peut gérer et attribuer (écrit à la main, indépendamment de ROLE_RANK). */
const BELOW_ADMIN: Role[] = ['EDITOR', 'MODERATOR', 'CREATOR', 'MEMBER'];

const actor = (role: Role) => ({ id: 'actor', role });
const target = (role: Role) => ({ id: 'target', role });

/** Oracle indépendant de l'implémentation, appliqué à toutes les combinaisons. */
function expectedAssign(actorRole: Role, targetRole: Role, newRole: Role): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  if (actorRole === 'ADMIN')
    return BELOW_ADMIN.includes(targetRole) && BELOW_ADMIN.includes(newRole);
  return false;
}
function expectedManage(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  if (actorRole === 'ADMIN') return BELOW_ADMIN.includes(targetRole);
  return false;
}

describe('role-policy', () => {
  it('couvre les 6 rôles', () => {
    expect(ROLES).toHaveLength(6);
  });

  describe('attribution de rôle : toutes les combinaisons (acteur × cible × nouveau rôle)', () => {
    for (const a of ROLES) {
      for (const t of ROLES) {
        for (const r of ROLES) {
          const allowed = expectedAssign(a, t, r);
          it(`${a} → ${t} devient ${r} : ${allowed ? 'autorisé' : 'refusé'}`, () => {
            const decision = canAssignRole(actor(a), target(t), r);
            expect(decision.allowed).toBe(allowed);
            if (!decision.allowed) expect(decision.reason.length).toBeGreaterThan(0);
          });
        }
      }
    }
  });

  describe('statut (désactivation) : toutes les combinaisons (acteur × cible)', () => {
    for (const a of ROLES) {
      for (const t of ROLES) {
        const allowed = expectedManage(a, t);
        it(`${a} → ${t} : ${allowed ? 'autorisé' : 'refusé'}`, () => {
          expect(canChangeStatus(actor(a), target(t)).allowed).toBe(allowed);
          expect(canManageUser(actor(a), target(t)).allowed).toBe(allowed);
        });
      }
    }
  });

  describe('jamais sur soi-même, quel que soit le rôle', () => {
    for (const a of ROLES) {
      it(`${a} ne peut ni changer son rôle ni son statut`, () => {
        const self = { id: 'same', role: a };
        expect(canChangeStatus(self, self).allowed).toBe(false);
        for (const r of ROLES) expect(canAssignRole(self, self, r).allowed).toBe(false);
      });
    }
    it('le refus sur soi-même est explicite', () => {
      const self = { id: 'same', role: 'SUPER_ADMIN' as const };
      expect(canAssignRole(self, self, 'MEMBER')).toEqual({
        allowed: false,
        reason: 'Vous ne pouvez pas modifier votre propre compte.',
      });
    });
  });

  describe('cas métier explicites', () => {
    it('seul un SUPER_ADMIN attribue SUPER_ADMIN', () => {
      expect(canAssignRole(actor('ADMIN'), target('MEMBER'), 'SUPER_ADMIN').allowed).toBe(false);
      expect(canAssignRole(actor('SUPER_ADMIN'), target('MEMBER'), 'SUPER_ADMIN').allowed).toBe(
        true,
      );
    });
    it('un ADMIN ne promeut pas au rang ADMIN', () => {
      expect(canAssignRole(actor('ADMIN'), target('EDITOR'), 'ADMIN').allowed).toBe(false);
    });
    it('un ADMIN ne rétrograde pas un autre ADMIN', () => {
      expect(canAssignRole(actor('ADMIN'), target('ADMIN'), 'MEMBER').allowed).toBe(false);
      expect(canChangeStatus(actor('ADMIN'), target('ADMIN')).allowed).toBe(false);
    });
    it('un ADMIN gère un EDITOR (promotion MODERATOR → EDITOR, désactivation)', () => {
      expect(canAssignRole(actor('ADMIN'), target('MODERATOR'), 'EDITOR').allowed).toBe(true);
      expect(canChangeStatus(actor('ADMIN'), target('EDITOR')).allowed).toBe(true);
    });
    it('un SUPER_ADMIN rétrograde un autre SUPER_ADMIN', () => {
      expect(canAssignRole(actor('SUPER_ADMIN'), target('SUPER_ADMIN'), 'ADMIN').allowed).toBe(
        true,
      );
    });
    it('un EDITOR ou un MODERATOR ne gère personne', () => {
      expect(canAssignRole(actor('EDITOR'), target('MEMBER'), 'MODERATOR').allowed).toBe(false);
      expect(canChangeStatus(actor('MODERATOR'), target('MEMBER')).allowed).toBe(false);
    });
  });
});
