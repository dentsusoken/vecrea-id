/**
 * Env identifier set for `HASH_ALG` (consumed by `verifyPasswordHash`).
 */

export const HASH_ALGS = [
  'PLAIN_TEXT',
  /** Legacy single-step digests (migration / old systems only). */
  'MD5',
  'SHA_1',
  'SHA_128',
  'SHA_256',
  'SHA_512',
  /** PBKDF2-HMAC (salt from `HASH_SALT`). */
  'PBKDF2_SHA1',
  'PBKDF2_SHA256',
  'PBKDF2_SHA512',
  /** Adaptive password hashes (PHC string in `password_hash`). */
  'BCRYPT',
  'SCRYPT',
  'ARGON2ID',
  'ARGON2I',
  'ARGON2D',
] as const;

export type HashAlg = (typeof HASH_ALGS)[number];

export function isHashAlg(value: string): value is HashAlg {
  return (HASH_ALGS as readonly string[]).includes(value);
}
