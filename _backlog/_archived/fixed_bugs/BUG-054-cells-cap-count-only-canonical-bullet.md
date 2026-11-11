---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-054：cells 上限的计数只认 `- lenses:` 一种写法——`*`/缩进静默计 0，预算闸门失效

> 严重级别：P1 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；lens 行抽 `lensScanOf` 单一解析（`-`/`*`/`+`、缩进、大小写、括号列表与无括号简写），读不出 = `cells-unparseable` 红；`countCellsOf` 与 `strategyOf` 的 lenses/cells 同源；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

`protocol-audit` 的 effort 合同用 `countCellsOf(topicsText)` 数 cells，再与
`min(protocol.cells_max, band.cells_max)` 比。计数正则只认**行首、`-`、小写**的清单项：

```js
/^-\s*lenses\s*[:：]\s*\[(.*)\]\s*$/gm
```

任何常见 Markdown 变体都会计 0，于是「超上限」静默通过：

| topics 写法（quick 档 cap = 2，每行 4 个 lens） | 期望 | 实测 |
|---|---|---|
| `- lenses: [a, b, c, d]`（模板写法，对照） | red | **red**（对照，判据本身有效） |
| `* lenses: [a, b, c, d]` | red | **无 finding**（计 0） |
| `  - lenses: [a, b, c, d]`（缩进） | red | **无 finding** |
| `+ lenses: [a, b, c, d]` / `- Lenses: [...]`（大写） | red | **无 finding** |

`countCellsOf` 直接返回：模板写法 4；`*`、`+`、缩进、大写均 0。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/cells-variants.mjs
```

（一次性实验脚本；protocol = `BAND_TABLE.quick`（cells_max 2），§Protocol/§Decisions/plan 齐全，
只改 topics 的 lens 行写法。）

## 根因（已证）

- [`countCellsOf`](../../../scripts/lib/protocol-core.mjs) 的正则把「行首 `-`」与「小写 `lenses`」写死为
  必要条件；不匹配 = 0，没有「看起来像 lens 行但解析不了」的红；
- 同文件 `lensIdsOf`（[strategy-core](../../../scripts/lib/strategy-core.mjs)）的正则同样只认 `-`，
  所以投影的 `knowledge.lenses` 也会漏（两处独立实现、同一盲区）；
- 上限判据 `checkEffortContract` 只在 `cells > ceiling` 时红，0 永远不大于 ceiling。

**生产数据**：`research-workspace` 全部 10 个 topics 文件都用模板写法（`^- lenses:`），今天没有实例——
本条是**潜在**缺口，不是已发生事故。但 Lead 由模型按模板写，`*`/缩进是常见漂移形态。

## 牵出的失败类

**「预算/上限类」判据的输入解析必须 fail-loud**：上限是安全轨，输入读不到时不能当成 0（0 永远安全），
必须像同一审计的 `strategy-budget-unparseable` 那样红。同族检查方向：所有把「文本里的列表项」当计数的
地方（cells、nodes、waves、sources），是否都有「解析不了的形态 → 红」而不是「→ 0」。

## 修复判据

1. `* lenses:` / `+ lenses:` / 缩进 / 大写 `Lenses:` 的 4 lens 行 → effort 合同红（与模板写法同判）；
2. 更宽的兜底：一行**看起来像** lens 声明（含 `lenses` 词与 `[...]`）但解析不了 → red
   （如 `lenses-unparseable`），不许静默计 0；
3. `lensIdsOf` 与 `countCellsOf` 用同一解析助手（单一正本），不再各写一份正则；
4. 先红后绿：把上表三行加进 `tests/run/protocol-core.test.mjs`（修复前绿/应为红，修复后全红）；
5. 真实 10 个 topics 文件重跑 `protocol-audit` 仍全绿（模板写法不受影响）；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`protocol-core` 增 `lensScanOf`（ids/cells/unparsable），`countCellsOf` 改为其薄包装；`protocol-audit` 对 `unparsable` 报 `cells-unparseable` 红；`strategy-core` 删除本地 `lensIdsOf`，lenses/cells 共用同一扫描。证据 = `tests/run/protocol-core.test.mjs` BUG-054 用例（五种写法 + 括号不成对）与 `tests/run/strategy-core.test.mjs` 变体例先红后绿；8 个生产 bundle 审计 parity 不变（`- lenses: []` 与无括号简写都不误红）。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门）且改变 `countCellsOf` 的公开判据，按
[_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。**与 [BUG-049](BUG-049-protocol-projection-lines-absent-silent.md)
同族**（在场/可解析的 fail-open），建议同一次修复里抽「解析不了就红」的共享助手。
