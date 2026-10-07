'use client';

import { useState } from 'react';
import type { Me } from '@ecine/contracts';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

/** Connexion ou création de compte dans la même feuille ; une seule action principale visible. */
export function AuthForms({
  onAuthenticated,
  initialMode = 'login',
}: {
  onAuthenticated: (me: Me) => void;
  initialMode?: 'login' | 'register';
}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  return mode === 'login' ? (
    <LoginForm onSuccess={onAuthenticated} onSwitch={() => setMode('register')} />
  ) : (
    <RegisterForm onSuccess={onAuthenticated} onSwitch={() => setMode('login')} />
  );
}
