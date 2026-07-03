#!/usr/bin/env bash
# 打包为 Chrome 扩展分发 zip（根目录含 manifest.json）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(basename "$ROOT")"
OUT="${ROOT}/dist/${NAME}.zip"

mkdir -p "${ROOT}/dist"
rm -f "$OUT"

cd "$ROOT"
zip -r "$OUT" . \
  -x "*.git*" \
  -x "dist/*" \
  -x "scripts/*" \
  -x ".DS_Store" \
  -x "*.zip"

echo "已生成: $OUT"
echo ""
echo "安装方式："
echo "  1) 开发者模式 → 加载已解压的扩展程序 → 选项目文件夹"
echo "  2) 或 chrome://extensions → 打包扩展程序 → 选择 dist/${NAME}.zip（若 Chrome 支持）"
echo "  3) 上架 Chrome 商店：上传此 zip"
