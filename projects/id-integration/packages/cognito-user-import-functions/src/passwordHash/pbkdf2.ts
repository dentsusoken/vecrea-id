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
 * Parses `salt_hex:dk_hex` from `storedHex`, re-derives with PBKDF2, and compares.
 * The salt is embedded in the stored value (written by `generate-import-csv.mjs`).
 * `PBKDF2_ITERATIONS` env var overrides the iteration count (default 100 000).
 */
export function verifyPbkdf2Hex(
  alg: keyof typeof PBKDF2_DIGEST,
  plainPassword: string,
  storedHex: string,
): boolean {
  const trimmed = storedHex.trim();
  const colon = trimmed.indexOf(':');
  if (colon === -1) return false;
  const saltHex = trimmed.slice(0, colon);
  const dkHex = trimmed.slice(colon + 1);
  if (!saltHex || !dkHex) return false;
  const saltBuf = Buffer.from(saltHex, 'hex');
  const { name, keylen } = PBKDF2_DIGEST[alg];
  const derived = pbkdf2Sync(plainPassword, saltBuf, pbkdf2Iterations(), keylen, name);
  return timingSafeEqualHex(derived.toString('hex'), dkHex);
}
