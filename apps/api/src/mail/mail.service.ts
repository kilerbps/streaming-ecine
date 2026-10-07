import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envoi d'e-mails transactionnels. Pilote `log` en développement (aucun envoi réel, adresse masquée),
 * `resend` en production (Q10 du README : Resend par défaut).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(message: MailMessage): Promise<void> {
    if (this.env.MAIL_DRIVER === 'log') {
      this.logger.log(
        `[e-mail simulé] « ${message.subject} » → ${maskEmail(message.to)}\n${message.text}`,
      );
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.env.MAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Envoi d'e-mail refusé (HTTP ${res.status})`);
  }
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}
