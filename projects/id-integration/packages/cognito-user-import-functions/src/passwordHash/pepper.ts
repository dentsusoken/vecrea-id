/**
 * Builds the byte sequence many legacy systems hash: `pepper || password` (UTF-8).
 * When `pepper` is empty, returns the password bytes only.
 */
export function pepperedPasswordUtf8(
  password: string,
  pepper: string | undefined
): Buffer {
  const p = pepper ?? '';
  if (p === '') {
    return Buffer.from(password, 'utf8');
  }
  return Buffer.concat([Buffer.from(p, 'utf8'), Buffer.from(password, 'utf8')]);
}
