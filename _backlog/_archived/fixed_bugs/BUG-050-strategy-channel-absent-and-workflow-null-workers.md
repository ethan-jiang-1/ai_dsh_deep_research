---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-050：策略行审计的两处静默——通道缺席零 finding、workflow 无 Wave 时 worker 对账被跳过

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；通道缺席 = warning（strategy-channel-missing）、声明 workflow 无 Wave 拓扑 = red（strategy-workflow-without-wave），worker 不再被 null 哨兵跳过；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

`protocol-audit` 的 `checkStrategy` 负责把 plan 头的 `- 策略:` 行与派生投影对账（[D48](../../../docs/decisions.md#d48)
要求「对账通道/worker/预算 cap」）。两处输入让这条对账静默失效：

1. **通道字段缺席**：`- 策略: worker=research-worker；预算=12/8`（没有 `通道=`）→ **零 strategy finding**。
   同一行里 worker 缺席和预算缺席各有一条 warn，通道缺席却没有；投影改用正文猜出的 `spawn` 继续对账，
   读者不知道通道是猜的。
2. **workflow 通道 + 无 `## Wave 执行` 节**：`通道=workflow；worker=research-worker`（或 `research-wave`）→
   **零 finding**。派生侧 `workers.wave = null`（无 Wave 节），检查侧 `expectedWorker = null`，于是
   `expectedWorker !== null` 这个守卫把 worker 比较整段跳过；写成哪个 worker 都绿。

负对照（证明判据本身会咬人）：有 Wave 节但 `worker=research-worker` → `red:strategy-mismatch
策略行 worker research-worker ≠ 派生 research-wave`。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/strategy-final.mjs
```

（一次性实验脚本；protocol 取 `BAND_TABLE.standard` 默认值，§Protocol / §Decisions / plan 其余部分齐全，
只改策略行与 Wave 节。）

## 根因（已证）

[`checkStrategy`](../../../scripts/lib/protocol-audit-core.mjs) 里两套逻辑各判一半：

- **通道**：只校验「在场且不在 `team/spawn/workflow`」→ 非法值红；`channel === undefined` 没有分支，
  等于默认放行（同文件里 worker/预算缺席各有 warn，唯独通道没有——不对称）。
- **worker**：期望值由派生投影给出：`channel === 'workflow' ? workers.wave : workers.oneShot`。
  `workers.wave` 只有在 plan 文本里同时出现 `## Wave 执行` 与 `research-wave|wave-executor|lens-fanout`
  时才非 null（[`strategyOf`](../../../scripts/lib/strategy-core.mjs)）。于是「声明了 workflow 通道但没有
  Wave 拓扑」这一自相矛盾的输入，恰好把期望值变成 null，而 null 又被当作「无需对账」的哨兵值。

即：**声明的通道**（策略行）与**派生的通道**（文本启发）是两份事实；检查器只在其中一份非空时比较，
另一份为空时静默。

## 牵出的失败类

- **哨兵值当授权**：`null` 同时表示「没有 Wave 拓扑」和「不需要检查」，两种语义混用；
- **声明 vs 派生双份事实**：同一策略在两处各算一次（`strategyOf` 与 `checkStrategy` 内联解析），
  没有单一正本；
- **缺席容忍**：与 [BUG-049](BUG-049-protocol-projection-lines-absent-silent.md) 同族（`?? ''` / 缺字段跳过），
  但触发点在策略行而非 §Protocol 投影。

## 修复判据

1. 策略行有内容但缺 `通道=` → 至少一条 warn（v1 兼容；与 worker/预算缺席的 warn 对称）；
2. `channel === 'workflow'` 且派生 `workers.wave === null`（或 `topology.waves === 0`）→ red
   （如 `strategy-workflow-without-wave`：声明了 workflow 却没有 Wave 拓扑，不可执行）；
3. worker 对账在 workflow 分支不得因期望值为 null 而跳过——先判「workflow 拓扑是否成立」，再比 worker；
4. 先红后绿：在 `tests/run/protocol-core.test.mjs` 增加「通道缺席」「workflow 无 Wave × 两种 worker」三个
   用例，确认修复前红、修复后绿；
5. 既有负对照（有 Wave + worker 不符）仍红；`pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`checkStrategy` 增通道缺席 warning 与 workflow-without-wave red；workflow 分支期望 worker 固定 `research-wave`，不再用 `workers.wave === null` 跳过对账；既有「有 Wave + worker 不符」负对照仍红。证据 = `tests/run/protocol-core.test.mjs` BUG-050 用例先红后绿（26/26）、`pnpm test` 1184/0。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权；
修法建议（供修复者取舍）：

- 在 `checkStrategy` 开头对 `通道=` 做在场检查（与 worker/预算同档）；
- 用派生投影的 `orchestration.channel` 与声明通道直接比较（两者都有正本，不再各自解析）；
- 把 `workers.wave === null` 且声明 workflow 视为 red，而不是把 null 解释成「跳过」。

原卡不改产品代码；落地方式与去向见上方「已落地」。
