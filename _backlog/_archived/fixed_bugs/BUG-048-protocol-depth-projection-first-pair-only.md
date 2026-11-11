---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-048：协议审计的深度投影只解析首对深度——deep 档官方投影假红，单深度漏检

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；深度集合改单一编解码（depthsTextOf / depthsOfText，生成器与检查器共用），deep 生成器写法 / 端点 / 单值 / 非连续四态先红后绿，生产单深度 bundle 副本篡改可判红（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

`protocol-audit`（L4 交付审计之一，`run-accept` 的第四道）在 **deep 档**（`allowed_depths`
= `L1,L2,L3`，[BAND_TABLE](../../../scripts/lib/protocol-core.mjs) 自带的默认值）上，对**官方生成器**
`projectionOf()` 产出的 §Protocol 投影判红：

```
red:projection-number｜§Protocol 投入深度 L1–L2 ≠ JSON allowed_depths L1,L2,L3
```

也就是说：一个 schema 合法、按生成器抄写的 deep 档 bundle，会在交付审计被拒绝；而按模板端点写法
`L1–L3` 手写的同一份投影反而是绿的。反过来，`allowed_depths = ['L3']`（单深度）时深度检查**整条跳过**，
写什么深度都不报。

**分级说明（同日按生产证据校准）**：首判 P1 基于生成器路径；扫完全部真实 bundle 后降为 P2——人工按模板
写端点/单值是当前唯一实际路径，假红没有在生产触发；但**单深度漏检在生产里已经成立**（见下表 2/8）。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/projection-final.mjs
```

（一次性实验脚本，运行区；核心输入 = `tests/run/protocol-core.test.mjs` 的 `baseProtocol` 形态，
只改 `effort.band='deep'` / `allowed_depths`，投影用 `projectionOf(protocol)` 生成。）

实测三态：

| 输入 | 期望 | 实测 |
|---|---|---|
| standard 档 + `projectionOf` | 绿 | 绿（对照） |
| deep 档 + `projectionOf`（`L1,L2,L3` → 投影 `L1–L2–L3`） | 绿 | **red:projection-number**（假红） |
| deep 档 + 端点写法 `L1–L3` | 绿 | 绿（证明红来自表示不一致，不是深度真漂移） |
| `allowed_depths=['L3']` + `projectionOf`（投影 `L3`） | 应拦（无法机检就 red） | **零 finding**（漏检） |

**生产数据（`research-workspace/drt_*` 全部 8 个带 protocol.json 的 bundle，2026-11-11 扫描）**：

| bundle | band | allowed_depths | §Protocol 投入行 | 深度检查实际 |
|---|---|---|---|---|
| `drt_anthropic-claude-api-limits` | quick | `["L0"]` | `快答（≤4 节点 / ≤2 cells / L0）` | **整段跳过**（单值不匹配区间正则） |
| `drt_deepseek-chat-context-limits` | quick | `["L1"]` | `快答（≤4 节点 / ≤2 cells / L1）` | **整段跳过** |
| 其余 6 个（deep/quick） | — | 2–3 个值 | `L1–L2` / `L1–L3` 端点写法 | 正常对账 |

即：**漏检是生产事实，假红是工具/生成器路径的潜在事实**；两者同源（区间正则只认 `L?–L?` 且只取首对）。

## 根因（已证）

两处实现对「深度段」的表示没有共识：

- **生成器**：[`projectionOf`](../../../scripts/lib/protocol-audit-core.mjs) 把全部深度用 `join('–')` 连成
  `L1–L2–L3`；
- **检查器**：[`checkProjectionDetails`](../../../scripts/lib/protocol-audit-core.mjs) 的范围正则
  `/L([0-3])\s*[–-]\s*L([0-3])/` 只有一个捕获对，命中 `L1–L2` 后把区间展开成 `{L1,L2}`，与 JSON 的
  `{L1,L2,L3}` 比较 → 假红；
- **模板**：[question.md](../../../packages/deep-research-pack/content/templates/run/question.md) 写的是
  `Lx–Ly`（端点写法），与检查器一致、与生成器不一致。

证据：`deep + 端点写法` 绿、`deep + 生成器写法` 红，**唯一差异是字符串表示**；单深度时正则不命中，
`range !== null` 分支整段跳过。`tests/run/protocol-core.test.mjs` 的 `projection-number` 用例只覆盖了
quick 档的两端点（`L0–L1`），所以测试是绿的。

## 牵出的失败类

**同一事实的三种表示**（生成器 / 检查器 / 模板）没有单一正本；用「字符串拼接 + 正则反解」传递结构化
集合，遇到长度/形态变化就失效。横切排查方向：全仓 `join('–')` / `join('—')` 与「拼完再用正则拆」的配对
（`grep -rn "join('–')\|join(\"—\")" scripts/ packages/`），以及所有「有多个值时取首对」的正则。

同类但不同面的另一个症状：`checkPlanRef` 在 `planText` 为空时直接返回 `[]`（缺 plan.md 只落到
`strategy-missing` 的 warning）——「缺席即可通过」的同一族，见 [BUG-049](BUG-049-protocol-projection-lines-absent-silent.md)。

## 修复判据

1. `deep` 档 + `projectionOf()` 的 §Protocol → `evaluateBundle` 无 `projection-number`；
2. 端点写法 `L1–L3` 仍绿（兼容手写模板）；
3. `allowed_depths=['L3']` 且投影写 `L1–L3` → 必须 red（不允许整段跳过）；
4. `allowed_depths=['L0','L2']`（非连续、schema 合法）不再假红，且漂移能被抓到；
5. 先红后绿：在 `tests/run/protocol-core.test.mjs` 增加 deep / 单深度 / 非连续三个用例，
   确认新用例在修复前红、修复后绿；
5. 把生产里的两个单深度 bundle（`L0` / `L1`）作为回归输入：修复后其深度**被真正对账**（写错要红），
   不再整段跳过；
6. `pnpm test` + `pnpm verify` 绿；quick / standard 档既有行为不变。

## 修复关联

已落地（2026-11-11）：`scripts/lib/protocol-core.mjs` 增 `depthsTextOf` / `depthsOfText`（编码唯一正本）；`projectionOf` 改用编码器，`checkProjectionDetails` 改用解码器；`tests/run/protocol-core.test.mjs` 新增 BUG-048 用例（deep 生成器 / 端点 / 单深度 / 非连续）。证据 = 该文件 26/26、`pnpm test` 1184/0、8 个生产 bundle 审计前后仅既有 1 红不变、单深度副本改 L0→L1 新判红。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权；
修法二选一（推荐第一）：

- **解析端**：把「深度段」按 `/L[0-3]/g` 取全量 token；恰两个且以 `–`/`-` 连接时展开区间，否则按显式集合比较；
- **生成端**：`projectionOf` 只写端点（`depths[0]–depths.at(-1)`），并让模板与检查器继续按区间展开——
  但这会让非连续深度无法表达，故仅作兼容退路。

原卡不改产品代码；落地方式与去向见上方「已落地」。
