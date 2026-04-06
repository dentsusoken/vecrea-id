/// <reference types="node" />
import { randomBytes } from 'crypto';
import { createHash, pbkdf2Sync } from 'crypto';
import { argon2id, bcrypt } from 'hash-wasm';
import { describe, expect, it, vi } from 'vitest';
import { verifyPasswordHash } from '../verifyPasswordHash';

describe('verifyPasswordHash', () => {
  it('PLAIN_TEXT: accepts matching password; pepper ignored', async () => {
    await expect(
      verifyPasswordHash('secret', 'secret', 'PLAIN_TEXT', 'pepper')
    ).resolves.toBe(true);
    await expect(
      verifyPasswordHash('secret', 'other', 'PLAIN_TEXT', undefined)
    ).resolves.toBe(false);
  });

  it('undefined HASH_ALG behaves as PLAIN_TEXT', async () => {
    await expect(
      verifyPasswordHash('x', 'x', undefined, 'ignored')
    ).resolves.toBe(true);
  });

  it('MD5: hex(pepper || password)', async () => {
    const stored = createHash('md5')
      .update('app', 'utf8')
      .update('pw', 'utf8')
      .digest('hex');
    await expect(
      verifyPasswordHash('pw', stored, 'MD5', 'app')
    ).resolves.toBe(true);
    await expect(
      verifyPasswordHash('pw', stored, 'MD5', 'wrong')
    ).resolves.toBe(false);
  });

  it('PBKDF2_SHA256: matches derived hex', async () => {
    vi.stubEnv('PBKDF2_ITERATIONS', '1000');
    const salt = 'fixed-salt';
    const derived = pbkdf2Sync('pw', salt, 1000, 32, 'sha256');
    const stored = derived.toString('hex');
    await expect(
      verifyPasswordHash('pw', stored, 'PBKDF2_SHA256', salt)
    ).resolves.toBe(true);
    vi.unstubAllEnvs();
  });

  it('BCRYPT: compares PHC hash', async () => {
    const salt = randomBytes(16);
    const hash = await bcrypt({
      password: 'pw',
      salt,
      costFactor: 4,
      outputType: 'encoded',
    });
    await expect(
      verifyPasswordHash('pw', hash, 'BCRYPT', undefined)
    ).resolves.toBe(true);
    await expect(
      verifyPasswordHash('no', hash, 'BCRYPT', undefined)
    ).resolves.toBe(false);
  });

  it('ARGON2ID: compares PHC hash', async () => {
    const salt = randomBytes(16);
    const hash = await argon2id({
      password: 'pw',
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 16,
      hashLength: 32,
      outputType: 'encoded',
    });
    await expect(
      verifyPasswordHash('pw', hash, 'ARGON2ID', undefined)
    ).resolves.toBe(true);
  });

  it('SCRYPT: requires HASH_SALT (via pepper)', async () => {
    await expect(
      verifyPasswordHash('pw', '00', 'SCRYPT', undefined)
    ).rejects.toThrow('HASH_SALT is required for SCRYPT');
  });
});
