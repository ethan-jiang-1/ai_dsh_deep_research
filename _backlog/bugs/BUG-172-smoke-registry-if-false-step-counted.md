---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-172：smoke-registry 把 `if: false` 的 run 行当执行——被跳过的 smoke 仍算 CI 资产

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI/验收合同，需用户放行
>
> 位置：[tests/checks/smoke-registry.test.mjs](../../tests/checks/smoke-registry.test.mjs) 的
> `executedSmokeFiles`；前科 = [BUG-160](../_archived/fixed_bugs/BUG-160-smoke-registry-mention-not-execution.md)
> （注释/echo 不算）。本条是它的**跳过面**残余：`if: false` / `continue-on-error`。

## 症状

`executedSmokeFiles` 只抽 `run:` 块的行文本；step 的 `if:`/`continue-on-error` 上下文不在判据里。
把一条真实 run 步骤改成**永假条件**，测试仍 4/4 PASS，registry 继续宣称 ci：

```yaml
      - name: Receipt chain (run-accept end-to-end)
        if: false
        run: source dev/env.sh && node scripts/smoke/run-accept.e2e.mjs
```

```sh
node --test tests/checks/smoke-registry.test.mjs
# ok 1..4 / # tests 4 / # pass 4 / # fail 0   ← 应红：步骤被跳过
```

## 根因（已证）

判据的「执行」只等于「run 行里出现 node + smoke 路径」；没有建模 GitHub Actions 的 step 级
`if:`、`continue-on-error` 与 job 级 `if:`。`if: false` 的 step 在 Actions 里 skipped、job 仍可
success；聚合门只读 job 结果 → 全绿，而 smoke 从未运行。

## 影响面

- 临时禁用一条 smoke（`if: false`）时，`smoke-registry` 仍把它当 ci 资产；证据链静默缺失。
- `continue-on-error: true` 的 run 行失败也不会让 job 红，registry 仍算执行——同一「执行面」缺口。
- 当前 ci.yml 没有 `if: false`；属门禁钝化（P2），但这是 BUG-160 修复时明确列为可选加强的边界。

## 牵出的失败类

- **C7 假绿**（跳过 ≠ 执行）+ **C2 消费者遗漏**（step 上下文没有消费者）。
- 同机制第 **2** 次（160 文本提及 → 本条 step 条件）。类修：解析 step 块（`- name` / `if` /
  `continue-on-error` / `run`），只有「无跳过条件 + run 可执行 + 所属 job 在 needs」才算 ci 证据。

## 修复判据

- `executedSmokeFiles` 按 step 分组：带 `if: false`（以及 `if: ${{ false }}` 的等价形态）的 step
  不计；`continue-on-error: true` 至少判红/显式登记，不能当无条件执行。
- 可选：要求该 step 所属 job 出现在 `all-checks-passed.needs`（与 `ci-jobs` 共用 job 解析）。
- 反证：上面 `if: false` → 必须红「run-accept 没有可执行步骤」；删 `if: false` → 绿；
  `continue-on-error: true` 的 run 行 → 红或登记理由。

## 修复关联

未修。触面 = CI/验收合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；
可与 BUG-160 的同一解析器同批。
