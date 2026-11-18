---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-252：findings 的 `gap` 四态只查“有个非空值”——`gap: maybe` 照样过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：[tests/pack/contract/template-contract.spec.mjs](../../tests/pack/contract/template-contract.spec.mjs) 第 35 行
> （`/^-\s*gap\s*[:：]\s*\S+/m`）；模板 = `content/templates/run/findings.md:10`
> （`gap: supported | needs_search | contradicted | insufficient`）。
> 探索轮 = [模型可见语义卡](../issues/2026-11-18-model-visible-semantics.md)。

## 症状

`findings.md` 的 `- gap:` 是驱动定向补搜的四态字段；`template-contract` 只断言“有非空字符”，
没有任何 gate/解析器校验值域：

```js
{ pattern: /^-\s*gap\s*[:：]\s*\S+/m, why: 'gap 四态与补搜判据' }
```

所以 `gap: maybe` / `gap: done` / `gap: 已补` 都能过模板契约；`node-gate`/schema-scan 不读 gap 值；
dashboard 若按四态解析，未知值会被静默丢或当默认。一个 needs_search 的 finding 写成 done，补搜就消失。

## 分诊与授权

- 严重级：P2 — 模型可见的 gap 四态与机械契约脱节；不阻断运行，但会假称补搜完成。
- 表面 / 边界：findings 合同 / ② 静态（值域）
- DSH 不变量：fail-loud；gap 是状态机，未知状态不得静默
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
sed -n '35p' tests/pack/contract/template-contract.spec.mjs
grep -rn "gap" checks/lib/gates checks/run-gates | head    # 无四态校验
# 把 findings 模板的 gap 行改成 `- gap: maybe`（临时复制）→ template-contract 仍绿
```

## 根因（已证）

`template-contract` 的判据是“键在场”；没有 `GAP_STATES` 闭集，也没有 findings 解析器消费 gap 值。
`nodes-contract`/manual 的四态只活在模板注释与散文里。

## 牵出的失败类

- 语义 C2（注释即合同）/ C7（非空即通过）；与 251（evidence 值域）同族。
- 类级方向 = 模板里的枚举值必须有同源闭集消费者（模板契约 → 值域断言）。

## 修法

1. `template-contract` 或新 `findings-contract` 加 `GAP_STATES`，findings 每个 F# 的 gap 必须 ∈ 四态；
2. 若 dashboard 解析 gap，复用同一常量（单一正本）；
3. 测试注入 `maybe` → 红；四态各一 → 绿；
4. 旧场按断代（无 run.md）豁免。

## 修复判据

- 非四态 gap → 红；四态合法 → 绿；
- 旧场不误伤；`pnpm test` 绿。
