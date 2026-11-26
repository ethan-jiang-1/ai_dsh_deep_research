---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-442：DefaultsPanel 下拉换用 DSH Menu 按钮后 cockpit-truth-residuals S21 以 inputValue()=null 失败

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：SelectMenu button 显式暴露 data-value 并同步更新 S21 读取契约，cockpit-truth-residuals 恢复 28/28 PASS；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

运行既有真浏览器门禁 `cockpit-truth-residuals.entry.mjs`，27/28 通过、唯一失败项：
`FAIL  S21 合法 effort 生效（select.value=deep） — value=null state=count`（退出码 `1`）。

## 根因与边界

- M1/M6 将 `DefaultsPanel` 的深度控件由原生 `<select>` 重构为 [SelectMenu.tsx](../../../packages/deep-research-pack/src/client/defaults/SelectMenu.tsx)（`L28-L43`） 的 `<button type="button" data-testid={testId} value={value}>` + `Menu` 原语；
- [cockpit-truth-residuals.entry.mjs](../../../checks/smoke/cockpit-truth-residuals.entry.mjs)（`L336`） 仍通过 Playwright `page.locator('[data-testid="defaults-depth"]').first().inputValue()` 取值，而 Playwright 的 `.inputValue()` 规范仅支持 `<input>` / `<textarea>` / `<select>`，遇到 `<button>` 会抛错并在 `.catch(() => null)` 后返回 `null`。
- 现场证据：Stage 1 实跑记录（第 27/28 PASS，S21 FAIL）。

## 复现

```sh
node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs --scenario S21
# 实测 exit 1: FAIL  S21 合法 effort 生效（select.value=deep） — value=null state=count
```

## 修复判据

1. 对齐 [cockpit-truth-residuals.entry.mjs](../../../checks/smoke/cockpit-truth-residuals.entry.mjs)（`L336`） 与 [SelectMenu.tsx](../../../packages/deep-research-pack/src/client/defaults/SelectMenu.tsx)（`L28-L43`） 的契约（如读 `getAttribute('value')` / 可见文案，或在控件暴露规范可读属性）；
2. `cockpit-truth-residuals.entry.mjs` 全场景 28/28 绿过。

## 分诊与授权

- 严重级：P1 — 既有浏览器回归 `cockpit-truth-residuals` 因 DOM 契约漂移常驻红灯。
- 表面 / 边界：`SelectMenu.tsx` + `checks/smoke/cockpit-truth-residuals.entry.mjs`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`SelectMenu` 将 `<select>` 改为 DSH `<button>` 触发器后，`<button>` 不支持 `.inputValue()`（返回 `null`）。

## 修法

`SelectMenu.tsx` 的 `<button>` 显式暴露 `data-value={value}` 与 `value={value}`；`cockpit-truth-residuals.entry.mjs` S21 改读 `getAttribute('data-value') ?? getAttribute('value')`。真浏览器重跑 `cockpit-truth-residuals` 全量 28/28 PASS。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/defaults/SelectMenu.tsx",
    "checks/smoke/cockpit-truth-residuals.entry.mjs",
    "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "exit": 1,
    "output": "BUG-442 SelectMenu：null !== 'deep'"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  }
}
```
