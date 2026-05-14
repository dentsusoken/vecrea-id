Run the CSV generation script for the user management import feature.

Arguments (optional): $ARGUMENTS

Steps:
1. Determine the options from $ARGUMENTS. Supported flags:
   - `--output <dir>`       Output directory relative to project root (default: data). Filename is always generate-<random>.csv
   - `--algorithm <algo>`   Hash algorithm (default: SHA_256). Valid values:
       PLAIN_TEXT, MD5, SHA_1, SHA_128, SHA_256, SHA_512,
       PBKDF2_SHA1, PBKDF2_SHA256, PBKDF2_SHA512,
       BCRYPT, SCRYPT, ARGON2ID, ARGON2I, ARGON2D
   - `--count <n>`          Number of users to generate (default: 4, minimum 4)

2. Always pass `--login-email` using the operator email from CLAUDE.md (`# userEmail`).

3. Run the script from the project root:
   ```
   node scripts/generate-import-csv.mjs --login-email <userEmail> [user-provided flags]
   ```

4. Report the output path and a summary of the generated rows (username, verification pattern).

Notes:
- At least 4 users are always generated to cover all email_verified × phone_number_verified patterns.
- The first user always uses the login user's email address.
- BCRYPT requires the `bcrypt` package; ARGON2* require the `argon2` package.
  If the package is missing, inform the user and suggest: `pnpm add -D bcrypt` or `pnpm add -D argon2`.
- password_hash for keyed derivations (PBKDF2, SCRYPT) is encoded as `salt_hex:derived_key_hex`.
