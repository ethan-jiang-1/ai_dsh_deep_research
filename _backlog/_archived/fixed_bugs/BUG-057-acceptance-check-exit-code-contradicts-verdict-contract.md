---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-057：acceptance-check 的退出码与全仓 verdict 契约相反——FAIL/UNVERIFIED/noCriteria 都是 exit 0

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；退出码收回全仓 verdict 契约：0 仅当全 PASS 且至少一条，FAIL / UNVERIFIED / 零判据 = 1，用法/前置错 = 2；先红后绿（2026-11-11，去向：none — 机械修复（契约已在 scripts/AGENTS 成文，本工具收回例外），审查：agent 自审 + 机械门禁）
> ｜ 升级条件：一旦 CI 或 agent 用退出码判「收活」，本卡应升 P1（false acceptance 主路径）

## 症状

`acceptance-check` 把判据求值结果只放在**文本**里，退出码恒为 0：

```sh
node scripts/run-ops/acceptance-check.mjs <bundle> <criteria.json>; echo "exit=$?"
```

| 判据 | 文本结论 | exit |
|---|---|---|
| `[{"type":"file_exists","path":"final/v1.md"}]`（存在） | PASS 1 | **0** |
| `[{"type":"file_exists","path":"definitely-missing.md"}]`（不存在） | FAIL 1 | **0** |
| `[]`（零判据 = 缺陷形态 noCriteria） | 0 条 · noCriteria | **0** |
| `[{"type":"semantic",...}]`（未知形态） | UNVERIFIED 1 | **0** |

即：**失败、判不了、和空判据都无法从退出码区分**，全部与「全绿」同码。

## 复现

```sh
source dev/env.sh
echo '[{"type":"file_exists","path":"definitely-missing.md"}]' > /tmp/crit-fail.json
node scripts/run-ops/acceptance-check.mjs research-workspace/drt_unsc-p5-members /tmp/crit-fail.json; echo "exit=$?"
# 文本：PASS 0 · FAIL 1；exit=0
```

## 根因（已证，且是**两处成文契约的冲突**）

- 全仓契约（[scripts/AGENTS](../../../scripts/AGENTS.md)）：「exit 0=全绿 / 1=断言红 / 2=未跑（前置缺席）；
  未跑 ≠ 通过」；
- 本工具自己的头注（[acceptance-check](../../../scripts/run-ops/acceptance-check.mjs)）：「退出码：0 = 求值完成
  （PASS/FAIL/UNVERIFIED 是求值结果，不是工具错误）/ 2 = 用法或前置错」；
- 实现按后者：求值完成后无条件 `process.exit(0)`，三态只在 stdout。

冲突点：工具的**存在理由**是把「收活结论」对账成机械事实，而仓内机械事实的唯一通用出口是退出码。

## 影响面

- 文件头注与 `scripts/README` 都把它写成「收活判据三态求值」的操作侧工具；一个 agent/CI 若按其
  惯例执行 `cmd && 认为收活通过`，会把 **FAIL 与 UNVERIFIED 当成通过**——正是本仓「完成定义 = 真检查」
  要防的形态；
- `noCriteria`（无判据委派 = 缺陷形态）同样 exit 0，空清单也能被读成「收活通过」；
- 今天没有仓内自动消费方（`grep acceptance-check` 只有 README/tests），所以是**潜在**主路径，
  不是已发生事故。

## 修复判据

1. `FAIL > 0` → exit 1；`UNVERIFIED > 0` → exit 1（判不了不得静默放行，同三态头注）；`noCriteria` →
   exit 1（或 2，二者取一并在头注写死）；
2. 仅当 `PASS > 0 && FAIL = 0 && UNVERIFIED = 0` → exit 0；
3. 用法错误/前置缺席仍 exit 2；
4. 若确有「只想看报告」的场景，加显式 `--report-only`（默认关闭），不许默认静默；
5. 更新 [acceptance-check](../../../scripts/run-ops/acceptance-check.mjs) 头注与 [scripts/README](../../../scripts/README.md)
   的退出码说明；`tests/run/acceptance-check.test.mjs` 补四种形态的退出码用例（红先）；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`scripts/lib/acceptance-check.mjs` 新增 `acceptanceExitCode(summary)`（0 = 全 PASS 且 total>0；1 = FAIL/UNVERIFIED/noCriteria）；CLI 改为 `process.exit(acceptanceExitCode(...))`，头注与 [scripts/README](../../../scripts/README.md) 的退出码说明同步。证据 = `tests/run/acceptance-check.test.mjs` 新增退出码用例（8/8）；真实 bundle 四形态实测 fail/noCriteria/unverified → exit 1、pass → exit 0。去向 = none — 机械修复（契约已在 `scripts/AGENTS` 成文，本工具收回例外）。

原始处置（留档）：修复改变一个成文工具的退出码契约（`scripts/AGENTS` 的 verdict 契约本是全仓纪律，本工具是唯一例外），按 [_backlog/AGENTS](../../AGENTS.md) 触及验收面，不由本卡自授权；建议与
[BUG-049](BUG-049-protocol-projection-lines-absent-silent.md) /
[BUG-056](BUG-056-protocol-projection-unreadable-values-silent.md) 的「fail-loud」收口同批处理。
