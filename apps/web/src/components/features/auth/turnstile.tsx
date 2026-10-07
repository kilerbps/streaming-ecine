'use client';

import { useEffect, useRef } from 'react';

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile indisponible'));
    document.head.appendChild(script);
  });
  return loading;
}

/** Anti-spam Cloudflare Turnstile (discret, sans CAPTCHA envahissant). Le jeton est vérifié par l'API. */
export function Turnstile({
  onToken,
  theme,
}: {
  onToken: (token: string | undefined) => void;
  theme: 'dark' | 'light';
}) {
  const container = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          theme,
          language: 'fr',
          appearance: 'interaction-only',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': () => onToken(undefined),
        });
      })
      .catch(() => onToken(undefined));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, theme, onToken]);

  if (!siteKey) return null;
  return <div ref={container} className="min-h-0" />;
}
