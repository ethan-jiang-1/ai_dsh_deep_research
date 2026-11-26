---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-440：ResearchMilestoneCard 在单次多文件 deliverables/presented 后重复渲染两张相同的交付里程碑卡片

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：research-turn.ts 对同次多文件 deliverables/presented 按 turn 级单卡去重（优先 readable*.md）；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

标准交付时 `deliverables/presented` 事件 `files` 同时包含主交付物与读者版（如 `final/readable-v1.md` 与 `final/v1.md`），同一回合尾部 `ResearchMilestoneCard` 会连着渲染两条内容完全一致的「研究报告已正式交付 · delivered · 阅读终稿」行，造成对话流噪音重复。

## 根因与边界

- [research-turn.ts](../../../packages/deep-research-pack/src/client/research-turn.ts)（`L37-L40`） 的 `addMilestone` 按 `${m.kind}:${m.path}` 去重；
- [research-turn.ts](../../../packages/deep-research-pack/src/client/research-turn.ts)（`L92-L100`） 在处理单个 `deliverables/presented` 事件时遍历 `rec.data.files`，把每个合法 `finalPath` 都各追加一条 `kind: 'delivered'` 里程碑；
- [ResearchMilestoneCard.tsx](../../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx)（`L33-L56`） 对每个 `m` 渲染一行固定标题 `milestoneDeliveredTitle`，导致同一轮单次 `present` 出现多张完全相同的交付卡片。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/05-rich-chat-pill-tools-milestone-light-1440.png`、`13-dark-status-1440.png`、`stage234.log`。

## 复现

```sh
# 回合内记录一条含 files: [final/readable-v1.md, final/v1.md] 的 deliverables/presented 事件
# 实测 05-rich-chat-pill-tools-milestone-light-1440.png 回合尾出现两行「研究报告已正式交付 delivered 阅读终稿」
```

## 修复判据

1. 同一次 `deliverables/presented`（含主本 + 读者版多文件）只渲染一条 `delivered` 里程碑行（优先读者版/首路径）；
2. 单测覆盖多文件 `deliverables/presented` 不重复产出两条 `delivered` 行。

## 分诊与授权

- 严重级：P1 — 每次正式交付同时递交读者版与审计版时对话流均渲染双份相同里程碑卡。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-turn.ts`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`researchTurnDefinition` 处理 `deliverables/presented` 时对每个 `files[i]` 各 `push` 一条 `kind: 'delivered'` 里程碑项，导致一轮多文件呈现产出两张同名卡片。

## 修法

`research-turn.ts` 在 `deliverables/presented` 分支挑选首选规范路径（优先 `readable*.md`，次选首项），按单 turn 对 `kind === 'delivered'` 去重只保留一张里程碑卡片。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-turn.ts",
    "tests/cockpit/client/research-turn.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/research-turn.spec.mjs",
    "exit": 1,
    "output": "BUG-440 researchTurnDefinition：2 !== 1"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-turn.spec.mjs"
  }
}
```
