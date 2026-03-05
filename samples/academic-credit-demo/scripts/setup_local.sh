#!/bin/bash
# デモをローカルで動かすためのセットアップスクリプト
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OIDC_REPO="$REPO_ROOT/projects/eudi-srv-issuer-oidc-py"
EUDIW_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-eudiw-py"
FRONTEND_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-frontend-eudiw-py"

echo "=== univ-credit-demo local setup ==="
echo "REPO_ROOT: $REPO_ROOT"
echo ""

# ---------------------------------------------------------------------------
# 1. サブモジュールの存在確認と初期化
# ---------------------------------------------------------------------------
need_submodule=0
for dir in "$OIDC_REPO" "$EUDIW_REPO" "$FRONTEND_REPO"; do
    if [[ ! -d "$dir" ]] || [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
        need_submodule=1
        break
    fi
done

if [[ $need_submodule -eq 1 ]]; then
    echo "=== Initializing submodules (git submodule update --init --recursive) ==="
    cd "$REPO_ROOT"
    git submodule update --init --recursive
    echo ""
else
    echo "=== Submodules already present ==="
    echo ""
fi


# ---------------------------------------------------------------------------
# 2. eudi-srv-issuer-oidc-py: generate_local.sh
# ---------------------------------------------------------------------------
echo "=== eudi-srv-issuer-oidc-py: generate_local.sh ==="
cd "$OIDC_REPO"
bash script/generate_local.sh
echo ""

# ---------------------------------------------------------------------------
# 3. univ-credit-demo: patch_issuer.sh（eudiw 等へのパッチ適用）
# ---------------------------------------------------------------------------
echo "=== univ-credit-demo: patch_issuer.sh ==="
bash "$SCRIPT_DIR/patch_issuer.sh"
echo ""

# ---------------------------------------------------------------------------
# 4. eudi-srv-issuer-oidc-py: 証明書セットアップ
# ---------------------------------------------------------------------------
echo "=== eudi-srv-issuer-oidc-py: setup-certs.sh ==="
cd "$OIDC_REPO"
bash script/setup-certs.sh
echo ""

# ---------------------------------------------------------------------------
# 5. academic_credit_jwt_vc.json を credentials_supported にコピー
# ---------------------------------------------------------------------------
CRED_SUPPORTED="$EUDIW_REPO/app/metadata_config/credentials_supported"
SRC_JSON="$SCRIPT_DIR/../resource/academic_credit_jwt_vc.json"

echo "=== Copying academic_credit_jwt_vc.json ==="
mkdir -p "$CRED_SUPPORTED"
cp "$SRC_JSON" "$CRED_SUPPORTED/academic_credit_jwt_vc.json"
echo "  OK: $CRED_SUPPORTED/academic_credit_jwt_vc.json"
echo ""

echo "Done! Local demo setup complete."
