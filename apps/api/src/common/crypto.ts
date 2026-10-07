import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** Jeton aléatoire opaque (base64url, 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte SHA-256 pour stocker un jeton (refresh, e-mail) sans pouvoir le réutiliser. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** IP hachée (HMAC + sel secret) : permet les limites et l'audit sans stocker l'IP. */
export function hashIp(ip: string | undefined, salt: string): string | null {
  if (!ip) return null;
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Chiffrement au repos (AES-256-GCM) avec la clé maîtresse. Format : base64url(iv).base64url(tag).base64url(data).
 * Utilisé pour les clés AES des vidéos et les secrets TOTP.
 */
export function sealSecret(plain: Buffer, masterKeyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(masterKeyB64, 'base64'), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function openSecret(sealed: string, masterKeyB64: string): Buffer {
  const [iv, tag, data] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !data) throw new Error('Secret scellé invalide');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(masterKeyB64, 'base64'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
