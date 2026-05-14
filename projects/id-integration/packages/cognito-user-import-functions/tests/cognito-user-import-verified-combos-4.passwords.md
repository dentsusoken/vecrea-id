# Companion: `cognito-user-import-verified-combos-4.csv`

The CSV includes a `password_hash` column (last column). Values are **SHA-256** (hex, lowercase) of the UTF-8 plaintext password, with **no pepper** (`HASH_SALT` unset). `parseUserInfoCsv` stores them on DynamoDB `Item.data.password_hash`. For the migration Lambda, use **`HASH_ALG=SHA_256`** so `verifyPasswordHash` matches.

| Row | `cognito:username` | `email_verified` | `phone_number_verified` | Plaintext | SHA-256 (hex) |
|-----|--------------------|------------------|---------------------------|-----------|---------------|
| 1 | `importtest-combo-tt@example.com` | true | true | `pw-e1p1` | `75529a54050aab0e94a16bfb85915cc87c340c92c2fdcc6298a8aa7cc891ac98` |
| 2 | `importtest-combo-tf@example.com` | true | false | `pw-e1p0` | `63604f73253f433c18dc5b9a6f08f79fbe5fa187370c3d766924624dd06c8982` |
| 3 | `importtest-combo-ft@example.com` | false | true | `pw-e0p1` | `c3fb2eee113de6b1cd7c629c7eacfadf8cecc4950a999470420bc6e09dff5cb8` |
| 4 | `importtest-combo-ff@example.com` | false | false | `pw-e0p0` | `0f2a8c8edf9c87b5dad8a31a84e9c3af9ff38ad71cfe762cce74c955efb8b935` |
