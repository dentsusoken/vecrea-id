# User Management App — User Guide

## Overview

This web application lets you manage users registered in an Amazon Cognito User Pool. You can list, create, edit, and delete users, and bulk-import users from a CSV file.

---

## Table of Contents

1. [Sign In / Sign Out](#1-sign-in--sign-out)
2. [User List](#2-user-list)
3. [Create a New User](#3-create-a-new-user)
4. [User Detail & Edit](#4-user-detail--edit)
5. [Delete a User](#5-delete-a-user)
6. [CSV Import](#6-csv-import)
7. [Import Staging (Review)](#7-import-staging-review)
8. [Data Reset (Admin Only)](#8-data-reset-admin-only)
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

Click the **Sign out** button next to your email address in the top-right navigation bar. You will be redirected to the sign-in page and see "You are signed out."

---

## 2. User List

**URL:** `/users`

The first screen after signing in. Displays all users registered in the Cognito User Pool.

### Columns

| Column | Description |
| --- | --- |
| User ID (sub) | Unique ID issued by Cognito (UUID) |
| Username | Sign-in identifier |
| Email | Email address |
| Status | Account status ([see §9](#9-user-status-reference)) |
| Enabled | Whether the account is active |
| Phone | Phone number |

### Filtering

Type a keyword in the **Filter (this page)** field to filter the current page by username, email, or User ID.

> **Note:** Filtering is client-side and applies only to the current page. Changing the filter resets pagination to the first page.

### Pagination

Cognito returns up to 60 users per page.

- **Next page** — go to the next page.
- **Previous page** — go to the previous page.

---

## 3. Create a New User

**URL:** `/users/new`

Click the **+ New user** button on the user list to open this page.

### Fields

#### Required

| Field | Description |
| --- | --- |
| Username | Cognito sign-in identifier. Also used in API paths. Cannot be changed after creation. |

#### Contact (optional)

| Field | Description |
| --- | --- |
| Email | Email address |
| Phone number | Phone number in E.164 format (e.g. `+819012345678`) |
| Set email_verified to true | Check to mark the email as verified at creation time |

#### Profile (optional)

| Field | Description |
| --- | --- |
| Given name | First name |
| Family name | Last name |
| Full name | Full name |

#### Sign-up Options (optional)

| Field | Description |
| --- | --- |
| Temporary password | A temporary password that the user must change on first sign-in. Must be at least 8 characters and include uppercase, lowercase, a number, and a symbol. Setting this puts the account in `FORCE_CHANGE_PASSWORD` status. |
| Suppress invitation message | Check to suppress the Cognito invitation email. |

### Create

Click **Create**. On success, you will be taken to the new user's detail page.

---

## 4. User Detail & Edit

**URL:** `/users/{username}`

Click a row or the **View** link in the user list to open this page.

### Read-only Info

The following information is shown at the top of the page.

| Field | Description |
| --- | --- |
| User ID (sub) | Unique ID issued by Cognito |
| Status | Account status |
| Enabled | Enabled / Disabled |
| Created | Creation timestamp |
| Last modified | Last updated timestamp |

### Edit Form

Edit the fields below and click **Save changes** to save.

| Field | Description |
| --- | --- |
| Email | Email address (set to null when cleared) |
| Phone number | Phone number in E.164 format |
| Email verified | Email verification flag |
| Phone verified | Phone verification flag |
| Enabled | Uncheck to disable the user |
| Given name / Family name / Full name | Profile attributes |
| Other attributes | Additional attributes such as `custom:`. Use **Add attribute** to add a row and **Remove** to delete a row. Note: removing a row does not delete the attribute from Cognito — it only overwrites the value. |

> **Note:** If you try to leave the page with unsaved changes, a confirmation dialog will appear.

### MFA (read-only)

If the user has MFA configured, an expandable **MFA (read-only)** section is shown. MFA settings cannot be changed from this page.

### All Cognito Attributes (JSON)

Expand **All Cognito attributes (JSON)** to view all attributes stored in Cognito as a JSON object.

---

## 5. Delete a User

Click the **Delete user** button on the user detail page. Deletion requires two confirmation steps.

### Steps

1. Click **Delete user**.
2. A confirmation dialog (Step 1) appears. Review the details and click **Continue**.
3. A second confirmation dialog (Step 2) appears. Type the exact **Username** of the user in the text field. Use the **Copy** button next to the username to copy it to your clipboard.
4. Click **Delete permanently** once it becomes active.
5. When deletion is complete, you are automatically redirected to the user list where a "User deleted" notification is shown.

> **Warning:** Deletion is permanent and cannot be undone.

---

## 6. CSV Import

**URL:** `/import`

Click the **Import** button on the user list to open this page. You can bulk-register multiple users into the staging table by uploading a CSV file.

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

1. Select a `.csv` file in the **CSV file** field. Files must be 5 MB or smaller.
2. Click **Upload**.
3. After a successful upload, you will be automatically redirected to the staging review page (`/import/staging`).

### CSV Format

The first row must be a header row. Prepare a CSV with the columns below. Column order does not matter. Note that this format differs from the standard Cognito import format.

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

## 7. Import Staging (Review)

**URL:** `/import/staging`

Accessible automatically after a CSV upload, or directly from the navigation.

### Columns

| Column | Description |
| --- | --- |
| id | Unique ID of the staging row |
| Batch | Import batch ID |
| Imported | Migration complete flag (yes / no) |
| Verified | Verified flag from the CSV |
| Data (preview) | Preview of username and email |
| Import error | Error message if import failed |

### Batch Filter

Immediately after a CSV upload, the view is filtered to that upload's batch ID. Click **All rows** to remove the filter and show all staging rows.

### Next Steps

After reviewing the staging data, click the **Open user list** button at the bottom of the page to go to the user list and verify the users created in Cognito.

---

## 8. Data Reset (Admin Only)

**URL:** `/admin/data-init`

> **Warning:** This feature is for demo environments only. It permanently deletes all rows in the staging table and all users in the Cognito User Pool. Never use this in production.

### Steps

1. In the **Current scope** section, confirm the number of records to be deleted (staging rows and Cognito users).
2. Check the "I understand that staging and Cognito users in this project will be permanently deleted." checkbox.
3. Type `DELETE ALL` in the text field.
4. Click **Run data reset** once it becomes active.
5. Click **Delete all** in the final confirmation dialog.
6. When the operation is complete, you will be returned to the user list.

---

## 9. User Status Reference

| Status | Description |
| --- | --- |
| `CONFIRMED` | Normal account with verified email |
| `UNCONFIRMED` | Account that has not yet been confirmed |
| `FORCE_CHANGE_PASSWORD` | Temporary password set; user must change it on first sign-in |
| `RESET_REQUIRED` | Password reset required |
| `COMPROMISED` | Account disabled due to a security concern |
| `EXTERNAL_PROVIDER` | Account created via federation (external IdP) |
| `ARCHIVED` | Archived account |
| `UNKNOWN` | Unknown status |
