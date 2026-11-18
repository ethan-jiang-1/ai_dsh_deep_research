---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-257：review.md 的 CRITICAL/MAJOR 清单与 audit.md 的 CRITICAL 计数不交叉核对

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：交付门 = [checks/lib/gates/node-gate-delivery-gate.mjs](../../checks/lib/gates/node-gate-delivery-gate.mjs)
> 第 68–83 行（只读 audit.md 的 CRITICAL=0）；`presets/critic/skills/adversarial-review/SKILL.md`
> 要求 review.md 写 CRITICAL/MAJOR 清单；`run-accept` 只消费 audit.md。
> 探索轮 = [模型可见语义卡](../issues/2026-11-18-model-visible-semantics.md)。

## 症状

review.md 是 critic 的人读报告，要求写 CRITICAL/MAJOR 清单与 readiness；audit.md 是 evidence-audit
的机器报告，交付门只核对 audit.md 的 CRITICAL 计数=0。两者没有交叉核对：

- review.md 可以写 `CRITICAL 3`，audit.md 写 CRITICAL 0（或反之）——门只看 audit.md；
- review.md 的 MAJOR 清单可以空/假，不影响交付；
- readiness PASS 只由 claims/verdicts/audit 支撑，review 的 severity 清单是散文。

这不是要求 review 与 audit 完全相等（audit 是证据面、review 是综合审查），但 **review 声明的
CRITICAL 必须至少被 audit 看见/解释**；否则“review 说 3 个 CRITICAL 仍 PASS”会静默交付。

## 分诊与授权

- 严重级：P2 — 交付门可被一份自相矛盾的 review 绕过；readiness PASS 的语义被稀释。
- 表面 / 边界：review/audit 交付合同 / ② 静态
- DSH 不变量：fail-loud；同一交付面的 severity 不得两份互斥事实
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
grep -n 'auditCriticalCount\|critical' checks/lib/gates/node-gate-delivery-gate.mjs
grep -rn 'CRITICAL\|MAJOR' checks/lib/gates checks/run-gates | grep -v evidence | grep -v audit.md | head
# 临时 review.md 写 CRITICAL 3、audit.md CRITICAL 0、readiness PASS → 交付门不报
```

## 根因（已证）

review 的 severity 是 prose；`review-readiness` 只解析 readiness/conditional；`verdict-audit` 只读 claims/
verdicts；`node-gate-delivery` 只读 audit.md。没有「review 的 CRITICAL 清单 ⊆ audit 的 CRITICAL+解释」判据。

## 牵出的失败类

- 语义 C2（三份 severity 事实）/ C7（prose 不核）；与 250/254/256 同族。
- 类级方向 = review 的结构化摘要（severity 计数/覆盖表）与 readiness 同级；人读散文可有，但声明必须可核。

## 修法

1. `review-readiness` 解析 review.md 的 CRITICAL/MAJOR 计数（或结构化 `review/severity.json`）；
2. 交付门/verdict-audit 交叉：review CRITICAL>0 时 readiness 必须 FAIL，或 audit 必须解释（白名单）；
3. 测试：review CRITICAL 3 + audit 0 + PASS → 红；一致/解释 → 绿；
4. 旧场按断代；quick_factual 豁免按现有条件件。

## 修复判据

- review severity 与 audit/readiness 交叉核对；矛盾 → 红；
- 合法解释/旧场不误伤；`pnpm test` / run-gates 绿。
