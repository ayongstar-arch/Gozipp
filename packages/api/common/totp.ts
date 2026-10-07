import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * TOTP (RFC 6238, SHA-1, 30s, 6 digits) — dependency-free, for admin MFA.
 * Secrets are base32 (RFC 4648), compatible with Google Authenticator / 1Password.
 */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function otpauthUrl(issuer: string, account: string, secret: string): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${secret}&issuer=${enc(issuer)}&digits=6&period=30`;
}

function hotp(key: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

export function totpNow(secret: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secret), Math.floor(atMs / 1000 / 30));
}

/** Constant-time compare with ±1 step clock window. */
export function verifyTotp(secret: string, code: string, atMs: number = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }
  const step = Math.floor(atMs / 1000 / 30);
  const candidate = Buffer.from(code);
  for (let d = -window; d <= window; d++) {
    const expected = Buffer.from(hotp(key, step + d));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}
