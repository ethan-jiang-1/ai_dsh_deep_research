---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-446：研究工作台 RunsView / LensesView 搜索框未撑满容器，停在 ~198px 固有宽度导致 placeholder 被截断

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：hub.module.css 新增 .searchInput { width: 100%; box-sizing: border-box } 并挂载到 RunsView / LensesView；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

打开「Orca 研究工作台（Research Hub）」的「Run 档案」和「研究透镜」页签时：
- 工具栏搜索外容器宽达 `1120px`（「研究透镜」整行几乎全空），但内部的搜索 `<Input>` 盒却收缩在仅 **`198px`**（`<input>` 本身 `158px`）；
- 中文占位提示 `搜索研究透镜（学术 / 反例 / 定量 / 官方 / 监管…）` 在视觉上被硬截断成 `搜索研究透镜（学术 / 反`。

## 根因与边界

- [hub.module.css](../../../packages/deep-research-pack/src/client/research-hub/hub.module.css)（`L93-L96`） 给外层 `.searchWrap` 设为 `flex: 1 1 240px; min-width: 180px;`，但未约束子组件 `<Input>` 宽度；
- DSH 原语 `vendor/dsh/packages/client/ui-primitives/src/Input.module.css#L1-L10` 与 `vendor/dsh/packages/client/ui-primitives/src/Input.tsx#L14-L23` 的外包 `<span>`（`.wrap`）是 `display: inline-flex` 且无默认 `width: 100%`；
- [RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx)（`L95-L102`） 与 [LensesView.tsx](../../../packages/deep-research-pack/src/client/research-hub/LensesView.tsx)（`L34-L42`） 均未传 `className` 为 `<Input>` 设 `width: 100%`。
- 现场证据：`stage234.log`（`FAIL [S2-B] Hub 搜索框撑满容器不截断 placeholder — {"inputW":158,"spanW":198,"wrapW":1120,"scrollW":158,"clientW":158}`）及截图 `02-hub-runs-light-1440.png`、`04-hub-lenses-light-1440.png`、`17-en-hub-1440.png`。

## 复现

```sh
# 1440x900 打开 Orca 研究工作台 → 切换「Run 档案」或「研究透镜」
# 实测 searchWrap width=1120px 而内部 Input span width=198px，placeholder 被裁切
```

## 修复判据

1. 为 Hub 搜索 `<Input>` 传入 `width: 100%`（或 `.searchWrap > * { width: 100%; box-sizing: border-box; }`），在 1440/1280/768/480 下自适应工具栏可用空间；
2. 完整展示 `hubSearchLenses` 与 `hubSearchRuns` 占位文本，不出现过早硬截断。

## 分诊与授权

- 严重级：P1 — 工作台工具栏长占位提示被原生 `size=20` 截断，大量工具栏空间浪费。
- 表面 / 边界：`hub.module.css`、`RunsView.tsx`、`LensesView.tsx`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`RunsView` 与 `LensesView` 的 `<Input>` 仅包在 flex 容器 `.searchWrap` 内但未设 `width: 100%`，vendor `Input` 盒保持浏览器固有 ~198px 宽度。

## 修法

在 `hub.module.css` 新增 `.searchInput { width: 100%; box-sizing: border-box; }` 并在 `RunsView.tsx` 与 `LensesView.tsx` 的 `<Input>` 显式传 `className={css.searchInput ?? ''}`。真浏览器实测宽度分别为 `842px/882px` 与 `1080px/1120px`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-hub/hub.module.css",
    "packages/deep-research-pack/src/client/research-hub/RunsView.tsx",
    "packages/deep-research-pack/src/client/research-hub/LensesView.tsx",
    "tests/cockpit/client/research-hub-panel.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "BUG-446 ResearchHubPanel：searchInput 类未挂载"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-hub-panel.spec.mjs"
  }
}
```
