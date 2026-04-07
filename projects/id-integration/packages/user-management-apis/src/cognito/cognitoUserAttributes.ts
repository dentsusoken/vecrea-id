import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Converts Cognito `AttributeType[]` into a plain string map (Name → Value).
 */
export function userAttributesToRecord(
  attributes: AttributeType[] | undefined
): Record<string, string> {
  if (!attributes?.length) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const { Name, Value } of attributes) {
    if (Name !== undefined && Value !== undefined && Value !== '') {
      out[Name] = Value;
    }
  }
  return out;
}

/**
 * Cognito boolean user attributes are stored as the strings `"true"` / `"false"`.
 */
export function cognitoBooleanStringToBoolean(
  value: string | undefined
): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const v = value.toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}
