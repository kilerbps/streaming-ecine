import type { IncomingMessage } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IMAGE_UPLOAD_MAX_BYTES } from '@ecine/contracts';
import { configureUploadParsers, UPLOAD_CHUNK_MAX_BYTES } from './static.js';

interface ParserCall {
  parser: string;
  options: { limit: number; type: (req: IncomingMessage) => boolean };
}

function registeredParsers(): ParserCall[] {
  const calls: ParserCall[] = [];
  const app = {
    useBodyParser: (parser: string, options: ParserCall['options']) => {
      calls.push({ parser, options });
      return app;
    },
  };
  configureUploadParsers(app as unknown as NestExpressApplication);
  return calls;
}

const req = (method: string, url: string, contentType?: string) =>
  ({
    method,
    url,
    headers: contentType ? { 'content-type': contentType } : {},
  }) as unknown as IncomingMessage;

describe('corps binaires limités à leurs routes', () => {
  const [image, chunk] = registeredParsers();

  it('enregistre deux parseurs bruts avec leurs limites', () => {
    expect(image?.parser).toBe('raw');
    expect(image?.options.limit).toBe(IMAGE_UPLOAD_MAX_BYTES);
    expect(chunk?.parser).toBe('raw');
    expect(chunk?.options.limit).toBe(UPLOAD_CHUNK_MAX_BYTES);
  });

  it('image : POST /v1/admin/media/images avec un type image autorisé uniquement', () => {
    const accepts = image!.options.type;
    expect(
      accepts(req('POST', '/v1/admin/media/images?alt=Affiche&decorative=false', 'image/jpeg')),
    ).toBe(true);
    expect(accepts(req('POST', '/v1/admin/media/images', 'image/avif; charset=binary'))).toBe(true);
    expect(accepts(req('POST', '/v1/admin/media/images', 'image/svg+xml'))).toBe(false);
    expect(accepts(req('POST', '/v1/admin/media/images', 'image/gif'))).toBe(false);
    expect(accepts(req('POST', '/v1/admin/films', 'image/png'))).toBe(false);
    expect(accepts(req('PATCH', '/v1/admin/media/images', 'image/png'))).toBe(false);
  });

  it('morceau vidéo : PATCH /v1/admin/media/uploads/{id} en octet-stream uniquement', () => {
    const accepts = chunk!.options.type;
    expect(
      accepts(
        req(
          'PATCH',
          '/v1/admin/media/uploads/cabcdefghijklmnopqrstuvwx',
          'application/octet-stream',
        ),
      ),
    ).toBe(true);
    expect(
      accepts(
        req('PATCH', '/v1/admin/media/uploads/cabcdefghijklmnopqrstuvwx', 'application/json'),
      ),
    ).toBe(false);
    expect(
      accepts(
        req(
          'POST',
          '/v1/admin/media/uploads/cabcdefghijklmnopqrstuvwx',
          'application/octet-stream',
        ),
      ),
    ).toBe(false);
    expect(
      accepts(req('PATCH', '/v1/admin/media/uploads/cabc/complete', 'application/octet-stream')),
    ).toBe(false);
    expect(accepts(req('PATCH', '/v1/me', 'application/octet-stream'))).toBe(false);
  });
});
