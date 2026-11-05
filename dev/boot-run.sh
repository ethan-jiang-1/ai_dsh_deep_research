#!/usr/bin/env bash
# dev/boot-run.sh — 开跑就绪命令（幂等，keyless）：deep-research profile（= 用户安装 profile 名）组合校验/补装 → boot web
# → 打印入口步骤。RFC：notes/implemented/2026-09-24-m2-p1-run-channel.md（A 定案：团队机制归
# vendor agent-team-profile 层）。操作指南全文 = docs/guides/61-run-playbook.md。
# 用法：bash dev/boot-run.sh（Ctrl-C 停 web）。重复执行不重复安装（组合在位即跳过）。
# 同机制纪律：dev 与用户安装走同一条载入路径（tarball → dsh plugin add → roster），差异只看 dev/README
# 的 parity 表；profile 用户层（cordis.patch.yml）dev 不写——MCP 行走 --patch 覆盖层。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# 先 source 再进 strict mode：被 source 的脚本不该继承调用方的 nounset（env.sh 已加花括号
# 防全角括号陷阱，此为标准防御序——第三方/共享 env 一律裸 source）。
source "$ROOT/dev/env.sh"   # 双 home（DSH_HOME=runtime/harness-home）+ dsh 机制基线函数
set -euo pipefail

# ⓪ vendor 构建产物自检（RFC vendor-build-guard，2026-09-25）：0.1.7 起启动依赖构建
#    产物，缺失时启动深处报错隐晦（typert-loader / client-modules）——提前拦成一行 remedy。
#    这是 boot 面护栏；L0 门禁刻意不依赖构建产物（新 clone 未构建时 verify 仍应秒级绿）。
node "$ROOT/scripts/lib/vendor-artifacts.mjs"

PROFILE="${DSH_RUN_PROFILE:-deep-research}"
# 端口：缺省 3083（2026-09-28 用户指令——3081 让给别的项目；3080 = 本仓开发 GUI）；覆写：
#   DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh
PORT="${DSH_RUN_PORT:-3083}"
# 实例状态根：多实例用不同 DSH_RUN_STATE_DIR（web.log/dashboard/run-pack/npm-cache 各自独立）。
STATE_DIR="${DSH_RUN_STATE_DIR:-$ROOT/runtime/smoke-workspace}"
mkdir -p "$STATE_DIR"
STATE_DIR="$(cd "$STATE_DIR" && pwd)"
WORKSPACE="${DSH_RUN_WORKSPACE:-${DEEP_RESEARCH_WORKSPACE:-$ROOT/research-workspace}}"
export DEEP_RESEARCH_WORKSPACE="$WORKSPACE"

# BSD/GNU 都可用的 in-place sed：`sed -i.bak` 两派都接受，备份随即删除。
sed_inplace() { sed -i.bak "$1" "$2" && rm -f "$2.bak"; }

PACKDIR="$ROOT/packages/deep-research-pack"
PROFDIR="$DSH_HOME/profiles/$PROFILE"
RUNTMP="$STATE_DIR/run-pack"

# ② pack 漂移检测（RFC debug-dashboard-plus）：pack 源 ↔ profile 安装镜像逐文件比对。
# 2026-09-24 三次注入面事故里两次是镜像类（$DSH_HOME/AGENTS.md 化石、pack persona/skill
# 旧文本进了镜像）——机制化补丁：不符即 fail-loud，不带着旧 harness 开 run。
# 比对集合 = **实际随包发布的文件**（`npm pack --dry-run --json` 为准），不是源目录全量：
# pack 的 `files` 字段决定镜像里有什么（例如 AGENTS.md 是子树开发指令、不随包发布），
# 按源目录全量比对会把"没发布"误报成"镜像缺席"（0.1.7 升 pin 时实测）。
# 非运行时文件（README/LICENSE）不参与判红（2026-11-03 G-20）：文档漂移不改变页面行为，
# 只逐条点名提示；发布集完整性由 release-smoke / pack-smoke 负责。否则改一行 README 就把
# 通道判 NOT-RUN，逼人 `rm -rf profile` 重建。
# 单跑模式：--drift-only（只读、不碰端口/不安装/不起 web；run-driver 复用通道时调用）
#           --drift-check（可初始化 profile/MCP patch，旧语义保留）。
drift_check() {
  local bad=0 rel mirror
  local shipped skipped=0
  # 工具态重定向（本仓纪律）：npm 缓存钉在仓库内，避全局 cache 权限/污染（release-smoke 同款）。
  # ⚠ `--ignore-scripts` 是必需的（2026-09-26 跑 run 时实测的环路缺陷）：pack 的 `prepack`
  #   钩子会跑 `pnpm build`，tsdown 的横幅（`ℹ tsdown v…`）混进 stdout 把 `--json` 载荷污染，
  #   下游 `JSON.parse` 抛 SyntaxError → **漂移检测整条崩掉**（而它正是"镜像是否等于 pack 源"的
  #   唯一机械证明）。本处只要**发布清单**、不要构建，故显式跳过生命周期脚本。
  # 发布清单缓存（2026-11-05 加速）：`npm pack --dry-run` 是漂移门 ~5s 的主要开销；清单只随
  # pack 源内容变化，键 = pack 源指纹（路径 + size + mtime，遍历顺序无关）。miss/损坏一律回退真跑。
  local fp
  fp="$(node "$ROOT/scripts/lib/channel-cache.mjs" fingerprint "$PACKDIR")"
  shipped="$(node "$ROOT/scripts/lib/channel-cache.mjs" read "$STATE_DIR/pack-shipped.json" "$fp" 2>/dev/null || true)"
  if [ -z "$shipped" ]; then
    shipped="$(cd "$PACKDIR" && npm pack --dry-run --json --ignore-scripts --cache "$STATE_DIR/npm-cache" 2>/dev/null | node -e '
      let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const j = JSON.parse(s);
        for (const f of j[0]?.files ?? []) console.log(f.path);
      });
    ')"
    [ -n "$shipped" ] || { echo "boot-run: 漂移检测拿不到 pack 发布清单（npm pack --dry-run 失败）" >&2; exit 1; }
    printf '%s\n' "$shipped" | node "$ROOT/scripts/lib/channel-cache.mjs" save "$STATE_DIR/pack-shipped.json" "$fp" >/dev/null 2>&1 || true
  else
    echo "boot-run: 发布清单缓存命中（pack 指纹 ${fp:0:12}）" >&2
  fi
  while IFS= read -r rel; do
    mirror="$PROFDIR/node_modules/dsh-deep-research-pack/$rel"
    # 非运行时文件（README/LICENSE）：文档漂移不改变页面行为，不参与"当前页面是否当前代码"的
    # 判定（2026-11-03 G-20：改一行 README 曾把整条通道判 NOT-RUN，逼人 rm -rf profile 重建）。
    # 仍逐文件点名提示，不静默；发布集完整性由 release-smoke / pack-smoke 负责。
    case "$rel" in
      README.md|README.zh.md|LICENSE)
        if [ ! -f "$PACKDIR/$rel" ] || [ ! -f "$mirror" ] || ! diff -q "$PACKDIR/$rel" "$mirror" >/dev/null 2>&1; then
          echo "boot-run: 注：非运行时文件漂移（${rel}）——不影响通道判绿" >&2
          skipped=$((skipped + 1))
        fi
        continue
        ;;
    esac
    if [ ! -f "$PACKDIR/$rel" ] || [ ! -f "$mirror" ] || ! diff -q "$PACKDIR/$rel" "$mirror" >/dev/null 2>&1; then
      echo "boot-run: 漂移——$rel 与 profile 镜像不一致（或镜像缺席）" >&2
      bad=1
    fi
  done <<< "$shipped"
  if [ "$bad" -ne 0 ]; then
    echo "boot-run: pack 漂移检测红——修复：rm -rf '$PROFDIR' 后重跑本脚本重建（或逐文件 cp 同步）" >&2
    exit 1
  fi
  echo "boot-run: pack 漂移检测绿（运行时集 ↔ 镜像一致；跳过 $skipped 个非运行时文件）"
}

# 只读镜像检查（2026-10-28 反馈真值修复）：run-driver 复用已在飞的通道时必须先回答
# "这个通道加载的镜像是否等于当前 pack 源"——否则 probe 会把旧页面判成当前代码的绿。
# 本模式在端口检查/组合安装/MCP patch/web 启动之前退出：只读，不碰活通道。
if [ "${1:-}" = "--drift-only" ]; then
  [ -d "$PROFDIR" ] || { echo "boot-run: profile 不存在（先跑一次完整 boot 生成）" >&2; exit 1; }
  drift_check
  exit 0
fi

# 端口自检（fail-loud + 补救）：端口已 LISTEN = 另起通道必失败，且可能打断在飞 run 的通道
# （bundle 文件不受损，但挂起的 HITL 回合会被终局化）——先说清再让人决定。
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "boot-run: 端口 $PORT 已被占用：pid = $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')" >&2
  echo "          若是本仓在飞的 run 通道 → 别另起：用它（URL/token 见启动横幅或 $STATE_DIR/web.log）" >&2
  echo "          确要重启或换端口：先停占用者，或 DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh" >&2
  exit 1
fi

# runtime 选择（2026-11-05 加速）：默认 vendor **构建产物** lib/bin.js（同一 pin 源码编译，≈3s 启动）；
# DSH_RUN_RUNTIME=source 退回 tsx 源码（≈13s，机制核对/调试用）；产物缺席自动退回源码并提示。
# 两者都走同一条 `--profile deep-research` 启动面与同一 roster——只换二进制，不换启动次序。
BUILT_CLI="$ROOT/vendor/dsh/apps/cli/lib/bin.js"
if [ "${DSH_RUN_RUNTIME:-built}" = "built" ] && [ -f "$BUILT_CLI" ]; then
  DSH_BOOT=(node "$BUILT_CLI")
  DSH_BOOT_LABEL="vendor 构建产物（lib/bin.js；退回源码 = DSH_RUN_RUNTIME=source）"
else
  DSH_BOOT=(dsh)
  DSH_BOOT_LABEL="vendor 源码 tsx（DSH_RUN_RUNTIME=source 或构建产物缺席）"
fi

# 层版本钉住：与**运行中的 dsh** 同版本（= 安装手册里"与 dsh --version 同版本"那一句）。
# 版本必须从**实际启动的那个二进制**派生（构建产物/源码二选一），不许从包清单猜。
# vendor 源码只是机制基线；从包清单派生会让 dev 测到用户不会有的组合。读不到版本就 fail-loud。
LAYER_VER="$("${DSH_BOOT[@]}" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?' | head -1)"
[ -n "$LAYER_VER" ] || { echo "boot-run: 读不到运行中 dsh 的版本（runtime --version）——拒绝用猜的版本门" >&2; exit 1; }
LAYER="@deepseek-ai/dsh-experimental-agent-team-profile@$LAYER_VER"

# 组合在位 = bundles 含本包与 vendor 层 + 安装副本每个盘上角色 preset 在位。
# 角色清单从本仓 pack 盘上目录枚举（单一事实源——基础整治 §3.2；硬编码清单会让
# profile_ok 在新增角色后永远返回假，幂等静默失效、每次调用都走重建分支）。
profile_ok() {
  [ -f "$PROFDIR/package.json" ] || return 1
  # 版本面同一函数内查（2026-10-19 换 pin 实红）：只查 bundles 在场会把**旧 pin 的**组合判成
  # 在位（幂等跳过重建），随后新 runtime 拒绝加载旧版 team 层——报「plugin version
  # 0.2.0-rc.2 is incompatible with dsh 0.2.1-rc.2 … Exact-version exemption: not active」
  # 并卡在启动横幅（表现 = snapshot-replay / run 通道超时，根因在 profile 未随 pin 重钉）。
  # 故 deps 里两层版本必须逐字等于本次期望：pack 副本版本 + LAYER_VER。
  node -e "
    const pkg = require('$PROFDIR/package.json');
    const b = new Set(pkg.dsh?.profile?.bundles ?? []);
    const packWant = require('$PACKDIR/package.json').version;
    const okBundles = b.has('dsh-deep-research-pack') && b.has('@deepseek-ai/dsh-experimental-agent-team-profile');
    const okPack = pkg.dependencies?.['dsh-deep-research-pack'] !== undefined
      && require('$PROFDIR/node_modules/dsh-deep-research-pack/package.json').version === packWant;
    const okLayer = pkg.dependencies?.['@deepseek-ai/dsh-experimental-agent-team-profile'] === '$LAYER_VER';
    process.exit(okBundles && okPack && okLayer ? 0 : 1);
  " || return 1
  local r
  for r in "$PACKDIR"/presets/*.patch.yml; do
    r="${r##*/}"; r="${r%.patch.yml}"
    [ -f "$PROFDIR/node_modules/dsh-deep-research-pack/presets/$r.patch.yml" ] || return 1
  done
}

# 两道闸分工（别合并）：profile_ok 查组合**在场**（幂等跳过安装的依据，只看文件存在）；
# drift_check（下方 ②）查**内容**（pack 源 ↔ 镜像逐文件比对）——绿了前者不代表镜像新鲜，
# 陈旧镜像靠后者拦（2026-10-11 实测：镜像 client 旧于源半天，本函数绿、漂移检测红拦下）。
if profile_ok; then
  echo "boot-run: research profile 组合在位（幂等跳过安装）"
else
  echo "boot-run: research profile 组合不完整或缺席——重建（web 模板 → pack → vendor 层）…"
  rm -rf "$PROFDIR" "$RUNTMP"
  mkdir -p "$RUNTMP"
  dsh --profile "$PROFILE" --from-default-profile web --dump-config >/dev/null
  [ -f "$PROFDIR/cordis.yml" ] || { echo "boot-run: profile 初始化失败（fail-loud）" >&2; exit 1; }
  # 工具态纪律：pnpm store / npm cache 钉进本仓 gitignored 区
  printf 'store-dir=%s\ncache-dir=%s\n' \
    "$STATE_DIR/pnpm-store" "$STATE_DIR/npm-cache" > "$PROFDIR/.npmrc"
  (cd "$PACKDIR" && npm pack --cache "$STATE_DIR/npm-cache" --pack-destination "$RUNTMP" >/dev/null)
  TGZ="$RUNTMP/$(ls "$RUNTMP")"
  dsh plugin --profile "$PROFILE" add "file:$TGZ"
  dsh plugin --profile "$PROFILE" add "$LAYER"
  profile_ok || { echo "boot-run: 重建后组合校验仍不过——fail-loud，检查上方安装输出" >&2; exit 1; }
fi

# ①½ SPA 抓取通道（mcp-playwright，**默认挂载**——2026-10-03 用户拍板常驻，pilot 终版结论 =
#     采纳 Note；D22 交付约束：零账号零凭据零订阅，npx 自动拉起）。MCP_PLAYWRIGHT=0 = 显式拆。
#     **不写 profile 用户层**（与用户安装路径对齐：用户的 cordis.patch.yml 只由用户/设置页写）——
#     生成本次启动的 dev 覆盖层，经 launcher `--patch` 传入。决定/淘汰方案/环境踩坑正本 =
#     notes/implemented/2026-10-02-mcp-playwright-adoption.md。版本钉 0.0.83。
MCP_MARK_BEGIN='# BEGIN mcp-playwright-block'
MCP_MARK_END='# END mcp-playwright-block'
DEV_OVERLAY="$STATE_DIR/dev-overlay.yml"

# 迁移（一次性）：旧版把 MCP 行直接写进 profile patch；见到旧 marker 就摘掉，让 profile 回到用户态。
if grep -qF "$MCP_MARK_BEGIN" "$PROFDIR/cordis.patch.yml" 2>/dev/null; then
  sed_inplace "/^${MCP_MARK_BEGIN}/,/^${MCP_MARK_END}/d" "$PROFDIR/cordis.patch.yml"
  if ! grep -qvE '^[[:space:]]*(#.*)?$' "$PROFDIR/cordis.patch.yml"; then
    printf '[]\n' >> "$PROFDIR/cordis.patch.yml"
  fi
  echo "boot-run: 旧的 MCP 行已从 profile patch 摘出（迁移到 dev 覆盖层）"
fi

PATCH_ARGS=()
if [ "${MCP_PLAYWRIGHT:-1}" = "1" ]; then
  cat > "$DEV_OVERLAY" <<MCPROW
$MCP_MARK_BEGIN
- insert:
    - id: mcp-playwright
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: playwright
        transport: stdio
        command: npx
        args: ['-y', '@playwright/mcp@0.0.83', '--headless']
        env:
          npm_config_cache: '$STATE_DIR/npm-cache'
        failOnStartupError: true
$MCP_MARK_END
MCPROW
  PATCH_ARGS=(--patch "$DEV_OVERLAY")
  echo "boot-run: MCP Playwright 通道 → dev 覆盖层（${DEV_OVERLAY}；拆 = MCP_PLAYWRIGHT=0 重跑本脚本）"
else
  rm -f "$DEV_OVERLAY"
  echo "boot-run: MCP Playwright 通道已关（MCP_PLAYWRIGHT=0）"
fi

# 旧模式保留（可初始化 profile/MCP patch；测试/CI 用，不起 web）。新的只读检查走 --drift-only。
if [ "${1:-}" = "--drift-check" ]; then
  [ -d "$PROFDIR" ] || { echo "boot-run: profile 不存在（先跑一次完整 boot 生成）" >&2; exit 1; }
  drift_check
  exit 0
fi
drift_check

# ③ 仪表盘（RFC m2-run-dashboard + debug-dashboard-plus）：--latest 多场扫描
# （research-workspace/drt_* + runtime/harness-home/runs ad-hoc 场）、流程步骤条、
# HITL 等待横幅（⏳ 等你拍板）、web GUI deep-link（token 读自下方 tee 的 web.log）。
DASH_OUT="$STATE_DIR/dashboard.html"
mkdir -p "$(dirname "$DASH_OUT")"
node --import tsx/esm "$ROOT/scripts/run-ops/run-dashboard.mjs" --latest \
  --out "$DASH_OUT" --watch --interval 5 &
DASH_PID=$!
# trap 修复（RFC debug-dashboard-plus，2026-09-24 事故 ① 收尾）：EXIT/INT/TERM 全杀子进程；
# SIGKILL 直杀本 shell 时 trap 不会跑 → 仪表盘自带孤儿自退出（ppid 变化即退）作第二道保险。
cleanup() {
  kill "$DASH_PID" 2>/dev/null || true
  pkill -P $$ 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "boot-run: run 仪表盘已起（只读投影，5s 再生成）：$DASH_OUT"
echo "boot-run: 研究工作区 = ${WORKSPACE}（DSH_RUN_WORKSPACE 可覆写）"
cat <<'STEPS'
──────────────────────────── 怎么开 run ────────────────────────────
1. 等 web 横幅出现（含本次端口与 token）→ 用浏览器打开该 URL
2. 新建会话：preset 选 "Deep Research Lead"（默认项），cwd 选 research-workspace/
3. 说出研究问题 → lead 走 HITL1 三问（研究类型 / 深度篇幅 / 时间口径，每问带推荐）→ 你拍板
4. 静默自主区（角色不问不报）：进度两层看——
   在场主面 = Web 里的研究驾驶舱「研究状态」页签（流程轨道/活动流/活标题/HITL 挂起横幅），
   辅以 ② 各角色会话实时流 ③ ui-agent-team 任务板 ④ deliverables 面板（成品出现处）；
   离机投影 = run 仪表盘（本次 STATE_DIR 的 dashboard.html：多 run 场清单/流程步骤条/
   HITL 等待横幅/矩阵/leads/findings/review/journal，5s 刷新——只读 fail-soft，不是交付判据）
5. 仪表盘出现"⏳ 等你拍板（HITL）"横幅 = lead 在等你（HITL1/HITL2）——去 web GUI 答题
6. HITL2 审阅（证据充分性 + 交付/补研究推荐）→ 拍板 → final/ 版本化交付 + present 声明
   中断恢复：新开 lead 会话只认 research-workspace/drt_<slug>/ 的文件事实。
全文指南：docs/guides/61-run-playbook.md
───────────────────────────────────────────────────────────────────
STEPS

echo "boot-run: boot web（profile=${PROFILE}，端口 ${PORT}；Ctrl-C 停止）…"
echo "boot-run: runtime = ${DSH_BOOT_LABEL}"
# LLM 流 socket 隔离（用户指令 2026-10-13：LLM 流式请求走一次性连接不复用——上游边缘对
# 长命复用连接有相位性故障，postmortem 2026-10-13；移除 = 删本行）
ISOLATION_GUARD="$ROOT/dev/llm-socket-isolation.cjs"
if [ ! -f "$ISOLATION_GUARD" ]; then
  echo "boot-run: 隔离预载件缺席（${ISOLATION_GUARD}）——拒绝在未隔离通道上启动；先恢复该文件" >&2
  exit 2
fi
# DSH_ISOLATION_ANNOUNCE：让预载在 boot 日志打一行确定性自证（判读"隔离下"的核验锚点 =
# web.log 检索 llm-socket-isolation 预载行；见 _backlog/triggers.md 处置序）
export NODE_OPTIONS="--require $ISOLATION_GUARD${NODE_OPTIONS:+ $NODE_OPTIONS}"
export DSH_ISOLATION_ANNOUNCE=1
# web 输出 tee 进运行区日志：仪表盘 deep-link 从这里抓 token URL（缺席 → 页面不链，fail-soft）
# 会话 cwd = 工作区（D38：安装态 Host 也认 DEEP_RESEARCH_WORKSPACE；dev 通道同样真正生效）
cd "$WORKSPACE"
"${DSH_BOOT[@]}" --profile "$PROFILE" ${PATCH_ARGS[@]+"${PATCH_ARGS[@]}"} -- --port "$PORT" --no-open 2>&1 | tee "$STATE_DIR/web.log"
