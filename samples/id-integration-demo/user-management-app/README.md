# User Management App

A Next.js web application for managing users in an Amazon Cognito User Pool. Supports listing, creating, editing, and deleting users, as well as bulk importing from a CSV file.

## Prerequisites

- Node.js 20+
- pnpm
- An Amazon Cognito User Pool and App Client
- A deployed [user-management-apis](../../../projects/id-integration/packages/user-management-apis) backend
- OAuth 2.0 client credentials (M2M) for the backend API

## Setup

1. Copy the example env file and fill in the values.

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `NEXT_PUBLIC_APP_ORIGIN` | Base URL of this app (e.g. `http://localhost:3000`) |
   | `NEXT_PUBLIC_USER_POOL_ID` | Cognito User Pool ID |
   | `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito App Client ID |
   | `USER_MANAGEMENT_API_BASE_URL` | Base URL of the user-management-apis (no trailing slash) |
   | `OAUTH_TOKEN_URL` | OAuth 2.0 token endpoint |
   | `OAUTH_CLIENT_ID` | M2M client ID |
   | `OAUTH_CLIENT_SECRET` | M2M client secret |
   | `OAUTH_SCOPE` | Space-separated scopes (e.g. `manage:users:read manage:users:write`) |

2. Install dependencies.

   ```bash
   pnpm install
   ```

3. Start the development server.

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build & Start

```bash
pnpm build
pnpm start
```

## Generating Test CSV

Use the Claude Code command (recommended):

```
/generate-import-csv
```

Or run the script directly:

```bash
node scripts/generate-import-csv.mjs --login-email <your-email>
```

The generated CSV is saved to `data/generate-<random>.csv` with a companion password list at `data/generate-<random>.md`. If neither is available, use the sample files in `data/sample-users.csv` and `data/sample-users.md`.

See [`docs/user-guide.md`](docs/user-guide.md) for the full user guide. A Japanese version is available at [`docs/user-guide.ja.md`](docs/user-guide.ja.md).
