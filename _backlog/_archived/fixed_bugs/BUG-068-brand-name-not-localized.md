---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-068：产品名 Orca 未做双语——中文应叫「Orca 深度搜索」，英文应叫「Orca Deep Research」

> 严重级别：P2｜发现：2026-11-12｜状态：已修 — `brandName` 进字典（zh `Orca 深度搜索` / en `Orca Deep Research`），`OrcaName` 收 `PropsLocale` 走 `t()`，品牌名槽声明 `locale`；`startTitle` 前缀与 `locale/{zh,en}.json` 的 `meta.title` 同批对齐；静态渲染断言 en 零 CJK/zh 逐字（2026-11-12，去向：none — UI 呈现修复，审查：agent 自审 + 机械门禁）。

## 症状

侧栏左上角品牌名**无论界面语言都是 `Orca`**：

- 英文界面（2026-11-12 02:14 用户截图）：品牌区显示 `Orca`，而产品要求是 `Orca Deep Research`；
- 中文界面：同一处仍显示 `Orca`，而产品要求是 `Orca 深度搜索`。

品牌名是产品身份，不属于技术标识；它必须随 locale 走。相邻的产品名显示位还有三处，当前彼此不一致：

| 位置 | 中文现状 | 英文现状 | 归属 |
|---|---|---|---|
| 侧栏品牌槽 `sidebar.brand.name` | `Orca` | `Orca` | 本卡 |
| 插件市场/Plugins 标题 `locale/{zh,en}.json` 的 `meta.title` | `深度研究` | `Deep Research` | 同一产品名的显示位，需对齐 |
| 首屏起步卡标题 `startTitle` | `Deep Research · 一支多角色研究团队` | `Deep Research · a multi-role research team` | 同一产品名的显示位，需对齐 |
| Lead preset 名 `Deep Research Lead` | `Deep Research Lead` | `Deep Research Lead` | 角色名（agent 标识），不在本卡 |

## 复现

1. 启动 Web GUI，语言设为中文：看侧栏左上品牌名 → `Orca`（应为 `Orca 深度搜索`）；
2. 语言切到英文：同一处 → `Orca`（应为 `Orca Deep Research`）；
3. 对照 Plugins 页标题与首屏起步卡：中文/英文分别仍是「深度研究」「Deep Research」，没有统一的 “Orca …” 产品名。

## 根因（已证到代码）

1. [BrandMark.tsx](../../../packages/deep-research-pack/src/client/BrandMark.tsx) 的 `OrcaName` 是**硬编码字面量** `Orca`，没有接收 `PropsLocale<'deepResearchPack'>`，也没有 `t()`。
2. [index.ts](../../../packages/deep-research-pack/src/client/index.ts) 的品牌名槽注册是 `{ name, priority: -1 }`，**没有 `locale: 'deepResearchPack'`**；因此即使组件想要 `t`，槽也不会注入。
3. 品牌名的其它显示位各写各的：`locale/zh.json` / `locale/en.json` 的 `meta.title` 是「深度研究 / Deep Research」，`locales/zh.ts` / `en.ts` 的 `startTitle` 是 `Deep Research · …`；没有单一品牌名来源。
4. 现有 `tests/cockpit/locales.test.mjs` 只对方法库/状态/图谱视图做 en 渲染断言，未覆盖品牌槽；`cjk-source` 扫描不检查英文硬编码字面量，故 `Orca` 一直绿。

## 牵出的失败类

**“产品名被当成代码常量”**：品牌名不经过字典，且同类显示位没有单一正本——任何新显示位都可以再造一个名字，语言切换时不会跟。

## 修复判据

- `locales/zh.ts` 与 `locales/en.ts` 增品牌名键（建议 `brandName`），zh 值**逐字** `Orca 深度搜索`，en 值**逐字** `Orca Deep Research`；键集/占位符对账与 en 值零 CJK 继续通过；
- `OrcaName` 收 `PropsLocale<'deepResearchPack'>`，通过 `t('brandName')` 输出；品牌名槽注册声明 `locale: 'deepResearchPack'`（mark 槽不需要）；
- 英文 locale 渲染 `OrcaName` 不含 CJK 且等于 `Orca Deep Research`；中文 locale 等于 `Orca 深度搜索`（新增静态渲染断言）；
- 同一产品名的其它显示位同批对齐：`locale/{zh,en}.json` 的 `meta.title` 与 `startTitle` 前缀使用同一品牌名（`Orca 深度搜索` / `Orca Deep Research`），不再出现「深度研究 / Deep Research」与 `Orca` 三套名字；若产品决定保留旧标题，须在卡上写明并只改侧栏品牌——本卡默认对齐；
- 不把角色名/技术标识（`Deep Research Lead`、`method-library.md`、`readiness` 等）当品牌名翻译；`tests/cockpit/cjk-source.test.mjs` 的模型面/数据面 allowlist 不因此放宽；
- `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm verify` 绿；真机/静态渲染至少证明语言切换即时生效（无需重建会话）。

## 修复关联

已落地（2026-11-12）：`src/client/locales/zh.ts`/`en.ts` 增 `brandName`；`BrandMark.tsx` 的 `OrcaName` 改收 `PropsLocale<'deepResearchPack'>` 并输出 `t('brandName')`；`index.ts` 的 `sidebar.brand.name` 注册补 `locale: 'deepResearchPack'`；`startTitle` 前缀与 `locale/zh.json`/`en.json` 的 `meta.title` 统一为品牌名。证据 = `tests/cockpit/locales.test.mjs` 新增 BUG-068 渲染断言（zh `Orca 深度搜索` / en `Orca Deep Research`、首屏前缀同源）+ 全量 en 零 CJK/键集对账。去向 = none — UI 呈现修复。
