---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-447：ResearchEvidenceTab 重复渲染两份 Question List，且中文模式下硬编码英文 Quality 标签

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：parseEvidenceCard 裁剪已提取的 Question List 节消除双份渲染，并将质量/信源层/默认 lens 标签纳入 locale；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

点击终稿证据引用分屏打开「证据卡」阅读器（`ResearchEvidenceTab`）时可见两处 UI 瑕疵：
1. **Question List 双份重复**：正文 Markdown 已渲染了一遍 `## Question List（本 topic）` 勾选列表，紧接其下方又由结构化 `.questionsBox` 框原样重复渲染了第二遍 `Question List 核对进度`（完全相同的勾选条目）；
2. **中文模式下混出英文硬编码标签**：头部元数据 `Tag` 在中文模式下仍直接拼写英文 `Quality A` 及未经投影的 `primary` / `official` 原始键值。

## 根因与边界

- [evidence-card.ts](../../../packages/deep-research-pack/src/lib/run/evidence-card.ts)（`L89-L106`） 提取 `questions` 数组的同时，仅剥离 YAML frontmatter，保留了 `bodyMarkdown` 中的 `## Question List` 原节，随后 [ResearchEvidenceTab.tsx](../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx)（`L118-L128`） 同时渲染 `<MarkdownText text={card.bodyMarkdown} />` 和 `.questionsBox`；
- [ResearchEvidenceTab.tsx](../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx)（`L109`） 直接硬编码 `<Tag tone={qualityTone}>Quality {meta.quality}</Tag>`，未接入 locale 字典。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/08-final-and-evidence-split-light-1440.png`、`09-final-claims-canonical-check.png`。

## 复现

```sh
# 1440x900 分屏打开包含 `## Question List` 小节的标准 8 字段证据卡（如 evidence/e1.md）
# 截图 08/09 右栏可见上下连续出现两块完全相同的 Question List，且顶部标签为「Quality A」
```

## 修复判据

1. 当结构化 `questionsBox` 渲染勾选进度时，从 `bodyMarkdown` 中裁剪对应的 `## Question List` 节（仅当无法提取结构化条目时回退原文展示），消除同页双份重复；
2. `Quality {grade}` 走 `zh`/`en` 双语字典，保持中文界面文案一致。

## 分诊与授权

- 严重级：P1 — 证据卡界面将 Question List 重复展示两份并在中文 UI 中泄漏英文 `Quality A`。
- 表面 / 边界：`evidence-card.ts`、`ResearchEvidenceTab.tsx`、双语 locale。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`parseEvidenceCard` 解析 `questions` 数组后未将 `##/### Question List` 节从 `bodyMarkdown` 裁剪；`ResearchEvidenceTab` 直接拼接英文 `'Quality '` 与英文 `sourceTier` 枚举值。

## 修法

在 `evidence-card.ts` 提取 checkbox 问项时从正文节边界裁剪 `Question List` 节；在 `zh-cockpit.ts`/`en-cockpit.ts` 补齐 `evidenceQualityBadge` 与 `evidenceTier_*` 词条并在 `ResearchEvidenceTab.tsx` 本地化显示。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/evidence-card.ts",
    "packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh-cockpit.ts",
    "packages/deep-research-pack/src/client/locales/en-cockpit.ts",
    "tests/cockpit/lib/run/evidence-card.spec.mjs",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "BUG-447 ResearchEvidenceTab：expected /质量 A/ 且 Question List 出现 2 次"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-evidence.spec.mjs"
  }
}
```
