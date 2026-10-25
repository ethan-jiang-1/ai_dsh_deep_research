#!/usr/bin/env bash
# dev/env.sh — 双 home 隔离 + dsh 机制基线（source 本文件，不要 bash 执行）
# 设计依据：docs/design/10-architecture.md §5；company dev/env.sh 同款机制。
#
# 两个隔离面：
#   ① 数据面：DSH_HOME 重定向到本仓 runtime/harness-home —— 开发会话/凭据/插件安装与
#      日用 ~/.dsh 互不影响（崩溃半径隔离）；
#   ② 代码面：拦截裸 `dsh` —— PATH 里的全局安装随升级漂移，不作机制依据；机制核对
#      一律走钉住 tag 的源码基线。
#
# ⚠ 机制基线 = 本仓 vendor/dsh（pinned submodule；verify 门禁 vendor-pin/vendor-clean 机械
#   把守）；不借用任何外部 checkout。原「vendor submodule 延后」的偏离（D10）已随
#   队列「vendor-submodule-and-pnpm-dsh」落地而终结。

_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ① 数据面（默认覆盖平台 DSH_HOME；显式 DSH_DEV_HOME 可把隔离根指到仓外）
#   实证（2026-09-24 l4-lite 复跑首跑栽坑）：DSH 会话内（agent shell / GUI 环境）自带
#   平台级 DSH_HOME=~/.dsh——预设优先会让 source 后静默指向日用 home，boot 在日用
#   home 找不到 profile 时回退写 ~/.dsh/profiles/web/cordis.yml（被会话沙箱 EPERM 拒，
#   fail-loud 正确行为）。因此平台 DSH_HOME 一律被覆盖；需要另一隔离实例时用 DSH_DEV_HOME
#   （独立 home；配合 DSH_RUN_PROFILE / DSH_RUN_PORT / DSH_RUN_STATE_DIR 做多实例）。
_default_home="${_repo_root}/runtime/harness-home"
if [ -n "${DSH_DEV_HOME:-}" ]; then
  mkdir -p "$DSH_DEV_HOME"
  _dev_home="$(cd "$DSH_DEV_HOME" && pwd)"
else
  _dev_home="$_default_home"
fi
if [ -n "${DSH_HOME:-}" ] && [ "$DSH_HOME" != "$_dev_home" ]; then
  echo "dev/env.sh: 覆盖平台 DSH_HOME（$DSH_HOME → ${_dev_home}）" >&2
fi
export DSH_HOME="$_dev_home"
mkdir -p "$DSH_HOME"

# ② 代码面：dsh = 本仓 vendor 钉 tag 源码基线（vendor/dsh submodule，只读）；确要日用全局版：command dsh
#    前置：根 pnpm install 已跑（tsx + vendor workspace 依赖在 node_modules）。
_dsh_src="${_repo_root}/vendor/dsh/apps/cli/src/bin.ts"
dsh() {
  if [ -f "$_dsh_src" ]; then
    (cd "${_repo_root}" && node --import tsx/esm "$_dsh_src" "$@")
  else
    echo "dev/env.sh: 机制基线源码不可达（${_dsh_src}）——检查 vendor/dsh submodule（git submodule update --init）；" >&2
    echo "  机制核对前不要静默退回全局 dsh（版本漂移，不作依据）。确要日用：command dsh" >&2
    return 1
  fi
}

# 提示（source 时可见一次）——变量一律花括号：全角括号紧跟 $VAR 会被 bash 当成变量名
# 的一部分（$DSH_HOME（… → 变量 "DSH_HOME（"），set -u 的 source 方必炸（boot-run 实证）。
echo "dev/env.sh: DSH_HOME=${DSH_HOME}（数据面隔离）"
echo "dev/env.sh: dsh → 本仓 vendor/dsh 钉 tag 源码基线（机制权威；日用全局版用 command dsh）"

# ③ 提交面：pre-commit 钩子（dev/hooks/pre-commit：verify+tests 红灯拦 commit——收尾纪律
#    "必跑"的机器化，教训实证见 notes/implemented/2026-09-24-agent-friendly-polish.md）。
#    git config 幂等；hooksPath 相对路径按仓库顶层解析。
if git -C "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" config core.hooksPath dev/hooks 2>/dev/null; then
  echo "dev/env.sh: core.hooksPath=dev/hooks（pre-commit 门禁生效：红灯 commit 被拦）"
else
  echo "dev/env.sh: ⚠ 无法设置 core.hooksPath——pre-commit 门禁未生效，收尾须按 guides/60 §4 手跑 verify+tests" >&2
fi
