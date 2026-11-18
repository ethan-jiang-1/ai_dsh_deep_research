---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-263：findings 的重复 F# 不报——两个 F1 各自通过，仪表盘/引用只认一个

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：重复 F# 红（引用主键唯一）
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的
> `parseFindingsOf` / `findingsContractIssues`（无 duplicate-id 判据）；模板 = `content/templates/run/findings.md`。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

`parseFindingsOf` 按出现顺序 push 每个 `## F<n>:`，不检查 id 重复；`findingsContractIssues`
只遍历块，不建 id 集合。实测：

```text
## F1: a
- gap: supported
## F1: b
- gap: supported
→ parseFindingsOf = [F1, F1]；findingsContractIssues = []
```

两个 F1 都能过；`final.md [来源:]`/review/驾驶舱按 F# 引用时只命中一个，另一个成为不可寻址的结论。

## 分诊与授权

- 严重级：P2 — 结论 ID 重复 = 引用歧义；不会立即可见，但审计/仪表盘会漏。
- 表面 / 边界：findings 合同 / ② 静态（ID 唯一性）
- DSH 不变量：fail-loud；ID 是引用主键，重复必须红
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "
import {parseFindingsOf,findingsContractIssues} from './checks/lib/gates/findings-core.mjs';
console.log(parseFindingsOf('## F1: a\n- gap: supported\n## F1: b\n- gap: supported\n'));
"
# → [F1, F1]；对临时 bundle 调 findingsContractIssues → []
```

## 根因（已证）

解析器只做形状解析，契约只做值域/证据/lens；没有 `seenIds` 集合。与 `topics` 的 T# 重复同族（264）。

## 牵出的失败类

- 语义 C2（主键无唯一性）+ C7；与 264 同族。
- 类级方向 = 所有模板 ID（F#、T#、C#、V#、W#）统一唯一性判据。

## 修法

1. `parseFindingsOf` 或契约建 `seen`，重复 F# → 红（含占位/大小写变体）；
2. 空 F#/`F01` 归一化规则写清；
3. 测试：两个 F1 → 红；F1/F2 → 绿；
4. 与 topics T# 同变更。

## 修复判据

- 重复 F# → 红；唯一 → 绿；旧场按断代；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/findings-contract.spec.mjs",
    "tests/run/gates/evidence-audit.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 7 - BUG-263：重复 F# 红"
  },
  "green": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/findings-contract.spec.mjs"
  }
}
```
