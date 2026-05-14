import { timingSafeEqualUtf8 } from './timingSafe';

/** Stored `password_hash` is the raw password (UTF-8). Pepper is ignored. */
export function verifyPlainText(plainPassword: string, storedHash: string): boolean {
  return timingSafeEqualUtf8(plainPassword, storedHash);
}
