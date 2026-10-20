import type { Request } from 'express';
import type { ClientInfo } from '../auth/session.service.js';

/** IP et agent utilisateur réels du visiteur (voir RelayMiddleware). */
export function clientInfo(req: Request): ClientInfo {
  return { ip: req.clientIp ?? req.ip, userAgent: req.clientUserAgent };
}

/** Catégorie d'appareil grossière pour les statistiques agrégées (aucune empreinte). */
export function deviceCategory(userAgent: string | undefined): string {
  if (!userAgent) return 'inconnu';
  if (/tablet|ipad/i.test(userAgent)) return 'tablette';
  if (/mobi|android|iphone/i.test(userAgent)) return 'mobile';
  return 'ordinateur';
}
