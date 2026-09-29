#!/usr/bin/env bash
# dev/boot-run.sh — 开跑就绪命令（幂等，keyless）：research profile 组合校验/补装 → boot web
# → 打印入口步骤。RFC：notes/implemented/2026-09-24-m2-p1-run-channel.md（A 定案：团队机制归
# vendor agent-team-profile 层）。操作指南全文 = docs/guides/61-run-playbook.md。
# 用法：bash dev/boot-run.sh（Ctrl-C 停 web）。重复执行不重复安装（组合在位即跳过）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# 先 source 再进 strict mode：被 source 的脚本不该继承调用方的 nounset（env.sh 已加花括号
# 防全角括号陷阱，此为标准防御序——第三方/共享 env 一律裸 source）。
source "$ROOT/dev/env.sh"   # 双 home（DSH_HOME=dev/harness-home）+ dsh 机制基线函数
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
  echo "          若是本仓在飞的 run 通道 → 别另起：用它（URL/token 见启动横幅或 dev/smoke-workspace/web.log）" >&2
  echo "          确要重启或换端口：先停占用者，或 DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh" >&2
  exit 1
fi
PACKDIR="$ROOT/packages/deep-research-pack"
PROFDIR="$DSH_HOME/profiles/$PROFILE"
RUNTMP="$ROOT/dev/smoke-workspace/run-pack"

# 层版本钉住：与 pack 兼容矩阵同源（dsh-v0.1.7-rc.2 → 0.1.7-rc.2）——升 pin 只改 pack
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
    "$ROOT/dev/smoke-workspace/pnpm-store" "$ROOT/dev/smoke-workspace/npm-cache" > "$PROFDIR/.npmrc"
  (cd "$PACKDIR" && npm pack --cache "$ROOT/dev/smoke-workspace/npm-cache" --pack-destination "$RUNTMP" >/dev/null)
  TGZ="$RUNTMP/$(ls "$RUNTMP")"
  dsh plugin --profile "$PROFILE" add "file:$TGZ"
  dsh plugin --profile "$PROFILE" add "$LAYER"
  profile_ok || { echo "boot-run: 重建后组合校验仍不过——fail-loud，检查上方安装输出" >&2; exit 1; }
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
  shipped="$(cd "$PACKDIR" && npm pack --dry-run --json --ignore-scripts --cache "$ROOT/dev/smoke-workspace/npm-cache" 2>/dev/null | node -e '
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

# ③ 仪表盘（RFC m2-run-dashboard + debug-dashboard-plus）：--latest 多场扫描
# （research-workspace/drt_* + dev/harness-home/runs ad-hoc 场）、流程步骤条、
# HITL 等待横幅（⏳ 等你拍板）、web GUI deep-link（token 读自下方 tee 的 web.log）。
DASH_OUT="$ROOT/dev/smoke-workspace/dashboard.html"
mkdir -p "$(dirname "$DASH_OUT")"
node "$ROOT/scripts/run-dashboard.mjs" --latest \
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
4. 静默自主区（角色不问不报）：进度看四处——① run 仪表盘（dev/smoke-workspace/dashboard.html：
   多 run 场清单/流程步骤条/HITL 等待横幅/矩阵/leads/findings/review/journal，5s 刷新）
   ② 各角色会话实时流 ③ ui-agent-team 任务板（谁领了什么活） ④ deliverables 面板（成品出现处）
5. 仪表盘出现"⏳ 等你拍板（HITL）"横幅 = lead 在等你（HITL1/HITL2）——去 web GUI 答题
6. HITL2 审阅（证据充分性 + 交付/补研究推荐）→ 拍板 → final/ 版本化交付 + present 声明
   中断恢复：新开 lead 会话只认 research-workspace/drt_<slug>/ 的文件事实。
全文指南：docs/guides/61-run-playbook.md
───────────────────────────────────────────────────────────────────
STEPS

echo "boot-run: boot web（research profile，端口 ${PORT}；Ctrl-C 停止）…"
# web 输出 tee 进运行区日志：仪表盘 deep-link 从这里抓 token URL（缺席 → 页面不链，fail-soft）
dsh --profile "$PROFILE" -- --port "$PORT" --no-open 2>&1 | tee "$ROOT/dev/smoke-workspace/web.log"
