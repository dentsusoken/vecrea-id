#!/bin/bash
# local プロファイルの Docker Compose サービスをバックグラウンドで起動する
# (issuer_oidc_local, issuer_backend_local, issuer_frontend_local)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
EUDIW_REPO="$REPO_ROOT/projects/eudi-srv-web-issuing-eudiw-py"

echo "=== Starting local services (background) ==="
echo "EUDIW_REPO: $EUDIW_REPO"
echo ""

if [[ ! -d "$EUDIW_REPO" ]]; then
  echo "ERROR: $EUDIW_REPO not found. Run setup_local.sh first."
  exit 1
fi

cd "$EUDIW_REPO"
# eudiw-py の docker-compose が oidc / frontend を include しているため、
# ここで --profile local を指定すると全 local サービスが起動する
docker compose --profile local up -d

echo ""
echo "Done! Local services started in background."
echo "  - issuer_oidc_local (e.g. 6005)"
echo "  - issuer_backend_local (e.g. 5001)"
echo "  - issuer_frontend_local (e.g. 6007)"
echo "To stop: cd $EUDIW_REPO && docker compose --profile local down"
