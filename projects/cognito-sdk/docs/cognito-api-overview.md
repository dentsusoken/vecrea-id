# Cognito API 機能一覧

SDK設計の仕様検討用リファレンス。`@aws-sdk/client-cognito-identity-provider` および `@aws-sdk/client-cognito-identity` でカバーされる全操作を整理する。

## 凡例

| 記号 | 意味 |
|------|------|
| 🔓 Public | 認証不要（ClientId のみ）、エンドユーザー向け |
| 🔑 Auth | ユーザーの AccessToken が必要 |
| 🔐 Admin | IAM 認証（SigV4）が必要、サーバーサイドのみ |

---

## 1. ユーザープール管理

プール自体の CRUD。すべて Admin 操作。

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateUserPool | 🔐 Admin | PoolName, Policies, LambdaConfig, MfaConfiguration, Schema |
| DescribeUserPool | 🔐 Admin | UserPoolId |
| UpdateUserPool | 🔐 Admin | UserPoolId, Policies, LambdaConfig |
| DeleteUserPool | 🔐 Admin | UserPoolId |
| ListUserPools | 🔐 Admin | MaxResults, NextToken |

### アプリクライアント管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateUserPoolClient | 🔐 Admin | UserPoolId, ClientName, ExplicitAuthFlows, GenerateSecret |
| DescribeUserPoolClient | 🔐 Admin | UserPoolId, ClientId |
| UpdateUserPoolClient | 🔐 Admin | UserPoolId, ClientId, ExplicitAuthFlows |
| DeleteUserPoolClient | 🔐 Admin | UserPoolId, ClientId |
| ListUserPoolClients | 🔐 Admin | UserPoolId |

### ドメイン管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateUserPoolDomain | 🔐 Admin | Domain, UserPoolId, CustomDomainConfig |
| DescribeUserPoolDomain | 🔐 Admin | Domain |
| UpdateUserPoolDomain | 🔐 Admin | Domain, ManagedLoginBrandingVersion |
| DeleteUserPoolDomain | 🔐 Admin | Domain |

---

## 2. ユーザー管理

### CRUD

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| AdminCreateUser | 🔐 Admin | UserPoolId, Username, TemporaryPassword, UserAttributes, MessageAction |
| AdminGetUser | 🔐 Admin | UserPoolId, Username |
| ListUsers | 🔐 Admin | UserPoolId, Filter, AttributesToGet, Limit |
| AdminDeleteUser | 🔐 Admin | UserPoolId, Username |
| GetUser | 🔑 Auth | AccessToken（暗黙） |
| DeleteUser | 🔑 Auth | AccessToken（暗黙） |

### ユーザー状態管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| AdminEnableUser | 🔐 Admin | UserPoolId, Username |
| AdminDisableUser | 🔐 Admin | UserPoolId, Username |
| AdminConfirmSignUp | 🔐 Admin | UserPoolId, Username |
| AdminUserGlobalSignOut | 🔐 Admin | UserPoolId, Username |
| GlobalSignOut | 🔑 Auth | AccessToken |

---

## 3. サインアップ・確認

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| SignUp | 🔓 Public | ClientId, Username, Password, UserAttributes |
| ConfirmSignUp | 🔓 Public | ClientId, Username, ConfirmationCode |
| ResendConfirmationCode | 🔓 Public | ClientId, Username |
| AdminConfirmSignUp | 🔐 Admin | UserPoolId, Username |

**フロー:**
1. `SignUp` → ユーザーが `UNCONFIRMED` 状態で作成される
2. メール/SMS に確認コードが送信される
3. `ConfirmSignUp` → `CONFIRMED` 状態に遷移
4. コードが期限切れの場合は `ResendConfirmationCode`

---

## 4. 認証フロー

### 主要 API

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| InitiateAuth | 🔓 Public | ClientId, AuthFlow, AuthParameters |
| RespondToAuthChallenge | 🔓 Public | ClientId, ChallengeName, ChallengeResponses, Session |
| AdminInitiateAuth | 🔐 Admin | UserPoolId, ClientId, AuthFlow, AuthParameters |
| AdminRespondToAuthChallenge | 🔐 Admin | UserPoolId, ClientId, ChallengeName, ChallengeResponses, Session |

### AuthFlow 種別

| AuthFlow | 説明 |
|----------|------|
| USER_SRP_AUTH | SRP プロトコルを使ったパスワード認証（推奨） |
| USER_PASSWORD_AUTH | パスワードを平文で送信（HTTPS 必須） |
| REFRESH_TOKEN_AUTH | Refresh Token を使ったトークン更新 |
| CUSTOM_AUTH | Lambda トリガーによるカスタム認証 |
| ADMIN_NO_SRP_AUTH | Admin 専用：SRP なしのパスワード認証 |

### ChallengeName 種別

| ChallengeName | 説明 |
|---------------|------|
| PASSWORD_VERIFIER | SRP パスワード検証 |
| NEW_PASSWORD_REQUIRED | 初回ログイン時のパスワード変更 |
| MFA_REQUIRED | MFA コード入力 |
| SOFTWARE_TOKEN_MFA | TOTP コード入力 |
| SELECT_MFA_TYPE | 複数 MFA が有効な場合の選択 |
| DEVICE_SRP_AUTH | デバイス SRP 認証 |
| DEVICE_PASSWORD_VERIFIER | デバイスパスワード検証 |
| CUSTOM_CHALLENGE | Lambda カスタムチャレンジ |

---

## 5. トークン管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| InitiateAuth (REFRESH_TOKEN_AUTH) | 🔓 Public | ClientId, AuthParameters: { REFRESH_TOKEN } |
| GetTokensFromRefreshToken | 🔓 Public | ClientId, RefreshToken |
| RevokeToken | 🔓 Public | Token, ClientId |
| GetSigningCertificate | 🔓 Public | UserPoolId |

**トークン種別:**
- **ID Token** (JWT): ユーザー属性情報を含む
- **Access Token** (JWT): API 認可に使用、有効期限 1 時間（デフォルト）
- **Refresh Token**: 新しいトークンセットを取得、有効期限 30 日（デフォルト）

---

## 6. パスワード管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| ForgotPassword | 🔓 Public | ClientId, Username |
| ConfirmForgotPassword | 🔓 Public | ClientId, Username, ConfirmationCode, Password |
| ChangePassword | 🔑 Auth | PreviousPassword, ProposedPassword |
| AdminSetUserPassword | 🔐 Admin | UserPoolId, Username, Password, Permanent |
| AdminResetUserPassword | 🔐 Admin | UserPoolId, Username |

**フロー（セルフサービス）:**
1. `ForgotPassword` → 検証済みメール/SMS にコード送信（有効期限 1 時間）
2. `ConfirmForgotPassword` → コードと新パスワードを送信

---

## 7. ユーザー属性

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| UpdateUserAttributes | 🔑 Auth | UserAttributes |
| DeleteUserAttributes | 🔑 Auth | UserAttributeNames |
| GetUserAttributeVerificationCode | 🔑 Auth | AttributeName |
| VerifyUserAttribute | 🔑 Auth | AttributeName, Code |
| AdminUpdateUserAttributes | 🔐 Admin | UserPoolId, Username, UserAttributes |
| AdminDeleteUserAttributes | 🔐 Admin | UserPoolId, Username, UserAttributeNames |
| AddCustomAttributes | 🔐 Admin | UserPoolId, CustomAttributes |

**標準属性（OIDC Standard Claims）:**
`email`, `email_verified`, `phone_number`, `phone_number_verified`, `name`, `given_name`, `family_name`, `middle_name`, `nickname`, `preferred_username`, `profile`, `picture`, `website`, `gender`, `birthdate`, `zoneinfo`, `locale`, `updated_at`

---

## 8. MFA 管理

### プールレベル設定

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| SetUserPoolMfaConfig | 🔐 Admin | UserPoolId, MfaConfiguration (OPTIONAL/REQUIRED/OFF), SmsConfiguration, SoftwareTokenMfaConfiguration |
| GetUserPoolMfaConfig | 🔐 Admin | UserPoolId |

### ユーザーレベル設定

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| SetUserMFAPreference | 🔑 Auth | SMSMfaSettings, SoftwareTokenMfaSettings |
| AdminSetUserMFAPreference | 🔐 Admin | UserPoolId, Username, SMSMfaSettings, SoftwareTokenMfaSettings |
| SetUserSettings | 🔑 Auth | MFAOptions |
| AdminSetUserSettings | 🔐 Admin | UserPoolId, Username, MFAOptions |

### TOTP 登録

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| AssociateSoftwareToken | 🔑 Auth | AccessToken, Session |
| VerifySoftwareToken | 🔑 Auth | AccessToken, UserCode, FriendlyDeviceName |

---

## 9. デバイス管理

### ユーザー操作

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| ConfirmDevice | 🔑 Auth | DeviceKey, DeviceSecretVerifier, FriendlyDeviceName |
| GetDevice | 🔑 Auth | DeviceKey |
| UpdateDeviceStatus | 🔑 Auth | DeviceKey, DeviceRememberedStatus |
| ForgetDevice | 🔑 Auth | DeviceKey |
| ListDevices | 🔑 Auth | Limit, PaginationToken |

### Admin 操作

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| AdminGetDevice | 🔐 Admin | UserPoolId, Username, DeviceKey |
| AdminListDevices | 🔐 Admin | UserPoolId, Username |
| AdminUpdateDeviceStatus | 🔐 Admin | UserPoolId, Username, DeviceKey, DeviceRememberedStatus |
| AdminForgetDevice | 🔐 Admin | UserPoolId, Username, DeviceKey |

---

## 10. グループ管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateGroup | 🔐 Admin | GroupName, UserPoolId, Description, RoleArn, Precedence |
| GetGroup | 🔐 Admin | GroupName, UserPoolId |
| UpdateGroup | 🔐 Admin | GroupName, UserPoolId, Description, RoleArn, Precedence |
| DeleteGroup | 🔐 Admin | GroupName, UserPoolId |
| ListGroups | 🔐 Admin | UserPoolId |
| AdminAddUserToGroup | 🔐 Admin | UserPoolId, Username, GroupName |
| AdminRemoveUserFromGroup | 🔐 Admin | UserPoolId, Username, GroupName |
| AdminListGroupsForUser | 🔐 Admin | UserPoolId, Username |
| ListUsersInGroup | 🔐 Admin | UserPoolId, GroupName |

**備考:** グループはトークンの `cognito:groups` クレームに反映される。1 ユーザーが複数グループ所属可能。

---

## 11. OAuth / OIDC・外部 IdP

### Identity Provider 管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateIdentityProvider | 🔐 Admin | UserPoolId, ProviderName, ProviderType, ProviderDetails, AttributeMapping |
| DescribeIdentityProvider | 🔐 Admin | UserPoolId, ProviderName |
| UpdateIdentityProvider | 🔐 Admin | UserPoolId, ProviderName, ProviderDetails |
| DeleteIdentityProvider | 🔐 Admin | UserPoolId, ProviderName |
| ListIdentityProviders | 🔐 Admin | UserPoolId |
| GetIdentityProviderByIdentifier | 🔐 Admin | IdpIdentifier |

**対応 ProviderType:** `SAML`, `OIDC`, `Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`

### リソースサーバー（カスタムスコープ）

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateResourceServer | 🔐 Admin | UserPoolId, Identifier, Name, Scopes |
| DescribeResourceServer | 🔐 Admin | UserPoolId, Identifier |
| UpdateResourceServer | 🔐 Admin | UserPoolId, Identifier, Scopes |
| DeleteResourceServer | 🔐 Admin | UserPoolId, Identifier |
| ListResourceServers | 🔐 Admin | UserPoolId |

### プロバイダーリンク

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| AdminLinkProviderForUser | 🔐 Admin | UserPoolId, DestinationUser, SourceUser |
| AdminDisableProviderForUser | 🔐 Admin | UserPoolId, Username, ProviderName |

---

## 12. WebAuthn / パスキー

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| StartWebAuthnRegistration | 🔑 Auth | AccessToken |
| CompleteWebAuthnRegistration | 🔑 Auth | AccessToken, CredentialName |
| ListWebAuthnCredentials | 🔑 Auth | AccessToken |
| DeleteWebAuthnCredential | 🔑 Auth | AccessToken, CredentialId |
| GetUserAuthFactors | 🔑 Auth | AccessToken |

---

## 13. セキュリティ・監査

### 脅威検知 (Advanced Security)

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| SetRiskConfiguration | 🔐 Admin | UserPoolId, AccountTakeoverRiskConfiguration, CompromisedCredentialsRiskConfiguration |
| DescribeRiskConfiguration | 🔐 Admin | UserPoolId |
| AdminListUserAuthEvents | 🔐 Admin | UserPoolId, Username, MaxResults |
| UpdateAuthEventFeedback | 🔑 Auth | EventId, FeedbackValue |
| AdminUpdateAuthEventFeedback | 🔐 Admin | UserPoolId, Username, EventId, FeedbackValue |

### ログ配信

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| SetLogDeliveryConfiguration | 🔐 Admin | UserPoolId, LogDeliveryConfiguration |
| GetLogDeliveryConfiguration | 🔐 Admin | UserPoolId |

---

## 14. ユーザー一括インポート

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| GetCSVHeader | 🔐 Admin | UserPoolId |
| CreateUserImportJob | 🔐 Admin | JobName, UserPoolId, CloudWatchLogsRoleArn |
| DescribeUserImportJob | 🔐 Admin | UserPoolId, JobId |
| StartUserImportJob | 🔐 Admin | UserPoolId, JobId |
| StopUserImportJob | 🔐 Admin | UserPoolId, JobId |
| ListUserImportJobs | 🔐 Admin | UserPoolId |

---

## 15. Identity Pool（フェデレーテッドアイデンティティ）

`@aws-sdk/client-cognito-identity` パッケージが担当。User Pool とは別サービス。

### Pool 管理

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateIdentityPool | 🔐 Admin | IdentityPoolName, AllowUnauthenticatedIdentities |
| DescribeIdentityPool | 🔐 Admin | IdentityPoolId |
| UpdateIdentityPool | 🔐 Admin | IdentityPoolId |
| DeleteIdentityPool | 🔐 Admin | IdentityPoolId |
| ListIdentityPools | 🔐 Admin | MaxResults |
| SetIdentityPoolRoles | 🔐 Admin | IdentityPoolId, Roles |
| GetIdentityPoolRoles | 🔐 Admin | IdentityPoolId |

### 認証情報取得フロー

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| GetId | 🔓 Public | IdentityPoolId, Logins |
| GetCredentialsForIdentity | 🔓 Public | IdentityId, Logins |
| GetOpenIdToken | 🔓 Public | IdentityId, Logins |

**フロー:**
1. `GetId` → Identity ID 取得（または作成）
2. `GetCredentialsForIdentity` → 一時 AWS 認証情報取得（STS の `AssumeRoleWithWebIdentity` を内部で呼ぶ）

---

## 16. UI カスタマイズ（Managed Login / Hosted UI）

| API | 区分 | 主要パラメータ |
|-----|------|--------------|
| CreateManagedLoginBranding | 🔐 Admin | UserPoolId, ClientId, Assets, PrimaryBrandingOptions |
| DescribeManagedLoginBranding | 🔐 Admin | UserPoolId |
| UpdateManagedLoginBranding | 🔐 Admin | UserPoolId, ClientId |
| DeleteManagedLoginBranding | 🔐 Admin | UserPoolId |
| SetUICustomization | 🔐 Admin | UserPoolId, ClientId, CSS, ImageUrl |
| GetUICustomization | 🔐 Admin | UserPoolId |

---

## SDK 設計上の考慮点

### 操作の分類

```
cognito-sdk
├── client/          # 🔓🔑 エンドユーザー向け操作（フロントエンド利用可）
│   ├── auth         # サインイン・サインアウト・トークン更新
│   ├── signup       # ユーザー登録・確認
│   ├── password     # パスワード変更・リセット
│   ├── user         # プロフィール・属性管理
│   ├── mfa          # MFA 設定・TOTP 登録
│   ├── device       # デバイス管理
│   └── webauthn     # パスキー登録・管理
│
└── admin/           # 🔐 サーバーサイド専用（IAM 認証が必要）
    ├── pool         # User Pool 管理
    ├── users        # ユーザー CRUD・一括操作
    ├── groups       # グループ管理
    ├── devices      # デバイス管理
    ├── security     # 脅威検知・監査ログ
    ├── idp          # 外部 IdP・SAML・OIDC 設定
    └── identity     # Identity Pool 管理
```

### 認証コンテキスト

- **Client 操作**: `UserPoolId` + `ClientId` を設定として保持
- **Admin 操作**: AWS Credentials（AccessKeyId + SecretAccessKey + Region）が必要
- **Auth 操作**: `AccessToken` をリクエストごとに渡すか、インスタンスに保持させる設計が必要

### AWS SDK との違い

| 課題 | SDK での対応 |
|------|-------------|
| SRP 計算が複雑 | `USER_SRP_AUTH` フローを内部で自動計算 |
| チャレンジのステートマシンが煩雑 | `signIn()` メソッドがチャレンジを抽象化 |
| トークンのライフサイクル管理 | 自動リフレッシュ・ストレージ抽象化 |
| エラーコードが多様 | 型付きエラークラスに変換 |
| ページネーションが手動 | `listAll*` ヘルパーで自動収集 |

---

## 参考リンク

- [Cognito User Pools API Reference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_Operations.html)
- [Authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html)
- [Identity Pools API Reference](https://docs.aws.amazon.com/cognitoidentity/latest/APIReference/API_Operations.html)
- [@aws-sdk/client-cognito-identity-provider](https://www.npmjs.com/package/@aws-sdk/client-cognito-identity-provider)
- [@aws-sdk/client-cognito-identity](https://www.npmjs.com/package/@aws-sdk/client-cognito-identity)
