import { pbkdf2Sync } from 'node:crypto';
import { timingSafeEqualHex } from './timingSafe';

const PBKDF2_DIGEST: Record<
  'PBKDF2_SHA1' | 'PBKDF2_SHA256' | 'PBKDF2_SHA512',
  { name: string; keylen: number }
> = {
  PBKDF2_SHA1: { name: 'sha1', keylen: 20 },
  PBKDF2_SHA256: { name: 'sha256', keylen: 32 },
  PBKDF2_SHA512: { name: 'sha512', keylen: 64 },
};

function pbkdf2Iterations(): number {
  const raw = process.env.PBKDF2_ITERATIONS;
  if (raw === undefined || raw === '') {
    return 100_000;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('PBKDF2_ITERATIONS must be a positive integer');
  }
  return n;
}

/**
 * Derives a key with PBKDF2; compares to `storedHex` (lowercase hex of derived bytes).
 * Uses `HASH_SALT` as the PBKDF2 salt (UTF-8); empty salt is allowed for weak legacy schemes.
 */
export function verifyPbkdf2Hex(
  alg: keyof typeof PBKDF2_DIGEST,
  plainPassword: string,
  storedHex: string,
  salt: string | undefined
): boolean {
  const { name, keylen } = PBKDF2_DIGEST[alg];
  const saltBuf = Buffer.from(salt ?? '', 'utf8');
  const iterations = pbkdf2Iterations();
  const derived = pbkdf2Sync(plainPassword, saltBuf, iterations, keylen, name);
  return timingSafeEqualHex(derived.toString('hex'), storedHex.trim());
}
