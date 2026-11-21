---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-328：plan/vN-1 只拒绝“与当前文本完全相同”，不校验旧图内容/重写记录

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（2026-11-21 用户授权按计划修；门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

planGate 的快照检查：空表、version 字符串、`snapText === text`。一份被改过节点/验收/预算的旧图（不等于当前文本）仍通过。

## 根因（已证）

版本链只证“不是同一文件”，不证“旧图是旧图”。

## 复现

复现状态：稳定 — 构造 bundle：v1 快照与当前 v2 的节点/验收/预算完全相同、只是措辞不同，`planGate` 仍 PASS：

```sh
node --input-type=module -e "
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planGate } from './checks/lib/gates/plan-gate.mjs';
const d = mkdtempSync(join(tmpdir(), 'planprobe-'));
mkdirSync(join(d, 'plan'));
const head = (v) => '> protocol: v1\n> 策略: 通道=team；worker=research-worker；门=hitl1；预算=3/3/L1\n> 图版本：' + v + '\n';
const table = '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n| W1.1 | — | active | broad-scan | Q1 | scout | — | leads.md §T1 | A1 | 3 query | L1 | — |\n';
const rest = '\n## 剩余工作\n\n- W1.1 owner=scout next=待派发\n\n';
writeFileSync(join(d, 'plan.md'), '# Plan\n\n' + head('v2') + '\n## 节点表\n\n' + table + rest);
writeFileSync(join(d, 'plan/v1.md'), '# Plan（旧版措辞不同，事实相同）\n\n' + head('v1') + '\n## 节点表\n\n' + table + rest);
console.log(planGate(d));
"
# 当前输出 PASS（应红：快照事实与当前图无差异 = 不是旧图）
```

## 修法

比对**解码事实**而非文本：vN-1 与当前图的节点集合/验收/预算必须真的不同（同 id 的 acceptance/budget 至少一处变化，或节点增删）；完全相同 → 红「快照不是旧图」。保留现有空表/版本链检查。

## 修复判据

- 同事实异措辞 → 红；真正更早的图（节点/验收/预算有差异）→ 绿；
- 空快照 / 版本号不符仍红；`pnpm verify` / `pnpm test` 绿。
