# SDK 設計仕様

## 決定事項

| #   | 方針               | 内容                                                     |
| --- | ------------------ | -------------------------------------------------------- |
| 1   | パッケージ分割     | `client`（フロント向け）と `admin`（サーバー向け）を分離 |
| 2   | SRP 自動計算       | `USER_SRP_AUTH` フローを SDK が内部で処理                |
| 3   | ステートレス       | SDK はトークンを保持しない。呼び出し元が管理             |
| 4   | チャレンジ自動処理 | `signIn()` がチャレンジフローを完結させる                |
| 5   | チャレンジ API     | コールバック方式                                         |

---

## パッケージ構成

単一リポジトリ・単一 npm パッケージ、サブパスエクスポートで分離する。

```
cognito-sdk
├── src/
│   ├── client/      # エントリ: cognito-sdk/client
│   └── admin/       # エントリ: cognito-sdk/admin
```

```typescript
// フロントエンド
import { createCognitoClient } from "cognito-sdk/client";

// サーバーサイド
import { createCognitoAdmin } from "cognito-sdk/admin";
```

**分割の理由:**

- `admin/` は AWS Credentials（SigV4）が必要なため、フロントエンドバンドルに含めるべきでない
- `client/` はブラウザ環境で動作する必要がある（Node.js 依存なし）

---

## Client API

### 初期化

```typescript
const cognito = createCognitoClient({
  region: "ap-northeast-1",
  userPoolId: "ap-northeast-1_xxxxxxxxx",
  clientId: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
});
```

### 認証

#### signIn

SRP フローを自動処理し、チャレンジが発生した場合はコールバックを呼ぶ。

```typescript
const tokens = await cognito.signIn({
  username: "user@example.com",
  password: "password",
  onChallenge: {
    mfaCode: async (type: "SMS" | "TOTP") => {
      // 呼び出し元が UI を制御して入力を受け取る
      return prompt(`${type} コードを入力:`);
    },
    newPassword: async () => {
      return prompt("新しいパスワードを入力:");
    },
    customChallenge: async (parameters) => {
      return prompt("チャレンジ回答を入力:");
    },
  },
});
// tokens: AuthTokens
```

**AuthTokens 型:**

```typescript
interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number; // 秒（デフォルト 3600）
  tokenType: "Bearer";
}
```

#### refreshTokens

```typescript
const tokens = await cognito.refreshTokens({
  refreshToken: "xxx",
});
```

#### signOut

```typescript
await cognito.signOut({
  accessToken: tokens.accessToken,
  global: true, // 全デバイスからサインアウト（GlobalSignOut）。false なら RevokeToken のみ
});
```

### サインアップ

```typescript
// 登録
await cognito.signUp({
  username: "user@example.com",
  password: "password",
  attributes: {
    email: "user@example.com",
    given_name: "太郎",
  },
});

// メール確認コード送信
await cognito.resendConfirmationCode({ username: "user@example.com" });

// 確認
await cognito.confirmSignUp({
  username: "user@example.com",
  code: "123456",
});
```

### パスワード管理

```typescript
// 変更（ログイン済みユーザー）
await cognito.changePassword({
  accessToken: tokens.accessToken,
  previousPassword: "old",
  proposedPassword: "new",
});

// リセット開始（未ログイン）
await cognito.forgotPassword({ username: "user@example.com" });

// リセット確認
await cognito.confirmForgotPassword({
  username: "user@example.com",
  code: "123456",
  newPassword: "newPassword",
});
```

### ユーザー属性

```typescript
// 取得
const user = await cognito.getUser({ accessToken: tokens.accessToken });
// user.attributes: Record<string, string>

// 更新（変更した属性に検証が必要な場合はコードを送信）
await cognito.updateUserAttributes({
  accessToken: tokens.accessToken,
  attributes: { email: "new@example.com" },
});

// メール/電話番号の確認コード再送信
await cognito.getAttributeVerificationCode({
  accessToken: tokens.accessToken,
  attributeName: "email",
});

// 確認
await cognito.verifyAttribute({
  accessToken: tokens.accessToken,
  attributeName: "email",
  code: "123456",
});
```

### MFA

```typescript
// TOTP 登録開始 → シークレットキー取得
const { secretCode } = await cognito.associateTotpToken({
  accessToken: tokens.accessToken,
});

// TOTP 登録完了
await cognito.verifyTotpToken({
  accessToken: tokens.accessToken,
  code: "123456",
  friendlyDeviceName: "My Authenticator",
});

// MFA 設定変更
await cognito.setMfaPreference({
  accessToken: tokens.accessToken,
  totp: "PREFERRED", // 'ENABLED' | 'PREFERRED' | 'DISABLED'
  sms: "DISABLED",
});
```

### WebAuthn / パスキー

```typescript
// パスキー登録開始
const options = await cognito.startPasskeyRegistration({
  accessToken: tokens.accessToken,
});

// パスキー登録完了（WebAuthn API のレスポンスを渡す）
await cognito.completePasskeyRegistration({
  accessToken: tokens.accessToken,
  credential: navigatorCredential,
  credentialName: "My Passkey",
});

// パスキー一覧・削除
const credentials = await cognito.listPasskeys({ accessToken: tokens.accessToken });
await cognito.deletePasskey({ accessToken: tokens.accessToken, credentialId: "xxx" });
```

---

## Admin API

### 初期化

```typescript
const admin = createCognitoAdmin({
  region: "ap-northeast-1",
  userPoolId: "ap-northeast-1_xxxxxxxxx",
  credentials: {
    accessKeyId: "xxx",
    secretAccessKey: "xxx",
    sessionToken: "xxx", // optional（STS 一時認証情報用）
  },
});
```

### ユーザー管理

```typescript
// 作成
await admin.users.create({
  username: 'user@example.com',
  temporaryPassword: 'Temp@1234',
  attributes: { email: 'user@example.com', email_verified: 'true' },
  sendEmail: true,  // MessageAction: 'RESEND' or 'SUPPRESS'
})

// 取得・一覧
const user = await admin.users.get({ username: 'user@example.com' })
const users = await admin.users.list({ filter: 'email = "user@example.com"', limit: 10 })
const allUsers = await admin.users.listAll()  // ページネーション自動

// 更新・削除
await admin.users.updateAttributes({ username, attributes: { ... } })
await admin.users.setPassword({ username, password: 'New@1234', permanent: true })
await admin.users.delete({ username })

// 状態変更
await admin.users.enable({ username })
await admin.users.disable({ username })
await admin.users.confirmSignUp({ username })
await admin.users.resetPassword({ username })
await admin.users.signOutGlobally({ username })
```

### グループ管理

```typescript
await admin.groups.create({ groupName: "admins", description: "管理者", precedence: 1 });
await admin.groups.delete({ groupName: "admins" });
const groups = await admin.groups.list();

await admin.groups.addUser({ groupName: "admins", username });
await admin.groups.removeUser({ groupName: "admins", username });
const userGroups = await admin.groups.listForUser({ username });
const groupUsers = await admin.groups.listUsers({ groupName: "admins" });
```

### Admin 認証

```typescript
// サーバーサイドで直接認証（SRP なし）
const tokens = await admin.auth.signIn({
  username: "user@example.com",
  password: "password",
  clientId: "xxx", // UserPool Client ID
});
```

---

## エラーハンドリング

Cognito の例外コードを型付きクラスに変換する。

```typescript
import { CognitoError, CognitoErrorCode } from 'cognito-sdk/client'

try {
  await cognito.signIn({ ... })
} catch (err) {
  if (err instanceof CognitoError) {
    switch (err.code) {
      case CognitoErrorCode.UserNotFound:
        // ...
      case CognitoErrorCode.NotAuthorized:
        // ...
      case CognitoErrorCode.UserNotConfirmed:
        // ...
    }
  }
}
```

**主要エラーコード:**

| CognitoErrorCode      | 元の AWS エラー                | 説明                           |
| --------------------- | ------------------------------ | ------------------------------ |
| UserNotFound          | UserNotFoundException          | ユーザーが存在しない           |
| NotAuthorized         | NotAuthorizedException         | 認証失敗（パスワード不正など） |
| UserNotConfirmed      | UserNotConfirmedException      | メール未確認                   |
| CodeMismatch          | CodeMismatchException          | 確認コードが不正               |
| CodeExpired           | ExpiredCodeException           | 確認コードが期限切れ           |
| UsernameExists        | UsernameExistsException        | ユーザー名が重複               |
| TooManyRequests       | TooManyRequestsException       | レート制限                     |
| PasswordResetRequired | PasswordResetRequiredException | パスワードリセットが必要       |
| InvalidPassword       | InvalidPasswordException       | パスワードポリシー違反         |
| InvalidParameter      | InvalidParameterException      | パラメータ不正                 |

---

## 確定した追加決定事項

| #   | 項目          | 決定                         | 理由                                                                 |
| --- | ------------- | ---------------------------- | -------------------------------------------------------------------- |
| 6   | パッケージ名  | `@vecrea/cognito-sdk`        | スコープ付きで名前衝突を防ぐ                                         |
| 7   | `listAll*`    | **提供する**                 | ページネーションのボイラープレートを毎回書くのを避けるため           |
| 8   | デバイス管理  | **client に含める**          | リメンバードデバイスは MFA スキップと連動するため auth フローの一部  |
| 9   | Identity Pool | **今回のスコープ外**         | User Pool に集中。後で `@vecrea/cognito-sdk/identity` として追加可能 |
| 10  | 動作環境      | **ブラウザ・Node.js 両対応** | `client/` は SSR や Lambda オーソライザーでも使えるようにする        |

---

## 全決定事項まとめ

```
@vecrea/cognito-sdk
├── /client   ブラウザ・Node.js 両対応、AccessToken はステートレス（呼び出し元管理）
└── /admin    Node.js 専用、IAM Credentials（SigV4）必須
```

- SRP (USER_SRP_AUTH) フローは client が内部で自動計算
- signIn() はチャレンジをコールバック方式で自動ハンドリング → AuthTokens を返す
- Admin の list 系は `list()` (1ページ) と `listAll()` (全件自動) を両方提供
- エラーは CognitoError クラス + CognitoErrorCode enum に変換
- スコープ: User Pool のみ（Identity Pool は将来拡張）
