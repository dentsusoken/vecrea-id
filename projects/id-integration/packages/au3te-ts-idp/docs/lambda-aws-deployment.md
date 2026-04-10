# Lambda デプロイ（`au3te-ts-idp`）

このパッケージを AWS Lambda に載せるときに用意する **リソース**・**IAM**・**環境変数**を整理する。ビルドは `pnpm run build` → `pnpm run zip`（`dist/index.zip` の単一 `index.js`）想定。**ハンドラ**は `index.handler`（`src/index.ts` の `handler` エクスポート）。

---

## 1. Lambda 関数設定（推奨）

| 項目 | 推奨 |
|------|------|
| ランタイム | Node.js 20.x（esbuild の `--target=node20` と一致） |
| ハンドラ | `index.handler` |
| アーキテクチャ | x86_64 または arm64（ビルド環境と揃える） |
| メモリ | 512MB〜（認可画面 HTML 生成・SDK 読み込みに余裕を） |
| タイムアウト | 30〜60 秒（外部 IdP フェデレーションや Authlete API 待ちを考慮） |

実行ロールには下記 **カスタムポリシー** に加え、ログ用に AWS 管理ポリシー **`AWSLambdaBasicExecutionRole`**（`logs:CreateLogGroup` など）を付与する。

---

## 2. 環境変数

### 2.1 必須に近い（用途別）

| 変数 | 用途 |
|------|------|
| `AU3TE_API_*` など | Authlete / au3te API クライアント（下記シークレット経由でも可） |
| `AU3TE_IDP_SECRET_ARN` | （推奨）Secrets Manager のシークレット ARN。JSON がマージされ、同じキー名の平文環境変数を上書き |
| `AU3TE_SESSION_DDB_TABLE_NAME` | 設定時、`DynamoDbSessionStore` を使用（未設定時はプロセス内メモリのみで**マルチインスタンス非対応**） |
| `AU3TE_PUBLIC_PATH_PREFIX` | （任意）`getIdpConfigRecord` 経由＝**Lambda 環境変数または IdP シークレット JSON** と同じ。明示しない場合、リクエストパスに `/api/` より前の区間があればそれを採用し、無ければ **API Gateway HTTP API v2 の `requestContext.stage`**（`$default` は除く）を付与する |

### 2.2 管理 API（`user-management-apis`）

アプリは `createManagementApis(cognito, { basePath: '/manage', getEnv: getIdpConfigRecord })` で **`/manage`** 以下にユーザー管理系をマウントしている。`getEnv` により **`AU3TE_PUBLIC_PATH_PREFIX`**（上述）と API Gateway ステージ推定が **Scalar（`/manage/docs`）と `openapi.json` の `servers`** にも反映され、ステージ付き URL で参照できる。

**セキュリティ:** IdP は `createManagementApis` に **`introspectionConfig: (c) => c.get('au3teHandlers').introspection`** を渡し、`/manage/users` は Authlete のイントロスペクションで **Bearer 必須**とする。さらに API ごとに **OAuth スコープ**（例: `manage:users:read` / `write` / `delete` / `import` — `@vecrea/user-management-apis` の `USER_MANAGEMENT_SCOPES` と一致させる）が無いと 403 となる。Authlete のクライアントに同じスコープを登録し、トークンに載せること。

| 変数 | 必須条件 | 説明 |
|------|-----------|------|
| `USER_POOL_ID` | **`/manage` の Cognito 系 CRUD を使うとき必須** | 対象 Cognito ユーザープール ID |
| `DDB_STAGING_TABLE` | **`POST .../users/import-csv` を使うとき必須** | CSV インポート先 DynamoDB テーブル名。未使用なら未設定でもよいが、そのルートを叩くと実行時エラー |

Cognito クライアントはリージョン未指定で生成されるため、**ユーザープールと同じリージョン**で Lambda を動かすか、コード側で `CognitoIdentityProviderClient` に `region` を渡す拡張が必要（現状は Lambda の `AWS_REGION` に依存）。

### 2.3 その他（フェデレーション等）

| 変数 | 説明 |
|------|------|
| `AU3TE_FEDERATION_REGISTRY` | JSON 文字列（シークレット JSON に同キーで含めても可） |
| `AU3TE_FEDERATION_DEV` | 省略時は本番相当では `NODE_ENV=production` なら `false` 扱い |

### 2.4 Optional（DynamoDB セッションの上書き）

`DynamoDbSessionStore` のコンストラクタ既定は **TTL 86400 秒（24h）**、属性名 `ttl`。工場は現状テーブル名のみ環境変数から読む。秒数を変えたい場合はコードの `createAu3teSessionStore` 拡張が必要。

---

## 3. Secrets Manager（`AU3TE_IDP_SECRET_ARN`）

- **権限**: 実行ロールに対象シークレットへの `secretsmanager:GetSecretValue`（下記 IAM 参照）。
- **シークレット値**: `SecretString` が **JSON オブジェクト**（フラットなキー・文字列値）。例: `AU3TE_API_BASE_URL`, `AU3TE_SERVICE_API_KEY`, `AU3TE_SERVICE_ACCESS_TOKEN`, `AU3TE_API_VERSION`, `AU3TE_FEDERATION_REGISTRY` など、平文環境変数と同じキー名。
- **KMS**: カスタマー管理 KMS で暗号化している場合、当該キーへの `kms:Decrypt` がロールに必要。

---

## 4. DynamoDB

### 4.1 セッションテーブル（IdP ブラウザセッション）

`AU3TE_SESSION_DDB_TABLE_NAME` 指定時に使用。

| 項目 | 設定 |
|------|------|
| パーティションキー | 属性名 **`sessionId`**（型 **文字列**） |
| その他属性 | **`payload`**（文字列）— `StoredSessionData` の JSON 文字列 |
| | **`ttl`**（数値）— Unix **秒**の失効時刻。各 `write` で `現在時刻 + 86400`（既定）をセット |
| TTL | テーブル設定で属性 **`ttl`** に TTL を**有効化**推奨（期限後の自動削除）。読み取り時にも期限切れならアプリ側で `DeleteItem` 済み |

**注意**: 既存アイテムに `ttl` がない場合、読み取りロジックは互換のため期限切れ扱いにしない。

### 4.2 ステージングテーブル（`POST /manage/users/import-csv` のみ）

`user-management-apis` の `importUsersCsvToStaging` が **PutItem** する。`DDB_STAGING_TABLE` にテーブル名を渡す。

| 項目 | 設定 |
|------|------|
| パーティションキー | 属性名 **`id`**（型 **文字列**）— Cognito CSV の `cognito:username` |
| アイテム例 | `id`, **`data`**（マップ／オブジェクト。CSV 行の検証済みフィールド）, **`imported`**（bool）, **`verified`**（bool） |

ソートキー不要。オンデマンド課金で足りることが多い。

---

## 5. `user-management-apis` が呼ぶ AWS API（IAM の根拠）

すべて **`USER_POOL_ID` のユーザープール** に対する操作。

| API 操作 | 用途 |
|----------|------|
| `cognito-idp:ListUsers` | `GET /manage/users` |
| `cognito-idp:AdminGetUser` | `GET /manage/users/:userId`、patch 後の再取得 等 |
| `cognito-idp:AdminCreateUser` | `POST /manage/users` |
| `cognito-idp:AdminUpdateUserAttributes` | `PATCH /manage/users/:userId` |
| `cognito-idp:AdminDeleteUserAttributes` | 同上（属性削除） |
| `cognito-idp:AdminEnableUser` / `AdminDisableUser` | 同上（有効／無効） |
| `cognito-idp:AdminDeleteUser` | `DELETE /manage/users/:userId` |
| `dynamodb:PutItem` | **`POST /manage/users/import-csv` のみ**（ステージングテーブル） |

管理 API を使わない構成（ルートを外す等）なら、対応する Cognito / DynamoDB 権限を削れる。

---

## 6. IAM ポリシー例（カスタムインラインポリシー）

プレースホルダを置換すること。

- `${Region}` / `${AccountId}` / `${SessionTableName}` / `${StagingTableName}` / `${UserPoolId}` / `${SecretArn}`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerGetIdpSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${Region}:${AccountId}:secret:${SecretNameOrSuffix}"
    },
    {
      "Sid": "DynamoSessionRW",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:${Region}:${AccountId}:table/${SessionTableName}"
    },
    {
      "Sid": "DynamoStagingPutForCsvImport",
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:${Region}:${AccountId}:table/${StagingTableName}"
    },
    {
      "Sid": "CognitoUserPoolAdminForManageApi",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUserAttributes",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminDisableUser"
      ],
      "Resource": "arn:aws:cognito-idp:${Region}:${AccountId}:userpool/${UserPoolId}"
    }
  ]
}
```

- **シークレットを使わない**場合は `SecretsManager` のステートメントを削除。
- **セッションを DynamoDB に載せない**場合は `DynamoSessionRW` を削除（その場合、Lambda をスケールさせるとセッションは共有されない）。
- **CSV インポートを使わない**場合は `DynamoStagingPutForCsvImport` とステージングテーブル、`DDB_STAGING_TABLE` の用意を省略可。
- **管理 API をマウントしない**改修をする場合は `CognitoUserPoolAdminForManageApi` を削除可能。

---

## 7. API Gateway / Function URL での注意

- **ステージ付き URL と同意画面**  
  `AU3TE_PUBLIC_PATH_PREFIX` は **`AU3TE_API_*` と同様**（平文環境変数 + `AU3TE_IDP_SECRET_ARN` の JSON マージ）で解決する。  
  未設定時は、(1) URL の `/api/` より前のパス (2) **`c.env.event.requestContext.stage`**（Hono Lambda が渡すイベント）(3) `X-Forwarded-Prefix` の順で推測する。HTTP API v2 では `rawPath` にステージが含まれないため、(2) が効く。

- **Cookie**: ブラウザセッションは `au3te_sid`（httpOnly）を使う。API 設定で **ステージやカスタムドメインのパス** がアプリの `Cookie` `Path=/` と一致するか確認する。
- **ボディサイズ**: CSV アップロードは API Gateway の **ペイロード上限**（通常 6〜10MB 程度）に注意。
- **タイムアウト**: API Gateway の統合タイムアウトは Lambda より短くならないよう揃える。

---

## 8. チェックリスト

- [ ] Lambda: Node 20、`index.handler`、`AWSLambdaBasicExecutionRole`
- [ ] 環境変数: Authlete 系、`USER_POOL_ID`（管理 API 利用時）、`AU3TE_SESSION_DDB_TABLE_NAME`（本番でセッション共有する場合）
- [ ] Secrets Manager: 任意。利用時は `AU3TE_IDP_SECRET_ARN` と `GetSecretValue`（＋必要なら KMS）
- [ ] DynamoDB: セッションテーブル（`sessionId` / `payload` / `ttl` + TTL 有効化推奨）
- [ ] DynamoDB: CSV 利用時のみステージングテーブル（`id` PK）と `DDB_STAGING_TABLE`
- [ ] IAM: Cognito admin API + 上記 DynamoDB + Secrets
- [ ] リージョン: Cognito・DynamoDB・Lambda・Secrets を整合させる
