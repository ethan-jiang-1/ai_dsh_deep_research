---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-275：claims 可以零 critical——只 WARN，覆盖门因此无对象，交付仍可 PASS

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`checks/lib/gates/verdict-audit-core.mjs:305–306`（`stats.critical === 0` 只 `warn('no-critical')`）；
> 覆盖判据只遍历 `claim.critical`；模板 = `content/templates/run/claims.json`（`critical: true` 示例）。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

claims 表可以一条 critical 都没有；`verdict-audit` 只发 warning：

```js
if (stats.critical === 0) warn('no-critical', 'claim 表没有一条 critical——「全都不关键」通常是表做漏了')
```

覆盖门（`coverage-gap`）只检查 critical claims；zero critical = 零覆盖对象 = 没有 coverage gap。
于是：

- 关键结论全部不标 critical → 覆盖门空转；
- `run-accept` 仍 PASS（warning 不拦）；
- review/critic 的覆盖表可以只覆盖非 critical，或完全空。

## 分诊与授权

- 严重级：P2 — 用“全都不关键”绕开 claim 覆盖；交付结论无人核。
- 表面 / 边界：claims/verdicts 合同 / ② 静态
- DSH 不变量：fail-loud；关键结论不能通过“都不标”消失
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
# claims: C1/C2 均 critical:false；verdicts 覆盖 C1/C2
node checks/run-gates/verdict-audit.mjs <bundle> --sessions <dir>
# → no-critical warning；无 coverage-gap；PASS
```

## 根因（已证）

`critical` 是唯一覆盖标记；judge 把“全不关键”当 warning 而非红。没有“至少 N 条 critical”或
“关键结论必须 critical”的判据。review 的覆盖表（254）也只按 claim 表。

## 牵出的失败类

- 语义 C2/C7（覆盖对象可被清空）；与 274 同族。
- 类级方向 = critical 数量下限 + 关键结论标记；warning 不能承担“覆盖对象为空”。

## 修法

1. 非 quick_factual 的 run：claims 至少 1 条 critical（或 review 显式声明“无 critical 的理由”）；
2. zero critical → 红，或要求 review/readiness 的显式豁免；
3. 测试：全 false → 红；至少一条 critical → 绿；
4. 旧场按断代。

## 修复判据

- zero critical 不再静默 PASS；有理由的豁免可绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。
