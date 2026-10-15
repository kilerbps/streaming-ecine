'use client';

import { useState } from 'react';
import type { Me } from '@ecine/contracts';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type AuthMode = 'login' | 'register';

/**
 * Connexion ou création de compte dans la même feuille ; une seule action principale visible.
 * `mode` + `onModeChange` : mode tenu par la feuille, qui adapte son titre.
 */
export function AuthForms({
  onAuthenticated,
  initialMode = 'login',
  mode: controlled,
  onModeChange,
}: {
  onAuthenticated: (me: Me) => void;
  initialMode?: AuthMode;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
}) {
  const [own, setOwn] = useState<AuthMode>(initialMode);
  const mode = controlled ?? own;
  const setMode = (next: AuthMode) => {
    setOwn(next);
    onModeChange?.(next);
  };
  return mode === 'login' ? (
    <LoginForm onSuccess={onAuthenticated} onSwitch={() => setMode('register')} />
  ) : (
    <RegisterForm onSuccess={onAuthenticated} onSwitch={() => setMode('login')} />
  );
}
