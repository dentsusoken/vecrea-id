#!/bin/bash
# local プロファイルの Docker Compose サービスを停止する
# (issuer_oidc_local, issuer_backend_local, issuer_frontend_local)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
EUDIW_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-eudiw-py"

echo "=== Stopping local services ==="
echo "EUDIW_REPO: $EUDIW_REPO"
echo ""

if [[ ! -d "$EUDIW_REPO" ]]; then
  echo "ERROR: $EUDIW_REPO not found."
  exit 1
fi

cd "$EUDIW_REPO"
docker compose --profile local down

echo ""
echo "Done! Local services stopped."
