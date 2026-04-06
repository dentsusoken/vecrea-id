import { scryptSync } from 'node:crypto';
import { timingSafeEqualHex } from './timingSafe';

function parsePositiveInt(name: string, raw: string | undefined, defaultVal: number): number {
  if (raw === undefined || raw === '') {
    return defaultVal;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
}

/**
 * `scryptSync(password, salt, keylen, { N, r, p })` — compares derived key to `storedHex`.
 * Requires non-empty `HASH_SALT` (used as scrypt salt, UTF-8).
 */
export function verifyScryptHex(
  plainPassword: string,
  storedHex: string,
  salt: string | undefined
): boolean {
  if (salt === undefined || salt === '') {
    throw new Error('HASH_SALT is required for SCRYPT');
  }

  const keylen = parsePositiveInt('SCRYPT_KEYLEN', process.env.SCRYPT_KEYLEN, 64);
  const N = parsePositiveInt('SCRYPT_N', process.env.SCRYPT_N, 16_384);
  const r = parsePositiveInt('SCRYPT_R', process.env.SCRYPT_R, 8);
  const p = parsePositiveInt('SCRYPT_P', process.env.SCRYPT_P, 1);

  const saltBuf = Buffer.from(salt, 'utf8');
  const derived = scryptSync(plainPassword, saltBuf, keylen, { N, r, p });
  return timingSafeEqualHex(derived.toString('hex'), storedHex.trim());
}
