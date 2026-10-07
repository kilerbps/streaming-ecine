import { base32Decode, base32Encode, generateTotpSecret, hotp, verifyTotp } from './totp.js';

// Vecteurs de test officiels de la RFC 6238, annexe B (SHA-1, secret ASCII "12345678901234567890").
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('TOTP (RFC 6238)', () => {
  it.each(VECTORS)('t=%i → %s', (time, expected) => {
    expect(hotp(RFC_SECRET, Math.floor(time / 30), 8)).toBe(expected);
  });

  it('encode et décode le base32 sans perte', () => {
    const secret = generateTotpSecret();
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(base32Decode(secret)).toHaveLength(20);
  });

  it('accepte le code courant et le pas voisin, refuse au-delà', () => {
    const b32 = base32Encode(RFC_SECRET);
    const now = 1111111111 * 1000;
    const code = hotp(RFC_SECRET, Math.floor(now / 30000));
    expect(verifyTotp(b32, code, now)).toBe(Math.floor(now / 30000));
    expect(verifyTotp(b32, code, now + 30_000)).not.toBeNull();
    expect(verifyTotp(b32, code, now + 90_000)).toBeNull();
    expect(verifyTotp(b32, 'abcdef', now)).toBeNull();
  });
});
