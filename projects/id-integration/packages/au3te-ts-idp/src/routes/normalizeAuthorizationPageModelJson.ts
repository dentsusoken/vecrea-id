/**
 * Coerce federation / OIDC IdP claim payloads into shapes accepted by
 * {@link authorizationPageModelSchema} (camelCase `User`, structured `address`).
 *
 * When this normalization is skipped, `safeParse` fails and the IdP returns raw JSON
 * instead of rendering the consent page HTML.
 */

const OIDC_SNAKE_TO_USER_FIELD: Record<string, string> = {
  preferred_username: 'preferredUsername',
  phone_number: 'phoneNumber',
  phone_number_verified: 'phoneNumberVerified',
  email_verified: 'emailVerified',
  given_name: 'givenName',
  family_name: 'familyName',
  middle_name: 'middleName',
  updated_at: 'updatedAt',
};

function coerceBooleanish(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return undefined;
}

function normalizeUserClaimsObject(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  for (const [snake, camel] of Object.entries(OIDC_SNAKE_TO_USER_FIELD)) {
    if (camel in out) {
      delete out[snake];
      continue;
    }
    if (snake in out) {
      out[camel] = out[snake];
      delete out[snake];
    }
  }

  for (const key of ['emailVerified', 'phoneNumberVerified'] as const) {
    const v = out[key];
    if (v !== undefined && typeof v !== 'boolean') {
      const b = coerceBooleanish(v);
      if (b !== undefined) out[key] = b;
    }
  }

  if (typeof out.address === 'string') {
    out.address = { formatted: out.address };
  }

  if (out.loginId == null && typeof out.username === 'string') {
    out.loginId = out.username;
  }
  delete out.username;

  return out;
}

export function normalizeAuthorizationPageModelJson(input: unknown): unknown {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const root = { ...(input as Record<string, unknown>) };
  const u = root.user;
  if (u !== null && typeof u === 'object' && !Array.isArray(u)) {
    root.user = normalizeUserClaimsObject(u as Record<string, unknown>);
  }
  return root;
}
