---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-250：evidence 八字段合同里的 `lens` 从未被审计——缺 `lens` 的证据卡照样过 evidence-audit

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：lens 入 evidence 硬字段 + 与 topics lenses 集合对账（越界 MAJOR）
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-model-visible-semantics.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/evidence-audit-core.mjs](../../../checks/lib/gates/evidence-audit-core.mjs) 第 219–225 行
> （硬五字段 + 软二字段）；合同 = `content/manual.md:136`（八字段）、`content/templates/run/evidence-entry.md`
> （含 `lens`）、`presets/analyst/skills/evidence-extraction/SKILL.md`（`lens: <id>`）。
> 探索轮 = [模型可见语义卡](../settled_issues/2026-11-18-model-visible-semantics.md)。

## 症状

模板/手册/技能都要求 evidence frontmatter **八字段**（含 `lens`），`evidence-audit-core` 只检查：

```js
for (const k of ['source_url','retrieved_at','quality','found_by','supports']) ... // 硬五
if (!fm.source_tier || !fm.publisher) ... // 软二
```

`lens` 既不是硬字段也不是软字段；一张没有 `lens` 的证据卡不会产生任何 finding。现场：

```sh
# 临时 bundle 里放一张无 lens、quality=Z 的卡
node --input-type=module -e "…auditBundle(…)…"
# findings 里只有 source_tier/publisher 软提示；没有 lens / quality 值
```

下游 `review.md` 的 topic × lens 覆盖表、`findings.md` 的 lens_gaps 都依赖这个字段；缺字段的证据
会让覆盖表“看起来齐”，而审计不报。

## 分诊与授权

- 严重级：P2 — 模型可见语义合同（八字段）与机械审计（七字段）不一致；不会立刻坏运行，但证据面/finding 覆盖会假齐。
- 表面 / 边界：evidence 合同 / ② 静态（frontmatter）
- DSH 不变量：fail-loud；模板即 schema，schema 声明的字段必须有消费者
- 触及面：门禁与验收合同（evidence-audit）
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
grep -n "for (const k of \['source_url'" -A 3 checks/lib/gates/evidence-audit-core.mjs
grep -n 'lens' packages/deep-research-pack/content/templates/run/evidence-entry.md packages/deep-research-pack/content/manual.md | head
node checks/run-gates/evidence-audit.mjs <fixture-bundle> --sessions <dir>   # 无 lens 不报
```

## 根因（已证）

`lens` 是 2026-11 新增的证据面字段（D18/驾驶舱），加进了模板/手册/wave 配方，但没有接进
`evidence-audit-core` 的字段清单；`template-contract` 只断言模板有该键，不断言审计消费它。
`lensScanOf` 只扫 `topics.md` 的 `lenses:`，不扫 evidence 的 `lens`。

## 牵出的失败类

- 语义 C2（模板声明 vs 审计消费）+ C7（缺字段不报）；与 251（值域）/254（review 覆盖表）同族。
- 类级方向 = 八字段逐一有消费者；`lens` 同时要做「本 run lenses 集合」校验（critic 说：缺/越界 = MAJOR）。

## 修法

1. `evidence-audit-core` 把 `lens` 纳入必填（MAJOR）；并与 topics 的 `lenses:` 集合对账（缺失/越界）；
2. 旧 bundle 断代：按 `run.md` 在场/契约日豁免（不追补）；
3. 测试注入无 lens/未知 lens → 红；合法卡绿；
4. `template-contract` 从「模板有键」升级为「审计消费键」。

## 修复判据

- 无 `lens` 或 `lens` 不在 topics 集合 → evidence-audit 红；合法卡绿；
- 旧场按断代不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/evidence-audit-core.mjs",
    "tests/run/gates/evidence-audit.spec.mjs",
    "tests/pack/contract/template-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/evidence-audit.spec.mjs",
    "exit": 1,
    "output": "not ok 18 - BUG-250：缺 lens = MAJOR…（从硬字段删 lens 后，缺 lens 用例红）"
  },
  "green": {
    "command": "node --test tests/run/gates/evidence-audit.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/evidence-audit.spec.mjs"
  }
}
```
