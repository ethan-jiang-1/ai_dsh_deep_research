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

echo "④ tsc client 遍（叶项目 lib/types 发射；聚合自身 = noEmit 纯 typecheck）…"
if ! node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -b tsconfig.client.json; then
  # 0.2.0 实测（升 pin Note 记档）：聚合程序的 tests 夹具红 TS2883（@vitest/spy Procedure
  # 不可命名——tests 靠上游单层安装的 hoist 解析 vitest，本仓双层安装下不可命名），而本步
  # 真正需要的叶项目 lib/types 发射先于聚合程序完成。fail-loud：金丝雀叶产物缺失 = 真失败。
  canary='packages/client/ui-sidebar-right/lib/types/index.d.ts'
  if [ ! -f "$canary" ]; then
    echo "tsc client 红：叶产物缺失（$canary）——真构建失败，中止" >&2
    exit 1
  fi
  echo "  聚合 typecheck 红（TS2883，tests 夹具，上游面偏差）——叶 lib/types 发射齐全，继续"
fi

# ④a root host 遍（**0.2.1 轮新增步骤**）：上游把 host 半产物交给了 root tsdown 的 workspace
#    单元集合——自带 `tsdown.config.ts` 的包（hostPhase / 双 bundle / CSS 面）只由这一遍产出，
#    本仓 ⑤ 的逐包补建**故意不碰**它们（用无插件配置补建会覆盖包配置）。少了这一遍，安装态
#    profile 的 `dsh plugin add @deepseek-ai/dsh-web-app` 解析不到 tool-ask-user / tool-goal 等
#    peer（0.2.1 轮 release-smoke 首红症状）。放在 ④ 之后：它吃 client 遍发射的 lib/types。
echo "④a root host 遍（tsdown workspace 单元；自带 tsdown 配置的包由此产出 host 半）…"
npx tsdown --env.DSH_BUILD_FACE host

# ⑤ host 半补建（tsc host 遍早夭的残留）：root 单元红会让 200+ 个包的 host 半 lib/index.js
#   从未产出，而 client 遍的 clientBundle 助手对"纯折"依赖**能解析才内联**——目标包缺
#   lib/index.js 时静默外置成 require，浏览器模块表答不出（实测三连：cosmokit /
#   dsh-typert-protocol / dsh-util-workspace-path "missed the module table"）。判据 = 有
#   lib/types/index.js 而无 lib/index.js；处置 = 用本仓无插件配置逐包补建。0.2.0 轮补
#   `vendor` 前缀：--clean 会清掉 vendored cordis 全家（vendor/cordis、cosmokit、schemastery）
#   的 lib/，它们同样命中该判据。
#   **顺序铁律（0.2.0 轮实证）**：本步必须在 ⑥ tsdown client **之前**——client bundle 构建时
#   依赖缺 lib/index.js 会被静默外置成 require，事后补建救不了已生成的 bundle（症状 = Web
#   boot 17 包 failed / "missed the module table"；换 pin 必跑面含 client-load-smoke 把关）。
#   0.2.1 轮补：判据加 `! tsdown.config.ts`——上游给部分包加了**包自己的 tsdown 配置**
#   （clientBundle(…, { hostPhase: true }) / 双 bundle 等），root 的 workspace glob **不进**这类
#   包单元（包配置自成一单元），所以它们同样会缺 lib/index.js，但用本仓无插件配置补建 =
#   **覆盖上游配置**（丢 hostPhase / companions / CSS 面）。实证（0.2.1 轮）：tool-ask-user /
#   tool-goal 起带包配置，旧判据仍拿它们补建；它们真正的产物应由 root host 遍产出，缺则是
#   root 遍的问题——本脚本⓪之后的 root 遍若没产出 lib/index.js，**必须红**而不是拿错产物糊上，
#   所以下面在补建后单独断言"带配置且属 base/web-app 面的包是否齐全"前先只排除、不静默。
echo "⑤ host 半补建检查…"
#   ⚠ find -exec 的退出码 = 最后一个 sh 的退出码；判据全用 `[ ]` 且最后一个不命中时 sh 退 1，
#   `set -e` 会把**赋值行**当失败杀掉整个脚本（症状：日志停在"⑤ host 半补建检查…"、无 stderr、
#   exit 1——0.2.1 轮实测踩到）。故子脚本显式 `exit 0`。
missing="$(find packages apps vendor -maxdepth 3 -type d -name lib -not -path '*/node_modules/*' \
  -exec sh -c 'for l; do p="${l%/lib}"; [ -f "$l/types/index.js" ] && [ ! -f "$l/index.js" ] && [ ! -f "$p/tsdown.config.ts" ] && printf "%s\n" "$p"; done; exit 0' _ {} +)"
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

# ⑤b（已移至 ⑥ 之后：见下方"⑥b 入口产物后置断言"）——host 遍的覆盖范围由上游配置决定，
#     在 ⑥ 之前无法区分"该由 host 遍产出"与"只由 client 遍产出"的包；统一在 ⑥ 之后按
#     manifest 声明的入口断言，才是与发布形状同构的判据。

echo "⑥ client 面 bundle（client-modules 组合要求 lib/client.js；依赖内联前提 = ⑤ 已补齐）…"
npx tsdown --env.DSH_BUILD_FACE client

# ⑥b 入口产物后置断言（0.2.1 轮新增）：**workspace 里每个包 manifest 声明的主入口必须真存在**。
#     为什么需要：上游的 host/client 两遍各自只覆盖自己那批单元（包级 tsdown.config.ts 通过
#     clientBundle 的 hostPhase / SKIP_WORKSPACE_BUILD / staticLinked 决定自己在哪一遍），任何一遍
#     漏掉 = 包在 workspace 里"看起来装好了"但入口是空的——症状会跑到很远的地方（0.2.1 轮：
#     tool-ask-user / tool-goal 缺 lib/index.js → 安装态 `plugin add @deepseek-ai/dsh-web-app`
#     解析不到 peer → preflight 报"缺平台 peer 包"，离病根三跳）。判据取 manifest 而非文件名
#     约定：`main`/`exports["."].default` 是发布形状的合同，也是 Node 解析的合同。
#     排除 apps/desktop：Electron 桌面壳走自己的 `pnpm run bundle`（tsdown --config-loader native），
#     不在 Web 宿主的加载面（dsh CLI / web profile / client bundle 都不 import 它），本脚本不为
#     它产产物，故不该断言它。
echo "⑥b 入口产物断言（每个 workspace 包的 manifest 主入口必须落地）…"
node -e '
const fs = require("node:fs"), path = require("node:path")
const root = process.cwd()
const skip = new Set(["node_modules", "tests", "dist", "lib"])
const SKIP_PKGS = new Set(["@deepseek-ai/dsh-desktop"])
const bad = []
const walk = (dir) => {
  let ents = []
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    if (!e.isDirectory() || skip.has(e.name)) continue
    const p = path.join(dir, e.name)
    const manifest = path.join(p, "package.json")
    if (fs.existsSync(manifest)) {
      let pkg = null
      try { pkg = JSON.parse(fs.readFileSync(manifest, "utf8")) } catch { continue }
      if (pkg.private === true && pkg.name === undefined) { walk(p); continue }
      const main = pkg.main ?? (typeof pkg.exports?.["."] === "string" ? pkg.exports["."] : pkg.exports?.["."]?.default)
      if (typeof pkg.name === "string" && typeof main === "string" && main.startsWith("lib/")
        && !SKIP_PKGS.has(pkg.name) && !fs.existsSync(path.join(p, main))) {
        bad.push(`${pkg.name}  ${path.relative(root, p)}  →  ${main}`)
      }
    }
    walk(p)
  }
}
for (const top of ["packages", "apps", "vendor"]) walk(path.join(root, top))
if (bad.length > 0) {
  console.error(`  失败：${bad.length} 个包的 manifest 主入口不存在（构建遍未覆盖）：`)
  for (const line of bad) console.error(`    ${line}`)
  console.error("  → 补救：确认该包是否自带 tsdown.config.ts 并选对了构建遍；必要时在 dev/vendor-build.sh 显式补跑其包级配置。")
  process.exit(1)
}
console.log("  全部 workspace 包的主入口已落地")
'

echo "⑦ typert client 产物…"
node "$ROOT/dev/vendor-typert-emit.mjs" client

# ⑧ 前端壳重建：apps/web/dist 是 gitignored 的**冻结产物**——升 pin 后不重建会留着上一代
#   平台壳，实测症状是 Web UI 静默报 "settingsNumberField is not a function"（旧壳 + 新
#   lib 的组合错误）。dist 在 .gitignore 内，重建不污染 vendor 只读面。
echo "⑧ 前端壳重建（apps/web/dist）…"
pnpm --filter @deepseek-ai/dsh-web-frontend run build

echo "vendor-build: 完成（vendor tracked 内容未改；构建产物在 gitignored 的 lib/ 与 apps/web/dist）"
