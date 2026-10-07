'use client';

import type { ReactNode } from 'react';
import { AuthProvider, type Viewer } from './auth';
import { PreferencesProvider, type Preferences } from './preferences';
import { ToastProvider } from './toast';

export function AppProviders({
  preferences,
  viewer,
  children,
}: {
  preferences: Preferences;
  viewer: Viewer | null;
  children: ReactNode;
}) {
  return (
    <PreferencesProvider initial={preferences}>
      <ToastProvider>
        <AuthProvider initialViewer={viewer}>{children}</AuthProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
}
