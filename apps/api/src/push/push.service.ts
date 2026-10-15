import { Inject, Injectable, Logger } from '@nestjs/common';
import { isPushServiceUrl, type PushSubscriptionInput } from '@ecine/contracts';
import webpush from 'web-push';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PushPayload {
  title: string;
  body: string;
  /** Chemin du site ouvert au toucher (toujours interne). */
  url: string;
}

/** Une notification non lue au-delà de 24 h n'a plus de sens (sortie d'un film). */
const TTL_SEC = 24 * 60 * 60;

/**
 * Notifications Web Push (ADR-0014) : abonnements des membres et envoi par les services push des
 * navigateurs. Sans clés VAPID, le service est inactif et les rappels partent seulement par e-mail.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (this.enabled) {
      webpush.setVapidDetails(
        env.VAPID_SUBJECT ?? 'mailto:contact@e-cine.example',
        env.VAPID_PUBLIC_KEY!,
        env.VAPID_PRIVATE_KEY!,
      );
    }
  }

  publicKey(): string | null {
    return this.enabled ? (this.env.VAPID_PUBLIC_KEY ?? null) : null;
  }

  /** Abonne l'appareil au membre ; un même appareil réabonné change simplement de propriétaire. */
  async subscribe(userId: string, input: PushSubscriptionInput): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
      update: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Envoie à tous les appareils du membre ; les abonnements expirés (404, 410) sont supprimés. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.enabled) return 0;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    let sent = 0;
    for (const sub of subscriptions) {
      // Double contrôle : seule une adresse de service push connu reçoit une requête (SSRF).
      if (!isPushServiceUrl(sub.endpoint)) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: TTL_SEC, timeout: 10_000 },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
        } else {
          this.logger.warn(`Notification non envoyée (${status ?? 'réseau'})`);
        }
      }
    }
    return sent;
  }
}
