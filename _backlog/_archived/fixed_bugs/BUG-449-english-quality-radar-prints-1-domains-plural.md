---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-449：英文 UI 模式下 QualityRadar 独立域名计数为 1 时显示「1 domains」缺少单数处理

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：拆分为 statusRadarPublishersOne / statusRadarPublishersOther 并在英文下渲染 1 domain；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在 `locale.preference: en` 下打开仅命中 1 个独立出版域（如 `un.org`）的 bundle 状态面板，「Evidence quality radar」卡片右上角 Tag 显示 `1 domains`（单数 1 配了复数 `domains`）。

## 根因与边界

- [en-cockpit.ts](../../../packages/deep-research-pack/src/client/locales/en-cockpit.ts)（`L26`） 固定写为 `statusRadarPublishers: '{count} domains'`；
- [QualityRadar.tsx](../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx)（`L45`） 未做单复数分叉（注：`en-cockpit.ts#L94` 的 `{count} evidence` 按 `evidence` 不可数名词正常，主要偏差在 `domains`）。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/18-en-status-1440.png`（卡片右上角显示 `Evidence quality radar` `1 domains`）。

## 复现

```sh
# locale.preference: en 下打开仅有 1 个 publisher 域的 bundle 状态页
# 截图 18-en-status-1440.png 显示「1 domains」
```

## 修复判据

1. `matrix.uniquePublishers === 1` 时英文渲染 `1 domain`，其余渲染 `{count} domains`；
2. 双语单测或浏览器 EN 校验通过。

## 分诊与授权

- 严重级：P2 — 英文 UI 单数域名计数语法错误。
- 表面 / 边界：`QualityRadar.tsx` + 双语 locale。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`en-cockpit.ts` 仅有单一键值 `statusRadarPublishers: '{count} domains'`，`QualityRadar.tsx` 未按 `uniquePublishers === 1` 选择单复数。

## 修法

拆分 `statusRadarPublishersOne`（`'{count} domain'`）与 `statusRadarPublishersOther`（`'{count} domains'`），并在 `QualityRadar.tsx` 按数量分支调用。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/QualityRadar.tsx",
    "packages/deep-research-pack/src/client/locales/zh-cockpit.ts",
    "packages/deep-research-pack/src/client/locales/en-cockpit.ts",
    "tests/cockpit/client/research-status/protocol-radar.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/research-status/protocol-radar.spec.mjs",
    "exit": 1,
    "output": "BUG-449 QualityRadar：'1 domains' did not match /\\b1 domain\\b/"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-status/protocol-radar.spec.mjs"
  }
}
```
