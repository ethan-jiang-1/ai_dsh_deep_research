---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-455：研究配置 UI 纯文本提示槽裸露 **...** 原始 Markdown 加粗语法且路径指引陈旧

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（清除四份字典纯文本槽中的原始 `**...**` 并更新工作台指引） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

1. 打开右栏「研究配置」页签，「本次研究」卡片上方副标题直接显示原始星号：`编辑/新建/删除在**有对话的会话**顶部「方法库」tab（空白 New Session 不显示 view tabs）。`；
2. 代码巡检确认同类纯文本字段 `configDetailCreateDesc`（`点按钮是**发给 Lead 由它建进库**`）与旧管理说明文案亦含未渲染的 `**...**`；
3. 此外，当前已提供全局「Orca 研究工作台 → 方法库」，空白会话并非完全无法管理方法库，原提示语引导陈旧。

## 根因与边界

- [zh.ts](../../../packages/deep-research-pack/src/client/locales/zh.ts)（`L298`、`L300`）与 `zh-fold.ts`（`L221`）、`en-fold.ts`（`L219`）在供 `<div>` / `<Modal description>` 纯文本渲染的词条中写入了 `**...**` Markdown 语法；
- [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)（`L192`、`L315`）直接将字符串作为普通 React 文本节点输出，而非交由 `<MarkdownText>` 渲染；
- 现场证据：截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-s1-config-1280x720.png` 与 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-delta-defaults-warnings.png`。

## 复现

```sh
# 1. 打开右栏「研究配置」页签，查看「本次研究」框上方的说明行（可见裸露 **有对话的会话**）
# 2. 全量检索纯文本 locale 里的原始星号：
rg -n "\*\*[^*]+\*\*" packages/deep-research-pack/src/client/locales/
```

## 修复判据

1. 清理 `locales/` 中用于纯文本渲染槽的原始 `**...**` 语法（或改用结构化 `<strong>` 片段 / `MarkdownText`），确保 UI 不出现原始星号；
2. 同步修正 `configMethodHint` 对「研究工作台 → 方法库」与会话顶部「方法库」tab 的双入口说明（遵循 `changing-ui-copy` 中英文同改合同）。

## 分诊与授权

- 严重级：P2 — 主界面常驻配置页签肉眼可见原始 Markdown 星号且引导信息过时。
- 表面 / 边界：`packages/deep-research-pack/src/client/locales/{zh,en,zh-fold,en-fold}.ts` + `ResearchConfigTab.tsx`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`zh.ts`（`configMethodHint` / `configDetailCreateDesc`）与 `zh-fold.ts` / `en-fold.ts`（`legacyFooter2`）在纯 React 文本槽词条中混入了 `**...**` Markdown 加粗标记，且 `configMethodHint` 尚未纳入「研究工作台 → 方法库」入口。

## 修法

清理 `zh.ts`、`en.ts`、`zh-fold.ts`、`en-fold.ts` 中全部纯文本渲染词条的 `**...**` 原始星号（保留既有子串契约「都是给 Lead 发一条指令」），并同步中英文更新 `configMethodHint` 指引至「研究工作台 → 方法库」与会话顶部「方法库」tab。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/client/locales/client-locale.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/locales/client-locale.spec.mjs",
    "exit": 1,
    "output": "纯文本 UI 字典词条含未剥离的 **...** 原始 Markdown 星号"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/locales/client-locale.spec.mjs" }
}
```
