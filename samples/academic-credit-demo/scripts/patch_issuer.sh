#!/bin/bash
# _local ファイルを patches/ から生成するスクリプト
# 使い方: git pull 後に ./generate_local.sh を実行
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# SCRIPT_DIR for reference (optional debug)
# echo "SCRIPT_DIR: $SCRIPT_DIR"
EUDIW_REPO="$SCRIPT_DIR/../../../projects/eudi-srv-web-issuing-eudiw-py"

apply_patch() {
    local original="$1"
    local output="$2"
    local patchfile="$3"
    # Docker が存在しないバインドマウントをディレクトリとして作成することがあるため削除する
    [[ -d "$output" ]] && rmdir "$output" 2>/dev/null || true
    local output_tmp="${output}.patch_tmp"
    local repatched=false
    if [[ -f "$output" ]]; then
        # output が既に存在する場合: output にパッチを当てて output を上書き
        cp "$output" "$output_tmp"
        repatched=true
    else
        # output が無い場合: original にパッチを当てて output を生成
        cp "$original" "$output_tmp"
    fi
    if patch --forward "$output_tmp" < "$patchfile" > /dev/null 2>&1; then
        mv "$output_tmp" "$output"
        if $repatched; then
            echo "  OK: $(basename "$output") (re-patched existing file)"
        else
            echo "  OK: $(basename "$output")"
        fi
    else
        rm -f "$output_tmp"
        if $repatched; then
            echo "  SKIP: $(basename "$output") (already patched or conflict)"
        else
            echo "  CONFLICT: $(basename "$patchfile") - manual resolution needed"
        fi
    fi
}


# ---- eudi-srv-web-issuing-eudiw-py ----
echo ""
echo "=== eudi-srv-web-issuing-eudiw-py ==="
cd "$EUDIW_REPO"
apply_patch app/route_oidc_local.py                       app/route_oidc_local.py                             "$SCRIPT_DIR/../patches/route_oidc.patch"
apply_patch app/app_config/config_countries_local.py      app/app_config/config_countries_local.py            "$SCRIPT_DIR/../patches/config_countries.patch"
apply_patch app/app_config/config_service_local.py        app/app_config/config_service_local.py              "$SCRIPT_DIR/../patches/config_service.patch"
apply_patch docker-compose.yml                            docker-compose.yml                                  "$SCRIPT_DIR/../patches/docker-compose.patch"

echo ""
echo "Done!"
