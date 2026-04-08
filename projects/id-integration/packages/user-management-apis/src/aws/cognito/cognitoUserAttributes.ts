/**
 * Helpers for Cognito user attribute arrays and string-encoded booleans.
 */

import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Converts Cognito `AttributeType[]` into a plain string map (Name → Value).
 *
 * @param attributes - `UserAttributes` / `UserType.Attributes`; empty or undefined yields `{}`.
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
 * Parses Cognito boolean user attributes (stored as `"true"` / `"false"` strings).
 *
 * @param value - Raw attribute value (e.g. `email_verified`).
 * @returns `true` / `false`, or `undefined` if missing or unrecognized.
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
