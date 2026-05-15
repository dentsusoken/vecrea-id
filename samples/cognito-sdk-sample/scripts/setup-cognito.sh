#!/usr/bin/env bash
# ==============================================================================
# setup-cognito.sh
# @vecrea/cognito-sdk デモアプリ用の Cognito リソースをセットアップします。
#
# 作成されるリソース:
#   - Cognito User Pool（メール/SRP/パスワードレス/TOTP MFA 対応）
#   - Cognito App Client（全認証フロー有効）
#   - IAM ポリシー + IAM ユーザー（Admin API 用）
#   - テスト用デモユーザー
#
# 使い方:
#   bash setup-cognito.sh                        # デフォルト設定
#   bash setup-cognito.sh --region ap-northeast-1
#   bash setup-cognito.sh --name my-demo
#   bash setup-cognito.sh --webauthn-rp-id example.com --webauthn-rp-name "My App"
#   bash setup-cognito.sh --cleanup              # 作成したリソースを削除
# ==============================================================================

set -euo pipefail

# ---- デフォルト設定 ----
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
NAME_PREFIX="cognito-sdk-demo"
DEMO_USER_EMAIL="demo@example.com"
DEMO_USER_PASSWORD="Demo@12345"
WEBAUTHN_RP_ID=""
WEBAUTHN_RP_NAME=""
CLEANUP=false
STATE_FILE=".cognito-setup-state.json"

# ---- 引数パース ----
while [[ $# -gt 0 ]]; do
  case $1 in
    --region)           REGION="$2";           shift 2 ;;
    --name)             NAME_PREFIX="$2";       shift 2 ;;
    --demo-email)       DEMO_USER_EMAIL="$2";   shift 2 ;;
    --demo-password)    DEMO_USER_PASSWORD="$2";shift 2 ;;
    --webauthn-rp-id)   WEBAUTHN_RP_ID="$2";   shift 2 ;;
    --webauthn-rp-name) WEBAUTHN_RP_NAME="$2";  shift 2 ;;
    --cleanup)          CLEANUP=true;           shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ---- カラー出力 ----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ---- AWS アカウント確認 ----
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) || {
  error "AWS 認証情報が設定されていません。CloudShell で実行しているか確認してください。"
  exit 1
}
info "AWS Account: $ACCOUNT_ID  /  Region: $REGION"

# ==============================================================================
# クリーンアップモード
# ==============================================================================
if $CLEANUP; then
  step "リソースのクリーンアップ"

  if [[ ! -f "$STATE_FILE" ]]; then
    error "状態ファイル ($STATE_FILE) が見つかりません。手動で削除してください。"
    exit 1
  fi

  USER_POOL_ID=$(jq -r '.userPoolId'   "$STATE_FILE")
  IAM_USER=$(jq -r '.iamUser'          "$STATE_FILE")
  POLICY_ARN=$(jq -r '.policyArn'      "$STATE_FILE")
  ACCESS_KEY_ID=$(jq -r '.accessKeyId' "$STATE_FILE")

  info "Access Key を削除: $ACCESS_KEY_ID"
  aws iam delete-access-key --user-name "$IAM_USER" --access-key-id "$ACCESS_KEY_ID" 2>/dev/null || true

  info "IAM ユーザーからポリシーをデタッチ"
  aws iam detach-user-policy --user-name "$IAM_USER" --policy-arn "$POLICY_ARN" 2>/dev/null || true

  info "IAM ユーザーを削除: $IAM_USER"
  aws iam delete-user --user-name "$IAM_USER" 2>/dev/null || true

  info "IAM ポリシーを削除: $POLICY_ARN"
  aws iam delete-policy --policy-arn "$POLICY_ARN" 2>/dev/null || true

  info "User Pool を削除: $USER_POOL_ID"
  aws cognito-idp delete-user-pool --user-pool-id "$USER_POOL_ID" --region "$REGION" 2>/dev/null || true

  rm -f "$STATE_FILE"
  success "クリーンアップ完了"
  exit 0
fi

# ==============================================================================
# リソース作成
# ==============================================================================

# ---- 1. User Pool 作成 ----
step "User Pool を作成"

USER_POOL_JSON=$(aws cognito-idp create-user-pool \
  --region "$REGION" \
  --pool-name "${NAME_PREFIX}" \
  --username-attributes email \
  --auto-verified-attributes email \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": false,
      "RequireLowercase": false,
      "RequireNumbers": false,
      "RequireSymbols": false,
      "TemporaryPasswordValidityDays": 7
    }
  }' \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration '{"Enabled": true}' \
  --device-configuration '{
    "ChallengeRequiredOnNewDevice": false,
    "DeviceOnlyRememberedOnUserPrompt": true
  }' \
  --account-recovery-setting '{
    "RecoveryMechanisms": [
      {"Priority": 1, "Name": "verified_email"}
    ]
  }' \
  --schema '[
    {"Name": "email",       "AttributeDataType": "String", "Required": true,  "Mutable": true},
    {"Name": "given_name",  "AttributeDataType": "String", "Required": false, "Mutable": true},
    {"Name": "family_name", "AttributeDataType": "String", "Required": false, "Mutable": true},
    {"Name": "phone_number","AttributeDataType": "String", "Required": false, "Mutable": true}
  ]' \
  --user-attribute-update-settings '{
    "AttributesRequireVerificationBeforeUpdate": ["email"]
  }')

USER_POOL_ID=$(echo "$USER_POOL_JSON" | jq -r '.UserPool.Id')
success "User Pool 作成完了: $USER_POOL_ID"

# ---- 2. App Client 作成 ----
step "App Client を作成"

# 有効にする認証フロー:
#   ALLOW_USER_SRP_AUTH         → client.signIn()
#   ALLOW_USER_PASSWORD_AUTH    → client.signInWithPassword()
#   ALLOW_USER_AUTH             → client.signInWithUserAuth() (EMAIL_OTP / WebAuthn / PASSWORD)
#   ALLOW_ADMIN_USER_PASSWORD_AUTH → admin.auth.signIn()
#   ALLOW_REFRESH_TOKEN_AUTH    → client.refreshTokens()
#   ALLOW_CUSTOM_AUTH           → CUSTOM_CHALLENGE チャレンジ対応

CLIENT_JSON=$(aws cognito-idp create-user-pool-client \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "${NAME_PREFIX}-client" \
  --no-generate-secret \
  --explicit-auth-flows \
    ALLOW_USER_SRP_AUTH \
    ALLOW_USER_PASSWORD_AUTH \
    ALLOW_USER_AUTH \
    ALLOW_ADMIN_USER_PASSWORD_AUTH \
    ALLOW_REFRESH_TOKEN_AUTH \
    ALLOW_CUSTOM_AUTH \
  --auth-session-validity 3 \
  --refresh-token-validity 30 \
  --access-token-validity 60 \
  --id-token-validity 60 \
  --token-validity-units '{
    "AccessToken":  "minutes",
    "IdToken":      "minutes",
    "RefreshToken": "days"
  }' \
  --prevent-user-existence-errors ENABLED)

CLIENT_ID=$(echo "$CLIENT_JSON" | jq -r '.UserPoolClient.ClientId')
success "App Client 作成完了: $CLIENT_ID"

# ---- 3. WebAuthn リライングパーティ設定（オプション）----
if [[ -n "$WEBAUTHN_RP_ID" ]]; then
  step "WebAuthn リライングパーティを設定 (RP ID: $WEBAUTHN_RP_ID)"
  RP_NAME="${WEBAUTHN_RP_NAME:-$WEBAUTHN_RP_ID}"

  aws cognito-idp set-user-pool-web-authn-relying-party \
    --region "$REGION" \
    --user-pool-id "$USER_POOL_ID" \
    --web-authn-relying-party-id "$WEBAUTHN_RP_ID" \
    --web-authn-relying-party-name "$RP_NAME" \
    --web-authn-user-verification PREFERRED 2>/dev/null && \
    success "WebAuthn RP 設定完了" || \
    warn "WebAuthn RP 設定をスキップ（この CLI バージョンでは非対応の可能性があります）"
fi

# ---- 4. IAM ポリシー作成（Admin API 用）----
step "IAM ポリシーを作成"

USER_POOL_ARN="arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${USER_POOL_ID}"
POLICY_NAME="${NAME_PREFIX}-admin-policy"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "cognito-idp:*",
      "Resource": "${USER_POOL_ARN}"
    }
  ]
}
EOF
)

POLICY_ARN=$(aws iam create-policy \
  --policy-name "$POLICY_NAME" \
  --description "Admin access to ${USER_POOL_ID} for cognito-sdk demo" \
  --policy-document "$POLICY_DOC" \
  --query 'Policy.Arn' \
  --output text)

success "IAM ポリシー作成完了: $POLICY_ARN"

# ---- 5. IAM ユーザー作成 ----
step "IAM ユーザーを作成"

IAM_USER="${NAME_PREFIX}-admin"
aws iam create-user --user-name "$IAM_USER" > /dev/null
aws iam attach-user-policy --user-name "$IAM_USER" --policy-arn "$POLICY_ARN"

ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER")
ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT"     | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')

success "IAM ユーザー作成完了: $IAM_USER"

# ---- 6. テスト用デモユーザー作成 ----
step "テスト用デモユーザーを作成 ($DEMO_USER_EMAIL)"

aws cognito-idp admin-create-user \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$DEMO_USER_EMAIL" \
  --temporary-password "$DEMO_USER_PASSWORD" \
  --user-attributes \
    "Name=email,Value=${DEMO_USER_EMAIL}" \
    "Name=email_verified,Value=true" \
    "Name=given_name,Value=Demo" \
    "Name=family_name,Value=User" \
  --message-action SUPPRESS > /dev/null

# 仮パスワードを本パスワードに昇格（NEW_PASSWORD_REQUIRED チャレンジ不要にする）
aws cognito-idp admin-set-user-password \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$DEMO_USER_EMAIL" \
  --password "$DEMO_USER_PASSWORD" \
  --permanent

success "デモユーザー作成完了"

# ---- 7. 状態ファイル保存（クリーンアップ用）----
cat > "$STATE_FILE" <<EOF
{
  "region":         "$REGION",
  "userPoolId":     "$USER_POOL_ID",
  "clientId":       "$CLIENT_ID",
  "iamUser":        "$IAM_USER",
  "policyArn":      "$POLICY_ARN",
  "accessKeyId":    "$ACCESS_KEY_ID"
}
EOF

# ==============================================================================
# 完了 — 設定値の出力
# ==============================================================================

echo ""
echo -e "${BOLD}${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}  セットアップ完了！${NC}"
echo -e "${BOLD}${GREEN}================================================================${NC}"
echo ""
echo -e "${BOLD}▼ デモアプリの設定値${NC}"
echo ""
echo -e "${CYAN}--- Client Config ---${NC}"
echo -e "  Region:       ${YELLOW}${REGION}${NC}"
echo -e "  User Pool ID: ${YELLOW}${USER_POOL_ID}${NC}"
echo -e "  Client ID:    ${YELLOW}${CLIENT_ID}${NC}"
echo ""
echo -e "${CYAN}--- Admin Config (IAM) ---${NC}"
echo -e "  Region:            ${YELLOW}${REGION}${NC}"
echo -e "  User Pool ID:      ${YELLOW}${USER_POOL_ID}${NC}"
echo -e "  Access Key ID:     ${YELLOW}${ACCESS_KEY_ID}${NC}"
echo -e "  Secret Access Key: ${RED}${SECRET_ACCESS_KEY}${NC}"
echo ""
echo -e "${CYAN}--- テスト用ユーザー ---${NC}"
echo -e "  Email:    ${YELLOW}${DEMO_USER_EMAIL}${NC}"
echo -e "  Password: ${YELLOW}${DEMO_USER_PASSWORD}${NC}"
echo ""
if [[ -n "$WEBAUTHN_RP_ID" ]]; then
  echo -e "${CYAN}--- WebAuthn ---${NC}"
  echo -e "  RP ID:   ${YELLOW}${WEBAUTHN_RP_ID}${NC}"
  echo -e "  RP Name: ${YELLOW}${WEBAUTHN_RP_NAME:-$WEBAUTHN_RP_ID}${NC}"
  echo ""
fi
echo -e "${CYAN}--- .env.local（コピーして使用可能）---${NC}"
cat <<ENVFILE
# samples/cognito-sdk-sample/.env.local
NEXT_PUBLIC_COGNITO_REGION=${REGION}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${USER_POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${CLIENT_ID}
ENVFILE
echo ""
echo -e "${YELLOW}⚠️  Secret Access Key はこの画面にのみ表示されます。安全な場所に保存してください。${NC}"
echo -e "${YELLOW}⚠️  削除するには: bash setup-cognito.sh --cleanup${NC}"
echo ""
echo -e "状態ファイルを保存しました: ${BOLD}${STATE_FILE}${NC}"
