#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/.env"

echo "=== univ-mock-idp setup ==="

# 既存の .env があればスキップ確認
if [[ -f "$ENV_FILE" ]]; then
  echo ".env already exists. Overwrite? [y/N]"
  read -r answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# 一時ディレクトリで鍵・証明書を生成
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

openssl req -x509 -newkey rsa:2048 -keyout "$TMP/key.pem" -out "$TMP/cert.pem" \
  -days 3650 -nodes -subj "/CN=univ-mock-idp" 2>/dev/null

PRIVATE_KEY_B64=$(base64 < "$TMP/key.pem" | tr -d '\n')
PUBLIC_KEY_B64=$(base64 < "$TMP/cert.pem" | tr -d '\n')

cat > "$ENV_FILE" <<EOF
ENTITY_ID=http://localhost:4000
PORT=4000
PRIVATE_KEY=${PRIVATE_KEY_B64}
PUBLIC_KEY=${PUBLIC_KEY_B64}
EOF

echo "Generated .env"
echo ""
echo "SAML_IDP_CERT (SP側の設定に使用):"
openssl x509 -in "$TMP/cert.pem" -outform DER | base64 | tr -d '\n'
echo ""
echo ""
echo "Done. Run: npm install && npm run dev"
