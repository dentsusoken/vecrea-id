#!/bin/bash
# デモをローカルで動かすためのセットアップスクリプト
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OIDC_REPO="$REPO_ROOT/projects/eudi-srv-issuer-oidc-py"
EUDIW_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-eudiw-py"
FRONTEND_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-frontend-eudiw-py"
VERIFIER_REPO="$REPO_ROOT/projects/eudi-srv-verifier-endpoint"
WEB_VERIFIER_REPO="$REPO_ROOT/projects/eudi-web-verifier"

echo "=== academic-credit-demo local setup ==="
echo "REPO_ROOT: $REPO_ROOT"
echo ""

# ---------------------------------------------------------------------------
# 1. サブモジュールの存在確認と初期化
# ---------------------------------------------------------------------------
need_submodule=0
for dir in "$OIDC_REPO" "$EUDIW_REPO" "$FRONTEND_REPO" "$VERIFIER_REPO" "$WEB_VERIFIER_REPO"; do
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
# 3. academic-credit-demo: patch_issuer.sh（eudiw 等へのパッチ適用）
# ---------------------------------------------------------------------------
echo "=== academic-credit-demo: patch_issuer.sh ==="
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
# 5. eudi-srv-verifier-endpoint: 証明書セットアップ
# ---------------------------------------------------------------------------
echo "=== eudi-srv-verifier-endpoint: setup-verifier-certs.sh ==="
cd "$VERIFIER_REPO"
bash scripts/setup-verifier-certs.sh
echo ""

# ---------------------------------------------------------------------------
# 6. eudi-srv-verifier-endpoint: TLS証明書セットアップ（ローカルHTTPS用）
# ---------------------------------------------------------------------------
echo "=== eudi-srv-verifier-endpoint: setup-local-tls.sh ==="
cd "$VERIFIER_REPO"
bash scripts/setup-local-tls.sh
echo ""

# ---------------------------------------------------------------------------
# 7. eudi-web-verifier: ローカルオーバーライドファイル生成
# ---------------------------------------------------------------------------
echo "=== eudi-web-verifier: patch_nii_demo.sh ==="
bash "$WEB_VERIFIER_REPO/scripts/patch_nii_demo.sh"
echo ""

# ---------------------------------------------------------------------------
# 8. academic_credit_jwt_vc.json を credentials_supported にコピー
# ---------------------------------------------------------------------------
CRED_SUPPORTED="$EUDIW_REPO/app/metadata_config/credentials_supported"
SRC_DIR="$SCRIPT_DIR/../resource"

echo "=== Copying academic_credit_jwt_vc.json files ==="
mkdir -p "$CRED_SUPPORTED"
cp "$SRC_DIR/academic_credit_2024_fall_jwt_vc.json" "$CRED_SUPPORTED/academic_credit_2024_fall_jwt_vc.json"
echo "  OK: $CRED_SUPPORTED/academic_credit_2024_fall_jwt_vc.json"
cp "$SRC_DIR/academic_credit_2025_spring_jwt_vc.json" "$CRED_SUPPORTED/academic_credit_2025_spring_jwt_vc.json"
echo "  OK: $CRED_SUPPORTED/academic_credit_2025_spring_jwt_vc.json"
echo ""

echo "Done! Local demo setup complete."
