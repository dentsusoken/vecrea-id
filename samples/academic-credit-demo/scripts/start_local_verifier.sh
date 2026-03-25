#!/bin/bash
# local プロファイルの Docker Compose サービスをバックグラウンドで起動する
# (verifier-backend-local, verifier-ui-local, haproxy-local)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
VERIFIER_REPO="$REPO_ROOT/projects/eudi-srv-verifier-endpoint"

echo "=== Starting local verifier services (background) ==="
echo "VERIFIER_REPO: $VERIFIER_REPO"
echo ""

if [[ ! -d "$VERIFIER_REPO" ]]; then
  echo "ERROR: $VERIFIER_REPO not found. Run setup_local.sh first."
  exit 1
fi

cd "$VERIFIER_REPO/docker"
docker compose --profile local up --build -d

echo ""
echo "Done! Local verifier services started in background."
echo "  - verifier-backend-local (8080)"
echo "  - verifier-ui-local (4200)"
echo "  - haproxy-local (443)"
echo "Open https://localhost in a browser."
echo "To stop: bash $SCRIPT_DIR/stop_local_verifier.sh"
