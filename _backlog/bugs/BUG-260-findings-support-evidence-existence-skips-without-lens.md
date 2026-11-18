---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-260：findings 的支撑证据路径只在“有 lens”时才查——无 lens 的 run 可引用不存在的 evidence

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：[checks/lib/gates/findings-core.mjs](../../checks/lib/gates/findings-core.mjs) 的
> `findingsContractIssues`（`if (allLenses.size > 0 && block.evidence.length > 0)` 才进入存在性检查）；
> 模板 = `content/templates/run/findings.md` 的 `- 支撑证据: evidence/<file>.md`。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

findings 的 `支撑证据` 是结论到 evidence 的唯一结构化链。`findingsContractIssues` 只在
`allLenses.size > 0` 时才检查 `evidence/...` 文件是否存在：

```js
if (allLenses.size > 0 && block.evidence.length > 0) {
  ...
  if (!existsSync(p)) { issues.push(`${block.id} 的支撑证据 ${rel} 不存在`); continue }
```

`lenses` 在 topics 里是**可选**（synthesis 可空；很多 run 无 lens）。于是无 lens 的 run 写
`- 支撑证据: evidence/missing.md`，findings 契约返回 `[]`。实测：

```text
topics: T1 (no lenses)
findings: F1 支撑证据 evidence/missing.md gap supported
findingsContractIssues -> []
```

## 分诊与授权

- 严重级：P2 — 结论可以引用不存在的证据而 findings 门不报；交付证据链断开。
- 表面 / 边界：findings 合同 / ② 静态（路径存在性）
- DSH 不变量：fail-loud；结构化引用必须可解析
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "…findingsContractIssues(tmpBundle)…"   # 无 lens + missing evidence → []
sed -n '/allLenses.size > 0/,/^  }/p' checks/lib/gates/findings-core.mjs
```

## 根因（已证）

证据存在性检查被放进 lens 差集对账的同一分支；无 lens 时整段跳过，而不是只跳过 lens 差集。
`findings` 的 `支撑证据` 路径校验与 lens 无关，应该独立。

## 牵出的失败类

- 语义 C2（结构化引用无校验）+ C7（条件分支吞检查）；与 261/262 同族。
- 类级方向 = 每个字段的每个**独立判据**分开；不要用一个条件包住两个不变量。

## 修法

1. 把“`支撑证据` 路径存在”移出 `allLenses` 条件，所有 findings 都查；
2. lens 差集对账保留在 `allLenses>0 && evidence>0`；
3. 测试：无 lens + missing evidence → 红；存在 → 绿；有 lens 行为不变。

## 修复判据

- 任意 run 的 findings 支撑证据不存在 → 红；合法路径绿；
- 旧场按断代；`pnpm test` / run-gates 绿。
