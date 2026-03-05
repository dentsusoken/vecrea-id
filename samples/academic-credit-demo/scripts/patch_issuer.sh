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
    local input_file
    if [[ -f "$output" ]]; then
        # output が既に存在する場合: output にパッチを当てて output を上書き
        input_file="$output"
        local output_tmp="${output}.patch_tmp"
        if patch --output="$output_tmp" "$input_file" < "$patchfile" > /dev/null 2>&1; then
            mv "$output_tmp" "$output"
            echo "  OK: $(basename "$output") (re-patched existing file)"
        else
            rm -f "$output_tmp"
            echo "  CONFLICT: $(basename "$patchfile") - manual resolution needed"
        fi
    else
        # output が無い場合: original にパッチを当てて output を生成
        if patch --output="$output" "$original" < "$patchfile" > /dev/null 2>&1; then
            echo "  OK: $(basename "$output")"
        else
            echo "  CONFLICT: $(basename "$patchfile") - manual resolution needed"
        fi
    fi
}


# ---- eudi-srv-web-issuing-eudiw-py ----
echo ""
echo "=== eudi-srv-web-issuing-eudiw-py ==="
cd "$EUDIW_REPO"
apply_patch app/app_config/config_countries.py            app/app_config/config_countries_local.py            "$SCRIPT_DIR/../patches/config_countries.patch"
apply_patch app/app_config/config_service.py              app/app_config/config_service_local.py              "$SCRIPT_DIR/../patches/config_service.patch"
apply_patch app/dynamic_func.py                           app/dynamic_func_local.py                           "$SCRIPT_DIR/../patches/dynamic_func.patch"
apply_patch app/formatter_func.py                         app/formatter_func_local.py                         "$SCRIPT_DIR/../patches/formatter_func.patch"
apply_patch app/route_dynamic.py                          app/route_dynamic_local.py                          "$SCRIPT_DIR/../patches/route_dynamic.patch"
apply_patch app/route_oidc.py                             app/route_oidc_local.py                             "$SCRIPT_DIR/../patches/route_oidc.patch"
apply_patch docker-compose.yml                            docker-compose.yml                                  "$SCRIPT_DIR/../patches/docker-compose.patch"

echo ""
echo "Done!"
