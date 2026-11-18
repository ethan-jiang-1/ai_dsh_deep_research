---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-271：protocol 的 `gates.evidence_threshold` 只校验值域——从不与 evidence 的 quality 对账

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`checks/lib/gates/protocol-core.mjs:84`（A/B/C 闭集）与 `checks/lib/gates/protocol-core.mjs`
> 的 gates 校验；`evidence-audit-core.mjs` 有 quality 值域但没有 threshold 消费；模板 =
> `content/templates/run/protocol.json`。探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

`protocol.gates.evidence_threshold` 是本次 run 的证据门槛（A/B/C），协议 schema 只校验它在闭集内；
**没有任何门把 threshold 与 evidence 的 quality 比较**。`grep evidence_threshold` 只命中
protocol-core 的闭集与模板/SMOKE fixture。

于是：

- 声明 `evidence_threshold: A`，证据卡全是 `quality: C`，照样过；
- 声明 `B`，关键结论只引 `C`，audit 只报值域合法，不报“低于承诺”；
- review 的 `source_tier_ok` 是 critic 主观布尔，不是 threshold 判据。

## 分诊与授权

- 严重级：P2 — 研究设计的证据质量承诺没有下游检查；报告可以自降证据标准。
- 表面 / 边界：protocol→evidence 合同 / ② 静态
- DSH 不变量：fail-loud；声明的门槛必须可核
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn evidence_threshold checks packages/deep-research-pack/src | head
# 只有 protocol-core 闭集 + 模板/fixture；无 evidence-audit/verdict-audit 消费
# 临时 protocol threshold A + evidence quality C → audit 不报 threshold
```

## 根因（已证）

`evidence_threshold` 是 protocol 的声明字段，schema 校验只做闭集；`evidence-audit-core` 读 quality
但不知道 protocol；`verdict-audit` 读 claims 但不知道 threshold。三者没有接线。

## 牵出的失败类

- 语义 C2（声明无消费者）+ C7；与 272（output.length）同族。
- 类级方向 = protocol 的每个“研究设计承诺”（threshold/length/gates）都要有下游消费者。

## 修法

1. `evidence-audit`/protocol-audit 接收 threshold，与每张 evidence 的 quality 比较；关键结论引用的
   evidence 低于门槛 → 红/警告（按契约）；
2. `verdict-audit` 的 `source_tier_ok` 至少与 threshold 对齐；
3. 测试：threshold A + quality C → 红；A+A → 绿；旧场按断代。

## 修复判据

- threshold 与 evidence quality 对账；低质 → 红；
- 旧场不误伤；`pnpm test` / run-gates 绿。
