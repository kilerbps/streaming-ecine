import { describe, expect, it, vi } from 'vitest';
import { SchedulerService } from '../admin/scheduler.service.js';
import type { MailMessage } from '../mail/mail.service.js';
import { InteractionsService } from './interactions.service.js';

const DAY = 24 * 60 * 60 * 1000;

function interactionsWith(film: { releaseAt: Date | null } | null) {
  const prisma = {
    film: { findFirst: vi.fn().mockResolvedValue(film) },
    reminder: { upsert: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({}) },
  };
  return { prisma, service: new InteractionsService(prisma as never, {} as never, {} as never) };
}

describe('« Me le rappeler »', () => {
  it('enregistre un rappel pour un film annoncé', async () => {
    const { prisma, service } = interactionsWith({ releaseAt: new Date(Date.now() + DAY) });
    await expect(service.setReminder('u1', 'f1', true)).resolves.toEqual({ reminded: true });
    expect(prisma.reminder.upsert).toHaveBeenCalledOnce();
  });

  it('refuse un rappel pour un film déjà sorti', async () => {
    const { prisma, service } = interactionsWith({ releaseAt: new Date(Date.now() - DAY) });
    await expect(service.setReminder('u1', 'f1', true)).rejects.toMatchObject({ status: 409 });
    expect(prisma.reminder.upsert).not.toHaveBeenCalled();
  });

  it('refuse un film introuvable ou non publié', async () => {
    const { service } = interactionsWith(null);
    await expect(service.setReminder('u1', 'f1', true)).rejects.toMatchObject({ status: 404 });
  });

  it('retire un rappel sans condition', async () => {
    const { prisma, service } = interactionsWith(null);
    await expect(service.setReminder('u1', 'f1', false)).resolves.toEqual({ reminded: false });
    expect(prisma.reminder.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', filmId: 'f1' },
    });
  });
});

describe('Envoi des rappels à la sortie', () => {
  function schedulerWith(claimed: number) {
    const reminder = {
      userId: 'u1',
      filmId: 'f1',
      user: { email: 'membre@example.org', displayName: 'Awa' },
      film: { slug: 'le-film', originalTitle: null, translations: [{ title: 'Le Film' }] },
    };
    const prisma = {
      film: { findMany: vi.fn().mockResolvedValue([]) },
      article: { findMany: vi.fn().mockResolvedValue([]) },
      post: { findMany: vi.fn().mockResolvedValue([]) },
      reminder: {
        findMany: vi.fn().mockResolvedValue([reminder]),
        updateMany: vi.fn().mockResolvedValue({ count: claimed }),
      },
    };
    const mail = {
      send: vi.fn<(message: MailMessage) => Promise<void>>().mockResolvedValue(undefined),
    };
    const scheduler = new SchedulerService(
      prisma as never,
      { log: vi.fn() } as never,
      { changed: vi.fn() } as never,
      mail as never,
      { NODE_ENV: 'test', APP_URL: 'https://e-cine.example' } as never,
    );
    return { scheduler, mail };
  }

  it('envoie le rappel une fois, avec le lien du film', async () => {
    const { scheduler, mail } = schedulerWith(1);
    await scheduler.tick();
    expect(mail.send).toHaveBeenCalledOnce();
    expect(mail.send.mock.calls[0]?.[0]).toMatchObject({
      to: 'membre@example.org',
      subject: '« Le Film » est disponible sur E-Ciné',
    });
    expect(mail.send.mock.calls[0]?.[0].text).toContain('https://e-cine.example/fr/films/le-film');
  });

  it("n'envoie rien si une autre instance a déjà réservé le rappel", async () => {
    const { scheduler, mail } = schedulerWith(0);
    await scheduler.tick();
    expect(mail.send).not.toHaveBeenCalled();
  });
});
