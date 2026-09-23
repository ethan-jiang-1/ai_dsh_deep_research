#!/usr/bin/env bash
# dev/boot-run.sh — 开跑就绪命令（幂等，keyless）：research profile 组合校验/补装 → boot web
# → 打印入口步骤。RFC：notes/proposed/2026-09-24-m2-p1-run-channel.md（A 定案：团队机制归
# vendor agent-team-profile 层）。操作指南全文 = docs/guides/61-run-playbook.md。
# 用法：bash dev/boot-run.sh（Ctrl-C 停 web）。重复执行不重复安装（组合在位即跳过）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# 先 source 再进 strict mode：被 source 的脚本不该继承调用方的 nounset（env.sh 已加花括号
# 防全角括号陷阱，此为标准防御序——第三方/共享 env 一律裸 source）。
source "$ROOT/dev/env.sh"   # 双 home（DSH_HOME=dev/harness-home）+ dsh 机制基线函数
set -euo pipefail

PROFILE=research
PORT=3081                    # 60 §3 约定：3080 被 DSH web GUI 占用
PACKDIR="$ROOT/packages/deep-research-pack"
PROFDIR="$DSH_HOME/profiles/$PROFILE"
RUNTMP="$ROOT/dev/smoke-workspace/run-pack"

# 层版本钉住：与 pack 兼容矩阵同源（dsh-v0.1.5-rc.2 → 0.1.5-rc.2）——升 pin 只改 pack
# package.json 的 dsh.compatibility.dshReleases，本脚本随之走（vendor 各包版本锁步发布）。
LAYER_VER="$(node -e "console.log(require('$PACKDIR/package.json').dsh.compatibility.dshReleases[0].replace(/^dsh-v/,''))")"
LAYER="@deepseek-ai/dsh-experimental-agent-team-profile@$LAYER_VER"

# 组合在位 = bundles 含本包与 vendor 层 + 安装副本四角色 preset 在位
profile_ok() {
  [ -f "$PROFDIR/package.json" ] || return 1
  node -e "
    const b = new Set(require('$PROFDIR/package.json').dsh?.profile?.bundles ?? []);
    process.exit(b.has('dsh-deep-research-pack') && b.has('@deepseek-ai/dsh-experimental-agent-team-profile') ? 0 : 1);
  " || return 1
  for r in lead scout analyst critic; do
    [ -f "$PROFDIR/node_modules/dsh-deep-research-pack/presets/$r/preset.yml" ] || return 1
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

cat <<'STEPS'
──────────────────────────── 怎么开 run ────────────────────────────
1. 等 web 横幅出现 http://127.0.0.1:3081/?token=… 用浏览器打开（token 在横幅里）
2. 新建会话：preset 选 "Deep Research Lead"（默认项），cwd 选 research-workspace/
3. 说出研究问题 → lead 走 HITL1 三问（研究类型 / 深度篇幅 / 时间口径，每问带推荐）→ 你拍板
4. 静默自主区（角色不问不报）：进度看三处——① 各角色会话实时流
   ② ui-agent-team 任务板（谁领了什么活） ③ deliverables 面板（成品出现处）
5. HITL2 审阅（证据充分性 + 交付/补研究推荐 + composition 确认）→ 拍板 → final.md + present 交付
   中断恢复：新开 lead 会话只认 research-workspace/runs/<slug>/ 的文件事实。
全文指南：docs/guides/61-run-playbook.md
───────────────────────────────────────────────────────────────────
STEPS

echo "boot-run: boot web（research profile，端口 ${PORT}；Ctrl-C 停止）…"
dsh --profile "$PROFILE" -- --port "$PORT" --no-open
