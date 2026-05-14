import { createHash } from 'node:crypto';
import { pepperedPasswordUtf8 } from './pepper';
import { timingSafeEqualHex } from './timingSafe';

const DIGEST_ALGOS: Record<
  'MD5' | 'SHA_1' | 'SHA_128' | 'SHA_256' | 'SHA_512',
  (material: Buffer) => string
> = {
  MD5(material) {
    return createHash('md5').update(material).digest('hex');
  },
  SHA_1(material) {
    return createHash('sha1').update(material).digest('hex');
  },
  /**
   * Non-standard label: first 128 bits of SHA-256, as lowercase hex (32 chars).
   */
  SHA_128(material) {
    const full = createHash('sha256').update(material).digest();
    return full.subarray(0, 16).toString('hex');
  },
  SHA_256(material) {
    return createHash('sha256').update(material).digest('hex');
  },
  SHA_512(material) {
    return createHash('sha512').update(material).digest('hex');
  },
};

export function verifySimpleDigest(
  alg: keyof typeof DIGEST_ALGOS,
  plainPassword: string,
  storedHex: string,
  pepper: string | undefined
): boolean {
  const material = pepperedPasswordUtf8(plainPassword, pepper);
  const expectedHex = DIGEST_ALGOS[alg](material);
  return timingSafeEqualHex(expectedHex, storedHex.trim());
}
