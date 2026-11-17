---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-215：CI 分层的频率账没进预算——`tier: ci` 现在等于 nightly，docs/67 仍称 required

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 D54 边界并拍板「拆 tier」） — 结论：tier 拆 ci/nightly + 预算分档 + 工作流双向对账；cli-exit 进 nightly；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/smoke/registry.json](../../../checks/smoke/registry.json)（11 条 `tier: ci`）·
> [tests/checks/smoke-cost-budget.test.mjs](../../../tests/checks/smoke-cost-budget.test.mjs)（`ci` = `tier === 'ci'`）
> · [docs/guides/67-test-strategy.md](../../../docs/guides/67-test-strategy.md)（「CI required … client-load / snapshot-replay / deploy」）
> · [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)（push 只跑 keyless）与
> [.github/workflows/nightly.yml](../../../.github/workflows/nightly.yml)（11 条 smoke）。
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N8。

## 症状

CI 快慢分层后，push 门禁只跑 `keyless`（verify + test），**0 条 smoke**；全部 11 条
`tier: ci` 的 smoke 只在 nightly 跑。但三处语义仍按分层前写：

```sh
# push 工作流实际执行的 smoke = 0
node --input-type=module -e "
import {executedSmokeFiles} from './checks/lib/test-infra/ci-workflow.mjs';
import {readFileSync} from 'node:fs';
const ci=readFileSync('.github/workflows/ci.yml','utf8');
const n=readFileSync('.github/workflows/nightly.yml','utf8');
console.log('push:', [...executedSmokeFiles(ci)].length, 'nightly:', [...executedSmokeFiles(n)].length)
"
# push: 0 nightly: 11
```

- `smoke-cost-budget` 的 `ci` = `entries.filter(([, e]) => e.tier === 'ci')`，即 **11 条，全部 nightly**；
  上限 11 被 nightly 资产占满——「新增 CI 入口先退役一个」现在约束的是**夜间资产**，不是挡提交的门。
- guides/67 §8 仍写「CI required 只保留慢资产的最小集：当前慢 CI job = `client-load` /
  `snapshot-replay` / `deploy`（keyless）」；实际上这三个都在 nightly，push 合并不会被它们挡住。
- `smoke-registry` 的测试把 `tier: ci` 定义为「ci ∪ nightly 真正执行」，所以「ci」既表示
  required、又表示夜间挂载，二者不可区分。

## 分诊与授权

- 严重级：P2 — 契约/账本语义；不影响运行，但「required 只留最小集」这条成本纪律在单位上失真。
- 表面 / 边界：测试制度（D54 四账）/ ② 静态（YAML + registry + 预算 + 文档）
- DSH 不变量：fail-loud —— required 与 nightly 必须可区分，「证据仍在门里」不能靠同一个标签
- 触及面：文档合同（guides/67）+ 门禁与验收合同（smoke-cost-budget / smoke-registry）+ D54
- 授权：用户 2026-11-17 放行（D54 契约边界）并拍板兄弟方案 1「拆 tier」→ 修复就绪 = P2 修复授权
- 批：2026-11-17 命名空间搬家探索（N8）；M10 车道时延

## 复现

复现状态：稳定（静态）。

```sh
node --input-type=module -e "
import {executedSmokeFiles} from './checks/lib/test-infra/ci-workflow.mjs';
import {readFileSync} from 'node:fs';
console.log('push:', [...executedSmokeFiles(readFileSync('.github/workflows/ci.yml','utf8'))].length);
console.log('nightly:', [...executedSmokeFiles(readFileSync('.github/workflows/nightly.yml','utf8'))].length);
"
node -e "const r=require('./checks/smoke/registry.json'); console.log(Object.entries(r).filter(([,v])=>v.tier==='ci').length)"  # 11
sed -n '138p' docs/guides/67-test-strategy.md
```

## 根因（已证）

CI 分层把「谁挡提交」从「谁在 ci.yml 里」改成「谁在 push 的 keyless job 里」，但：

- registry 的 `tier` 只有 `ci | dev-only` 两态，没有 `nightly`；`tier: ci` 被测试定义为
  「ci ∪ nightly 执行」——required 与夜间共用一词；
- `smoke-cost-budget` 沿用 `tier === 'ci'` 计数，预算的「CI 入口」含义随分层漂移；
- guides/67 §8 的「required」句没有随分层改写（D54 预算 9→11 的行改了，这句没改）。

## 牵出的失败类

- M10 车道时延 + C3 双份事实（CI 分层是事实，预算/文档是副本）：分层后没有同变更更新判据单位。
- 同族 = 第六轮 `run-lane` SKIP 观察（退出码语义与「未跑 ≠ 通过」）。

## 修法

用户 2026-11-17 拍板：**选 1（拆 tier）**；方案 2 留作备选记录，不实施。

1. **拆 tier（已选）**：`tier: ci` = push/required；新增 `tier: nightly` = 只夜间；`smoke-registry` 分别对
   `ci.yml` / `nightly.yml` 断言；`smoke-cost-budget` 分列 `required` 与 `nightly` 两个 cap；
2. **改语义（备选，未选）**：保留 `tier: ci` = 任何 CI 挂载，但把预算改名「CI-mounted」并在 guides/67
   删掉「required 只留最小集」的表述，明确「push 门禁 0 smoke，nightly 承重」。

不论哪条，`ci-jobs` / `smoke-registry` 的「实际执行」对账继续保留；新增/退役 smoke 时两级都要对。

## 修复判据

- 新增一条 nightly-only smoke 不再消耗 required cap（或反之），且测试/账本能区分两档；
- guides/67 的「required」表述与实际 push 面一致；`pnpm test` 绿；
- 负控：把一个 `tier: ci` 的件从两个工作流都删掉 → 红；把 nightly 件误标 required → 红（按选定语义）。

## 修复关联

与 [BUG-214](BUG-214-cost-baseline-108-stale-count-free-vocabulary.md) 同批（测试制度账）；
决定若改 D54，需同变更写 Note 或改 D54 行。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/smoke/registry.json",
    ".github/workflows/nightly.yml",
    "tests/checks/smoke-registry.test.mjs",
    "tests/checks/smoke-cost-budget.test.mjs",
    "tests/checks/smoke-lane.test.mjs",
    "tests/checks/ci-workflow.test.mjs",
    "checks/lib/repo/smoke-lane.mjs",
    "docs/guides/67-test-strategy.md",
    "docs/evaluation.md",
    "docs/decisions.md"
  ],
  "red": {
    "command": "node --test tests/checks/smoke-registry.test.mjs",
    "exit": 1,
    "output": "not ok 2 - smoke registry：…频率归属…；doctor.e2e.mjs 标记 ci（push/required），但 ci.yml 没有可执行步骤"
  },
  "green": {
    "command": "node --test tests/checks/smoke-registry.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/smoke-registry.test.mjs"
  }
}
```
