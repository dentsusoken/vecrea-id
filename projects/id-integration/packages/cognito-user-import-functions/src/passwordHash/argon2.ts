import { argon2Verify } from 'hash-wasm';

/**
 * Verifies against an Argon2 PHC string. The embedded variant (`argon2id` / `argon2i` / `argon2d`) is read from
 * `storedHash`; `HASH_SALT` (pepper) is ignored.
 *
 * Uses WASM (no native addon) so bundled Lambda deployments work on any supported Node runtime.
 */
export async function verifyArgon2Phc(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await argon2Verify({
      password: plainPassword,
      hash: storedHash,
    });
  } catch {
    return false;
  }
}
