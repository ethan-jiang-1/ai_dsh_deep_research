---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-461：RunsView「复制路径」在剪贴板写入被拒绝时仍假绿显示「已复制」

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（改为按 `clipboard.writeText` Promise 结果异步反馈「已复制 / 复制失败」） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-fixes.md)

## 症状

在 `Orca 研究工作台（Research Hub）` → `Run 档案` 中点击任意 run 卡片底部的「复制路径」按钮时，即便当前浏览器环境未授予 `clipboard-write` 权限（`navigator.clipboard.writeText` 返回 rejected Promise）或无 `navigator.clipboard` 对象，按钮文案依然会立刻切换成 **「已复制」**，向用户传递虚假成功信号，而剪贴板内并无路径内容。

- 真实浏览器实证：`runtime/smoke-workspace/ux-audit-r3-2026-11-27/batch2.log`（`FAIL S2.2e Clipboard 权限被拒时 RunsView 复制路径不应假绿显示「已复制」`——覆盖 `navigator.clipboard.writeText` 抛出 `NotAllowedError` 后，首张卡片正文变为 `... 已复制`）。

## 根因与边界

- 源码定位：[RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) 中 `copyPath` 实现：
  `void navigator.clipboard?.writeText(rootPath).catch(() => { /* @silent-catch */ }); setCopiedPath(rootPath)`
- `setCopiedPath(rootPath)` 同步写在 Promise `.catch()` 之外而非 `.then(...)` 回调内部，因此无论写入成功、reject 还是 `navigator.clipboard` 为 `undefined`，都会无条件把 UI 翻为「已复制」（与同包 `ResearchGraphTab.tsx` 把 `setCopiedId` 放在 `.then()` 内形成鲜明对比；另须顺带核查错误提示反馈）。

## 复现

```sh
# 1. 打开「研究工作台」→「Run 档案」
# 2. 在控制台或浏览器上下文拒绝剪贴板权限 / mock navigator.clipboard.writeText 返回 Promise.reject(new Error('NotAllowedError'))
# 3. 点击卡片「复制路径」按钮，观察按钮立即假绿显示「已复制」
```

## 修复判据

1. `RunsView.copyPath` 仅在 `navigator.clipboard?.writeText(rootPath)` 真实 resolve 后才设置 `copiedPath`（在非 HTTPS / 无剪贴板权限 reject 时不得显示「已复制」，应给出诚实失败提示或保持未复制态）；
2. 新增组件/单测验证 `clipboard.writeText` reject 与 `navigator.clipboard === undefined` 时都不出现「已复制」假状态，并附红→绿证据。

## 分诊与授权

- 严重级：P2 — 无剪贴板权限或非安全上下文时对用户给出虚假「已复制」反馈，违背 fail-loud / 诚实状态纪律。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-hub/RunsView.tsx`（`copyPath`）。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`RunsView.tsx` 中 `copyPath` 在调用异步 `navigator.clipboard?.writeText(rootPath)` 后同步执行 `setCopiedPath(rootPath)`，无视剪贴板对象缺失与 Promise 拒绝结果。

## 修法

在 `zh-cockpit.ts` 与 `en-cockpit.ts` 同步新增 `hubCopyFailed`，并在 `RunsView.tsx` 将状态升级为带定时清理的三态 `copyFeedback`（`idle | copied | failed`），仅在 `writeText` resolve 后置 `copied`，缺失或 reject 时如实置 `failed` 与 `data-copy-state="failed"`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/locales/zh-cockpit.ts",
    "packages/deep-research-pack/src/client/locales/en-cockpit.ts",
    "packages/deep-research-pack/src/client/research-hub/RunsView.tsx",
    "tests/cockpit/client/research-hub-panel.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "clipboard reject 时应诚实显示「复制失败」而非「已复制」: '已复制' !== '复制失败'"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/research-hub-panel.spec.mjs" }
}
```
