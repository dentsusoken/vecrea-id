# IAM: Roles and policy mapping

Replace placeholders in the JSON files in [`../src/iam/`](../src/iam/) (such as `__REGION__`) before registering them in IAM.

## Roles (purpose and policies)

| Role purpose | Trust policy (who can assume) | Attached policy JSON |
|--------------|-------------------------------|----------------------|
| **parseUserInfoCsv** Lambda execution role | [`trust-policy-lambda.json`](../src/iam/trust-policy-lambda.json) | [`policy-lambda-parse-user-info-csv.json`](../src/iam/policy-lambda-parse-user-info-csv.json) |
| **importVerifiedUsers** Lambda execution role | Same as above | [`policy-lambda-import-verified-users.json`](../src/iam/policy-lambda-import-verified-users.json) |
| **checkImportStatus** Lambda execution role | Same as above | [`policy-lambda-check-import-status.json`](../src/iam/policy-lambda-check-import-status.json) |
| **startUserImportPipeline** Lambda execution role | Same as above | [`policy-lambda-start-user-import-pipeline.json`](../src/iam/policy-lambda-start-user-import-pipeline.json) |
| **cognito-user-import-pipeline** Step Functions execution role (attached to the state machine) | [`trust-policy-step-functions.json`](../src/iam/trust-policy-step-functions.json) | [`policy-stepfunctions-cognito-user-import-pipeline.json`](../src/iam/policy-stepfunctions-cognito-user-import-pipeline.json) |
| **Cognito import logging** (IAM role passed as `CloudWatchLogsRoleArn` on `CreateUserImportJob`) | [`trust-policy-cognito-import-logs.json`](../src/iam/trust-policy-cognito-import-logs.json) | [`policy-role-cognito-import-cloudwatch-logs.json`](../src/iam/policy-role-cognito-import-cloudwatch-logs.json) |

## Notes

- **Lambda execution roles**: You may use a separate role per function or share one role. If you share a role, **merge** the `policy-lambda-*.json` files into a single policy, or attach multiple policies to the same role.
- **CloudWatch Logs (Lambda execution logs)**: You may attach the AWS managed policy **`AWSLambdaBasicExecutionRole`** instead of inline `logs:*` (in that case you can remove the `Sid: CloudWatchLogs` statement from each `policy-lambda-*.json`).
- **Cognito logging role**: This is **not** a Lambda role; it is the ARN passed as **`CLOUD_WATCH_LOG_ROLE_ARN` in events / from `importVerifiedUsers`**. The **importVerifiedUsers** Lambda role includes **`iam:PassRole`** (see [`policy-lambda-import-verified-users.json`](../src/iam/policy-lambda-import-verified-users.json)).

## References

- Permissions when Step Functions invokes Lambda: [IAM for Lambda invocations](https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html)
- `CreateUserImportJob` and `CloudWatchLogsRoleArn`: [CreateUserImportJob API](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserImportJob.html)
