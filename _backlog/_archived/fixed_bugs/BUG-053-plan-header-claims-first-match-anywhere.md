---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-053：「plan 头」类判据用全文首匹配——正文提及可冒充头（protocol / 策略行两处）

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；plan 头抽 `headerBlockOf`（首个 `##` 前），`plan-ref` 与策略行只认头，正文提及不再冒充；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

`protocol-audit` 有两条以「plan 头」为对象的判据，实际都按**全文首个匹配**解析：

1. **plan-ref**：`checkPlanRef` 用 `protocolVersionIn(planText)`（全文首个 `protocol: vN`）。plan **没有头部
   `> protocol: vN`**，但正文任何位置出现一句 `- 修订记录：protocol: v1 仍适用` → **绿**；
2. **策略行**：`checkStrategy` 的正则 `^>?\s*-\s*策略\s*[:：]` 允许无 `>` 前缀、且不限位置。策略行写在
   `## 备注` 正文里（头部没有）→ **绿**（连 `strategy-missing` 的 warning 都没有）。

两条判据的散文承诺都是「头」：`protocol-audit` 头注「plan.md 缺 `protocol: vN` 头」判红；策略行的模板与
D48 决策都写「plan 头 `- 策略:` 行」。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/planref-final.mjs
```

（一次性实验脚本；protocol 取 `BAND_TABLE.standard`，§Protocol / §Decisions 齐全，只改 plan 文本。）

| 输入 | 期望 | 实测 |
|---|---|---|
| 头齐（对照） | 绿 | 绿 |
| 缺 `> protocol: v1`，正文写 `- 修订记录：protocol: v1 仍适用` | 应 red（缺头） | **绿** |
| 头缺策略行，正文 `## 备注` 里写 `- 策略: 通道=spawn；…` | 至少 warn（缺头） | **绿**（零 finding） |
| 全文无 `protocol:` 字样 | red | red（对照，判据本身有效） |
| 策略行完全缺席 | warn | warn（对照） |

## 根因（已证）

- `protocolVersionIn`（[protocol-core](../../../scripts/lib/protocol-core.mjs)）对**任意文本**取首个
  `protocol\s*[:：]\s*v(\d+)`，无位置约束；
- `checkStrategy` 的正则 `^>?\s*-` 允许 `>` 可选（兼容旧 plan 的写法），于是正文列表项同样命中；
- 两处都没有「头 = 首个 `##` 之前的引用块/前 N 行」这个范围。

## 牵出的失败类

**「头」的语义没有载体**：判据用全文搜索近似「头在场」，于是任何正文提及都能满足它；同一失败类还会出现在
「头字段/派生行」一族的其它检查（如 `plan-ref` 与策略行之外的 future header 字段）。横切检查方向：
`grep -n "protocolVersionIn\|^>?\\\\s\*-" scripts/lib/protocol-*.mjs`，把「头」抽成一个共享的
`headerBlockOf(planText)`（首个 `##` 之前）再匹配。

## 修复判据

1. 缺头部 `> protocol: vN`、正文提及 `protocol: v1` → red（缺头），不再冒充；
2. 缺头部 `- 策略:` 行、正文有同形列表项 → 至少 warn（`strategy-missing`），不得静默；
3. 头齐（含无 `>` 前缀的旧写法，若仍要兼容）→ 保持绿；
4. 先红后绿：把上表两行加入 `tests/run/protocol-core.test.mjs`，修复前红、修复后绿；
5. `pnpm test` + `pnpm verify` 绿；真实 bundle（8 个带 protocol.json 的场次）重跑 `protocol-audit` 全绿。

## 修复关联

已落地（2026-11-11）：`protocol-core` 增 `headerBlockOf`；`checkPlanRef` 的 `protocolVersionIn` 与 `checkStrategy` 的策略行正则都改走头块；`strategy-core.channelOf` 的显式通道解析同源。证据 = `tests/run/protocol-core.test.mjs` BUG-053 用例先红后绿（正文提及 → `plan-ref` / `strategy-missing`）；8 个生产 bundle 审计 parity 不变（唯一既有红未动）。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。

**与 [BUG-048](BUG-048-protocol-depth-projection-first-pair-only.md) / [BUG-049](BUG-049-protocol-projection-lines-absent-silent.md) /
[BUG-050](BUG-050-strategy-channel-absent-and-workflow-null-workers.md) 同族**：都是「散文写了必须/头/在场，
实现用在场容忍或全文搜索近似」。修复时建议抽共享的「头块」与「行在场」助手，一次收口，避免逐条打补丁。
