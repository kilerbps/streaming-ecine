import type { Request } from 'express';
import type { CaptchaService } from '../common/captcha.service.js';
import type { Env } from '../config/env.js';
import type { MailService } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FormsController } from './forms.controller.js';

function controllerWith(create: ReturnType<typeof vi.fn>) {
  const prisma = { analyticsEvent: { create } } as unknown as PrismaService;
  return new FormsController(
    prisma,
    {} as CaptchaService,
    {} as MailService,
    { IP_HASH_SALT: 's'.repeat(32) } as Env,
  );
}

/** Données passées à `analyticsEvent.create` lors du premier appel. */
function savedData(create: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const [args] = create.mock.calls[0] as [{ data: Record<string, unknown> }];
  return args.data;
}

const request = {
  clientUserAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile',
} as unknown as Request;

describe('événements de mesure', () => {
  it('enregistre la provenance, la valeur et la session (lot 0 de la refonte)', async () => {
    const create = vi.fn().mockResolvedValue({});
    await controllerWith(create).event(
      {
        type: 'play_first_frame',
        targetType: 'FILM',
        targetId: 'cfilm1',
        source: 'film_page',
        value: 1840,
        session: 'a1b2c3d4e5f6a7b8',
      },
      request,
    );
    expect(savedData(create)).toMatchObject({
      type: 'play_first_frame',
      source: 'film_page',
      value: 1840,
      session: 'a1b2c3d4e5f6a7b8',
      device: 'mobile',
    });
  });

  it('ne garde que le domaine du référent et le chemin sans chaîne de requête', async () => {
    const create = vi.fn().mockResolvedValue({});
    await controllerWith(create).event(
      {
        type: 'page_view',
        path: '/fr/films/x?t=jeton',
        referrer: 'https://wa.me/123?text=salut',
      },
      request,
    );
    expect(savedData(create)).toMatchObject({
      path: '/fr/films/x',
      referrer: 'wa.me',
      source: null,
      value: null,
      session: null,
    });
  });
});
