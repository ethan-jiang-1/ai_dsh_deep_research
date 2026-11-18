---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-253：topics 的 `scope_role` 只消费 primary/comparison——未知/拼错角色静默逃出 L2 覆盖门

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：scope_role 四值先校验再算覆盖；未知/大小写错红
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-model-visible-semantics.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) 第 99–128 行
> （`role === 'primary' || role === 'comparison'`）；模板/技能值域 =
> `presets/lead/skills/research-brief/SKILL.md:59`（primary/synthesis/comparison/supporting）。
> 探索轮 = [模型可见语义卡](../settled_issues/2026-11-18-model-visible-semantics.md)。

## 症状

L2 覆盖门只把 `scope_role ∈ {primary, comparison}` 的 topic 纳入必覆盖；其它值一律不检查：

```js
const roleM = .../^\s*-\s*scope_role[:：]\s*(\S+)/m
if (role === 'primary' || role === 'comparison') { ... }
```

于是：

- `scope_role: Primary`（大小写）→ 不是 primary → 该 topic 不需要任何 lead；
- `scope_role: bogus` / `scope_role: supporing`（拼错）→ 静默不覆盖；
- 这正好是「模型把重要 topic 标错就绕过覆盖门」的路径。

## 分诊与授权

- 严重级：P2 — 覆盖门可被一个拼写绕过；不阻断运行，但 L2 的“primary 全指向”承诺失效。
- 表面 / 边界：topics 合同 / ② 静态（值域 + 覆盖）
- DSH 不变量：fail-loud；未知状态不得静默降级为“不要求”
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定（纯解析/门代码）。

```sh
sed -n '99,128p' checks/lib/gates/node-gate-run-gates.mjs
grep -n 'scope_role' packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md
# 临时 topics.md：把 T1 的 scope_role 改成 "Primary" → L2 覆盖门不把 T1 计入 required
```

## 根因（已证）

门只读两个合法值作为“必覆盖”集合，没有先校验 `scope_role` 闭集；`synthesis/supporting` 是合法豁免，
但**未知值**与 `supporting` 不可分。`template-contract` 只断言 `scope_role` 行在场，不断言值。

## 牵出的失败类

- 语义 C7（未知值静默变豁免）/ C2（技能值域 vs 门）；与 252（gap 四态）同族。
- 类级方向 = 先校验 `scope_role ∈ {primary,synthesis,comparison,supporting}`，再按角色算 coverage；
  非闭集 → 红（不是默认 supporting）。

## 修法

1. `node-gate-run-gates` 解析后校验四值；未知 → 红（`topics.md ... scope_role 非法`）；
2. 门 L 的 required 集合 = primary/comparison（合法 supporting/synthesis 才豁免）；
3. 测试：`Primary`/`bogus` → 红；四合法值 → 绿；`supporting` 真豁免；
4. `template-contract` 同步值域表。

## 修复判据

- 未知/大小写错 → 红；primary/comparison 必覆盖；supporting/synthesis 合法豁免；
- 旧场按断代；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "checks/lib/gates/node-gate-run-gates.mjs",
    "tests/run/gates/findings-contract.spec.mjs",
    "tests/pack/contract/template-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 4 - scope_role 非法/大小写错 → 门 L 红…（关闭 scope_role 校验后红）"
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
