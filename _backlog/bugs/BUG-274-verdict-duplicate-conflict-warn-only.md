---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-274：同一 claim 的多条冲突裁决只 WARN——supported + unsupported 可同时存在并交付

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`checks/lib/gates/verdict-audit-core.mjs:362`（重复 claim 只 `warn('verdict-duplicate')`）；
> 覆盖判据取并集；模板 = `content/templates/run/verdicts.json`。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

`verdicts.json` 允许同一 `claim_id` 多条裁决；`verdict-audit` 只发 warning：

```js
if (seenClaims.has(verdict.claim_id)) warn('verdict-duplicate', ...取并集判覆盖，冲突需语义审)
```

于是同一 critical claim 可以同时有 `supported` 与 `unsupported`（或 `unverifiable`）：

- coverage 取并集，只要有一条 supported 就算覆盖；
- 冲突只 warning，`run-accept` 仍可 PASS；
- “裁决冲突”交给语义审，但没有任何门/报告强制记录裁决。

## 分诊与授权

- 严重级：P2 — 互相否定的裁决可并存，交付结论取对自己有利的一条。
- 表面 / 边界：verdicts 合同 / ② 静态（冲突）
- DSH 不变量：fail-loud；同一 claim 的终局裁决必须唯一或显式仲裁
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
# verdicts: C1 supported + C1 unsupported（同/不同 batch）
node checks/run-gates/verdict-audit.mjs <bundle> --sessions <dir>
# → 只有 verdict-duplicate warning；PASS/交付不受阻
```

## 根因（已证）

`seenClaims` 只用来发 warning；没有“同 claim 值冲突 → 红”或“必须显式仲裁字段”的判据。
coverage 用并集，冲突不影响覆盖。

## 牵出的失败类

- 语义 C2（冲突裁决）+ C7（warning 不拦）；与 275（no-critical）同族。
- 类级方向 = 同一主键的多值必须唯一或带 `arbitration`；warning 不能承担终局冲突。

## 修法

1. 同一 claim 的多条裁决：值不同 → 红（除非有 `arbitration` 指向终局条目）；
2. coverage 只认仲裁后的终局；报告列出冲突；
3. 测试：supported+unsupported → 红；有仲裁 → 绿；
4. 旧场按断代。

## 修复判据

- 冲突裁决 → 红；唯一/显式仲裁 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。
