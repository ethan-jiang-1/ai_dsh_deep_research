---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-380：英文主 tab「Method Library」被截成「Method libr...」——主导航标签不可读全

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：主 tab 短标签 Methods + 完整页标题；不再 CSS 截断；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S30 en 主 tab 完整可读（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/locale-audit.png`（同一会话、locale=en）；
> 复现 = `runtime/e2e/locale-audit-e2e.mjs`（截图即该次运行）。

## 症状

英文界面下，主视图顶部 tab 显示：

```text
Chat | Method libr...
```

完整标签是 `Method Library`，但被截断成 `Method libr...`；中文「方法库」能完整显示。
这是主视图的一级导航，用户看不到完整名称，也无法从标签区分“方法库”与其他 method 面。

## 分诊与授权

- 严重级：P2 — 观察面把「非空/在场」当「有实质内容」，用户会以为步骤/证据已完成。
- 表面 / 边界：pack client（驾驶舱观察面）/ 真浏览器；M1/M2 是内容实质，M3 是 en 文案/导航。
- DSH 不变量：fail-loud — 空正文/只有标题/失败登记/空证据卡必须与完成分开，并给出提示。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-23 用户 goal 放行。
- 批：`observation-substance-377-384`。

## 批

`observation-substance-377-384` — 同批卡：377/378/379/380/381/382/383/384；批计划：[观察面内容实质与英文文案修复程序(../settled_issues/2026-11-23-observation-substance-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-23 复跑仍红）。

```sh
node --import tsx/esm runtime/e2e/locale-audit-e2e.mjs
```

## 证据

locale=en 的 seed 会话，截图 `runtime/e2e/locale-audit.png`：顶部 tab 行可见
`Chat` 与 `Method libr...`（省略号由 UI 截断，不是数据）。同一 run 的
`runtime/e2e/locale-more-tabs-verdict.json` 里 `libClicked:true`、`library` 为方法库正文，
说明截断的是 tab label，不是页面未打开。

复跑（会生成同图）：

```sh
node --import tsx/esm runtime/e2e/locale-audit-e2e.mjs
```

## 根因

主视图 tab 的标签宽度按中文短标签「方法库」定；en 的 `Method Library` 更长，tab 容器
`overflow:hidden` + 固定/竞争宽度把文本截成省略号。没有按 locale 调整 tab 宽度或提供短标签。

**P0 根因证据（2026-11-23）**：P0 复跑 `locale-audit-e2e.mjs`（en overlay）：主 tab 截图 `Method libr...`；label 来自 pack `index.ts` 的 `t('methodLibrary')`（en `Method library`），vendor tab 槽按固定宽度 + `text-overflow:ellipsis` 截断。pack 可改短标签，无需改 vendor。

## 修法方向（未实施）

- 给主 tab 足够宽度/允许换行（至少完整显示 `Method Library`），或 en 使用短标签
  `Methods`/`Library` 并在 `aria-label`/title 保留全名。
- 其他 locale 的长标签同样按内容测量，不硬编码中文宽度。
- 中文「方法库」保持现状（负控）。

## 修复判据

- locale=en 时主 tab 完整显示 `Method Library`（或明确的短标签 + 全名可达）。
- 中文仍完整显示「方法库」。
- 窄屏下可截断，但必须有 title/aria 全名；不能只有省略号。
- 红证：把 en 标签改回固定中文宽度 → 截图再次出现 `Method libr...`，exit 1；还原后绿。
- guard 落点：tab label 的 locale 宽度/aria 可读性测试，或浏览器层截图断言。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/index.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/client/locales/client-locale.spec.mjs",
    "checks/smoke/cockpit-locale.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-locale.entry.mjs",
    "exit": 1,
    "output": "FAIL S30 en 主 tab 完整可读——变异：countText 固定复数 + tab 长标签，exit 1（1/3）"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-locale.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-locale.entry.mjs"
  }
}
```
