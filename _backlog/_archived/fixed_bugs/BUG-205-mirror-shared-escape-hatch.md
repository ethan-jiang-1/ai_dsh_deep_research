---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-205：镜像门禁的 `shared/` 兜底——单 owner 的 spec 藏进 shared 就没人拦（run 与 cockpit lib 两处）

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — shared 只收无依赖/仅 shared/test-support；两个单 owner spec 归位 gates（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 两格探针红 / 归位后绿）（2026-11-16）
>
> 位置：[tests/checks/test-owner-mirror.test.mjs](../../../tests/checks/test-owner-mirror.test.mjs) ③
> 与 [tests/checks/pack-mirror.test.mjs](../../../tests/checks/pack-mirror.test.mjs) 的 lib 依赖规则；
> 批 E Note 的残余风险只登记了 `tests/run/shared`，未提 `tests/cockpit/lib/shared`。

## 症状

两条依赖规则都写着「spec 的 lib 依赖 owner/domain ∈ {目录, shared}」，但实现多了一个
`|| dir === 'shared'`——于是**只要 spec 住在 `shared/`，依赖哪个 owner 都放行**：

```sh
# ① tests/run/shared 放一个只依赖 scripts/lib/gates/ 的 spec
node --import tsx/esm --test tests/checks/test-owner-mirror.test.mjs     # 3/3 绿
# ② tests/cockpit/lib/shared 放一个只依赖 scripts/lib/gates/ 的 spec
node --import tsx/esm --test tests/checks/pack-mirror.test.mjs tests/checks/test-placement.test.mjs
# 11/11 绿
```

按规则正文（「无依赖、或只依赖 shared 的跨切 spec 才许住 shared」），这两类单 owner spec 应归
`tests/run/gates/` / 对应 domain，而不是 `shared/`。`shared/` 因此成了逃逸口：归属轴被藏起来，
索引/账本把它记成 shared，review 之外无人发现。

## 分诊与授权

- 严重级：P2 — 不阻断运行；但这是 BUG-191 类级修复明确要收口的「落点由规则决定」，shared 半边没落地。
- 表面 / 边界：研发面 / ② 行为（门禁自测）
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）；前序 = [BUG-191](BUG-191-placement-gates-unknown-subtree-unruled.md)；
  批 E Note 列为残余风险（run/shared 一处）

## 复现

复现状态：稳定（两格探针，已删、树复原）。

```sh
# ① run/shared
printf "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\nimport { parseStrategy } from '../../../scripts/lib/gates/strategy-core.mjs'\ntest('x', () => { assert.equal(typeof parseStrategy, 'function') })\n" > tests/run/shared/zz-owner-probe.spec.mjs
node --import tsx/esm --test tests/checks/test-owner-mirror.test.mjs      # 3/3 绿

# ② cockpit lib/shared
printf "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\nimport { parseStrategy } from '../../../../scripts/lib/gates/strategy-core.mjs'\ntest('x', () => { assert.equal(typeof parseStrategy, 'function') })\n" > tests/cockpit/lib/shared/zz-escape.spec.mjs
node --import tsx/esm --test tests/checks/pack-mirror.test.mjs tests/checks/test-placement.test.mjs  # 11/11 绿
rm -f tests/run/shared/zz-owner-probe.spec.mjs tests/cockpit/lib/shared/zz-escape.spec.mjs
```

## 根因（已证）

两条判据在断言里给 `shared` 开了后门：

```js
// test-owner-mirror ③
assert.ok(domains.has(dir) || dir === 'shared', …)
// pack-mirror lib 规则
assert.ok(domains.has(dir) || dir === 'shared', …)
```

而规则的「跨切」定义在文件头注里（「无 lib 依赖或只依赖 shared → 只许住 shared」），实现没有把它
写成正向条件。批 E Note 的残余风险只写了 run/shared，且将其明确延后；cockpit lib/shared 是同一
形状的第二处，未登记。

根因证据：上面两格实测 + 两行断言 + Note 残余风险第 1 条。

## 牵出的失败类

- **M1 落点补集**（规则只判「已知 owner 集合」的成员，不判「跨切」这个正向条件）+ C7（豁免被当成规则）。
- 同机制第 2/3 次；类修 = shared 的准入条件 = `domains.size === 0 || (domains.size === 1 && domains.has('shared'))`，
  否则红；单 owner spec 归其 owner 目录。

## 修法

1. 两条规则都改为：`dir === 'shared'` 时，只允许 `domains.size === 0` 或 `domains ⊆ {shared}`（pack lib 侧对应
   `domain ∈ {shared}`）；其余 → 红并点名「单 owner 的 spec 住 shared」。
2. 现有 `shared/` 用例逐个复核归属：`tests/run/shared/*`（`frontmatter`、`strategy-core`、`verdict-audit-fixture`、`workspace-root`）
   若只依赖某 owner 则归位；`tests/cockpit/lib/shared/method-presets.spec.mjs` 依赖 `scripts/lib/test-infra`（非 pack
   lib domain，`domains.size === 0`）——需在规则里确认这类跨库依赖的读法。
3. Note 的残余风险与 tests/AGENTS 同步（两处 shared 都要写）。

## 修复判据

- 两格探针在修后红（报因点名「单 owner 住 shared」）；合法的跨切 spec（依赖 ≥2 个不同 owner/domain）
  仍绿（负控）；
- 现有 shared 用例经复核后全部绿（必要时归位，不靠豁免）；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。两个单 owner spec 归位 `tests/run/gates/`（登记簿与文档链接同变更）；
`tests/cockpit/lib/shared` 的 test-support 依赖（test-infra）在规则里显式豁免。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/checks/test-owner-mirror.test.mjs",
    "tests/checks/pack-mirror.test.mjs",
    "tests/run/gates/strategy-core.spec.mjs",
    "tests/run/gates/verdict-audit-fixture.spec.mjs",
    "scripts/test-path-redirects.json",
    "docs/evaluation.md",
    "tests/fixtures/README.md",
    "tests/fixtures/verdict-audit/README.md",
    "tests/INDEX.generated.md",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/test-owner-mirror.test.mjs", "exit": 1, "output": "not ok 2 - spec 的 lib 依赖 owner ∈ {spec 目录, shared}；shared 只收跨切（BUG-205）；tests/run/shared/zz-owner-probe.spec.mjs 住 shared/，但依赖 gates" },
  "green": { "command": "node --import tsx/esm --test tests/checks/test-owner-mirror.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/test-owner-mirror.test.mjs" }
}
```
