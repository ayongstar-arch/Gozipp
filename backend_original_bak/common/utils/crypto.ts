import * as crypto from 'crypto';

/**
 * Sign a transaction payload to ensure data integrity.
 * Used for financial records in the WINNO wallet system.
 */
export function signTransaction(payload: object, secret: string): string {
  const data = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a transaction signature.
 */
export function verifyTransaction(payload: object, signature: string, secret: string): boolean {
  const expected = signTransaction(payload, secret);
  return expected === signature;
}
