/**
 * Helpers for mapping Cognito attribute maps to profile / "extra" fields in the UI.
 * Aligns with user-management-apis PATCH (top-level email, phone, verifications, enabled)
 * and `attributes` for other standard or custom keys.
 */

export const COGNITO_MANAGED_ATTR_KEYS = new Set([
  'sub',
  'email',
  'email_verified',
  'phone_number',
  'phone_number_verified',
]);

export const COGNITO_PROFILE_FORM_KEYS = ['given_name', 'family_name', 'name'] as const;
export type CognitoProfileFormKey = (typeof COGNITO_PROFILE_FORM_KEYS)[number];

export function pickProfileFromAttributes(
  attributes: Record<string, string> | undefined
): Record<CognitoProfileFormKey, string> {
  const out: Record<CognitoProfileFormKey, string> = {
    given_name: '',
    family_name: '',
    name: '',
  };
  if (!attributes) return out;
  for (const k of COGNITO_PROFILE_FORM_KEYS) {
    out[k] = attributes[k] ?? '';
  }
  return out;
}

export function pickExtraAttributes(
  attributes: Record<string, string> | undefined
): Record<string, string> {
  if (!attributes) return {};
  const out: Record<string, string> = {};
  const skip = new Set<string>([
    ...COGNITO_MANAGED_ATTR_KEYS,
    ...COGNITO_PROFILE_FORM_KEYS,
  ]);
  for (const [k, v] of Object.entries(attributes)) {
    if (!skip.has(k)) out[k] = v;
  }
  return out;
}

export function extraAttributesToRows(
  extra: Record<string, string>
): Array<{ id: string; key: string; value: string }> {
  return Object.entries(extra).map(([key, value], index) => ({
    id: `extra-${index}-${key}`,
    key,
    value,
  }));
}
