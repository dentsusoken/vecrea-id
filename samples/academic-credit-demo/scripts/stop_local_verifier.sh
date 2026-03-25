#!/bin/bash
# local プロファイルの Docker Compose サービスを停止する
# (verifier-backend-local, verifier-ui-local, haproxy-local)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
VERIFIER_REPO="$REPO_ROOT/projects/eudi-srv-verifier-endpoint"

echo "=== Stopping local verifier services ==="
echo "VERIFIER_REPO: $VERIFIER_REPO"
echo ""

if [[ ! -d "$VERIFIER_REPO" ]]; then
  echo "ERROR: $VERIFIER_REPO not found."
  exit 1
fi

cd "$VERIFIER_REPO/docker"
docker compose --profile local down

echo ""
echo "Done! Local verifier services stopped."
