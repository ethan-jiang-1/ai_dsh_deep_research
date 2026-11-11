---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-062：acceptance.md 既是生成物又是 L4 人工走查的唯一载体——重跑验收/`--repair` 会删掉人工证据

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；`acceptance.md` 的「人工走查」节在 `--repair` 与重新验收时保留（repair 只保留该节、丢弃旧机械回执；re-accept 把旧节拼回新回执），空节不算证据；先红后绿（2026-11-11，去向：none — 机械修复，审查：agent 自审 + 机械门禁）

## 症状

验收合同把 **L4 的人工走查（③ 两点交互纪律 / ④ 中断恢复）记录位**钉在 bundle 的
`acceptance.md`「人工走查」节，并明确「**没有记录 = 未跑**」（[evaluation.md](../../../docs/evaluation.md) §L4）。
但这个文件同时是 `run-accept` 的**生成物**：

- 每次验收绿都会**整文件覆盖**：`writeFileSync(join(bundle, 'acceptance.md'), acceptanceText)`
  （[run-accept.mjs:228](../../../scripts/run-ops/run-accept.mjs)）；
- `--repair` 会**直接删除**它，注释写的理由是「可再生产物，验收时重建」
  （[run-receipt.mjs](../../../scripts/lib/run-receipt.mjs) `repairReceiptPaths`）。

于是：操作者按合同把人工走查写进 `acceptance.md` 之后，任何一次**重新验收**或**回执修复**都会把这段
证据抹掉；而 `renderAcceptance` 本身**不生成**「人工走查」节（生成样本只有检查表与回执行），所以抹掉
之后也不会回来。

## 复现（决定性一半：删除路径）

```sh
# 1) 造一个带人工走查节的 acceptance.md
mkdir -p /tmp/drt_accept_probe
printf '# Acceptance\n\n## 人工走查\n\n- ③ HITL 之间无 ask（记录人：ops）\n' > /tmp/drt_accept_probe/acceptance.md
# 2) 调 --repair 的实现
node --import tsx/esm -e "
import { repairReceiptPaths } from './scripts/lib/run-receipt.mjs';
import { existsSync, readFileSync } from 'node:fs';
console.log('before', readFileSync('/tmp/drt_accept_probe/acceptance.md','utf8').includes('人工走查'));
console.log(JSON.stringify(repairReceiptPaths('/tmp/drt_accept_probe')));
console.log('after exists', existsSync('/tmp/drt_accept_probe/acceptance.md'));
"
# → before true；actions = ["acceptance.md: 删除（可再生产物，验收时重建）"]；after exists false
```

另一半（覆盖路径）是代码事实：`run-accept.mjs:228` 无条件写；`renderAcceptance` 不产出「人工走查」节。

## 根因（已证）

**同一文件承担两种寿命**：机械投影（可随时重算）与人工证据（一次性、不可重建）。生成器没有
「保留人写块」的机制，`--repair` 还把它归入「可再生产物」——分类错了，删除理由也就不成立。

## 影响面

- L4 的 ③④ 两条人工判据是**唯一不能机器复跑**的验收面；它们被抹掉 = 该场 run 的 L4 证据永久缺失
  （bundle 交付后通常不再进入版本库，运行时副本也可能被清理）；
- `--repair` 正是**历史 bundle** 的文档化修复路径（旧回执带绝对路径），历史场次恰好是人工走查记录
  最可能存在的场次；
- 操作者不会预期「修回执路径」会删掉人工记录——静默数据丢失。

## 修复判据

1. 重新验收与 `--repair` 都**保留**已有 `## 人工走查` 节（拼接进新 `acceptance.md`，或迁到独立载体
   `<bundle>/acceptance-manual.md` 并在两份文档里写清指针）；
2. 若选择「覆盖」策略：覆盖前检测人工节非空 → **fail-loud 拒绝**（除非显式 `--force`），文案说明
   人工记录会被丢弃；
3. 先红后绿：`tests/` 增加「带人工走查节的 bundle + repair/re-accept → 节仍在」用例（当前实现必红）；
4. [evaluation.md](../../../docs/evaluation.md) §L4 与 [guides/61](../../../docs/guides/61-run-playbook.md)
   写明人工节的持久化语义（哪个动作会保留、哪个会拒绝）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`run-receipt` 增 `manualEvidenceOf` / `withManualEvidence`；`repairReceiptPaths` 对含「## 人工走查」的 `acceptance.md` 只保留该节（旧机械回执丢弃，本机路径仍清掉），空节按无证据处理；`run-accept` 写盘前把旧人工节拼进新回执。证据 = `tests/run/run-receipt.test.mjs` BUG-062 两例先红后绿（17/17）；`docs/evaluation.md` §L4 与 [guides/61](../../../docs/guides/61-run-playbook.md) 写明持久化语义。去向 = none — 机械修复。

原始处置（留档）：修复触及验收合同（人工证据载体）与 `run-accept` 行为，按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。
与 [BUG-057](BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md)
（收活判据的机械出口）相邻：两条都在「验收证据的机械面」上，但本条是**载体寿命**问题，不是退出码问题。
