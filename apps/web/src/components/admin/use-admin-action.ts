'use client';

import { useCallback, useTransition } from 'react';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import type { ActionResult } from '@/server/actions/result';

export type ActionFailure = Extract<ActionResult<unknown>, { ok: false }>;

interface RunOptions<T> {
  /** Message de succès (toast). */
  success?: string;
  /** Pas de son de succès (lectures : pagination, suivi). */
  quiet?: boolean;
  onSuccess?: (data: T) => void;
  /** Appelé en cas d'échec, après le toast (ex. erreurs de champs). */
  onError?: (failure: ActionFailure) => void;
}

/**
 * Exécute une Server Action d'administration : état « en cours », toast + son/vibration au résultat,
 * feuille de connexion si la session a expiré. Aucune donnée n'est chargée ici (règle R1).
 */
export function useAdminAction() {
  const toast = useToast();
  const { feedback } = usePreferences();
  const { sessionExpired } = useAuth();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T>(action: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) => {
      startTransition(async () => {
        let result: ActionResult<T>;
        try {
          result = await action();
        } catch (error) {
          // L'action n'a pas abouti : réseau coupé, ou page ouverte avant une mise à jour du site
          // (identifiants d'action changés à chaque version).
          feedback('error');
          toast(
            /server action|unexpected response/i.test(String(error))
              ? 'Le site a été mis à jour pendant que cette page était ouverte : rechargez-la, puis recommencez.'
              : 'La connexion a été interrompue. Vérifiez le réseau, puis réessayez.',
            'error',
          );
          return;
        }
        if (result.ok) {
          if (!options.quiet) feedback('success');
          if (options.success) toast(options.success, 'success');
          options.onSuccess?.(result.data);
          return;
        }
        feedback('error');
        if (result.code === 'auth') {
          sessionExpired();
          return;
        }
        toast(result.error, 'error');
        options.onError?.(result);
      });
    },
    [feedback, sessionExpired, toast],
  );

  return { run, pending };
}
