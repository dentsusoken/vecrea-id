/**
 * Lambda handler triggered by SQS: for each message (body = `CognitoImportData` JSON from
 * `queueUnverifiedUsers`), ensure the user exists in Cognito or create them, then mark the staging row
 * imported in DynamoDB. On create failure, records `error` / `errorMessage` on the staging item.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Handler, SQSEvent } from 'aws-lambda';
import { cognitoImportDataSchema } from '../schemas';
import type { CognitoImportData } from '../schemas';

/** Standard / meta columns not sent as Cognito `UserAttributes` on create. */
const SKIP_ATTRIBUTE_NAMES = new Set([
  'email_verified',
  'phone_number_verified',
  'cognito:mfa_enabled',
  'cognito:username',
  'updated_at',
]);

/**
 * Writes a structured log line, then rethrows so the Lambda invocation fails.
 * @param context Step label included in the log prefix.
 * @param error Original error or value to log and throw.
 */
function logErrorAndRethrow(context: string, error: unknown): never {
  console.error(`[importUnVerifiedUsers] ${context}`, error);
  throw error;
}

function requireEnv(name: 'COGNITO_USER_POOL_ID' | 'DDB_TABLE'): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function validateUserPayload(body: string | undefined): CognitoImportData {
  const parsed: unknown = body === undefined ? undefined : JSON.parse(body);
  return cognitoImportDataSchema.parse(parsed);
}

/**
 * Maps validated CSV-shaped user fields to Cognito `UserAttributes` (skips meta keys and empty values).
 */
function userToAttributes(user: CognitoImportData): AttributeType[] {
  const attributes: AttributeType[] = [];

  for (const [name, value] of Object.entries(user)) {
    if (SKIP_ATTRIBUTE_NAMES.has(name)) continue;
    if (value === undefined) continue;
    attributes.push({ Name: name, Value: value });
  }

  return attributes;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function userExistsInPool(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string
): Promise<boolean> {
  try {
    await cognitoClient.send(
      new AdminGetUserCommand({
        Username: username,
        UserPoolId: userPoolId,
      })
    );
    return true;
  } catch (e) {
    if (e instanceof UserNotFoundException) {
      return false;
    }
    logErrorAndRethrow('userExistsInPool', e);
  }
}

/**
 * Creates a user with `AdminCreateUser`. Omits `TemporaryPassword` so Cognito generates one per pool policy.
 * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html
 */
async function createUser(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  attributes: AttributeType[]
): Promise<void> {
  await cognitoClient.send(
    new AdminCreateUserCommand({
      Username: username,
      UserPoolId: userPoolId,
      UserAttributes: attributes,
      DesiredDeliveryMediums: ['EMAIL'],
    })
  );
}

async function updateSucceededImportStatus(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  username: string
): Promise<void> {
  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: username },
      UpdateExpression: 'SET imported = :imported',
      ExpressionAttributeValues: { ':imported': true },
    })
  );
}

async function updateFailedImportStatus(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  error: Error
): Promise<void> {
  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: username },
      UpdateExpression: 'SET #err = :errorVal, #errMsg = :errorMessageVal',
      ExpressionAttributeNames: {
        '#err': 'error',
        '#errMsg': 'errorMessage',
      },
      ExpressionAttributeValues: {
        ':errorVal': error.name,
        ':errorMessageVal': error.message,
      },
    })
  );
}

async function processRecord(
  record: SQSEvent['Records'][number],
  deps: {
    cognitoClient: CognitoIdentityProviderClient;
    ddbClient: DynamoDBDocumentClient;
    userPoolId: string;
    tableName: string;
  }
): Promise<void> {
  const { cognitoClient, ddbClient, userPoolId, tableName } = deps;
  const user = validateUserPayload(record.body);
  const username = user['cognito:username'];

  if (await userExistsInPool(cognitoClient, userPoolId, username)) {
    await updateSucceededImportStatus(ddbClient, tableName, username);
    return;
  }

  const attributes = userToAttributes(user);

  try {
    await createUser(cognitoClient, userPoolId, username, attributes);
    await updateSucceededImportStatus(ddbClient, tableName, username);
  } catch (e) {
    await updateFailedImportStatus(ddbClient, tableName, username, toError(e));
  }
}

export const handler: Handler<SQSEvent> = async (event) => {
  const userPoolId = requireEnv('COGNITO_USER_POOL_ID');
  const tableName = requireEnv('DDB_TABLE');

  const cognitoClient = new CognitoIdentityProviderClient();
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

  await Promise.all(
    event.Records.map((record) =>
      processRecord(record, {
        cognitoClient,
        ddbClient,
        userPoolId,
        tableName,
      })
    )
  );
};
