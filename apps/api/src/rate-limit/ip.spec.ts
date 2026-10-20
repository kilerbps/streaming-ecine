import { describe, expect, it } from 'vitest';
import { limitedIp } from './ip.js';

describe('adresses des limites de débit', () => {
  it('ramène une IPv4 « mappée » à l’IPv4 (un seul compteur par adresse)', () => {
    expect(limitedIp('::ffff:41.243.10.10')).toEqual({
      key: '41.243.10.10',
      family: 4,
      address: '41.243.10.10',
    });
    expect(limitedIp('41.243.10.10')?.key).toBe('41.243.10.10');
  });

  it('regroupe une IPv6 par /64, avec son /48 en agrégat', () => {
    const a = limitedIp('2001:db8:1:2:aaaa::1');
    const b = limitedIp('2001:0db8:0001:0002:ffff:ffff:ffff:ffff');
    expect(a?.key).toBe('2001:db8:1:2::/64');
    expect(b?.key).toBe(a?.key);
    expect(a?.block48).toBe('2001:db8:1::/48');
    expect(limitedIp('2001:db8:1:3::5')?.block48).toBe(a?.block48);
  });

  it('développe « :: » et une IPv4 finale', () => {
    expect(limitedIp('::1')?.key).toBe('0:0:0:0::/64');
    expect(limitedIp('64:ff9b::192.0.2.33')?.key).toBe('64:ff9b:0:0::/64');
    expect(limitedIp('fe80::1%eth0')?.key).toBe('fe80:0:0:0::/64');
  });

  it('refuse ce qui n’est pas une adresse', () => {
    expect(limitedIp(undefined)).toBeNull();
    expect(limitedIp('inconnu')).toBeNull();
    expect(limitedIp('999.1.1.1')).toBeNull();
  });
});
