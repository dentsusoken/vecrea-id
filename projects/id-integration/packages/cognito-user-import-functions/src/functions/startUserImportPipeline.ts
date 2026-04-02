/**
 * Starts a `cognito-user-import-pipeline` Step Functions execution with input `{ USER_INFO_CSV }`
 * (matches the state machine’s `EnrichConfig` expectation after the Pass state merges placeholders).
 *
 * **Environment:** `SFN_STATE_MACHINE_ARN` (required).
 */

import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import type { Handler } from 'aws-lambda';

/** Event passed to this Lambda (e.g. from another Lambda or API Gateway proxy). */
export interface StartUserImportPipelineEvent {
  /** Cognito user-export CSV string passed through to `parseUserInfoCsv`. */
  USER_INFO_CSV: string;
  /**
   * Optional execution name. Must satisfy Step Functions naming rules (1–80 chars, etc.).
   * If omitted, the service generates a unique name.
   */
  executionName?: string;
}

/** Successful response from `StartExecution`. */
export type StartUserImportPipelineResult = {
  executionArn: string | undefined;
  startDate: string | undefined;
};

const STATE_MACHINE_ARN = process.env.SFN_STATE_MACHINE_ARN;

/**
 * @param event - `USER_INFO_CSV` required; optional `executionName` for `StartExecution`.
 * @returns `executionArn` and `startDate` from Step Functions.
 * @throws If `SFN_STATE_MACHINE_ARN` is unset or `USER_INFO_CSV` is missing/ null.
 */
export const handler: Handler<
  StartUserImportPipelineEvent,
  StartUserImportPipelineResult
> = async (event) => {
  if (!STATE_MACHINE_ARN) {
    throw new Error('SFN_STATE_MACHINE_ARN environment variable is not set');
  }

  const csv = event.USER_INFO_CSV;
  if (csv === undefined || csv === null) {
    throw new Error('USER_INFO_CSV is required');
  }

  const client = new SFNClient({});

  const output = await client.send(
    new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: event.executionName,
      input: JSON.stringify({
        USER_INFO_CSV: csv,
      }),
    })
  );

  return {
    executionArn: output.executionArn,
    startDate: output.startDate?.toISOString(),
  };
};
