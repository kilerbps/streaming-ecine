import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import type { ClientInfo } from '../auth/session.service.js';

/** IP et agent utilisateur réels du visiteur (voir ClientIpMiddleware). */
export function clientInfo(req: Request): ClientInfo {
  return { ip: req.clientIp ?? req.ip, userAgent: req.clientUserAgent };
}

/**
 * Limites de débit calculées sur l'IP réelle du visiteur, pas sur celle du serveur Next.js.
 * Les lectures internes du serveur Next.js (clé de service, sans visiteur relayé — ex. pages publiques
 * mises en cache) ne sont pas limitées : elles ne correspondent à aucun visiteur précis.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    return Promise.resolve(
      Boolean(req.fromService && !req.headers['x-client-ip'] && req.method === 'GET'),
    );
  }

  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    return Promise.resolve(request.clientIp ?? request.ip ?? 'inconnu');
  }
}

/** Catégorie d'appareil grossière pour les statistiques agrégées (aucune empreinte). */
export function deviceCategory(userAgent: string | undefined): string {
  if (!userAgent) return 'inconnu';
  if (/tablet|ipad/i.test(userAgent)) return 'tablette';
  if (/mobi|android|iphone/i.test(userAgent)) return 'mobile';
  return 'ordinateur';
}
