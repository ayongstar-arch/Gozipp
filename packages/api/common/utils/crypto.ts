import * as crypto from 'crypto';

/**
 * Sign a transaction payload using HMAC-SHA256 to ensure tamper-proof integrity.
 */
export function signTransaction(payload: object, secret: string): string {
  const data = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a transaction signature using constant-time comparison to prevent timing side-channel attacks.
 */
export function verifyTransaction(payload: object, signature: string, secret: string): boolean {
  const expected = signTransaction(payload, secret);
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Enterprise AES-256-GCM Data Encryption at Rest.
 */
export function encryptData(text: string, secretKey: string): { encryptedData: string; iv: string; tag: string } {
  const key = crypto.scryptSync(secretKey, 'gozipp-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

/**
 * Enterprise AES-256-GCM Data Decryption at Rest.
 */
export function decryptData(encryptedData: string, iv: string, tag: string, secretKey: string): string {
  const key = crypto.scryptSync(secretKey, 'gozipp-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
