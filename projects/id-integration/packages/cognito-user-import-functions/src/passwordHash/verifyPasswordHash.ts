import { verifyArgon2Phc } from './argon2';
import { verifyBcrypt } from './bcrypt';
import { verifySimpleDigest } from './digests';
import type { HashAlg } from './hashAlgorithms';
import { verifyPbkdf2Hex } from './pbkdf2';
import { verifyPlainText } from './plainText';
import { verifyScryptHex } from './scrypt';

/**
 * Checks whether `plainPassword` matches the legacy `storedHash` using `hashAlg` and optional `pepper` (`HASH_SALT`).
 *
 * - **PLAIN_TEXT** (also when `hashAlg` is `undefined`): timing-safe equality with stored value; pepper ignored.
 * - **MD5 / SHA_***: hex digest of `pepper || password` (UTF-8), compared to stored hex.
 * - **PBKDF2_***: `plainPassword` + salt = pepper as UTF-8; iterations from `PBKDF2_ITERATIONS` (default 100000).
 * - **SCRYPT**: `plainPassword` + `HASH_SALT` required; params from `SCRYPT_N` / `SCRYPT_R` / `SCRYPT_P` / `SCRYPT_KEYLEN`.
 * - **BCRYPT / ARGON2***: library verify on PHC string; pepper ignored.
 */
export async function verifyPasswordHash(
  plainPassword: string,
  storedHash: string,
  hashAlg: HashAlg | undefined,
  pepper: string | undefined
): Promise<boolean> {
  const alg: HashAlg = hashAlg ?? 'PLAIN_TEXT';

  switch (alg) {
    case 'PLAIN_TEXT':
      return verifyPlainText(plainPassword, storedHash);

    case 'MD5':
    case 'SHA_1':
    case 'SHA_128':
    case 'SHA_256':
    case 'SHA_512':
      return verifySimpleDigest(alg, plainPassword, storedHash, pepper);

    case 'PBKDF2_SHA1':
    case 'PBKDF2_SHA256':
    case 'PBKDF2_SHA512':
      return verifyPbkdf2Hex(alg, plainPassword, storedHash, pepper);

    case 'SCRYPT':
      return verifyScryptHex(plainPassword, storedHash, pepper);

    case 'BCRYPT':
      return await verifyBcrypt(plainPassword, storedHash);

    case 'ARGON2ID':
    case 'ARGON2I':
    case 'ARGON2D':
      return verifyArgon2Phc(plainPassword, storedHash);
  }
}
