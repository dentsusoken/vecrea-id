# ユーザー管理アプリ 操作説明書

## 概要

このアプリケーションは、Amazon Cognito のユーザープールに登録されたユーザーを管理するための Web アプリです。ユーザーの一覧表示・新規作成・編集・削除、および CSV ファイルによる一括インポートができます。

---

## 目次

1. [ログイン / サインアウト](#1-ログイン--サインアウト)
2. [ユーザー一覧](#2-ユーザー一覧)
3. [ユーザー新規作成](#3-ユーザー新規作成)
4. [ユーザー詳細・編集](#4-ユーザー詳細編集)
5. [ユーザー削除](#5-ユーザー削除)
6. [CSV インポート](#6-csv-インポート)
7. [インポートステージング（レビュー）](#7-インポートステージングレビュー)
8. [データリセット（管理者専用）](#8-データリセット管理者専用)
9. [ユーザーステータス一覧](#9-ユーザーステータス一覧)

---

## 1. ログイン / サインアウト

### ログイン手順

このアプリはパスワード不要の **メール OTP 認証** を採用しています。

1. ブラウザでアプリの URL にアクセスします。未ログインの場合は自動的にログイン画面へ遷移します。
2. **Email** フィールドに登録済みのメールアドレスを入力し、**Send code** をクリックします。
3. 入力したメールアドレス宛に 6 桁のワンタイムコードが届きます。
4. **One-time code** フィールドにコードを入力し、**Sign in** をクリックします。
5. 認証が成功するとユーザー一覧画面へ遷移します。

> **注意:** 別のメールアドレスで試し直す場合は、**Use a different email** リンクをクリックしてメール入力画面に戻ります。

### サインアウト

画面右上のナビゲーションバーに表示されているメールアドレスの隣にある **Sign out** ボタンをクリックします。ログイン画面に遷移し「You are signed out.」と表示されます。

---

## 2. ユーザー一覧

**URL:** `/users`

ログイン後の最初の画面です。Cognito ユーザープールに登録されたユーザーを一覧表示します。

### 表示項目

| 列 | 説明 |
|---|---|
| User ID (sub) | Cognito が発行する固有 ID（UUID） |
| Username | ログイン識別子（サインイン名） |
| Email | メールアドレス |
| Status | アカウントのステータス（[詳細は §9 参照](#9-ユーザーステータス一覧)） |
| Enabled | アカウントが有効かどうか |
| Phone | 電話番号 |

### ユーザーの絞り込み

**Filter (this page)** 入力欄にキーワードを入力すると、現在表示されているページ内のユーザーを username・email・User ID で絞り込めます。

> **注意:** フィルターはサーバー側検索ではなく、現在のページのみが対象です。フィルター内容を変更すると最初のページに戻り、ページネーションがリセットされます。

### ページネーション

Cognito は最大 60 件ずつユーザーを返します。

- **Next page** — 次のページへ移動します。
- **Previous page** — 前のページへ戻ります。

---

## 3. ユーザー新規作成

**URL:** `/users/new`

ユーザー一覧画面の **+ New user** ボタンをクリックして開きます。

### 入力フィールド

#### 必須

| フィールド | 説明 |
|---|---|
| Username | Cognito のサインイン識別子。API のパスにも使われます。作成後は変更できません。 |

#### 連絡先（任意）

| フィールド | 説明 |
|---|---|
| Email | メールアドレス |
| Phone number | 電話番号。E.164 形式で入力します（例: `+819012345678`）。 |
| email_verified を true に設定 | チェックすると作成時にメールを確認済みにします。 |

#### プロフィール（任意）

| フィールド | 説明 |
|---|---|
| Given name | 名 |
| Family name | 姓 |
| Full name | フルネーム |

#### サインアップオプション（任意）

| フィールド | 説明 |
|---|---|
| Temporary password | 初回サインイン時に変更を求める仮パスワード。8 文字以上で、大文字・小文字・数字・記号をそれぞれ 1 文字以上含める必要があります。設定するとステータスが `FORCE_CHANGE_PASSWORD` になります。 |
| Suppress invitation message | チェックすると Cognito からの招待メールを送信しません。 |

### 作成

**Create** ボタンをクリックします。作成が成功するとそのユーザーの詳細画面へ遷移します。

---

## 4. ユーザー詳細・編集

**URL:** `/users/{username}`

ユーザー一覧の行をクリック、または **View** リンクをクリックして開きます。

### ユーザー情報（読み取り専用）

画面上部に以下の情報が表示されます。

| 項目 | 説明 |
|---|---|
| User ID (sub) | Cognito が発行する固有 ID |
| Status | アカウントのステータス |
| Enabled | 有効 / 無効 |
| Created | 作成日時 |
| Last modified | 最終更新日時 |

### 編集フォーム

以下の項目を変更して **Save changes** ボタンで保存できます。

| フィールド | 説明 |
|---|---|
| Email | メールアドレス（空にすると null が設定されます） |
| Phone number | 電話番号（E.164 形式） |
| Email verified | メール確認済みフラグ |
| Phone verified | 電話確認済みフラグ |
| Enabled | チェックを外すとユーザーを無効化します |
| Given name / Family name / Full name | プロフィール属性 |
| Other attributes | `custom:` などの追加属性。**Add attribute** で行を追加し、名前と値を入力します。**Remove** で行を削除しますが、Cognito 上の属性は削除されません（上書きのみ）。 |

> **注意:** 未保存の変更がある状態で画面を離れようとすると確認ダイアログが表示されます。

### MFA（読み取り専用）

ユーザーに MFA が設定されている場合、**MFA (read-only)** セクションが展開可能な形で表示されます。MFA 設定の変更はこの画面からは行えません。

### すべての Cognito 属性（JSON）

**All Cognito attributes (JSON)** セクションを展開すると、Cognito が保持しているすべての属性を JSON 形式で確認できます。

---

## 5. ユーザー削除

ユーザー詳細画面の **Delete user** ボタンから削除できます。削除は 2 ステップの確認を経て実行されます。

### 手順

1. **Delete user** ボタンをクリックします。
2. 確認ダイアログ（Step 1）が表示されます。内容を確認して **Continue** をクリックします。
3. 確認ダイアログ（Step 2）が表示されます。テキストフィールドに削除対象の **Username を正確に入力** します。Username の横にある **Copy** ボタンでクリップボードにコピーできます。
4. **Delete permanently** ボタンが有効になったらクリックします。
5. 削除が完了すると自動的にユーザー一覧画面に遷移し、「User deleted」の通知が表示されます。

> **警告:** 削除は取り消しできません。

---

## 6. CSV インポート

**URL:** `/import`

ユーザー一覧画面の **Import** ボタンをクリックして開きます。CSV ファイルを使って複数のユーザーをステージングテーブルに一括登録できます。

### テスト用 CSV の準備

#### 方法 1: Claude Code コマンドで生成する（推奨）

Claude Code が利用できる環境では、プロジェクトカスタムコマンド `/generate-import-csv` を使うのが最も簡単です。

```
/generate-import-csv
```

オプションを指定する場合は引数として渡します。

```
/generate-import-csv --algorithm BCRYPT --count 8
```

コマンドがログインユーザーのメールアドレスを自動的に使用し、生成結果のパスと各ユーザーの概要を表示します。

#### 方法 2: スクリプトを直接実行する

Claude Code が使えない場合は、プロジェクトルートで以下を実行してください。

```bash
node scripts/generate-import-csv.mjs --login-email <あなたのメールアドレス>
```

#### 共通オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `--algorithm <algo>` | `SHA_256` | パスワードハッシュアルゴリズム（`PLAIN_TEXT` / `MD5` / `SHA_256` / `BCRYPT` など） |
| `--count <n>` | `4` | 生成するユーザー数（最小 4） |
| `--output <dir>` | `data` | 出力ディレクトリ（プロジェクトルートからの相対パス） |

生成された CSV は `data/generate-<random>.csv`、対応する平文パスワード一覧は `data/generate-<random>.md` に保存されます。

> いずれの方法も使えない場合は、リポジトリに同梱のサンプルファイルをそのままお使いください。
> - CSV: `data/sample-users.csv`
> - パスワード一覧: `data/sample-users.md`

### 手順

1. **CSV file** フィールドで `.csv` ファイルを選択します。ファイルサイズは 5 MB 以下にしてください。
2. **Upload** ボタンをクリックします。
3. アップロードが完了するとステージングレビュー画面（`/import/staging`）に自動遷移します。

### CSV フォーマット

1 行目はヘッダー行です。以下の列を定義した CSV ファイルを用意してください。列の順序は問いません。Cognito の標準インポート形式とは異なる点に注意してください。

```
cognito:username,name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,cognito:mfa_enabled,password_hash
```

| 列名 | 必須 | 説明 |
| --- | --- | --- |
| `cognito:username` | ○ | ユーザー名（サインイン識別子） |
| `email` | — | メールアドレス |
| `email_verified` | — | メール確認済みフラグ（`true` / `false`） |
| `phone_number` | — | 電話番号（E.164 形式、例: `+819012345678`） |
| `phone_number_verified` | — | 電話番号確認済みフラグ（`true` / `false`） |
| `name` | — | フルネーム |
| `given_name` | — | 名 |
| `family_name` | — | 姓 |
| `middle_name` | — | ミドルネーム |
| `nickname` | — | ニックネーム |
| `preferred_username` | — | 表示名 |
| `profile` | — | プロフィール URL |
| `picture` | — | プロフィール画像 URL |
| `website` | — | Web サイト URL |
| `gender` | — | 性別 |
| `birthdate` | — | 生年月日（`MM/DD/YYYY` 形式、例: `04/17/1995`） |
| `zoneinfo` | — | タイムゾーン（例: `Asia/Tokyo`） |
| `locale` | — | ロケール（例: `ja-JP`） |
| `address` | — | 住所（JSON 文字列または文字列） |
| `updated_at` | — | 最終更新日時（Unix タイムスタンプ） |
| `cognito:mfa_enabled` | — | MFA 有効フラグ（`true` / `false`） |
| `password_hash` | — | パスワードハッシュ（移行用） |

> **注意:** `cognito:username` のみ必須です。不要な列はヘッダーから省略せず空値のままにしておくことを推奨します。

---

## 7. インポートステージング（レビュー）

**URL:** `/import/staging`

CSV アップロード後に自動遷移、またはナビゲーションから直接アクセスできます。

### 表示項目

| 列 | 説明 |
|---|---|
| id | ステージング行の固有 ID |
| Batch | インポートバッチ ID |
| Imported | 移行完了フラグ（yes / no） |
| Verified | CSV の verified フラグ |
| Data (preview) | username と email のプレビュー |
| Import error | エラーがある場合にメッセージを表示 |

---

## 8. データリセット（管理者専用）

**URL:** `/admin/data-init`

> **警告:** この機能はデモ環境専用です。ステージングテーブルの全行と Cognito ユーザープールの全ユーザーを完全に削除します。本番環境では絶対に使用しないでください。

### 手順

1. **Current scope** セクションで削除対象の件数（Staging 行数、Cognito ユーザー数）を確認します。
2. 「I understand that staging and Cognito users in this project will be permanently deleted.」チェックボックスをオンにします。
3. テキストフィールドに `DELETE ALL` と入力します。
4. **Run data reset** ボタンが有効になったらクリックします。
5. 最終確認ダイアログで **Delete all** をクリックします。
6. 処理が完了するとユーザー一覧画面に戻ります。

---

## 9. ユーザーステータス一覧

| ステータス | 説明 |
|---|---|
| `CONFIRMED` | メール確認済みの通常アカウント |
| `UNCONFIRMED` | まだ確認が完了していないアカウント |
| `FORCE_CHANGE_PASSWORD` | 仮パスワードが設定されており、初回サインイン時にパスワード変更が必要 |
| `RESET_REQUIRED` | パスワードのリセットが必要な状態 |
| `COMPROMISED` | セキュリティ上の問題により無効化されたアカウント |
| `EXTERNAL_PROVIDER` | フェデレーション（外部 IdP）経由で作成されたアカウント |
| `ARCHIVED` | アーカイブ済みアカウント |
| `UNKNOWN` | 不明なステータス |
