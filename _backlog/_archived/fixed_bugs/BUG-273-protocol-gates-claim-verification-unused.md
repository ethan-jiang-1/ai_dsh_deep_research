---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-273：protocol 的 `gates.claim_verification` / `gates.critic` 没有消费者——声明 on/off 不改变门禁

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：claim_verification/critic 接线
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/protocol-core.mjs:85–86`（critic 五值、claim_verification on/off 闭集）；
> `checks/run-gates/verdict-audit.mjs` / `run-accept` 不看这两个字段；模板 =
> `content/templates/run/protocol.json`。探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

protocol 的 `gates` 是本次 run 的审查配置：

```text
critic: report | claim | both | none | light
claim_verification: on | off
```

schema 只校验闭集；**没有任何门读它们**：

- `claim_verification: off` 时，run-accept 仍跑 verdict-audit/claims 检查（或反之）；
- `critic: none` 时，review/readiness 仍按默认要求；
- `critic: claim` vs `both` 不改变审查深度/判据；
- 这些值只出现在 protocol 投影/驾驶舱，不影响执行。

## 分诊与授权

- 严重级：P2 — 研究设计的审查配置是“写了不生效”的声明；用户以为关掉了 claim 验证，门仍按开。
- 表面 / 边界：protocol→gate 配置 / ② 静态
- DSH 不变量：fail-loud；配置字段必须改变行为，或明确只读展示
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn 'claim_verification\|gates.critic\|critic:' checks/run-gates checks/lib/gates | head
# 只有 protocol-core 闭集；无 run-accept/verdict-audit 消费
```

## 根因（已证）

protocol 的 `gates` 被当作 HITL1 的设计展示；`verdict-audit`/`run-accept` 用固定流程，不读 protocol。
`critic` 的 report/claim/both/none/light 也没有映射到 review 深度。

## 牵出的失败类

- 语义 C2（配置无消费者）+ C7；与 271/272 同族。
- 类级方向 = protocol 的 gates 每个值都有执行映射，或从 schema 删除/标为只读。

## 修法

1. run-accept/verdict-audit 读协议：`claim_verification: off` 时显式豁免 claims/verdicts（或要求
   `approval_basis` 记录豁免）；`critic: none/light` 映射 review 要求；
2. 若决定只读展示，schema 标 `display_only` 并写进 docs；
3. 测试：off/on 行为不同；none/light 行为不同；
4. 旧场按断代。

## 修复判据

- 两个 gate 字段改变实际流程，或被显式标只读；
- 测试覆盖 on/off、none/light；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs",
    "checks/run-gates/run-accept.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 41 - gates.claim_verification/critic → claim 裁决是否必需（BUG-273）"
  },
  "green": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
