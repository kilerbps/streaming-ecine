import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';
import { parseDevice, RELAY_HEADERS, RELAY_MAX_SKEW_MS, relayCanonical } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { hmacHex, safeEqual } from './crypto.js';

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Relais signé du serveur Next.js (ADR-0015). Sans signature valide, les en-têtes `x-client-*`
 * sont ignorés : l'IP est celle de la connexion et la requête n'est pas « interne ».
 */
@Injectable()
export class RelayMiddleware implements NestMiddleware {
  constructor(@Inject(ENV) private readonly env: Env) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const ip = header(req, RELAY_HEADERS.ip);
    const userAgent = header(req, RELAY_HEADERS.userAgent);
    const device = header(req, RELAY_HEADERS.device);
    const trusted = this.verify(req, ip, userAgent, device);
    req.fromService = trusted;
    req.relayedVisitor = trusted && Boolean(ip);
    req.clientIp = trusted && ip && isIP(ip) ? ip : req.ip;
    const ua = trusted ? userAgent : req.headers['user-agent'];
    req.clientUserAgent = typeof ua === 'string' ? ua.slice(0, 255) : undefined;
    req.device = (trusted && parseDevice(device)) || undefined;
    next();
  }

  private verify(req: Request, ip?: string, userAgent?: string, device?: string): boolean {
    const relay = header(req, RELAY_HEADERS.signature);
    if (!relay) return false;
    const [timestamp, signature] = relay.split('.');
    const sentAt = Number(timestamp);
    if (!timestamp || !signature || !Number.isFinite(sentAt)) return false;
    if (Math.abs(Date.now() - sentAt) > RELAY_MAX_SKEW_MS) return false;
    const expected = hmacHex(
      this.env.SERVICE_API_KEY,
      relayCanonical({
        timestamp,
        method: req.method,
        path: req.originalUrl,
        ip,
        userAgent,
        device,
      }),
    );
    return safeEqual(signature, expected);
  }
}
