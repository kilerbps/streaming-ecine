/** Cookie décrit par un en-tête Set-Cookie de l'API, relayé tel quel au navigateur. */
export interface ParsedCookie {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
  expires?: Date;
}

export function parseSetCookie(header: string): ParsedCookie | null {
  const [pair, ...attributes] = header.split(';').map((part) => part.trim());
  if (!pair) return null;
  const eq = pair.indexOf('=');
  if (eq <= 0) return null;
  const cookie: ParsedCookie = {
    name: pair.slice(0, eq),
    value: decodeURIComponent(pair.slice(eq + 1)),
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
  };
  for (const attribute of attributes) {
    const [rawKey = '', ...rest] = attribute.split('=');
    const key = rawKey.toLowerCase();
    const value = rest.join('=');
    if (key === 'httponly') cookie.httpOnly = true;
    else if (key === 'secure') cookie.secure = true;
    else if (key === 'path') cookie.path = value || '/';
    else if (key === 'max-age' && /^-?\d+$/.test(value)) cookie.maxAge = Number(value);
    else if (key === 'expires') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) cookie.expires = date;
    } else if (key === 'samesite') {
      const v = value.toLowerCase();
      if (v === 'strict' || v === 'none' || v === 'lax') cookie.sameSite = v;
    }
  }
  return cookie;
}
