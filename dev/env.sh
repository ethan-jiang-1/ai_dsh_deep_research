#!/usr/bin/env bash
# dev/env.sh — 双 home 隔离 + dsh 机制基线（source 本文件，不要 bash 执行）
# 设计依据：docs/design/10-architecture.md §5；company dev/env.sh 同款机制。
#
# 两个隔离面：
#   ① 数据面：DSH_HOME 重定向到本仓 dev/harness-home —— 开发会话/凭据/插件安装与
#      日用 ~/.dsh 互不影响（崩溃半径隔离）；
#   ② 代码面：拦截裸 `dsh` —— PATH 里的全局安装随升级漂移，不作机制依据；机制核对
#      一律走钉住 tag 的源码基线。
#
# ⚠ D10 偏离（R1）：本仓尚无 vendor submodule。机制基线暂指向 company 仓的钉 tag
#   checkout（同一 tag `dsh-v0.1.5-rc.2`，只读借用）；R2 队列「vendor-submodule-and-pnpm-dsh」
#   落地后改为本仓 `node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts`。

# ① 数据面
export DSH_HOME="${DSH_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dev/harness-home}"
mkdir -p "$DSH_HOME"

# ② 代码面：dsh = 钉 tag 源码基线（company checkout，只读）；确要日用全局版：command dsh
_dsh_src="/Users/bowhead/ai_dsh_company/vendor/dsh/apps/cli/src/bin.ts"
dsh() {
  if [ -f "$_dsh_src" ]; then
    (cd /Users/bowhead/ai_dsh_company && node --import tsx/esm "$_dsh_src" "$@")
  else
    echo "dev/env.sh: 机制基线源码不可达（$_dsh_src）——检查 company checkout 是否在位；" >&2
    echo "  机制核对前不要静默退回全局 dsh（版本漂移，不作依据）。确要日用：command dsh" >&2
    return 1
  fi
}

# 提示（source 时可见一次）
echo "dev/env.sh: DSH_HOME=$DSH_HOME（数据面隔离）"
echo "dev/env.sh: dsh → 钉 tag 源码基线（company checkout 借用，D10 偏离；日用全局版用 command dsh）"
