---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-448：快速切换会话时 workspace-files 把预期 gateway/cancelled 打出 console.error 并伴随 DSH Session reference is released 报错

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：workspace-files 与 useStatusFeed 对 gateway/cancelled 与已 abort 竞态静默退场不打 console.error（vendor SidebarSessionView.dispose 已登记只读接缝边界）；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在 未绑定会话 → 已绑定富会话 → 未绑定会话 之间连续快速切换（间隔 500ms）后，页面功能恢复正常且无串台，但控制台录得 3 条 `console.error`：
1. `[research-status] workspaceFiles.read 失败 {"path":"research-defaults.json","error":{"code":"gateway/cancelled",...}}`
2. `[research-status] workspaceFiles.list 失败 {"path":".","error":{"code":"gateway/cancelled",...}}`
3. `Sidebar Session opening failed: Error: Session reference "session-..." is released`（vendor `SidebarSessionView.dispose`）

## 根因与边界

- [workspace-files.ts](../../../packages/deep-research-pack/src/client/workspace-files.ts)（`L30-L35`） 与 [workspace-files.ts](../../../packages/deep-research-pack/src/client/workspace-files.ts)（`L101-L104`）：在 `result.ok === false` 时只豁免了 `'workspace-file/not-found'`，未判断 `signal.aborted` 或 `codeOf(result.error) === 'gateway/cancelled'`，导致清理旧会话请求（AbortController abort）的预期取消被当作真故障记入 `console.error`（注：同文件 `readLibrary` 第 63 行在 `catch` 里判断了 `signal.aborted`，但未处理 `!result.ok` 携带 `gateway/cancelled` 返回值的情况）；
- 第 3 条 `Session reference ... is released` 为 vendor DSH `ClientSessionReference` 在快速切页取消打开时的已知侧栏释放路径（可向 vendor 核对或归因）。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/stage234.log`（第 114 行 `FAIL [S2-Health] 主审计会话零 console.error`）。

## 复现

```sh
# 在已加载页面上以 ~500ms 间隔依次点击 Session B → Session C → Session B 并监听 console.error
# 实测出现 2 条 [research-status] gateway/cancelled 错误与 1 条 Session reference is released
```

## 修复判据

1. `workspace-files.ts` 的 `listDir` / `readText` 对 `signal.aborted` 或 `gateway/cancelled` 正常静默退场，不触发 `[research-status] ... 失败` 的假故障 `console.error`；真实非取消错误仍保持 fail-loud 记录；
2. 快速切会话压测下本包无多余 `console.error`。

## 分诊与授权

- 严重级：P2 — 快速切会话取消飞行中请求属预期竞态，控制台却刷 `workspaceFiles.* console.error` 并序列化为 `[object Object]`。
- 表面 / 边界：`workspace-files.ts`、`useStatusFeed.ts`（第 3 条 `Sidebar Session opening failed: Session reference is released` 在只读 `vendor/dsh` `SidebarSessionView.dispose`，不私改 vendor）。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`workspace-files.ts` 的 `listDir` / `readPreview` / `readText` 与 `useStatusFeed.ts` 只检查 `signal.aborted` 未识别异步回包中的 `gateway/cancelled`，使取消包被当成真实故障打印 `console.error`。

## 修法

在 `workspace-files.ts` 抽取 `isCancelled(signal, error)` 同时识别 `signal.aborted` 与 `error.code === 'gateway/cancelled'`，在 `useStatusFeed.ts` 增加取消保护，真故障仍保留 `console.error` fail-loud。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/workspace-files.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "tests/cockpit/client/workspace-files.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/workspace-files.spec.mjs",
    "exit": 1,
    "output": "BUG-448 workspace-files：readPreview returned { kind: 'error', detail: '[object Object]' } instead of { kind: 'cancelled' }"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/workspace-files.spec.mjs"
  }
}
```
