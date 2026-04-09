import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});

/**
 * Fetches a Secrets Manager secret by id/ARN and parses `SecretString` as JSON.
 */
export async function getSecretJson<T extends Record<string, unknown>>(
  secretId: string
): Promise<T> {
  const out = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  const s = out.SecretString;
  if (s == null || s === '') {
    throw new Error(
      `Secrets Manager secret "${secretId}" has no SecretString payload.`
    );
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new Error(
      `Secrets Manager secret "${secretId}" SecretString is not valid JSON.`
    );
  }
}
