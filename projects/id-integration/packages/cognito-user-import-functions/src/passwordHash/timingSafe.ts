import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time UTF-8 string comparison.
 * Both strings are SHA-256 hashed before comparison to normalise length and
 * prevent the early-return length side-channel.
 */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ha = createHash('sha256').update(Buffer.from(a, 'utf8')).digest();
  const hb = createHash('sha256').update(Buffer.from(b, 'utf8')).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Constant-time comparison of two lowercase hex strings of equal decoded length.
 * @returns `false` if either side is not valid hex or lengths mismatch.
 */
const HEX_RE = /^[0-9a-f]*$/i;

export function timingSafeEqualHex(a: string, b: string): boolean {
  const aa = a.trim().toLowerCase();
  const bb = b.trim().toLowerCase();
  if (aa.length !== bb.length || aa.length % 2 !== 0 || !HEX_RE.test(aa) || !HEX_RE.test(bb)) {
    return false;
  }
  const bufA = Buffer.from(aa, 'hex');
  const bufB = Buffer.from(bb, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
