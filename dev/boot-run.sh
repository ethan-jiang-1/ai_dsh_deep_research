#!/usr/bin/env bash
# dev/boot-run.sh — 开跑就绪命令（幂等，keyless）：research profile 组合校验/补装 → boot web
# → 打印入口步骤。RFC：notes/implemented/2026-09-24-m2-p1-run-channel.md（A 定案：团队机制归
# vendor agent-team-profile 层）。操作指南全文 = docs/guides/61-run-playbook.md。
# 用法：bash dev/boot-run.sh（Ctrl-C 停 web）。重复执行不重复安装（组合在位即跳过）。
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

PROFILE=research
# 端口：缺省 3083（2026-09-28 用户指令——3081 让给别的项目；3080 = 本仓开发 GUI）；覆写：
#   DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh
PORT="${DSH_RUN_PORT:-3083}"

# 端口自检（fail-loud + 补救）：端口已 LISTEN = 另起通道必失败，且可能打断在飞 run 的通道
# （bundle 文件不受损，但挂起的 HITL 回合会被终局化）——先说清再让人决定。
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "boot-run: 端口 $PORT 已被占用：pid = $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')" >&2
  echo "          若是本仓在飞的 run 通道 → 别另起：用它（URL/token 见启动横幅或 runtime/smoke-workspace/web.log）" >&2
  echo "          确要重启或换端口：先停占用者，或 DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh" >&2
  exit 1
fi

# ⓪½ egress 模式判定（issue _backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md；两态一等公民）：
#    direct = 直连（DNS 答真实公网 IP）零变化；tun = TUN/fake-IP 态（SSRF 守卫将拒 web_fetch，
#    web 启动前在下方 ②½ 设代理出口）；offline = 无 egress 显性警告。探针 = dev/egress-probe.mjs
#    （keyless 秒级，走 getaddrinfo 路径——与守卫同款）；探针自身故障回落 direct（零变化默认）。
EGRESS_MODE="$(node "$ROOT/dev/egress-probe.mjs" 2>/dev/null || echo direct)"
echo "boot-run: egress 模式 = $EGRESS_MODE"

PACKDIR="$ROOT/packages/deep-research-pack"
PROFDIR="$DSH_HOME/profiles/$PROFILE"
RUNTMP="$ROOT/runtime/smoke-workspace/run-pack"

# 层版本钉住：与 pack 兼容矩阵同源（dsh-v0.2.0-rc.2 → 0.2.0-rc.2）——升 pin 只改 pack
# package.json 的 dsh.compatibility.dshReleases，本脚本随之走（vendor 各包版本锁步发布）。
LAYER_VER="$(node -e "console.log(require('$PACKDIR/package.json').dsh.compatibility.dshReleases[0].replace(/^dsh-v/,''))")"
LAYER="@deepseek-ai/dsh-experimental-agent-team-profile@$LAYER_VER"

# 组合在位 = bundles 含本包与 vendor 层 + 安装副本每个盘上角色 preset 在位。
# 角色清单从本仓 pack 盘上目录枚举（单一事实源——基础整治 §3.2；硬编码清单会让
# profile_ok 在新增角色后永远返回假，幂等静默失效、每次调用都走重建分支）。
profile_ok() {
  [ -f "$PROFDIR/package.json" ] || return 1
  node -e "
    const b = new Set(require('$PROFDIR/package.json').dsh?.profile?.bundles ?? []);
    process.exit(b.has('dsh-deep-research-pack') && b.has('@deepseek-ai/dsh-experimental-agent-team-profile') ? 0 : 1);
  " || return 1
  local r
  for r in "$PACKDIR"/presets/*.patch.yml; do
    r="${r##*/}"; r="${r%.patch.yml}"
    [ -f "$PROFDIR/node_modules/dsh-deep-research-pack/presets/$r.patch.yml" ] || return 1
  done
}

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
    "$ROOT/runtime/smoke-workspace/pnpm-store" "$ROOT/runtime/smoke-workspace/npm-cache" > "$PROFDIR/.npmrc"
  (cd "$PACKDIR" && npm pack --cache "$ROOT/runtime/smoke-workspace/npm-cache" --pack-destination "$RUNTMP" >/dev/null)
  TGZ="$RUNTMP/$(ls "$RUNTMP")"
  dsh plugin --profile "$PROFILE" add "file:$TGZ"
  dsh plugin --profile "$PROFILE" add "$LAYER"
  profile_ok || { echo "boot-run: 重建后组合校验仍不过——fail-loud，检查上方安装输出" >&2; exit 1; }
fi

# ①½ SPA 抓取通道（mcp-playwright，**默认挂载**——2026-10-03 用户拍板常驻，pilot 终版结论 =
#     采纳 Note；D22 交付约束：零账号零凭据零订阅，npx 自动拉起）。MCP_PLAYWRIGHT=0 = 显式拆；
#     缺省挂。决定/淘汰方案/环境踩坑全记录正本 =
#     notes/implemented/2026-10-02-mcp-playwright-adoption.md。版本钉 0.0.83（与缓存一致，
#     升 pin 时随重验流程走）。
MCP_MARK_BEGIN='# BEGIN mcp-playwright-block'
MCP_MARK_END='# END mcp-playwright-block'
if [ "${MCP_PLAYWRIGHT:-1}" = "1" ]; then
  if ! grep -qF "$MCP_MARK_BEGIN" "$PROFDIR/cordis.patch.yml" 2>/dev/null; then
    # 新建 profile 的 patch 以 `[]` 闭数组占位——其后再追加条目即非法 YAML（pilot 首跑红证），
    # 先摘掉占位行再追加块。
    sed -i '' '/^\[\]$/d' "$PROFDIR/cordis.patch.yml"
    cat >> "$PROFDIR/cordis.patch.yml" <<MCPROW

$MCP_MARK_BEGIN
- insert:
    - id: mcp-playwright
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: playwright
        transport: stdio
        command: npx
        args: ['-y', '@playwright/mcp@0.0.83', '--headless', '--proxy-server', 'direct://', '--proxy-bypass', '*']
        env:
          npm_config_cache: '$ROOT/runtime/smoke-workspace/npm-cache'
        failOnStartupError: true
$MCP_MARK_END
MCPROW
    echo "boot-run: MCP Playwright 通道已写入 profile patch（默认挂载；拆 = MCP_PLAYWRIGHT=0 重跑本脚本）"
  fi
elif grep -qF "$MCP_MARK_BEGIN" "$PROFDIR/cordis.patch.yml" 2>/dev/null; then
  sed -i '' "/^${MCP_MARK_BEGIN}/,/^${MCP_MARK_END}/d" "$PROFDIR/cordis.patch.yml"
  # 摘除后若无任何非注释内容，补回 `[]` 占位（注释-only 的 patch 文件解析非数组即抛）。
  if ! grep -qvE '^[[:space:]]*(#.*)?$' "$PROFDIR/cordis.patch.yml"; then
    printf '[]\n' >> "$PROFDIR/cordis.patch.yml"
  fi
  echo "boot-run: MCP Playwright 通道已移除（MCP_PLAYWRIGHT=0——显式拆）"
fi

# ② pack 漂移检测（RFC debug-dashboard-plus）：pack 源 ↔ profile 安装镜像逐文件比对。
# 2026-09-24 三次注入面事故里两次是镜像类（$DSH_HOME/AGENTS.md 化石、pack persona/skill
# 旧文本进了镜像）——机制化补丁：不符即 fail-loud，不带着旧 harness 开 run。
# 比对集合 = **实际随包发布的文件**（`npm pack --dry-run --json` 为准），不是源目录全量：
# pack 的 `files` 字段决定镜像里有什么（例如 AGENTS.md 是子树开发指令、不随包发布），
# 按源目录全量比对会把"没发布"误报成"镜像缺席"（0.1.7 升 pin 时实测）。
# 单跑模式：bash dev/boot-run.sh --drift-check（测试/CI 用，不起 web）。
drift_check() {
  local bad=0 rel mirror
  local shipped
  # 工具态重定向（本仓纪律）：npm 缓存钉在仓库内，避全局 cache 权限/污染（release-smoke 同款）。
  # ⚠ `--ignore-scripts` 是必需的（2026-09-26 跑 run 时实测的环路缺陷）：pack 的 `prepack`
  #   钩子会跑 `pnpm build`，tsdown 的横幅（`ℹ tsdown v…`）混进 stdout 把 `--json` 载荷污染，
  #   下游 `JSON.parse` 抛 SyntaxError → **漂移检测整条崩掉**（而它正是"镜像是否等于 pack 源"的
  #   唯一机械证明）。本处只要**发布清单**、不要构建，故显式跳过生命周期脚本。
  shipped="$(cd "$PACKDIR" && npm pack --dry-run --json --ignore-scripts --cache "$ROOT/runtime/smoke-workspace/npm-cache" 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const j = JSON.parse(s);
      for (const f of j[0]?.files ?? []) console.log(f.path);
    });
  ')"
  [ -n "$shipped" ] || { echo "boot-run: 漂移检测拿不到 pack 发布清单（npm pack --dry-run 失败）" >&2; exit 1; }
  while IFS= read -r rel; do
    mirror="$PROFDIR/node_modules/dsh-deep-research-pack/$rel"
    if [ ! -f "$PACKDIR/$rel" ] || [ ! -f "$mirror" ] || ! diff -q "$PACKDIR/$rel" "$mirror" >/dev/null 2>&1; then
      echo "boot-run: 漂移——$rel 与 profile 镜像不一致（或镜像缺席）" >&2
      bad=1
    fi
  done <<< "$shipped"
  if [ "$bad" -ne 0 ]; then
    echo "boot-run: pack 漂移检测红——修复：rm -rf '$PROFDIR' 后重跑本脚本重建（或逐文件 cp 同步）" >&2
    exit 1
  fi
  echo "boot-run: pack 漂移检测绿（pack 发布集 ↔ profile 镜像一致）"
}
if [ "${1:-}" = "--drift-check" ]; then
  [ -d "$PROFDIR" ] || { echo "boot-run: profile 不存在（先跑一次完整 boot 生成）" >&2; exit 1; }
  drift_check
  exit 0
fi
drift_check

# ②½ egress 出口（仅 web 启动路径——--drift-check 模式已在上方 exit）：tun 态给 DSH fetch 设
#     代理出口——SSRF 守卫按设计旁路（vendor util/http-proxy 读 http_proxy/https_proxy，代理侧
#     解析）。自旋代理 = dev/egress-proxy.mjs（本 shell 子进程，随 cleanup 的 pkill -P $$ 回收）；
#     DSH_EGRESS_OUTLET 指定自己的代理口时优先。no_proxy 同步设，保通道自身 localhost RPC。
if [ "$EGRESS_MODE" = "tun" ]; then
  if [ -n "${DSH_EGRESS_OUTLET:-}" ]; then
    export http_proxy="$DSH_EGRESS_OUTLET" https_proxy="$DSH_EGRESS_OUTLET"
    echo "boot-run: TUN 态——DSH fetch 出口 = $DSH_EGRESS_OUTLET（DSH_EGRESS_OUTLET 指定）"
  else
    node "$ROOT/dev/egress-proxy.mjs" --port 14200 >/dev/null 2>&1 &
    for _ in $(seq 1 40); do
      lsof -nP -iTCP:14200 -sTCP:LISTEN >/dev/null 2>&1 && break
      sleep 0.25
    done
    if lsof -nP -iTCP:14200 -sTCP:LISTEN >/dev/null 2>&1; then
      export http_proxy="http://127.0.0.1:14200" https_proxy="http://127.0.0.1:14200"
      echo "boot-run: TUN 态——自旋本地转发代理 = http://127.0.0.1:14200（随 web 一并回收）"
    else
      echo "boot-run: ⚠ 自旋出口 10s 未就绪——web_fetch 将被 SSRF 守卫全域拒；可设 DSH_EGRESS_OUTLET=http://127.0.0.1:<代理口> 重跑" >&2
    fi
  fi
  export no_proxy="localhost,127.0.0.1,::1"
elif [ "$EGRESS_MODE" = "offline" ]; then
  echo "boot-run: ⚠ 本环境无 egress——web_fetch 不可用：研究 run 无法取证（证据契约要求 source_url 真实抓取），仅可无网操作" >&2
fi

# ③ 仪表盘（RFC m2-run-dashboard + debug-dashboard-plus）：--latest 多场扫描
# （research-workspace/drt_* + runtime/harness-home/runs ad-hoc 场）、流程步骤条、
# HITL 等待横幅（⏳ 等你拍板）、web GUI deep-link（token 读自下方 tee 的 web.log）。
DASH_OUT="$ROOT/runtime/smoke-workspace/dashboard.html"
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
cat <<'STEPS'
──────────────────────────── 怎么开 run ────────────────────────────
1. 等 web 横幅出现（含本次端口与 token）→ 用浏览器打开该 URL
2. 新建会话：preset 选 "Deep Research Lead"（默认项），cwd 选 research-workspace/
3. 说出研究问题 → lead 走 HITL1 三问（研究类型 / 深度篇幅 / 时间口径，每问带推荐）→ 你拍板
4. 静默自主区（角色不问不报）：进度两层看——
   在场主面 = Web 里的研究驾驶舱「研究状态」页签（流程轨道/活动流/活标题/HITL 挂起横幅），
   辅以 ② 各角色会话实时流 ③ ui-agent-team 任务板 ④ deliverables 面板（成品出现处）；
   离机投影 = run 仪表盘（runtime/smoke-workspace/dashboard.html：多 run 场清单/流程步骤条/
   HITL 等待横幅/矩阵/leads/findings/review/journal，5s 刷新——只读 fail-soft，不是交付判据）
5. 仪表盘出现"⏳ 等你拍板（HITL）"横幅 = lead 在等你（HITL1/HITL2）——去 web GUI 答题
6. HITL2 审阅（证据充分性 + 交付/补研究推荐）→ 拍板 → final/ 版本化交付 + present 声明
   中断恢复：新开 lead 会话只认 research-workspace/drt_<slug>/ 的文件事实。
全文指南：docs/guides/61-run-playbook.md
───────────────────────────────────────────────────────────────────
STEPS

echo "boot-run: boot web（research profile，端口 ${PORT}；Ctrl-C 停止）…"
# web 输出 tee 进运行区日志：仪表盘 deep-link 从这里抓 token URL（缺席 → 页面不链，fail-soft）
dsh --profile "$PROFILE" -- --port "$PORT" --no-open 2>&1 | tee "$ROOT/runtime/smoke-workspace/web.log"
