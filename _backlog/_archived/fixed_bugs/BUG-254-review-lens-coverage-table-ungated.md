---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-254：critic 技能要求 review.md 有 `topic × lens` 覆盖表，但没有任何门禁核对这张表

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：review topic×lens 覆盖表结构判据 + evidence 引用/列 lens 对账 + 空格解释
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-model-visible-semantics.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`presets/critic/skills/adversarial-review/SKILL.md:80`（“review.md 终局块必须有 topic × lens 覆盖表”）
> 与 `:83`（找不到卡 = 表造假 MAJOR）；消费面 = `checks/lib/gates/*`（无 lens 校验）。
> 探索轮 = [模型可见语义卡](../settled_issues/2026-11-18-model-visible-semantics.md)。

## 症状

critic 技能把 lens 覆盖表写成 **MAJOR 级必须项**，并说“抽查任意一格：要能指向真实 evidence 文件与
`lens` 字段；找不到卡 = 表造假（MAJOR）”。但门禁只做：

- `schema-scan` 查 review.md 有 readiness；
- `review-readiness` 解析 readiness 行/结构化声明；
- `verdict-audit` 查 claims/verdicts/readiness；
- **没有任何代码解析 review.md 的覆盖表、evidence 的 lens 或表格里的 `—/gap/n/a`。**

所以 critic 可以完全不写覆盖表，或写一张指向不存在 evidence 的表，`run-accept` 仍绿。

## 分诊与授权

- 严重级：P2 — 技能声明的 MAJOR 判据无机械消费者；review 的 lens 覆盖可空转。
- 表面 / 边界：review 合同 / ② 静态（表格 + evidence 引用）
- DSH 不变量：fail-loud；技能说“必须”的判据必须有门
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
grep -n '覆盖表\|topic × lens\|表造假' packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md
grep -rn 'lens' checks/lib/gates checks/run-gates | head    # 只有 topics/protocol，无 review 表
# 临时 review.md 删掉覆盖表 → node-gate/verdict-audit 不报
```

## 根因（已证）

D18/驾驶舱的 lens 覆盖表加在 critic skill 与 review 模板说明里，没有加进 `review-readiness.ts` 或
`verdict-audit-core` 的解析；`review.md` 的 readiness 只覆盖裁决，不覆盖覆盖表。`review/readiness.json`
也只读 readiness/round/conditional，不读 lens。

## 牵出的失败类

- 语义 C2（技能声明 vs 门）/ C7（表缺失不报）；与 250（evidence lens 缺失）/256（lens_gaps）同族。
- 类级方向 = review 的结构化部分（覆盖表/severity）与 readiness 一样有解析器；不能只留在 skill 散文。

## 修法

1. `review-readiness` 或新 `review-coverage` 解析 review.md 的 `## 覆盖表（topic × lens）`：每个
   evidence-producing topic × 其 topics `lenses:` 必须有格；`—` 必须同行有 `gap:`/`n/a:`；抽查格指向
   真实 evidence 文件且其 `lens` 匹配；
2. 缺表/空格/假卡 → MAJOR（交付门）；
3. 测试：删表/伪造格 → 红；合法表 → 绿；
4. 与 250 的 evidence lens 审计共用集合。

## 修复判据

- review.md 缺覆盖表或格指向不存在/不匹配 evidence → 红；合法表绿；
- 旧场按断代；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/review-contract.mjs",
    "checks/lib/gates/node-gate-delivery-gate.mjs",
    "tests/run/gates/review-contract.spec.mjs",
    "packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md"
  ],
  "red": {
    "command": "node --test tests/run/gates/review-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 2 - 缺表 / 假引用 / lens 不匹配…（关闭 coverageIssues 后红）"
  },
  "green": {
    "command": "node --test tests/run/gates/review-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/review-contract.spec.mjs"
  }
}
```
