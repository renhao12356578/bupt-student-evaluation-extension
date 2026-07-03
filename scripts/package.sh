#!/usr/bin/env bash
# 打包 Chrome 扩展：staging → .zip + .crx
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(basename "$ROOT")"
DIST="${ROOT}/dist"
STAGING="${DIST}/staging"
ZIP_OUT="${DIST}/${NAME}.zip"

mkdir -p "$DIST"
rm -rf "$STAGING" "$ZIP_OUT"
mkdir -p "$STAGING"

# 仅复制扩展运行所需文件（与 manifest 一致）
cp "${ROOT}/manifest.json" "$STAGING/"
cp -R "${ROOT}/popup" "${ROOT}/content" "${ROOT}/lib" "${ROOT}/background" "${ROOT}/icons" "$STAGING/"

# zip（根目录为 manifest.json）
(
  cd "$STAGING"
  zip -r "$ZIP_OUT" . -x ".DS_Store"
)
echo "已生成 ZIP: $ZIP_OUT"

# crx（需 node + crx3）
if command -v node >/dev/null 2>&1; then
  if [[ ! -d "${ROOT}/node_modules/crx3" ]]; then
    echo "安装 crx3…"
    (cd "$ROOT" && npm install --no-save crx3@1.1.3)
  fi
  node "${ROOT}/scripts/package-crx.cjs" "$STAGING"
else
  echo "跳过 CRX: 未找到 node"
fi

echo ""
echo "产物:"
echo "  ZIP  ${ZIP_OUT}"
echo "  CRX  ${DIST}/${NAME}.crx"
echo ""
echo "安装:"
echo "  ZIP → 开发者模式 → 加载已解压 / 拖入 zip"
echo "  CRX → 开发者模式开启后，将 .crx 拖入 chrome://extensions/"
