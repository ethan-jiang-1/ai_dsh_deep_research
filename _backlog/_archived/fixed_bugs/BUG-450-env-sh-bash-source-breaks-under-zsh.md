---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-450：tools/env.sh 仅用 BASH_SOURCE[0] 取仓库根路径，在 macOS 默认 zsh 下 source 会偏移 DSH_HOME 并使 dsh 失效

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：tools/env.sh 兼容 BASH_SOURCE / ZSH_VERSION (${(%):-%x}) / $0 并校验仓库根标志，hooks 复用已解析根路径；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在 macOS 默认 Shell（`zsh`）直接运行 `source tools/env.sh` 时：
- `${BASH_SOURCE[0]}` 在 zsh 中为空字符串，`dirname ""` 返回 `.`，导致 `_repo_root="$(cd "./.." && pwd)"` 解析为仓库的**父目录**（`/Users/<user>` 而非 `/Users/<user>/ai_dsh_deep_research`）；
- `DSH_HOME` 被错误导出到 `$HOME/runtime/harness-home`（越出仓库隔离边界），且 `dsh()` 指向不存在的 `$HOME/vendor/dsh/...`，`git -C` 也因不在仓库内而使 `core.hooksPath` 静默失效。

## 根因与边界

- [tools/env.sh](../../../tools/env.sh)（`L15`） 与 [tools/env.sh](../../../tools/env.sh)（`L57`） 硬依赖 bash 专有数组 `${BASH_SOURCE[0]}`，未兼容 zsh（`${(%):-%x}`）或 `dirname` 不合法兜底报错。
- 现场证据：Stage 0 首轮直接执行 `source tools/env.sh && pnpm build` 时打印 `DSH_HOME=/Users/bowhead/runtime/harness-home` 与 `⚠ 无法设置 core.hooksPath`（后续所有脚本通过 `bash -c 'source tools/env.sh && ...'` 绕过）。

## 复现

```sh
zsh -c 'source tools/env.sh && echo "$DSH_HOME"'
# 实测输出仓库父目录下的 .../runtime/harness-home 而非本仓 runtime/harness-home，且 core.hooksPath 失败
```

## 修复判据

1. `tools/env.sh` 同时兼容 bash（`${BASH_SOURCE[0]}`）与 zsh（`${(%):-%x}`），并校验解析出的 `_repo_root/vendor/dsh` 或 `_repo_root/package.json` 在场，不静默飘到仓库外；
2. 分别在 `bash -c 'source tools/env.sh'` 与 `zsh -c 'source tools/env.sh'` 下验证 `DSH_HOME` 均指向 `<repo>/runtime/harness-home`。

## 分诊与授权

- 严重级：P2 — macOS 默认 zsh 下直接 `source tools/env.sh` 静默将 `DSH_HOME` 算到父目录且跳过 hooks/dsh 隔离。
- 表面 / 边界：`tools/env.sh`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`tools/env.sh` 仅用 bash 专有变量 `${BASH_SOURCE[0]}` 计算 `_repo_root` 与设置 `git core.hooksPath`，zsh 下 `${BASH_SOURCE[0]}` 为空使 `dirname ""` 退化为 `.`。

## 修法

增加 `BASH_SOURCE[0]` / `ZSH_VERSION`（`${(%):-%x}`）/ `$0` 三段回退，校验 `_repo_root/package.json` 与 `tools` 存在性，并让 `git -C "${_repo_root}"` 复用同一个根路径。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "tools/env.sh",
    "tests/run/channel/env-credentials.spec.mjs"
  ],
  "red": {
    "command": "zsh -c 'source tools/env.sh && test \"$DSH_HOME\" = \"$PWD/runtime/harness-home\"'",
    "exit": 1,
    "output": "DSH_HOME=/Users/bowhead/runtime/harness-home"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/channel/env-credentials.spec.mjs"
  }
}
```
