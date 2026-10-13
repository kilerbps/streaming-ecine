'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { LIST_ROW, ListRowContent } from '@/components/ui/list-row';
import { routes } from '@/lib/routes';
import { logoutAction } from '@/server/actions/auth';

/** Efface de l'appareil tout ce qui est lié au compte (FR-082) ; les préférences d'interface restent. */
async function purgePrivateData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ecine:')) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch {
    // Stockage indisponible : rien à effacer.
  }
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('ecine-private') || n.startsWith('pages'))
        .map((n) => caches.delete(n)),
    );
  }
  navigator.serviceWorker?.controller?.postMessage({ type: 'ECINE_LOGOUT' });
}

/** Déconnexion en un geste : session révoquée côté serveur, données privées effacées localement. */
export function LogoutButton({ variant = 'button' }: { variant?: 'button' | 'row' }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const { setViewer } = useAuth();
  const { feedback } = usePreferences();
  const [pending, startTransition] = useTransition();
  const logout = () =>
    startTransition(async () => {
      await logoutAction();
      await purgePrivateData();
      setViewer(null);
      feedback('success');
      toast(t('loggedOut'), 'success');
      router.replace(routes.home('fr'));
      router.refresh();
    });
  if (variant === 'row') {
    return (
      <button type="button" className={LIST_ROW} disabled={pending} onClick={logout}>
        <ListRowContent icon="logout" label={t('logout')} chevron={false} />
      </button>
    );
  }
  return (
    <Button variant="ghost" icon="logout" pending={pending} onClick={logout}>
      {t('logout')}
    </Button>
  );
}
