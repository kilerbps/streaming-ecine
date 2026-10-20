import { createHmac } from 'node:crypto';
import { RELAY_HEADERS, relayCanonical } from '@ecine/contracts';

/** Visiteur relayé à l'API : IP et agent réels, appareil (`formatDevice`). */
export interface RelayVisitor {
  ip?: string | null;
  userAgent?: string | null;
  device?: string | null;
}

/**
 * En-têtes du relais signé vers l'API (ADR-0015) : HMAC-SHA256 de la méthode, du chemin, de
 * l'horodatage et du visiteur. La clé de service ne quitte jamais le serveur du site.
 * Sans `server-only` : utilisable par `proxy.ts` comme par les actions serveur.
 */
export function relayHeaders(
  secret: string,
  method: string,
  url: string,
  visitor: RelayVisitor = {},
): Record<string, string> {
  const target = new URL(url);
  const timestamp = String(Date.now());
  const ip = visitor.ip || undefined;
  const userAgent = visitor.userAgent?.slice(0, 255) || undefined;
  const device = visitor.device || undefined;
  const signature = createHmac('sha256', secret)
    .update(
      relayCanonical({
        timestamp,
        method,
        path: `${target.pathname}${target.search}`,
        ip,
        userAgent,
        device,
      }),
    )
    .digest('hex');
  const headers: Record<string, string> = {
    [RELAY_HEADERS.signature]: `${timestamp}.${signature}`,
  };
  if (ip) headers[RELAY_HEADERS.ip] = ip;
  if (userAgent) headers[RELAY_HEADERS.userAgent] = userAgent;
  if (device) headers[RELAY_HEADERS.device] = device;
  return headers;
}

/** IP du visiteur posée par l'hébergeur (Vercel réécrit `x-forwarded-for`). */
export function visitorIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip');
}
