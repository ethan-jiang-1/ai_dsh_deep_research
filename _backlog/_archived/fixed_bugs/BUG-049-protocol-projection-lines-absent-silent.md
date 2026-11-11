---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-049：§Protocol 的「来源/投入/输出」行缺席或读不出时审计零 finding——只对在场行对账

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；§Protocol 的 来源/投入/输出 行缺席改 warning（projection-source-missing / projection-effort-missing / projection-output-missing），完整投影仍绿；三行逐条先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

`protocol-audit` 的 §Protocol 对账是「如果这一行在，就对账；不在，就静默」。把
`- 来源：…` / `- 投入：…` / `- 输出：…` 任一行删掉（其余必填字样挪到 §Protocol 内别处），审计**零
finding**：

| 删掉的行 | 老实点名 | 实测 |
|---|---|---|
| `- 来源：official + web；…` | 来源 families 无法对账，应 warn/red | **零 finding** |
| `- 输出：comparison_table；sections = …` | output.sections 无法对账，应 warn/red | **零 finding** |
| `- 投入：标准（≤12 节点 / ≤40 cells / L1–L2）` | 节点/cells/深度三项全跳过 | **零 finding** |

对照：同一份审计里，plan 头的 `- 策略:` 行缺席至少还有 `strategy-missing` 的 warning；§Protocol 的
三行缺席连 warning 都没有。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/projection-final.mjs
```

（一次性实验脚本；用 `projectionOf()` 生成完整投影作对照，再逐行删除并把 `band` 标签 / `output.shape`
挪进同节的 `- 方法：…` 行，其余 §Decisions/plan/topics 保持不变。）

实测：

- 完整投影 → 无 finding（对照）；
- 删「来源」→ 无 finding；
- 删「输出」+ shape 写进方法行 → 无 finding；
- 删「投入」+ 档位标签写进方法行 → 无 finding；
- `planText=""`（缺 plan.md）→ 仅 `warning:strategy-missing`。

## 根因（已证）

[`checkProjectionDetails`](../../../scripts/lib/protocol-audit-core.mjs) 的三段都长这样：

```js
const bandLine = /^-\s*投入\s*[:：]\s*(.+)$/m.exec(section)?.[1] ?? ''
if (bandLine !== '') { /* 才校验节点/cells/深度 */ }
```

`sourceLine`、`outputLine` 同形。缺席被折叠成空串，空串直接跳过校验；而
[`checkProjection`](../../../scripts/lib/protocol-audit-core.mjs) 只要求方法名、档位标签、output.shape、
`protocol.json` 指针与版本，不要求这四行在场。于是「行在但写错」会红，「行不在」永远绿。

**[question.md 模板](../../../packages/deep-research-pack/content/templates/run/question.md)** 把这四行列为
§Protocol 的固定形状（模板要求），模板要求 ≠ 审计要求，正是缺口。

## 第二形态（2026-11-11 第 5 轮补）：行在场但读不出 → 同样静默

同一函数的 `if (line !== '')` 只保证「行在场」，不保证「行可读」。三处读法都带额外格式前提，
前提不满足时整段跳过，**值写错也绿**：

| 输入（行都在） | 期望 | 实测 |
|---|---|---|
| `投入：18 节点 / 18 cells / L1–L2`（无 `≤`，与 JSON 12/8 不符） | red | **无 finding**（节点/cells 正则要求 `≤`） |
| `投入：12 nodes / 8 cells / L1–L2`（英文单位、无 `≤`） | 应可解析或红 | **无 finding** |
| `输出：comparison_table；分节 = decision`（缺 `risks`，无 `sections =`） | red | **无 finding**（只认 `sections\s*=`） |
| `输出：comparison_table；sections: decision`（冒号写法，缺 `risks`） | red | **无 finding** |

对照：生成器原样（`≤12 节点 / ≤8 cells`、`sections = risks / decision`）→ 绿（判据本身有效）。

复跑：`node --import tsx/esm runtime/explore-20261111/projection-format.mjs`。

## 牵出的失败类

**缺席容忍（absence-tolerant）校验**：`?? ''` + `if (x !== '')` 的组合把「没有」与「为空」压成同一个状态，
审计失去了「必填行缺失」这一整类信号。横切排查方向：`grep -n "?? ''" scripts/lib/protocol-audit-core.mjs`
逐段看是否只在场校验；同族旁证 = `checkPlanRef` 对空 `planText` 直接返回 `[]`（缺 plan.md 只有
strategy warning），以及 §Protocol 之外的其它「可选项」检查。

## 修复判据

1. §Protocol 缺 `- 来源` / `- 投入` / `- 输出` 任一行 → 至少一条 warn（v1 兼容；v2 可收紧为 red）；
1b. 行在场但节点/cells 读不出（无 `≤`、单位不认识、只有数字）→ red（对照同审计里
   `strategy-budget-unparseable` 的 fail-loud 成例，不许静默跳过）；
1c. 输出行在场但 `sections` 不可读出（不是 `sections =` 形态）→ red；
2. 完整投影仍绿；行在但值漂移仍按现有 red 判据红；
3. 旧 bundle（契约日前 / v1）不因新增缺席检查而整片变红——按 epoch 或 warning 档处理；
4. 先红后绿：在 `tests/run/protocol-core.test.mjs` 增加三行各删一次的红例（修复前红、修复后绿）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`checkProjectionDetails` 增 `projectionLineOf`（行缺席 / 空值同判）+ 三条缺失 warning；完整投影仍绿，行在值漂移仍红；`checkPlanRef` 空 planText 分支补「由 schema-scan 兜底」注释。证据 = `tests/run/protocol-core.test.mjs` BUG-049 用例先红后绿（26/26）、`pnpm test` 1184/0。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。

**顺带可修（同一失败类，供修复者判断是否并入）**：`checkPlanRef` 在 `planText` 为空时返回 `[]`，
使「缺 plan.md」只落到 strategy 的 warning；若 `node-gate` 已把 plan.md 列为交付必需，则此处可保持
warning，但应写明「由 node-gate 兜底」的注释，避免下一位读者把它当漏洞重复排查。

原卡不改产品代码；落地方式与去向见上方「已落地」。
