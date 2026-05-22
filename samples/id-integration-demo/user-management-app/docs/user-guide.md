# User Management App — User Guide

## Overview

This web application lets you manage users registered in an Amazon Cognito User Pool. You can list, create, edit, and delete users, and bulk-import users from a CSV file.

---

## Table of Contents

1. [Sign In / Sign Out](#1-sign-in--sign-out)
2. [User List](#2-user-list)
3. [Create a New User](#3-create-a-new-user)
4. [Edit a User](#4-edit-a-user)
5. [Delete a User](#5-delete-a-user)
6. [CSV Import](#6-csv-import)
7. [Staging](#7-staging)
8. [Data Reset](#8-data-reset)
9. [User Status Reference](#9-user-status-reference)

---

## 1. Sign In / Sign Out

### Sign In

This app uses **email OTP authentication** — no password required.

1. Open the app URL in your browser. If you are not signed in, you will be redirected to the sign-in page automatically.
2. Enter your registered email address in the **Email** field and click **Send code**.
3. A 6-digit one-time code will be sent to that address.
4. Enter the code in the **One-time code** field and click **Sign in**.
5. On success, you will be taken to the user list.

> **Note:** To try a different email address, click the **Use a different email** link to go back to the email entry screen.

### Sign Out

Click the **ログアウト** button at the bottom of the sidebar. You will be redirected to the sign-in page.

---

## 2. User List

**URL:** `/users`

The first screen after signing in. Displays all users registered in the Cognito User Pool.

### Columns

| Column | Description |
| --- | --- |
| ユーザー名 | Sign-in identifier (username) |
| メール | Email address |
| 氏名 | Full name (family_name + given_name) |
| ステータス | Account status ([see §9](#9-user-status-reference)) |
| 有効 | Whether the account is active |

### Pagination

Up to 20 users are shown per page.

- **前へ** — go to the previous page.
- **次へ** — go to the next page.

---

## 3. Create a New User

**URL:** `/users/new`

Click the **ユーザーを追加** button on the user list to open this page.

### Fields

#### Required

| Field | Description |
| --- | --- |
| ユーザー名 | Cognito sign-in identifier. Cannot be changed after creation. |

#### Optional

| Field | Description |
| --- | --- |
| 姓 / 名 | Family name / Given name (profile attributes) |
| メールアドレス | Email address |
| 電話番号 | Phone number in E.164 format (e.g. `+819012345678`) |
| 初期パスワード | Temporary password. If omitted, Cognito auto-generates one. Setting this puts the account in `FORCE_CHANGE_PASSWORD` status. |
| 招待メールを送信しない | Check to suppress the Cognito invitation email. |

### Create

Click **作成**. On success, you will be taken to the user list.

---

## 4. Edit a User

**URL:** `/users/{userId}`

Click the **編集** link in the user list to open this page.

### Read-only Info

The following information is shown at the top of the page.

| Field | Description |
| --- | --- |
| User ID | Unique ID issued by Cognito (UUID) |
| ステータス | Account status |

### Edit Form

Edit the fields below and click **保存** to save. On success, you will be taken to the user list.

| Field | Description |
| --- | --- |
| 姓 / 名 | Family name / Given name (profile attributes) |
| メールアドレス | Email address |
| メール確認済みにする | Check to set the email verification flag to true |
| 電話番号 | Phone number in E.164 format |
| アカウントを有効にする | Uncheck to disable the user |

---

## 5. Delete a User

Click the **ユーザーを削除** button on the user edit page.

### Steps

1. Click **ユーザーを削除**.
2. A confirmation dialog appears. Click **OK** to confirm.
3. When deletion is complete, you are redirected to the user list.

You can also select multiple users with checkboxes on the user list and delete them in bulk.

> **Warning:** Deletion is permanent and cannot be undone.

---

## 6. CSV Import

**URL:** `/users/import`

Click the **CSVインポート** button on the user list to open this page. You can bulk-register multiple users into the staging table by uploading a CSV file.

### Preparing a Test CSV

#### Option 1: Generate with a Claude Code command (recommended)

If you have Claude Code available, the easiest way is to use the project custom command `/generate-import-csv`.

```
/generate-import-csv
```

To pass options, include them as arguments.

```
/generate-import-csv --algorithm BCRYPT --count 8
```

The command automatically uses your login email address and prints the output path with a summary of the generated users.

#### Option 2: Run the script directly

If Claude Code is not available, run the following from the project root.

```bash
node scripts/generate-import-csv.mjs --login-email <your-email-address>
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `--algorithm <algo>` | `SHA_256` | Password hash algorithm (`PLAIN_TEXT` / `MD5` / `SHA_256` / `BCRYPT`, etc.) |
| `--count <n>` | `4` | Number of users to generate (minimum 4) |
| `--output <dir>` | `data` | Output directory relative to the project root |

The generated CSV is saved to `data/generate-<random>.csv` and the corresponding plain-text password list to `data/generate-<random>.md`.

> If neither option is available, use the sample files included in the repository.
> - CSV: `data/sample-users.csv`
> - Password list: `data/sample-users.md`

### Steps

1. Click the file selection area and choose a `.csv` file.
2. Click **インポート実行**.
3. The import result (success / failure counts) is displayed on the same page.
4. Imported data can be reviewed on the staging page (`/staging`).

### CSV Format

The first row must be a header row. Prepare a CSV with the columns below. Column order does not matter.

```
cognito:username,name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,cognito:mfa_enabled,password_hash
```

| Column | Required | Description |
| --- | --- | --- |
| `cognito:username` | Yes | Username (sign-in identifier) |
| `email` | — | Email address |
| `email_verified` | — | Email verification flag (`true` / `false`) |
| `phone_number` | — | Phone number in E.164 format (e.g. `+819012345678`) |
| `phone_number_verified` | — | Phone verification flag (`true` / `false`) |
| `name` | — | Full name |
| `given_name` | — | First name |
| `family_name` | — | Last name |
| `middle_name` | — | Middle name |
| `nickname` | — | Nickname |
| `preferred_username` | — | Display name |
| `profile` | — | Profile URL |
| `picture` | — | Profile picture URL |
| `website` | — | Website URL |
| `gender` | — | Gender |
| `birthdate` | — | Date of birth (`MM/DD/YYYY` format, e.g. `04/17/1995`) |
| `zoneinfo` | — | Time zone (e.g. `Asia/Tokyo`) |
| `locale` | — | Locale (e.g. `en-US`) |
| `address` | — | Address (JSON string or plain string) |
| `updated_at` | — | Last updated time (Unix timestamp) |
| `cognito:mfa_enabled` | — | MFA enabled flag (`true` / `false`) |
| `password_hash` | — | Password hash (for migration) |

> **Note:** Only `cognito:username` is required. It is recommended to keep all other columns in the header with empty values rather than omitting them.

---

## 7. Staging

**URL:** `/staging`

Click **ステージング** in the sidebar to access this page. You can review and delete data temporarily stored after a CSV import.

### Columns

| Column | Description |
| --- | --- |
| ID (username) | Unique ID of the staging row |
| ステータス | Import status (see below) |

### Status Values

| Display | Description |
| --- | --- |
| インポート済み | Migration to a Cognito user is complete |
| 初回ログイン待機中 | Migration is not yet complete |
| エラー | An error occurred during import processing |

### Bulk Delete

Select rows with checkboxes and click the **〇 件削除** button to delete the selected staging entries.

---

## 8. Data Reset

**URL:** `/settings`

Click **設定** in the sidebar to access this page.

> **Warning:** This feature is for demo environments only. It permanently deletes all users and all staging data. This action cannot be undone.

### Steps

1. Type `RESET` in the text field.
2. Click **全データをリセット** once it becomes active.
3. When complete, the number of deleted users and staging entries is shown on the page.

---

## 9. User Status Reference

| Status | Display | Description |
| --- | --- | --- |
| `CONFIRMED` | 確認済み | Normal account with verified email |
| `UNCONFIRMED` | 未確認 | Account that has not yet been confirmed |
| `FORCE_CHANGE_PASSWORD` | パスワード変更待ち | Temporary password set; user must change it on first sign-in |
| `RESET_REQUIRED` | リセット必要 | Password reset required |
| `COMPROMISED` | — | Account disabled due to a security concern |
| `EXTERNAL_PROVIDER` | — | Account created via federation (external IdP) |
| `ARCHIVED` | — | Archived account |
| `UNKNOWN` | — | Unknown status |
