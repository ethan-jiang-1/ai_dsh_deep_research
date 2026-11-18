---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-262：findings 的 `lens_gaps: []` 检测也是文件级——一个块写 `[]`，另一个写「无」的块被误判

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：lens_gaps [] 按块判，「无」块不误伤
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的
> `if (block.lensGaps.length === 0 && /^\s*-\s*lens_gaps\s*[:：]\s*\[\s*\]\s*$/m.test(text))`；
> 模板 = `content/templates/run/findings.md`。探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

“空列表写 `[]` 不可判”的判据扫描整份 `text`，却对每个 `block.lensGaps.length === 0` 的块都报：

```js
if (block.lensGaps.length === 0 && /...lens_gaps...\[\s*\].../m.test(text)) ...
```

因此：

- F1 写 `lens_gaps: []`（本身该红）；
- F2 写 `lens_gaps: 无`（合法）；
- 判据对 F2 也报“lens_gaps 是空列表”——**误伤**。

实测（F1 []、F2 无）→ 两条 `lens_gaps 是空列表`，其中 F2 是假红。一个块格式错，所有无缺口块陪葬。

## 分诊与授权

- 严重级：P2 — 假红会训练用户忽略该判据；与 261 同一根因（全文/块级）。
- 表面 / 边界：findings 合同 / ② 静态（块级）
- DSH 不变量：fail-loud 且**精确**；误伤会摧毁判据可信度
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "…findingsContractIssues(tmpBundle)…"
# F1: lens_gaps: []；F2: lens_gaps: 无
# → 报 F1 和 F2 两条空列表（F2 是假红）
```

## 根因（已证）

同 261：存在/格式判据用全文正则，块对象没有 `rawGap`/`hasEmptyList`，无法把 `[]` 归到 F1。

## 牵出的失败类

- 语义 C7（全文/块级混淆）+ 假红；与 261 同根，两个方向（假绿/假红）。
- 类级方向 = 块级字段一律块级解析；`[]` 是块级形态。

## 修法

1. 解析每块 `lensGapsRaw`（保留原文）；判 `[]` 只看该块；
2. 测试：F1 []、F2 无 → 只报 F1；F2 无 → 不报；
3. 与 261 同变更。

## 修复判据

- `[]` 只使该块红；“无”不误伤；
- 旧场按断代；`pnpm test` / run-gates 绿。

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
    "output": "not ok 6 - BUG-261 / BUG-262：只有 F1 的 [] 该报"
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
