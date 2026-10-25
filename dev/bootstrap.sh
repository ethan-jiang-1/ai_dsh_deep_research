#!/usr/bin/env bash
# dev/bootstrap.sh — 独立环境冷启动前置（幂等；默认准备，--check 只读）。
#
# 做的事：Node/pnpm/git 检查 → vendor submodule → pnpm install → vendor 构建 → env.sh →
# 凭据/端口工具检查 → 打印本次隔离根/profile/port/state。它不启动 web；启动用
# `node dev/run-driver.mjs up --bootstrap`（或 `bash dev/boot-run.sh`）。
#
# 多实例：DSH_DEV_HOME（隔离 home）、DSH_RUN_PROFILE、DSH_RUN_PORT、DSH_RUN_STATE_DIR。
# 离线：团队层需 registry（或预装）、Playwright MCP 需 npx 首次拉取；本脚本不伪装离线可用。
#
# 用法：bash dev/bootstrap.sh [--check]
# 退出码：0 就绪 / 1 缺件（--check 时列出）/ 2 用法错误
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=prepare
for arg in "$@"; do
  case "$arg" in
    --check) MODE=check ;;
    -h|--help) echo "用法：bash dev/bootstrap.sh [--check]"; exit 0 ;;
    *) echo "bootstrap: 未知参数 $arg" >&2; exit 2 ;;
  esac
done

missing=0
ok() { echo "ok   $*"; }
warn() { echo "warn $*"; }
bad() { echo "FAIL $*" >&2; missing=$((missing + 1)); }
would() { echo "todo $*（--check 只读；去掉 --check 执行）"; missing=$((missing + 1)); }

# ① 解释器与包管理器
if command -v node >/dev/null 2>&1 && node -e 'const [m,n]=process.versions.node.split(".").map(Number); process.exit(m>=24||(m===22&&n>=19)?0:1)' 2>/dev/null; then
  ok "Node $(node --version)（满足 ^22.19.0 || >=24.0.0）"
else
  bad "Node 不满足 ^22.19.0 || >=24.0.0（当前 $(node --version 2>/dev/null || echo '不可用')）——升级 Node"
fi
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm $(pnpm --version)"
else
  bad "pnpm 不可用——corepack enable（或按 packageManager 安装 pnpm@11.7.0）"
fi
if command -v git >/dev/null 2>&1; then ok "git $(git --version | awk '{print $3}')"; else bad "git 不可用"; fi

# ② vendor 机制基线（submodule）
if [ -f "$ROOT/vendor/dsh/apps/cli/src/bin.ts" ]; then
  ok "vendor/dsh 源码基线在位"
elif [ "$MODE" = check ]; then
  would "git submodule update --init --recursive（vendor/dsh 缺席）"
else
  echo "bootstrap: 初始化 vendor/dsh submodule…"
  git -C "$ROOT" submodule update --init --recursive || { bad "submodule 初始化失败"; }
  [ -f "$ROOT/vendor/dsh/apps/cli/src/bin.ts" ] && ok "vendor/dsh 源码基线在位" || bad "vendor/dsh 仍不可达"
fi

# ③ workspace 依赖
if [ -d "$ROOT/node_modules" ]; then
  ok "根 node_modules 在场"
elif [ "$MODE" = check ]; then
  would "pnpm install --frozen-lockfile（根依赖缺席）"
else
  echo "bootstrap: pnpm install --frozen-lockfile…"
  (cd "$ROOT" && pnpm install --frozen-lockfile) || bad "pnpm install 失败"
fi

# ④ vendor 构建产物（0.1.7 起启动依赖）
if node "$ROOT/scripts/lib/vendor-artifacts.mjs" >/dev/null 2>&1; then
  ok "vendor 构建产物在场"
elif [ "$MODE" = check ]; then
  would "bash dev/vendor-build.sh（vendor 产物缺席）"
else
  echo "bootstrap: bash dev/vendor-build.sh…"
  bash "$ROOT/dev/vendor-build.sh" || bad "vendor 构建失败"
fi

# ⑤ 数据面隔离 + 凭据/端口工具
# shellcheck source=/dev/null
source "$ROOT/dev/env.sh" >/dev/null
echo "ok   DSH_HOME=${DSH_HOME}（DSH_DEV_HOME=${DSH_DEV_HOME:-未设，默认仓内 runtime/harness-home}）"
if [ -f "$DSH_HOME/.credentials.yaml" ] || [ -n "${DEEPSEEK_API_KEY:-}" ]; then
  ok "模型凭据在场（真模型 run 可用；boot 本身 keyless）"
else
  warn "模型凭据缺席——boot/安装验收可继续；真模型 run 需 DEEPSEEK_API_KEY 或 $DSH_HOME/.credentials.yaml"
fi
if command -v lsof >/dev/null 2>&1; then ok "lsof 在场（端口检查）"; else warn "lsof 缺席——run-driver 的端口占用检查不可用"; fi
if command -v pgrep >/dev/null 2>&1; then ok "pgrep 在场（boot 并发检查）"; else warn "pgrep 缺席——run-driver 的 boot 并发检查不可用"; fi

echo "ok   本次实例：profile=${DSH_RUN_PROFILE:-research} port=${DSH_RUN_PORT:-3083} state=${DSH_RUN_STATE_DIR:-$ROOT/runtime/smoke-workspace}"
echo "note 团队层需 registry（或预装）；Playwright MCP 首次需 npx 拉取——离线环境先预置"
if [ "$missing" -gt 0 ]; then
  echo "bootstrap: $missing 项未就绪（见上）" >&2
  exit 1
fi
echo "bootstrap: 就绪；启动：node dev/run-driver.mjs up --bootstrap"
