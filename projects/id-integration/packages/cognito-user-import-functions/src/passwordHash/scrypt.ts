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

function parseScryptN(): number {
  const n = parsePositiveInt('SCRYPT_N', process.env.SCRYPT_N, 16_384);
  if ((n & (n - 1)) !== 0) {
    throw new Error('SCRYPT_N must be a power of 2');
  }
  return n;
}

/**
 * Parses `salt_hex:dk_hex` from `storedHex`, re-derives with scrypt, and compares.
 * The salt is embedded in the stored value (written by `generate-import-csv.mjs`).
 * Params from env: `SCRYPT_N` (must be power of 2, default 16384), `SCRYPT_R` (8),
 * `SCRYPT_P` (1), `SCRYPT_KEYLEN` (64).
 */
export function verifyScryptHex(
  plainPassword: string,
  storedHex: string,
): boolean {
  const trimmed = storedHex.trim();
  const colon = trimmed.indexOf(':');
  if (colon === -1) return false;
  const saltHex = trimmed.slice(0, colon);
  const dkHex = trimmed.slice(colon + 1);
  if (!saltHex || !dkHex) return false;
  const keylen = parsePositiveInt('SCRYPT_KEYLEN', process.env.SCRYPT_KEYLEN, 64);
  const N = parseScryptN();
  const r = parsePositiveInt('SCRYPT_R', process.env.SCRYPT_R, 8);
  const p = parsePositiveInt('SCRYPT_P', process.env.SCRYPT_P, 1);
  const saltBuf = Buffer.from(saltHex, 'hex');
  const derived = scryptSync(plainPassword, saltBuf, keylen, { N, r, p });
  return timingSafeEqualHex(derived.toString('hex'), dkHex);
}
