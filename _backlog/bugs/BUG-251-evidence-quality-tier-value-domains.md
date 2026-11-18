---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-251：evidence 的 `quality` / `source_tier` 只查“在场”，不查值域——`quality: Z`、`source_tier: foo` 照样过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：[checks/lib/gates/evidence-audit-core.mjs](../../checks/lib/gates/evidence-audit-core.mjs) 第 219–225 行
> （只 `if (!fm[k])`）；合同 = `content/manual.md:136,153–154`（quality A–D、source_tier 五档）、
> `presets/analyst/skills/evidence-extraction/SKILL.md:22`（`quality: A|B|C|D`）。
> 探索轮 = [模型可见语义卡](../issues/2026-11-18-model-visible-semantics.md)。

## 症状

`evidence-audit-core` 对 `quality` 只判“非空”，对 `source_tier` 只判“非空”，不校验闭集：

```js
if (!fm[k]) findings.push(... 缺硬字段 ...)          // quality 只在这里
if (!fm.source_tier || !fm.publisher) ...             // source_tier 只判在场
```

现场（临时 bundle）：`quality: Z`、`source_tier` 缺失只给 INFO“未分级”；把 `source_tier: foo` 也会通过。
手册说 quality 是 A–D、source_tier 是 primary/secondary/tertiary/weak；审计不认值，equal 于没有分级。

## 分诊与授权

- 严重级：P2 — 证据质量分级可被任意字符串冒充；review/verdict 的 `source_tier_ok` 判据失去上游事实。
- 表面 / 边界：evidence 合同 / ② 静态（frontmatter 值）
- DSH 不变量：fail-loud；分级字段必须有闭集校验，否则只是装饰
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
# 临时 evidence 卡 quality: Z / source_tier: foo
node --input-type=module -e "…auditBundle(…)…"   # 无 quality/source_tier 值域 finding
grep -n 'quality\|source_tier' checks/lib/gates/evidence-audit-core.mjs | head
grep -n 'quality.*A–D\|source_tier 唯一正本\|primary/secondary' packages/deep-research-pack/content/manual.md
```

## 根因（已证）

审计只对硬字段做“非空”检查，没有 `QUALITY_VALUES`/`TIER_VALUES` 闭集；`template-contract` 只断言
模板有 `quality` 行，不断言审计校验值。`verdict-audit` 的 `source_tier_ok` 是 critic 的主观布尔，
上游 evidence 的 tier 值没有机械约束。

## 牵出的失败类

- 语义 C2（模板值域 vs 审计）+ C7（在场即通过）；与 250（lens 缺字段）/254（review 覆盖）同族。
- 类级方向 = 模板里出现的每个闭集字段，审计都要有同源值域表；不要两份手抄。

## 修法

1. `evidence-audit-core` 加 `QUALITY_VALUES = A|B|C|D`、`TIER_VALUES = primary|secondary|tertiary|weak`；
   值不在闭集 → MAJOR（旧场按断代豁免）；
2. `publisher` 加注册域格式（至少 `host.tld`，`localhost` 例外）；
3. 测试注入 `Z`/`foo` → 红；合法 A/D、primary/weak → 绿；
4. 与 `template-contract` 的值域表同源。

## 修复判据

- 非法 quality/source_tier → evidence-audit 红；合法值绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。
