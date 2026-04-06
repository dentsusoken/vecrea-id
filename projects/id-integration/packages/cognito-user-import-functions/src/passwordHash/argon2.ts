import argon2 from 'argon2';

/**
 * Verifies against an Argon2 PHC string. The embedded variant (`argon2id` / `argon2i` / `argon2d`) is read from
 * `storedHash`; `HASH_SALT` (pepper) is ignored.
 */
export async function verifyArgon2Phc(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, plainPassword);
  } catch {
    return false;
  }
}
