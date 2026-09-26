#!/usr/bin/env bash
# dev/vendor-build.sh —— vendor 树在新 pin 上的**完整可用构建**（本仓驱动，不改 vendor 内容）。
#
# 为什么需要自建：vendor 自己的 `pnpm run build` 在干净树上红在 tsdown 的**根单元**
# （root 包无 `lib/types/{index,invariant,startup}.js` 入口——上游构建链在干净树上的自不自洽处；
# `-F` 过滤在本版对 workspace 合成配置无效）。实测过的失败链见
# notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md。
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

# ⑦ host 半补建（tsc host 遍早夭的残留）：root 单元红会让 205 个包的 host 半 lib/index.js
#   从未产出，而 client 遍的 clientBundle 助手对"纯折"依赖**能解析才内联**——目标包缺
#   lib/index.js 时静默外置成 require，浏览器模块表答不出（实测两连：cosmokit /
#   dsh-typert-protocol "missed the module table"）。判据 = 有 lib/types/index.js 而无
#   lib/index.js；处置 = 用本仓无插件配置逐包补建。
echo "⑦ host 半补建检查…"
missing="$(find packages apps -maxdepth 3 -type d -name lib -not -path '*/node_modules/*' \
  -exec sh -c 'for l; do [ -f "$l/types/index.js" ] && [ ! -f "$l/index.js" ] && printf "%s\n" "${l%/lib}"; done' _ {} +)"
if [[ -n "$missing" ]]; then
  n="$(printf '%s\n' "$missing" | wc -l | tr -d ' ')"
  echo "  发现 $n 个包缺 host 半产物，逐包补建（tsdown -c dev/vendor-host-bundle.config.ts）…"
  while IFS= read -r pkgdir; do
    ( cd "$pkgdir" && "$VENDOR/node_modules/.bin/tsdown" -c "$ROOT/dev/vendor-host-bundle.config.ts" >/dev/null )
  done <<< "$missing"
  echo "  补建完成：$n 个包"
else
  echo "  无缺件（host 半产物齐全）"
fi

# ⑧ 前端壳重建：apps/web/dist 是 gitignored 的**冻结产物**——升 pin 后不重建会留着上一代
#   平台壳，实测症状是 Web UI 静默报 "settingsNumberField is not a function"（旧壳 + 新
#   lib 的组合错误）。dist 在 .gitignore 内，重建不污染 vendor 只读面。
echo "⑧ 前端壳重建（apps/web/dist）…"
pnpm --filter @deepseek-ai/dsh-web-frontend run build

echo "vendor-build: 完成（vendor tracked 内容未改；构建产物在 gitignored 的 lib/ 与 apps/web/dist）"
