# Cognito user import functions

Package for bulk user import workflows into Amazon Cognito.

## AWS services

- **AWS Lambda** — CSV parsing, verified-user import, job orchestration steps, status checks, and enqueueing unverified users
- **AWS Step Functions** — Orchestration of the end-to-end user import job
- **Amazon Cognito** — User import job creation and execution, and user existence checks
- **Amazon DynamoDB** — Temporary storage of user records (JSON)
- **Amazon SQS** — Queueing and asynchronous processing for unverified users

## Sequence (overview)

```mermaid
sequenceDiagram
    participant P1 as au3te-ts
    participant P2@{ "type": "control" } as User Import Job(Sfn)
    participant P3 as Parse User CSV
    participant P5 as Import Verified Users
    participant P7 as Check User Import Status
    participant P8 as Queue Unverified Users
    participant P4@{ "type": "database" } as User Tmp Database
    participant P6@{ "type": "database" } as Cognito
    participant P9@{ "type": "queue" } as Unverified Users Queue
    participant P10 as Import Unverified Users
    P1->>P2: Call User Import Job
    P2->>P3: Call Parse User CSV Fn
    P3->>P3: Convert from User CSV into JSON
    P3->>P3: Validate User JSON
    P3->>P4: Register User JSON
    P3-->>P2: Return result
    par Verified Users Process
      P2->>P5: Call Import Verified Users Fn
      P5->>P4: Retrieve Verified User JSON
      P4-->>P5: User JSON
      P5->>P5: Convert from User JSON into CSV
      P5->>P6: Create Cognito User Import Job
      P6-->>P5: Job ID, CSV upload URL
      P5->>P5: Upload User CSV
      P5->>P6: Start Cognito User Import Job
      P5-->>P2: Return result
      P2->>P7: Call User Import Status Fn
      P7->>P6: Get Cognito User Import Job List
      P7->>P7: Check Import Job status
      alt Success
        P7->>P4: Update Verified Users imported status
        P7->>P2: Return success result
      else Failed or Expired or Stopped
        P7->>P2: Return error result
      else other
        P7->>P2: Return continue result
      end
    and Unverified Users Process
      P2->>P8: Call Import Unverified Users Fn
      P8->>P4: Retrieve Unverified User JSON
      P4-->>P8: User JSON
      P8->>P9: Push Unverified User JSON
      P8-->>P2: Return result
    end
    P9->>P10: Call Import Unverified Users Fn
    P10->>P6: Check user exists
    alt if user not exists
      P10->>P6: Execute create user command
    end
```
