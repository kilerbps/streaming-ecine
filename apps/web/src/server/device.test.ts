import { describe, expect, it } from 'vitest';
import { RELAY_HEADERS, relayCanonical } from '@ecine/contracts';
import { createHmac } from 'node:crypto';
import { newDevice, openDevice, renewDevice, sealDevice } from './device';
import { relayHeaders } from './relay';

const SECRET = 's'.repeat(40);
const NOW = 1_800_000_000;

describe('cookie d’appareil', () => {
  it('relit un cookie scellé et refuse un cookie modifié ou d’une autre clé', () => {
    const device = newDevice(NOW);
    const cookie = sealDevice(SECRET, device);
    expect(openDevice(SECRET, cookie)).toEqual(device);
    expect(openDevice('t'.repeat(40), cookie)).toBeNull();
    // Se dire vérifié sans passer Turnstile : la signature ne correspond plus.
    expect(openDevice(SECRET, cookie.replace(`.${NOW}.0.`, `.${NOW}.${NOW + 86_400}.`))).toBeNull();
    expect(openDevice(SECRET, undefined)).toBeNull();
  });

  it('prolonge une vérification active, pas une vérification fraîche ni expirée', () => {
    const device = { ...newDevice(NOW), verifiedUntil: NOW + 3600 };
    expect(renewDevice(device, NOW)?.verifiedUntil).toBe(NOW + 86_400);
    expect(renewDevice({ ...device, verifiedUntil: NOW + 20 * 3600 }, NOW)).toBeNull();
    expect(renewDevice({ ...device, verifiedUntil: NOW - 1 }, NOW)).toBeNull();
  });
});

describe('relais signé', () => {
  it('signe le chemin et la requête tels qu’envoyés, avec le visiteur', () => {
    const url = 'http://api.test/v1/films?limit=24&kind=FEATURE';
    const headers = relayHeaders(SECRET, 'GET', url, { ip: '41.243.10.10', device: 'D.1.0' });
    const [timestamp, signature] = headers[RELAY_HEADERS.signature]!.split('.');
    const expected = createHmac('sha256', SECRET)
      .update(
        relayCanonical({
          timestamp: timestamp!,
          method: 'GET',
          path: '/v1/films?limit=24&kind=FEATURE',
          ip: '41.243.10.10',
          device: 'D.1.0',
        }),
      )
      .digest('hex');
    expect(signature).toBe(expected);
    expect(headers[RELAY_HEADERS.ip]).toBe('41.243.10.10');
    expect(headers[RELAY_HEADERS.userAgent]).toBeUndefined();
  });
});
