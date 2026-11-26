---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-441：run-driver.mjs up 在默认 Blank Session 上以 exit 1 RED（status-pane-open=false）失败

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：probe-status-tab 导出可重入状态机 nextStatusPaneAction，在启动期切新会话后重新展开右栏并选中研究状态；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在端口 3083 活通道（`research-workspace`，默认落点为 Blank Session `新会话`）执行日常开发通道自检命令：
`node tools/channel/run-driver.mjs up`
即便 `channel-mirror`、`host-mounted`、`overlay-clear`、`console-clean` 全部为 `true`，命令仍判 **`level: RED`（exit 1）**：
`reason: "浏览器面红：status-pane-open(statusPaneOpen=false) ｜ probe=n/a"`。

## 根因与边界

- [run-driver.mjs](../../../tools/channel/run-driver.mjs)（`L196-L201`） 调 `probes/browser/cdp-probe.mjs` 时固定传 `--open-status` 而不传会话选择器，页面停在 Blank Session（`新会话`）；
- 实测抓包 `runtime/smoke-workspace/run-verdicts/2026-11-26T17-11-30-597Z-up/page.html` 显示：在 Blank Session 下点击 `[data-sidebar-right-expand="true"]` 展开右栏后（`data-sidebar-right-open` 存在），右栏 DOM 内不含 `research-status` guide 入口（`guide: False`），[cdp-probe.mjs](../../../probes/browser/cdp-probe.mjs)（`L256`） 在 `[data-sidebar-right-tab]` 中找不到「研究状态」页签体而报红。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/stage5-run-driver.log`、`runtime/smoke-workspace/run-verdicts/2026-11-26T17-11-30-597Z-up/verdict.json`、`page.png`、`page.html`。

## 复现

```sh
node tools/channel/run-driver.mjs up
# 实测 exit 1: "status-pane-open(statusPaneOpen=false)"（channel-mirror/host-mounted/overlay-clear/console-clean 全 true）
```

## 修复判据

1. 明确并对齐 Blank Session 下右栏研究页签引导面或 `run-driver` / `cdp-probe` 的会话打开/探测契约（如空白页右栏按设计隐藏则 `run-driver` 探测真实可达会话或 `Blank Session` 验研究工作台入口）；
2. `node tools/channel/run-driver.mjs up` 对健康活通道可稳定收口为 exit 0 GREEN。

## 分诊与授权

- 严重级：P1 — 活通道每次自检必报 `status-pane-open=false`，阻断 `run-driver.mjs up --force-probe` 门禁。
- 表面 / 边界：`checks/lib/shared/probe-status-tab.mjs` + `probes/browser/cdp-probe.mjs`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`workspace-boot.ts` 在启动中期异步切开新会话会重置右栏为 `expanded=false`；旧 `openStatusPane()` 的两段顺序循环在前段退出后不会在新会话下重展右栏。

## 修法

在 `probe-status-tab.mjs` 抽纯可重入状态机 `nextStatusPaneAction`，在 `cdp-probe.mjs` 合并为单循环持续跟踪 `expanded` 与 `currentSession`。实跑 `node tools/channel/run-driver.mjs up --force-probe` 返回 `exit 0` (`statusPaneOpen=true`, `consoleProblems=0`)。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/probe-status-tab.mjs",
    "probes/browser/cdp-probe.mjs",
    "tests/run/probes/probe-status-tab.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/probes/probe-status-tab.spec.mjs",
    "exit": 1,
    "output": "SyntaxError: does not provide an export named 'nextStatusPaneAction'"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/probes/probe-status-tab.spec.mjs"
  }
}
```
