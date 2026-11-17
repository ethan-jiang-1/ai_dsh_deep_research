---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-213：usage / 前置错误的退出码不统一——`run-dashboard` / `run-kickoff` 报 1，同族报 2

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（自授权 P2 修理型：两处 return code + 测试）
>
> 位置：[probes/analyze/run-dashboard.mjs](../../probes/analyze/run-dashboard.mjs)（无参 → `exit(1)`）；
> [tools/channel/run-kickoff.mjs](../../tools/channel/run-kickoff.mjs)（缺 `--token` → `exit(1)`）。
> 契约 = [checks/AGENTS.md](../../checks/AGENTS.md)「verdict 契约：exit 0=全绿 / 1=断言红 / 2=未跑（前置缺席）」；
> 探索轮 = [2026-11-17 卡](../issues/2026-11-17-exploratory-namespace-move.md) N4。

## 症状

同一类「没给参数 / 缺前置」在两个被搬入口上报 `1`（断言红），同族其余入口报 `2`（未跑）：

| 入口 | 输入 | 实际 | 同族对照 |
|---|---|---|---|
| `probes/analyze/run-dashboard.mjs` | 无参 | **1**（打印用法） | `scene-capture` / `session-replay` 无参 = 2 |
| `tools/channel/run-kickoff.mjs` | 无 `--token` | **1**（`缺 --token`） | `hitl-answer` 缺同一 token = 2 |
| `checks/run-gates/run-accept.mjs` | 无参 | 2 | — |
| `checks/run-gates/acceptance-check.mjs` | 无参 | 2 | — |
| `tools/channel/run-driver.mjs` | 无参 | 2 | — |

`run-kickoff` 对真正的运行期失败仍用 1（第 125 行）——用法错误与断言失败在退出码上不可分，
`run-lane` / 包装脚本会把「没跑」记成「失败」，也会让 `未跑 ≠ 通过` 的分列失效。

## 分诊与授权

- 严重级：P2 — 诊断/操作入口的 verdict 语义；不阻断主路径，但会污染证据账。
- 表面 / 边界：维护面入口（run 通道 + show）/ ② 行为（CLI 退出码）
- DSH 不变量：fail-loud —— 「未跑」必须可与「失败」区分
- 触及面：none（入口退出码；不改门禁/文档合同）
- 授权：自授权（P2 修理型）
- 批：2026-11-17 命名空间搬家探索（N4）；前序 = [BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md)（同一契约的机械出口）

## 复现

复现状态：稳定。

```sh
node probes/analyze/run-dashboard.mjs; echo $?          # 1（应 2）
node tools/channel/run-kickoff.mjs; echo $?             # 1（应 2；输出「缺 --token」）
node tools/channel/hitl-answer.mjs; echo $?             # 2（同一前置，已有正确约定）
node checks/run-gates/run-accept.mjs; echo $?           # 2
```

## 根因（已证）

- `run-dashboard.mjs:44-45` 的 usage 分支直接 `process.exit(1)`；
- `run-kickoff.mjs:42-43` 的缺 token 分支直接 `process.exit(1)`，而 sibling `hitl-answer.mjs:62-63`
  对同一判断用 `exit(2)`；
- 两个入口各自手写参数错误分支，没有共享的「前置缺席 = 2」出口——与 BUG-057 同形（契约存在、
  单点实现没跟上）。

## 牵出的失败类

- 同机制第 2 次：BUG-057（acceptance-check 的 verdict exit）→ 本卡（两个入口的 usage exit）
  ——处置：类修（抽一个 `usageError()` / 退出码常量，入口共用；或至少测试钉住每个入口的 usage=2）。
- C7 假绿/假红：退出码把「未跑」混进「失败」。

## 修法

1. 两处改为 `process.exit(2)`；`run-kickoff` 的 HTTP/会话失败仍保留 `1`；
2. 新增 `tests/checks/cli-usage-exit.test.mjs`：spawn 两个入口（无参 / 缺 token），断言 exit 2；
   负控 = 用 `--port 1 --token x` 之类触发真实连接失败，断言 exit 1（证明两态可分）；
3. 不把 `hitl-answer` 的 3/4（已文档化的专用态）并进本判据——只钉 usage 面。

## 修复判据

- 上表两个入口的 usage/缺前置 = 2；真实失败 = 1；成功 = 0；
- 新测试在旧实现上红（exit 1）、改后绿；`pnpm test` 绿；
- 邻接：`run-driver` / `run-accept` / `scene-capture` / `session-replay` 的 usage=2 不回退。

## 修复关联

与 [BUG-209](BUG-209-asset-ledger-canonical-libs-stale-helper-names.md) 同批（2026-11-17 探索）；
批 Note 待本批收口后写。
