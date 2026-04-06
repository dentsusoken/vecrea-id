import bcrypt from 'bcryptjs';

/**
 * Verifies against a bcrypt PHC string (e.g. `$2a$...`). `HASH_SALT` (pepper) is ignored;
 * bcrypt carries its own salt in the hash.
 */
export function verifyBcrypt(plainPassword: string, storedHash: string): boolean {
  return bcrypt.compareSync(plainPassword, storedHash);
}
