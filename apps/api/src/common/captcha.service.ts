import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { ProblemException } from './problem.js';

/** Vérification Cloudflare Turnstile côté serveur. Sans secret configuré (dev uniquement), le contrôle est sauté. */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async assertHuman(token: string | undefined, ip: string | undefined): Promise<void> {
    if (!this.env.TURNSTILE_SECRET) {
      if (this.env.NODE_ENV === 'production')
        throw ProblemException.forbidden('Vérification anti-spam indisponible.');
      return;
    }
    if (!token) throw ProblemException.badRequest('Vérification anti-spam manquante.');
    const body = new URLSearchParams({ secret: this.env.TURNSTILE_SECRET, response: token });
    if (ip) body.set('remoteip', ip);
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success === true) return;
    } catch (err) {
      this.logger.warn(`Turnstile injoignable : ${(err as Error).message}`);
    }
    // Échec fermé : en cas de doute, la requête est refusée.
    throw ProblemException.forbidden(
      'La vérification anti-spam a échoué. Rechargez la page et réessayez.',
    );
  }
}
