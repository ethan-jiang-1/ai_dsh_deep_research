#!/usr/bin/env bash
# dev/vendor-build.sh —— vendor 树在新 pin 上的**完整可用构建**（本仓驱动，不改 vendor 内容）。
#
# 为什么需要自建：vendor 自己的 `pnpm run build` 在干净树上红在 tsdown 的**根单元**
# （root 包无 `lib/types/{index,invariant,startup}.js` 入口——上游构建链在干净树上的自不自洽处；
# `-F` 过滤在本版对 workspace 合成配置无效）。实测过的失败链见
# notes/proposed/2026-09-25-vendor-pin-bump-017rc2.md。
#
# 真正被启动需要的三类产物（0.1.7 起）：
#   ① 逐包 `lib/types/**`（tsc host/client 两遍）——tsdown 与 typert 生成器的输入；
#   ② `lib/typert.<face>.js`——`typert-loader` 会 import 各贡献包的 `./typert` 子路径；
#   ③ client 面 `lib/client.js`——client-modules 组合要求（否则启动报
#      "client bundle not found; run `pnpm run build` before launch"）。
#
# 用法：bash dev/vendor-build.sh [--clean]
#   --clean 先清陈旧构建状态（`lib/` + `*.tsbuildinfo`）——换 pin 后必做（旧产物会让
#   tsc 认为"已最新"而跳过 emit，并让旧编译产物引用已删除导出）。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/vendor/dsh"
cd "$VENDOR"

if [[ "${1:-}" == "--clean" ]]; then
  echo "① 清陈旧构建状态（lib/ + *.tsbuildinfo，均在 .gitignore 内）…"
  find packages apps vendor -maxdepth 4 -type d -name lib -not -path '*/node_modules/*' -exec rm -rf {} + 2>/dev/null || true
  find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete 2>/dev/null || true
fi

echo "② tsc host 遍（逐包 lib/types）…"
node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -b tsconfig.host.json

echo "③ typert host 产物（本仓驱动：按 manifest 过滤后逐包生成）…"
node "$ROOT/dev/vendor-typert-emit.mjs" host

echo "④ tsc client 遍…"
node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -b tsconfig.client.json

echo "⑤ client 面 bundle（client-modules 组合要求 lib/client.js）…"
npx tsdown --env.DSH_BUILD_FACE client

echo "⑥ typert client 产物…"
node "$ROOT/dev/vendor-typert-emit.mjs" client

echo "vendor-build: 完成（vendor tracked 内容未改；构建产物在 gitignored 的 lib/）"
