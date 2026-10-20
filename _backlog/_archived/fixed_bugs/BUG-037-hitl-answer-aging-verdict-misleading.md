---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-037：hitl-answer 兜底触发后仍打「疑实例老化（处置 = 重启）」——误诊文案 + 已被证伪的处置

> 状态：**已修**（2026-10-18，判据与文案实施 + 强制端到端反证通过后归档）— 从 [BUG-035](BUG-035-hitl-answer-sidebar-session-invisible.md)
> 闭环时的残留带出（归档卡冻结、不可执行，故另立）。

## 症状

`dev/hitl-answer.mjs` 在**已经试过搜索兜底**之后，若仍未取到行，仍打：

```
侧栏没有目标会话行（session id=…，--session=…）——错因判据 = aging：UI 侧栏零会话行且组已全展开，
而盘侧确有该会话的挂起问询——疑通道实例老化（渲染/懒加载未解析）。处置 = 重启通道（bash dev/boot-run.sh）
+ 用新会话接手续跑；不要在旧实例上反复重试或按"已归档"处理。
```

两处失真：① 判据名/文案说"零会话行"——实测多数现场**分组行在场、只是目标行不在可扫区间**（不是"零行"）；
② 处置写"重启通道"——**实测重启无效**（BUG-035 表内两行反证）。照它做会浪费时间并误导归因。

## 根因与修法（已明）

判据函数 `scripts/lib/ask-drive.mjs:sidebarMissVerdict` 的 `aging` 分支不知道"搜索已试过/结果如何"，
文案与处置都是 BUG-035 修复前的旧世界假设。修法 = 给观测面加"兜底尝试史"（`triedSearch` /
`searchHit` / `rowKeyHit`），judgement 与文案据此分支：
- 搜索也试过且没命中 → 判据改 `not-in-scope`（"本会话可能不属于侧栏可见范围，或标题不匹配"），
  处置 = 核对 `--session` 标题与盘侧 `title` 是否一致、必要时用 run-kickoff 续跑；
- **删掉"重启通道"处置**（它已被证伪；重启只用于其它已记录的情形）。

## 修复判据

1. 注入式反证：致盲扫行/展开（红配方见 BUG-035 卡）+ 让标题搜不到 → 输出必须为
   `not-in-scope` 且**不含"重启"**；
2. 正常路径（搜索命中）不得打任何 miss 判据（现行为已正确，加断言钉住）；
3. `ask-drive` 的判据用例（keyless）随判据改名同步 —— 无回归。

## 闭环（2026-10-18）

- **修法（已实施）**：`scripts/lib/ask-drive.mjs` 的 `sidebarMissVerdict` 加**兜底尝试史**入参
  （`triedSearch`/`searchHit`），并新增 `not-in-scope` 分支——两路扫描都没命中**且搜索兜底也已试过未命中**
  时：判据不再叫"实例老化"，处置改为"核对 `--session` 子串与盘侧 `title`、必要时 run-kickoff 续跑"，
  **`not-in-scope` 文案里不再出现"重启"**；`aging` 分支保留但把"重启"降为"不是第一处置（实测无效）"。
  `dev/hitl-answer.mjs` 在兜底路径记录并传递 `triedSearch`/`searchHit`。
- **修复判据①（keyless 反证 + 负例留证）**：新增两例（not-in-scope 且 `doesNotMatch /重启/`；searchHit=true
  时不走该分支）。反证：删掉新分支 → 该例红（实做）→ 还原绿。`tests/run/ask-drive.test.mjs` 带
  `guard-red-record` 要求的负例留证块。
- **修复判据②（强制端到端反证，决定性）**：注入 `HITL_FORCE_MISS=1`（扫行/展开致盲 + 搜索故意搜不存在
  的标题）→ 对一条真挂起会话，工具输出
  `错因判据 = not-in-scope：… 处置 = 核对 --session 子串与盘侧 title …（本情形与通道实例无关）`，
  **全文无"重启"作为处置**；注入随后还原（grep 计数 0）。
- **残留**：无（`aging` 分支保留为"渲染未解析"的可能态，但不再把重启当第一处置）。
