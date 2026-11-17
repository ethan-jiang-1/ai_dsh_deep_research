---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-191：位置门禁只枚举已知子树——未知落点 + 重生成资产账 = 全绿

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — 落点补集门禁 `test-placement` + `pack-mirror` 正规则；账本重生成不再吸收（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 门禁自测 + 三格红绿）（2026-11-16）
>
> 位置：[tests/checks/pack-mirror.test.mjs](../../../tests/checks/pack-mirror.test.mjs)、
> [tests/checks/test-owner-mirror.test.mjs](../../../tests/checks/test-owner-mirror.test.mjs)、
> [tests/checks/test-lanes.test.mjs](../../../tests/checks/test-lanes.test.mjs)；
> 吸收方 = [dev/record-asset-ledger.mjs](../../../dev/record-asset-ledger.mjs)。

## 症状

把 spec 放进**没有任何位置规则命名过**的目录，四个位置/索引门禁全绿；唯一会红的是
`asset-ledger` 的「账与盘不一致」，而按仓规重生成账本（`node dev/record-asset-ledger.mjs`）后
→ 17/17 全绿。三格实测：

| 落点 | 未重生成账本 | 重生成后 |
|---|---|---|
| `tests/cockpit/misc/zz-place-probe.spec.mjs` | pass 16 / fail 1（asset-ledger） | **pass 17 / fail 0** |
| `tests/pack/misc/zz-place-probe.spec.mjs` | pass 16 / fail 1 | **pass 17 / fail 0** |
| `tests/cockpit/shared/zz-place-probe.spec.mjs` | pass 16 / fail 1 | **pass 17 / fail 0** |

即：任何 agent 把测试落进 `tests/cockpit/<任意目录>/` 或 `tests/pack/<任意目录>/`，跑一次生成器
就被全部门禁接受。这正是 2026-11-15 `c6f29682` 手工修正的同一形状（8 个 client 子目录 spec 落错
位置），当时靠 review 抓到，门禁没红。

## 分诊与授权

- 严重级：P2 — 不阻断产品与发布，但让「落点由规则决定」失效；错误落点会长期污染所有者轴与索引。
- 表面 / 边界：研发面 / ② 行为（门禁自测）
- DSH 不变量：fail-loud（规则未覆盖的落点必须红，不是「暂时没人管」）
- 触及面：门禁与验收合同 — 修法要改 `pack-mirror` / `test-owner-mirror` 的判据
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁触面不自授权）」解除
- 批：第十轮搬家探索 M1/M4 —— 同批 [BUG-192](BUG-192-snapshot-replay-offline-preload-stale-path.md)…[BUG-198](BUG-198-spec-header-stale-path-frozen-into-ledger-claim.md)

## 复现

复现状态：稳定（三格，先红后绿可重放）。

```sh
mkdir -p tests/cockpit/misc
printf "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('p', () => { assert.equal(1, 1) })\n" > tests/cockpit/misc/zz-place-probe.spec.mjs
node --import tsx/esm --test tests/checks/pack-mirror.test.mjs tests/checks/test-owner-mirror.test.mjs \
  tests/checks/test-lanes.test.mjs tests/checks/asset-ledger.test.mjs   # 16/1：只有资产账红
node dev/record-asset-ledger.mjs
node --import tsx/esm --test tests/checks/pack-mirror.test.mjs tests/checks/test-owner-mirror.test.mjs \
  tests/checks/test-lanes.test.mjs tests/checks/asset-ledger.test.mjs   # 17/0：全绿
rm -rf tests/cockpit/misc && git checkout -- tests/fixtures/asset-ledger/ledger.json
```

`tests/pack/misc/` 与 `tests/cockpit/shared/` 把第一行换目录即可重放。探针已删、树复原。

## 根因（已证）

四条门禁都只枚举**已知子树**，没有任何一条对「补集」成句：

- `pack-mirror`：枚举 `tests/cockpit/lib`（domain 规则）、`tests/cockpit/client`（依赖规则）、
  `tests/pack` 的固定 surface 列表与 `contract/`；不枚举 `tests/cockpit` 其余部分。
- `test-owner-mirror`：只枚举 `tests/run`；`tests/cockpit`、`tests/pack` 不在其范围。
- `test-lanes`：只要求 `.spec.mjs` 住 `run/cockpit/pack/contracts` 之一——`cockpit/<任意>/` 合法。
- `asset-ledger` / `test-index` 以盘为准重生成：新文件先触发漂移红，**重生成即吸收为准**。

根因证据：上表三格 + 生成器重生成后 17/0；`test-index` 只索引「谁 import 了模块」，不索引落点。

## 牵出的失败类

- **M1 落点补集**：位置门禁枚举已知子树，子树之外无人管。
- **M4 生成器吸收**：重跑账本把错落点合法化为「当前状态」。
- 同类先例：`c6f29682`（Step 2 的 8 个 client 子目录 spec 落错，review 咬出）。类修，非实例修。

## 修法

1. 判据从「枚举已知子集」改为「全集 − 已知子集 = 空」：
   `tests/cockpit` 首段 ∈ {`lib`, `client`, `shared`, `fixtures`}；
   `tests/pack` 首段 ∈ {`contract`, `scripts`, `content`, `startup`, `defaults`, `fetch-fallback`, `fixtures`}；
   `tests/run` 已有全量 owner 规则，保持。
2. 给 `tests/cockpit/shared/` 与 `tests/pack/contract/` 各自补正向规则（两者现在没有「允许什么」的判据）。
3. 修法不得靠重生成账本消化（那正是 M4）。

## 修复判据

- 三格在不重生成账本时红、**重生成后仍红**（关键：拒绝 M4 吸收）；
- 负控：`tests/cockpit/client/<已知 sub>/`、`tests/pack/contract/` 放同名 spec 绿；
- `pnpm verify` + `pnpm test` 绿；`gates.e2e` 至少新增一例「未知落点」注入案例（先红后绿）。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。门禁 = `test-placement`（L0）+ `pack-mirror` 的全集−已知子集断言；
gates.e2e 案例 = `test-placement-unknown-subtree`。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/repo/test-placement.mjs",
    "scripts/verify/gates/f-repo.mjs",
    "scripts/verify/context.mjs",
    "docs/evaluation.md",
    "scripts/lib/harness/gates-cases.mjs",
    "tests/checks/pack-mirror.test.mjs",
    "tests/checks/test-placement.test.mjs",
    "tests/checks/verify-gates.test.mjs",
    "scripts/README.md",
    "tests/INDEX.generated.md",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 1, "output": "not ok 1 - tests 落点全集 − 已知子集 = 空（BUG-191；账本重生成不能吸收）" },
  "green": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/shared/pack-mirror.test.mjs" }
}
```
