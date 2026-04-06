import { timingSafeEqual } from 'node:crypto';

/** Constant-time UTF-8 string comparison. */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
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
