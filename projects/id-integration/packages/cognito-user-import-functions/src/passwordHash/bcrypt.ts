import { bcryptVerify } from 'hash-wasm';

/**
 * Verifies against a bcrypt PHC string (e.g. `$2a$...`). `HASH_SALT` (pepper) is ignored;
 * bcrypt carries its own salt in the hash.
 *
 * Uses WASM (no native addon) so bundled Lambda deployments work on any supported Node runtime.
 */
export async function verifyBcrypt(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await bcryptVerify({
      password: plainPassword,
      hash: storedHash,
    });
  } catch {
    return false;
  }
}
