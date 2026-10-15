import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
}));

const { PushService } = await import('./push.service.js');

const env = {
  VAPID_PUBLIC_KEY: 'B'.repeat(87),
  VAPID_PRIVATE_KEY: 'p'.repeat(43),
  VAPID_SUBJECT: 'mailto:test@e-cine.test',
};

function serviceWith(endpoints: string[]) {
  const prisma = {
    pushSubscription: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          endpoints.map((endpoint, i) => ({ id: `s${i}`, endpoint, p256dh: 'k', auth: 'a' })),
        ),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn(),
    },
  };
  return { prisma, service: new PushService(prisma as never, env as never) };
}

const payload = { title: 'T', body: 'B', url: '/fr/films/x' };

describe('notifications Web Push', () => {
  beforeEach(() => {
    sendNotification.mockReset();
  });

  it('envoie à chaque appareil du membre', async () => {
    sendNotification.mockResolvedValue({});
    const { service } = serviceWith([
      'https://fcm.googleapis.com/fcm/send/a',
      'https://updates.push.services.mozilla.com/wpush/v2/b',
    ]);
    await expect(service.sendToUser('u1', payload)).resolves.toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('supprime un abonnement expiré (410)', async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));
    const { prisma, service } = serviceWith(['https://fcm.googleapis.com/fcm/send/a']);
    await expect(service.sendToUser('u1', payload)).resolves.toBe(0);
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: 's0' } });
  });

  it("n'appelle jamais une adresse qui n'est pas un service push connu", async () => {
    const { service } = serviceWith(['https://127.0.0.1/interne', 'http://fcm.googleapis.com/x']);
    await service.sendToUser('u1', payload);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('reste inactif sans clés VAPID', async () => {
    const prisma = { pushSubscription: { findMany: vi.fn() } };
    const service = new PushService(prisma as never, {} as never);
    expect(service.publicKey()).toBeNull();
    await expect(service.sendToUser('u1', payload)).resolves.toBe(0);
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
  });
});
