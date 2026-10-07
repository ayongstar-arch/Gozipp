import * as argon2 from 'argon2';

/**
 * PIN crypto — Argon2id with explicit hardening parameters + server-side pepper.
 *
 * - PIN_PEPPER: secret appended to the PIN before hashing. Empty in dev
 *   (behavior identical to plain Argon2id); REQUIRED in production
 *   (validated at boot in main.ts).
 * - verifyPin() auto-detects pre-pepper hashes and reports 'legacy' so the
 *   caller can transparently re-hash (same pattern as the bcrypt upgrade).
 */
export const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export type PinCheck = 'ok' | 'legacy' | 'no';

export async function hashPin(pin: string): Promise<string> {
  const pepper = process.env.PIN_PEPPER || '';
  return argon2.hash(pin + pepper, ARGON2_OPTS);
}

export async function verifyPin(storedHash: string, pin: string): Promise<PinCheck> {
  const pepper = process.env.PIN_PEPPER || '';
  try {
    if (await argon2.verify(storedHash, pin + pepper)) return 'ok';
  } catch {
    return 'no'; // Not an argon2 hash at all (e.g. legacy bcrypt — handled by caller).
  }
  // Peppered check failed but hash IS argon2: maybe a pre-pepper hash.
  if (pepper) {
    try {
      if (await argon2.verify(storedHash, pin)) return 'legacy';
    } catch {
      // fall through to 'no'
    }
  }
  return 'no';
}
