---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-055：插件 UI 只做了半套中英文——标签/按钮大量硬编码中文，英文界面里中英混排

> 严重级别：P1｜发现：2026-11-11｜状态：已修 — 方法库 + 四个右栏页签的组件字面量与数据面 fold 文案全部走 locale；字典 521 键 zh/en 逐键对齐；en 值/英文渲染零 CJK，源码 CJK 扫描守卫覆盖客户端与 lib；完整回归 1209 绿、verify 绿（2026-11-11，去向：none — UI 呈现修复，审查：agent 自审 + 机械门禁）

## 症状

宿主语言切到英文时，插件的界面中英混排：tab 名和少数按钮跟着 locale 走（`Method library`、`Start from this method`），
但同一屏里的「刷新 / 新建 / 我的库 / 内置参考 / 本工作区共享 · 保存交方法编辑」、空态文案、字段提示、删除确认、
研究状态/图谱/终稿三个页签的标签与按钮仍是中文。中文界面下则相反：tab 名是英文（`Method library`），正文是中文。

现场（2026-11-11 22:26 截图，3083 通道「方法编辑」会话）：方法库 tab 标题 `Method library`、按钮 `Start from this method`
为英文，而同屏的页签组与按钮为中文。

## 复现

1. 宿主语言设为英文（或默认英文），打开任一方法库 tab；
2. 看左侧栏头的「我的库 / 内置参考」、右上「刷新 / 新建」、空态「库还是空的。」；
3. 切到「研究配置 / 研究图谱 / 终稿」页签，同样有中文标签与提示。

## 根因（假设）

`src/client/locales.ts` 已注册 `zh` / `en` 两套字典（~97 键），但界面组件只把其中一部分接到 `t()`：
页面 chrome（页签组、刷新/新建、空态、字段提示、删除确认）与另外三个页签的标签/按钮仍是中文字面量。
`PropsLocale<'deepResearchPack'>` 在组件里可用，缺的是"字面量 → key"的搬运与 en 译文。

旁证：`MethodLibraryView.tsx` 25 处中文字面量里只有空态与提示可见（其余是发给方法编辑模型的内部指令，不属 UI 面）：
`views.tsx` 的 `SECTION_HINTS`、`新建方法/编辑方法`、占位符，`ResearchConfigTab` 23 处、`ResearchFinalTab` 15 处、
`ResearchGraphTab` 12 处、`research-status/TrackRail` 4 处同理。

## 牵出的失败类

**"做了 i18n 机制但没做覆盖"**：字典存在、`t()` 在位、门禁不咬——任何组件都可以绕过字典写死中文，
英文用户看到的是混排。守卫面 = zh/en 键集与占位符对账（机械）+ 关键组件渲染断言（英文 locale 下无 CJK）。

## 修复判据

- 方法库页签（含我的库/内置参考、刷新/新建、空态、来源选择、编辑器提示、删除确认）在英文 locale 下全英文，中文 locale 下全中文；
- 研究配置 / 研究状态 / 研究图谱 / 终稿四个页签的标签、按钮、提示同样双语；
- `locales.ts` 的 zh/en 键集与 `{placeholder}` 集合完全一致（新契约测试先红后绿）；
- 模型面指令（发给 Method Editor / Lead 的内部 prompt）不在此列，保持原文——它们不是 UI。

## 修复关联

已落地（2026-11-11）：

- `locales.ts`：字典 97 → 521 键，zh/en 逐键对齐（含占位符）；方法库全部 chrome（页签组、刷新/新建、
  空态、来源选择、编辑器提示、删除确认、四字段标题与提示、Markdown 预览词表）、四字段标题、
  研究状态（HITL/流失败/证据/交付/未绑定/挂起/队员动态/流程轨道图例）、终稿页签（更新/重读/过程/
  截断/复制/审查未过/读者版/审计版/版本账/错误态）、研究图谱（表头/计数/结构差异/空态/边线提示/
  版本轨/旧图快照/结构提示/节点卡/DAG aria）、研究配置（按钮/菜单/占位符/删除确认/执行说明/底线/
  标本/推荐说明），以及 GraphVersionRail / GraphNotices / NodeCard / DagMap / TrackRail 的 `t` 接线；
- 四个右栏页签注册补 `locale: 'deepResearchPack'`（`ResearchStatusTab`/`ConfigTab`/`GraphTab`/`FinalTab`
  经 `PropsLocale` 拿 `t`）；
- 测试：`tests/cockpit/locales.test.mjs`（键集/占位符对账 + en 值无 CJK + 英文 locale 渲染无 CJK）、
  既有视图测试改走 `tZh`（产品中文口径）；`pnpm typecheck` 绿；完整 `pnpm test` 1209 绿、`pnpm verify` 绿。

补充（数据面收口）：`lib/i18n.ts` 翻译桥 + `locales/zh-fold.ts` / `en-fold.ts`；`run-fold`（七步标签）、`brief-fold`（业务摘要）、`activity-fold` / `member-activity`、`run-version`、`graph-model` / `plan-diff` / `plan-index` / `plan-graph`、`state-note`、`config-model`（执行面/标本）、`rerun-triage`、`tool-card`、`receipt-fold` 均接受 `t` 并在 en 下零 CJK；`LegacyManagementPane` 组件字面量同步 bilingual。测试 = `tests/cockpit/i18n.test.mjs`（数据面 en 零 CJK）+ `tests/cockpit/cjk-source.test.mjs`（组件/lib 源码中文扫描 + 模型面 allowlist）+ `tests/cockpit/locales.test.mjs`（键集/占位符/en 值/渲染）。

真浏览器证据：`client-load-smoke --seed tests/fixtures/client-load-home --port 3114` → ALL PASS（方法库新建/编辑/窄屏全链 + 研究状态/图谱/配置/终稿；浏览器档钉 zh-CN，英文面由静态 en 渲染与数据面 en 断言覆盖）。

架构理由、输掉的方案与验证全表 = [Note：驾驶舱 i18n 覆盖](../../../notes/implemented/2026-11-11-cockpit-i18n-coverage.md)。
