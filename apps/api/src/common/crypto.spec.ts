import { randomBytes } from 'node:crypto';
import { hashIp, openSecret, safeEqual, sealSecret, sha256 } from './crypto.js';

describe('crypto', () => {
  const master = randomBytes(32).toString('base64');

  it('scelle et ouvre un secret', () => {
    const key = randomBytes(16);
    const sealed = sealSecret(key, master);
    expect(sealed).not.toContain(key.toString('base64url'));
    expect(openSecret(sealed, master).equals(key)).toBe(true);
  });

  it('refuse un secret altéré', () => {
    const sealed = sealSecret(randomBytes(16), master);
    const [iv, tag, data] = sealed.split('.');
    const tampered = [iv, tag, Buffer.from('x'.repeat(16)).toString('base64url') + data].join('.');
    expect(() => openSecret(tampered, master)).toThrow();
  });

  it('refuse une autre clé maîtresse', () => {
    const sealed = sealSecret(randomBytes(16), master);
    expect(() => openSecret(sealed, randomBytes(32).toString('base64'))).toThrow();
  });

  it('hache les IP de façon stable et non réversible', () => {
    const salt = 's'.repeat(32);
    expect(hashIp('41.243.1.2', salt)).toBe(hashIp('41.243.1.2', salt));
    expect(hashIp('41.243.1.2', salt)).not.toContain('41.243');
    expect(hashIp(undefined, salt)).toBeNull();
  });

  it('compare en temps constant', () => {
    expect(safeEqual(sha256('a'), sha256('a'))).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
