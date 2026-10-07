import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';
import { ENV, type Env } from '../config/env.js';
import { safeEqual } from './crypto.js';

/**
 * Le serveur Next.js appelle l'API pour le compte du visiteur : sans ce relais, toutes les limites
 * par IP s'appliqueraient à l'IP de Vercel. Les en-têtes `x-client-*` ne sont crus qu'avec la clé de service.
 */
@Injectable()
export class ClientIpMiddleware implements NestMiddleware {
  constructor(@Inject(ENV) private readonly env: Env) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const key = req.headers['x-service-key'];
    const trusted = typeof key === 'string' && safeEqual(key, this.env.SERVICE_API_KEY);
    req.fromService = trusted;
    const forwardedIp = req.headers['x-client-ip'];
    const forwardedUa = req.headers['x-client-user-agent'];
    req.clientIp =
      trusted && typeof forwardedIp === 'string' && isIP(forwardedIp) ? forwardedIp : req.ip;
    const ua = trusted && typeof forwardedUa === 'string' ? forwardedUa : req.headers['user-agent'];
    req.clientUserAgent = typeof ua === 'string' ? ua.slice(0, 255) : undefined;
    next();
  }
}
