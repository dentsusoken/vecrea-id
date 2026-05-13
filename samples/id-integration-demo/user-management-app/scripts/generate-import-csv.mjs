#!/usr/bin/env node
/**
 * Generates a sample CSV for /import with all 22 columns.
 *
 * Usage:
 *   node scripts/generate-import-csv.mjs [options]
 *
 * Options:
 *   --output <path>        Output directory (default: data). Filename is always generate-<random>.csv
 *   --algorithm <algo>     Hash algorithm for password_hash (default: SHA_256)
 *   --count <n>            Total number of users to generate (default: 4, min 4)
 *   --login-email <email>  Email address of the current operator (required)
 *
 * Supported algorithms:
 *   PLAIN_TEXT, MD5, SHA_1, SHA_128, SHA_256, SHA_512,
 *   PBKDF2_SHA1, PBKDF2_SHA256, PBKDF2_SHA512,
 *   BCRYPT, SCRYPT, ARGON2ID, ARGON2I, ARGON2D
 *
 * Note: BCRYPT requires 'bcrypt' package; ARGON2* require 'argon2' package.
 */

import { createHash, randomBytes, pbkdf2Sync, scryptSync } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const outputDirArg = getArg('--output')       ?? 'data';
const algorithmArg = (getArg('--algorithm')   ?? 'SHA_256').toUpperCase();
const countArg     = Math.max(4, parseInt(getArg('--count') ?? '4', 10));
const loginEmail   = getArg('--login-email');

if (!loginEmail) {
  console.error('Error: --login-email <email> is required.');
  process.exit(1);
}

const outputDir  = resolve(PROJECT_ROOT, outputDirArg);
const fileId     = randomBytes(6).toString('hex');
const outputPath = join(outputDir, `generate-${fileId}.csv`);

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 100_000;

/**
 * Hash a random plaintext with the specified algorithm.
 * Returns a hex-encoded string.
 * For keyed derivations (PBKDF2, SCRYPT) the format is: salt_hex:derived_hex
 */
async function hashPassword(plaintext, algorithm) {
  const input = Buffer.from(plaintext, 'utf8');

  switch (algorithm) {
    case 'PLAIN_TEXT':
      return input.toString('hex');

    case 'MD5':
      return createHash('md5').update(input).digest('hex');

    case 'SHA_1':
      return createHash('sha1').update(input).digest('hex');

    case 'SHA_128':
      // SHA-128 is not a standard algorithm; implemented as the first 128 bits of SHA-256
      return createHash('sha256').update(input).digest('hex').slice(0, 32);

    case 'SHA_256':
      return createHash('sha256').update(input).digest('hex');

    case 'SHA_512':
      return createHash('sha512').update(input).digest('hex');

    case 'PBKDF2_SHA1': {
      const salt = randomBytes(16);
      const dk   = pbkdf2Sync(input, salt, PBKDF2_ITERATIONS, 20, 'sha1');
      return `${salt.toString('hex')}:${dk.toString('hex')}`;
    }

    case 'PBKDF2_SHA256': {
      const salt = randomBytes(16);
      const dk   = pbkdf2Sync(input, salt, PBKDF2_ITERATIONS, 32, 'sha256');
      return `${salt.toString('hex')}:${dk.toString('hex')}`;
    }

    case 'PBKDF2_SHA512': {
      const salt = randomBytes(16);
      const dk   = pbkdf2Sync(input, salt, PBKDF2_ITERATIONS, 64, 'sha512');
      return `${salt.toString('hex')}:${dk.toString('hex')}`;
    }

    case 'SCRYPT': {
      const salt = randomBytes(16);
      const dk   = scryptSync(input, salt, 64);
      return `${salt.toString('hex')}:${dk.toString('hex')}`;
    }

    case 'BCRYPT': {
      let bcrypt;
      try {
        bcrypt = (await import('bcrypt')).default;
      } catch {
        throw new Error("BCRYPT requires the 'bcrypt' package. Run: pnpm add -D bcrypt @types/bcrypt");
      }
      const hash = await bcrypt.hash(plaintext, 12);
      return Buffer.from(hash, 'utf8').toString('hex');
    }

    case 'ARGON2ID':
    case 'ARGON2I':
    case 'ARGON2D': {
      let argon2;
      try {
        argon2 = await import('argon2');
      } catch {
        throw new Error(`${algorithm} requires the 'argon2' package. Run: pnpm add -D argon2`);
      }
      const typeMap = { ARGON2ID: argon2.argon2id, ARGON2I: argon2.argon2i, ARGON2D: argon2.argon2d };
      const hash = await argon2.hash(plaintext, { type: typeMap[algorithm] });
      return Buffer.from(hash, 'utf8').toString('hex');
    }

    default:
      throw new Error(`Unknown algorithm: "${algorithm}". Valid options: ${VALID_ALGORITHMS.join(', ')}`);
  }
}

const VALID_ALGORITHMS = [
  'PLAIN_TEXT', 'MD5', 'SHA_1', 'SHA_128', 'SHA_256', 'SHA_512',
  'PBKDF2_SHA1', 'PBKDF2_SHA256', 'PBKDF2_SHA512',
  'BCRYPT', 'SCRYPT', 'ARGON2ID', 'ARGON2I', 'ARGON2D',
];

if (!VALID_ALGORITHMS.includes(algorithmArg)) {
  console.error(`Error: Unknown algorithm "${algorithmArg}". Valid: ${VALID_ALGORITHMS.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fake user data
// ---------------------------------------------------------------------------

const FAKE_USERS = [
  { givenName: 'James',    familyName: 'Anderson',  gender: 'male',   locale: 'en-US', zoneinfo: 'America/New_York'   },
  { givenName: 'Emily',    familyName: 'Carter',    gender: 'female', locale: 'en-US', zoneinfo: 'America/Chicago'    },
  { givenName: 'Michael',  familyName: 'Thompson',  gender: 'male',   locale: 'en-GB', zoneinfo: 'Europe/London'      },
  { givenName: 'Sophie',   familyName: 'Walker',    gender: 'female', locale: 'en-GB', zoneinfo: 'Europe/London'      },
  { givenName: 'Daniel',   familyName: 'Harris',    gender: 'male',   locale: 'en-US', zoneinfo: 'America/Los_Angeles'},
  { givenName: 'Olivia',   familyName: 'Martin',    gender: 'female', locale: 'en-AU', zoneinfo: 'Australia/Sydney'   },
  { givenName: 'William',  familyName: 'Johnson',   gender: 'male',   locale: 'en-US', zoneinfo: 'America/Chicago'    },
  { givenName: 'Charlotte',familyName: 'Robinson',  gender: 'female', locale: 'en-AU', zoneinfo: 'Australia/Melbourne'},
];

/** The 4 verification patterns that must all be present */
const VERIFICATION_PATTERNS = [
  { emailVerified: true,  phoneVerified: true  },
  { emailVerified: true,  phoneVerified: false },
  { emailVerified: false, phoneVerified: true  },
  { emailVerified: false, phoneVerified: false },
];

function randomHex(bytes = 4) {
  return randomBytes(bytes).toString('hex');
}

function randomPhone() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return `+8190${digits}`;
}

function randomPassword() {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const digits  = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  const all     = upper + lower + digits + symbols;
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const extra = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...required, ...extra].sort(() => Math.random() - 0.5).join('');
}

function randomBirthdate() {
  const y = 1970 + Math.floor(Math.random() * 40);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${m}/${d}/${y}`;
}

function buildUser(index, loginEmail) {
  const fake       = FAKE_USERS[index % FAKE_USERS.length];
  const pattern    = VERIFICATION_PATTERNS[index % 4];
  const isOperator = index === 0; // first user gets the login email

  const email = isOperator
    ? loginEmail
    : `${fake.givenName.toLowerCase()}.${fake.familyName.toLowerCase()}_${randomHex(2)}@example.com`;

  const username = email;

  const name = `${fake.givenName} ${fake.familyName}`;

  return {
    username,
    name,
    givenName:     fake.givenName,
    familyName:    fake.familyName,
    email,
    emailVerified: pattern.emailVerified,
    phone:         randomPhone(),
    phoneVerified: pattern.phoneVerified,
    gender:        fake.gender,
    birthdate:     randomBirthdate(),
    zoneinfo:      fake.zoneinfo,
    locale:        fake.locale,
    updatedAt:     Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 365),
    mfaEnabled:    false,
  };
}

// ---------------------------------------------------------------------------
// CSV encoding
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  'cognito:username', 'name', 'given_name', 'family_name', 'middle_name',
  'nickname', 'preferred_username', 'profile', 'picture', 'website',
  'email', 'email_verified', 'gender', 'birthdate', 'zoneinfo', 'locale',
  'phone_number', 'phone_number_verified', 'address',
  'updated_at', 'cognito:mfa_enabled', 'password_hash',
];

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const mdPath = join(outputDir, `generate-${fileId}.md`);

async function main() {
  console.log(`Algorithm : ${algorithmArg}`);
  console.log(`Users     : ${countArg}`);
  console.log(`Output    : ${outputPath}`);
  console.log(`Passwords : ${mdPath}`);
  console.log(`Login     : ${loginEmail}`);
  console.log('');

  const rows         = [CSV_COLUMNS.join(',')];
  const passwordRows = [];

  for (let i = 0; i < countArg; i++) {
    const user = buildUser(i, loginEmail);

    const plainPassword = randomPassword();
    const hash          = await hashPassword(plainPassword, algorithmArg);

    const cells = {
      'cognito:username':      user.username,
      'name':                  user.name,
      'given_name':            user.givenName,
      'family_name':           user.familyName,
      'middle_name':           '',
      'nickname':              '',
      'preferred_username':    '',
      'profile':               '',
      'picture':               '',
      'website':               '',
      'email':                 user.email,
      'email_verified':        String(user.emailVerified),
      'gender':                user.gender,
      'birthdate':             user.birthdate,
      'zoneinfo':              user.zoneinfo,
      'locale':                user.locale,
      'phone_number':          user.phone,
      'phone_number_verified': String(user.phoneVerified),
      'address':               '',
      'updated_at':            String(user.updatedAt),
      'cognito:mfa_enabled':   String(user.mfaEnabled),
      'password_hash':         hash,
    };

    const pattern = VERIFICATION_PATTERNS[i % 4];
    console.log(
      `  [${i + 1}] ${user.username.padEnd(36)} `
      + `email_verified=${String(pattern.emailVerified).padEnd(5)} `
      + `phone_verified=${String(pattern.phoneVerified)}`
      + (i === 0 ? '  ← login user' : '')
    );

    rows.push(CSV_COLUMNS.map((col) => csvEscape(cells[col])).join(','));
    passwordRows.push({ username: user.username, plainPassword });
  }

  const mdLines = [
    `# Passwords — generate-${fileId}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Algorithm: ${algorithmArg}`,
    '',
    '> **Warning:** This file contains plain-text passwords. Do not commit.',
    '',
    '| Username | Plain-text password |',
    '| --- | --- |',
    ...passwordRows.map(({ username, plainPassword }) => `| \`${username}\` | \`${plainPassword}\` |`),
  ];

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, rows.join('\n') + '\n', 'utf8');
  writeFileSync(mdPath, mdLines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${countArg} rows to ${outputPath}`);
  console.log(`Wrote passwords to      ${mdPath}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
