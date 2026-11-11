---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-056：§Protocol 行在场但数值/分节读不出仍静默——BUG-049 修复未覆盖的解析半

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；§Protocol 数值/分节「行在场但读不出」改 red（`projection-number-unparseable` / `projection-output-unparseable`），单位写法宽容（无 `≤` / `顶层` / `nodes` / `cells` / `sections:`）；投入数字按上限语义（高于 JSON 才红）；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）
>
> **关系**：[BUG-049](BUG-049-protocol-projection-lines-absent-silent.md) 的修复补上了「行缺席 → warn」，
> 本卡是同一函数的**另一半**：行在场但格式读不出。按「已修卡不重开、回归 = 新卡」建本卡。

## 症状

在**已含 BUG-049 修复**的当前树上（2026-11-11 23:0x，`checkProjectionDetails` 已改成
`projectionLineOf` 缺席 warn），下面两种输入仍然零 finding：

| 输入（行都在，§Protocol 其余齐全） | 期望 | 实测 |
|---|---|---|
| `投入：18 节点 / 18 cells / L1–L2`（无 `≤`，与 JSON 12/8 不符） | red | **无 finding** |
| `投入：12 nodes / 8 cells / L1–L2`（英文单位、无 `≤`） | 可解析或 red | **无 finding** |
| `输出：comparison_table；分节 = decision`（缺 `risks`，无 `sections =`） | red | **无 finding** |
| `输出：comparison_table；sections: decision`（冒号写法，缺 `risks`） | red | **无 finding** |
| 模板原样（`≤12 节点 / ≤8 cells`、`sections = …`） | 绿 | 绿（对照） |

即：`projectionLineOf` 解决了「行缺席」，但「行在场而值读不出」仍被 `nodes !== null` / `sectionList !== undefined`
的守卫静默跳过——与同一审计里 `strategy-budget-unparseable`（读不出就红）的纪律不一致。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/projection-format.mjs
```

（脚本写于修复前，当前树上重跑即得到上表——修复前是「缺席 + 读不出都静默」，修复后只剩「读不出静默」。）

## 根因（已证）

- 节点/cells：`/≤\s*(\d+)\s*节点/`、`/≤\s*(\d+)\s*cells/i` 把 `≤` 写成必要条件；不匹配 = 不检查；
- 分节：`/sections\s*=\s*([^；;\n]+)/i` 把 `sections =` 写成必要条件；不匹配 = 不检查；
- 两处都只有「解析成功 → 比对」分支，没有「行在场但解析失败 → 红」分支（`depthsOfText` 已经这么做了，
  返回 null 就红——数值与分节没有跟上）。

## 牵出的失败类

**同一修复内的三处解析没有统一纪律**：深度已改为「解析失败 → 红」，数值/分节仍是「解析失败 → 跳过」。
横切检查方向：`checkProjectionDetails` 里所有 `?? null` / `!== undefined` 守卫，逐条问「这是缺席还是解析失败」；
同类应共享 `parseOrRed(value, pattern, code)` 助手。

## 修复判据

1. `投入` 行在场但节点/cells 读不出（无 `≤`、单位不认识、只有数字）→ red
   （如 `projection-number-unparseable`），与 `depthsOfText === null → red` 同档；
2. `输出` 行在场但 `sections` 读不出（不是 `sections =` 形态）→ red；若产品决定容忍 `sections:`/`分节`，
   则必须能解析并比对，不能跳过；
3. 模板原样仍绿；行缺席仍按 BUG-049 的 warn；
4. 先红后绿：把上表四行加进 `tests/run/protocol-core.test.mjs`（修复前绿，修复后红）；
5. 真实 8 个带 protocol.json 的 bundle 重跑 `protocol-audit` 全绿；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`checkProjectionDetails` 的 nodes/cells 解析改为宽容并新增 `projection-number-unparseable`；sections 接受 `=` / `:` 并新增 `projection-output-unparseable`；投入数字按上限语义（投影高于 JSON 才红）。证据 = `tests/run/protocol-core.test.mjs` BUG-056 用例先红后绿（30/30）；8 个生产 bundle parity 不变（唯一既有红 = regulation 18 > 12）。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。
与 [BUG-054](BUG-054-cells-cap-count-only-canonical-bullet.md) 同族（解析失败静默 → 上限/对账失效），
建议一次抽共享助手。
