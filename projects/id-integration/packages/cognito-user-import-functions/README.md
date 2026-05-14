# Cognito user import functions

Package for bulk user import workflows into Amazon Cognito.

## Documentation

- [IAM roles and policies](docs/iam-roles-and-policies.md) — trust policies, Lambda / Step Functions / Cognito import logging roles, and JSON policy mapping

## AWS services

- **AWS Lambda** — `parseUserInfoCsv` (CSV → staging), **Migrate user Lambda** (`userMigrationTrigger`), plus optional verified import, status checks, queue/unverified flows
- **AWS Step Functions** — Optional orchestration (e.g. parse-only or full import pipeline)
- **Amazon Cognito** — User pools, bulk import jobs, and **Migrate user Lambda trigger** on first sign-in
- **Amazon DynamoDB** — Staging table for parsed rows (`Item.data`, including optional `password_hash`)
- **Amazon SQS** — Optional queue for unverified-user follow-up

## Sequence (overview)

Staged CSV load (**Parse User CSV**) and lazy migration on first sign-in (**Migrate user Lambda trigger** — [AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html) name; `triggerSource` e.g. `UserMigration_Authentication`).

```mermaid
sequenceDiagram
    participant Caller as "Operator or client"
    participant Sfn as "Step Functions optional"
    participant Parse as parseUserInfoCsv
    participant DDB as "DynamoDB staging"
    participant Pool as "Cognito User Pool"
    participant Migrate as "userMigrationTrigger"
    Caller->>Sfn: Start state machine or invoke Parse Lambda directly
    Sfn->>Parse: Invoke USER_INFO_CSV and DDB_TABLE
    Parse->>Parse: Parse CSV and validate rows
    Parse->>DDB: PutItem staging rows
    Parse-->>Sfn: Complete
    Note over Pool,Migrate: User signs in, not in pool yet
    Pool->>Migrate: Migrate user Lambda trigger
    Migrate->>DDB: GetItem by username
    Migrate->>Migrate: verifyPasswordHash vs data.password_hash
    Migrate-->>Pool: response.userAttributes
    Pool->>Pool: Create user from Lambda response
```
