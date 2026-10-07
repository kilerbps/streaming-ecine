'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Me } from '@ecine/contracts';
import { AuthForms } from '@/components/features/auth/auth-forms';
import { Sheet } from '@/components/ui/sheet';

export interface Viewer {
  displayName: string;
  role: Me['role'];
  emailVerified: boolean;
}

interface AuthContextValue {
  viewer: Viewer | null;
  /**
   * Connexion à la demande (FR-080) : exécute l'action si le visiteur est connecté, sinon ouvre la
   * feuille de connexion puis reprend automatiquement l'action après connexion.
   */
  requireAuth: (action: () => Promise<unknown> | void) => void;
  /** À appeler quand une action renvoie `code: 'auth'` (session expirée). */
  sessionExpired: (retry?: () => Promise<unknown> | void) => void;
  setViewer: (viewer: Viewer | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialViewer,
  children,
}: {
  initialViewer: Viewer | null;
  children: ReactNode;
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer | null>(initialViewer);
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => Promise<unknown> | void) | null>(null);

  const requireAuth = useCallback(
    (action: () => Promise<unknown> | void) => {
      if (viewer) {
        void action();
        return;
      }
      pending.current = action;
      setOpen(true);
    },
    [viewer],
  );

  const sessionExpired = useCallback((retry?: () => Promise<unknown> | void) => {
    setViewer(null);
    pending.current = retry ?? null;
    setOpen(true);
  }, []);

  const onAuthenticated = useCallback(
    (me: Me) => {
      setViewer({ displayName: me.displayName, role: me.role, emailVerified: me.emailVerified });
      setOpen(false);
      const action = pending.current;
      pending.current = null;
      // L'utilisateur reste au même endroit : l'action interrompue est rejouée, la page est rafraîchie.
      void Promise.resolve(action?.()).finally(() => router.refresh());
    },
    [router],
  );

  const value = useMemo(
    () => ({ viewer, requireAuth, sessionExpired, setViewer }),
    [viewer, requireAuth, sessionExpired],
  );
  return (
    <AuthContext.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) pending.current = null;
        }}
        title={t('sheetTitle')}
        description={t('sheetReason')}
      >
        <AuthForms onAuthenticated={onAuthenticated} />
      </Sheet>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
