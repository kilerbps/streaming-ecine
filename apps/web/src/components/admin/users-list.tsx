'use client';

import { useState } from 'react';
import { ROLE_RANK, roleSchema, type AdminUser, type Page, type Role } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  loadUsersAction,
  setUserRoleAction,
  setUserStatusAction,
} from '@/server/actions/admin/community';
import { Badge } from './badges';
import { ConfirmSheet } from './confirm-sheet';
import { formatShort } from './format';
import { USER_ROLE_LABELS } from './labels';
import { useAdminAction } from './use-admin-action';
import { useCursorList } from './use-cursor-list';

/**
 * Rôles proposés dans la liste (miroir de role-policy.ts côté API, qui reste l'autorité) :
 * personne ne modifie son propre compte ; un ADMIN n'agit que sur les rôles inférieurs au sien.
 */
function assignableRoles(viewer: { id: string; role: Role }, target: AdminUser): Role[] {
  if (viewer.id === target.id) return [];
  if (viewer.role === 'SUPER_ADMIN') return [...roleSchema.options];
  if (ROLE_RANK[viewer.role] < ROLE_RANK.ADMIN || ROLE_RANK[target.role] >= ROLE_RANK.ADMIN)
    return [];
  return roleSchema.options.filter((r) => ROLE_RANK[r] < ROLE_RANK.ADMIN);
}

type Pending =
  | { kind: 'role'; user: AdminUser; role: Role }
  | { kind: 'status'; user: AdminUser; disabled: boolean };

/** Comptes : rôle, double authentification, activation. Aucune donnée sensible n'est affichée. */
export function UsersList({
  initial,
  q,
  viewer,
}: {
  initial: Page<AdminUser>;
  q?: string;
  viewer: { id: string; role: Role };
}) {
  const {
    items,
    hasMore,
    loadMore,
    pending: loading,
  } = useCursorList(initial, (cursor) => loadUsersAction({ q, cursor }));
  const { run, pending } = useAdminAction();
  const [confirm, setConfirm] = useState<Pending | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState title={q ? 'Aucun compte pour cette adresse' : 'Aucun compte'}>
        Vérifiez l’orthographe de l’adresse e-mail.
      </EmptyState>
    );
  }

  const apply = () => {
    if (!confirm) return;
    if (confirm.kind === 'role') {
      run(() => setUserRoleAction(confirm.user.id, { role: confirm.role }), {
        success: `Rôle mis à jour : ${USER_ROLE_LABELS[confirm.role]}.`,
        onSuccess: () => setConfirm(null),
      });
    } else {
      run(() => setUserStatusAction(confirm.user.id, { disabled: confirm.disabled }), {
        success: confirm.disabled
          ? 'Compte désactivé : ses sessions sont fermées.'
          : 'Compte réactivé.',
        onSuccess: () => setConfirm(null),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-1">
            <tr className="border-b border-border">
              {['Compte', 'Rôle', 'Sécurité', 'Statut', 'Inscription'].map((h) => (
                <th key={h} scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  {h}
                </th>
              ))}
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => {
              const roles = assignableRoles(viewer, user);
              const self = user.id === viewer.id;
              return (
                <tr key={user.id} className="border-b border-border align-top last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {user.displayName}
                      {self ? <span className="ml-2 text-muted">(vous)</span> : null}
                    </p>
                    <p className="text-muted break-all">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {roles.length > 0 ? (
                      <select
                        aria-label={`Rôle de ${user.displayName}`}
                        value={user.role}
                        disabled={pending}
                        onChange={(e) =>
                          setConfirm({ kind: 'role', user, role: e.target.value as Role })
                        }
                        className="min-h-9 rounded-xs border border-border-strong bg-bg px-2"
                      >
                        {!roles.includes(user.role) ? (
                          <option value={user.role}>{USER_ROLE_LABELS[user.role]}</option>
                        ) : null}
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {USER_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        title={
                          self
                            ? 'Vous ne pouvez pas modifier votre propre rôle.'
                            : 'Seul un super-administrateur peut modifier ce compte.'
                        }
                      >
                        {USER_ROLE_LABELS[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {user.twoFactorEnabled ? (
                        <Badge tone="success">2FA activée</Badge>
                      ) : (
                        <Badge tone={ROLE_RANK[user.role] >= ROLE_RANK.ADMIN ? 'danger' : 'muted'}>
                          Sans 2FA
                        </Badge>
                      )}
                      {user.emailVerified ? (
                        <span className="text-xs text-muted">E-mail vérifié</span>
                      ) : (
                        <span className="text-xs text-muted">E-mail non vérifié</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.disabledAt ? (
                      <Badge tone="danger">Désactivé</Badge>
                    ) : (
                      <Badge tone="success">Actif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    <time dateTime={user.createdAt} suppressHydrationWarning>
                      {formatShort(user.createdAt)}
                    </time>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {roles.length > 0 || (viewer.role === 'SUPER_ADMIN' && !self) ? (
                      <Button
                        size="sm"
                        variant={user.disabledAt ? 'secondary' : 'ghost'}
                        disabled={pending}
                        onClick={() =>
                          setConfirm({ kind: 'status', user, disabled: !user.disabledAt })
                        }
                      >
                        {user.disabledAt ? 'Réactiver' : 'Désactiver'}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={loading}>
            Voir plus
          </Button>
        </div>
      ) : null}

      <ConfirmSheet
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === 'role'
            ? 'Changer le rôle ?'
            : confirm?.kind === 'status' && confirm.disabled
              ? 'Désactiver ce compte ?'
              : 'Réactiver ce compte ?'
        }
        description={
          confirm?.kind === 'role'
            ? `${confirm.user.displayName} : ${USER_ROLE_LABELS[confirm.user.role]} → ${USER_ROLE_LABELS[confirm.role]}. ${
                ROLE_RANK[confirm.role] < ROLE_RANK[confirm.user.role]
                  ? 'Une rétrogradation ferme toutes ses sessions.'
                  : ''
              }${ROLE_RANK[confirm.role] >= ROLE_RANK.ADMIN ? ' Ce rôle exige la double authentification.' : ''}`
            : confirm?.kind === 'status' && confirm.disabled
              ? `${confirm.user.displayName} ne pourra plus se connecter et toutes ses sessions sont fermées immédiatement.`
              : confirm
                ? `${confirm.user.displayName} pourra de nouveau se connecter.`
                : undefined
        }
        confirmLabel={
          confirm?.kind === 'role'
            ? 'Changer le rôle'
            : confirm?.kind === 'status' && confirm.disabled
              ? 'Désactiver'
              : 'Réactiver'
        }
        variant={confirm?.kind === 'status' && confirm.disabled ? 'danger' : 'primary'}
        pending={pending}
        onConfirm={apply}
      />
    </div>
  );
}
