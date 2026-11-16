---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-200：test-placement 的「未知深度 = 红」没实现——run / cockpit lib / client 任意深都放过

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — run / cockpit lib / client 深度恰好 + 三门槛红绿（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 实盘深度探针红绿）（2026-11-16）
>
> 位置：[scripts/lib/repo/test-placement.mjs](../../../scripts/lib/repo/test-placement.mjs)（`placementIssues`）；
> 文档声明 = [docs/evaluation.md](../../../docs/evaluation.md) 的 `test-placement` 行与
> [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)；
> 负控矩阵 = [tests/checks/test-placement.test.mjs](../../../tests/checks/test-placement.test.mjs)。

## 症状

占位规则只校验「首段是已知 home」，不校验**深度恰好**：

```js
placementIssues([
  'tests/run/ops/deep/zz.spec.mjs',                 // 期望：红（未知深度）
  'tests/run/gates/a/b/c/x.spec.mjs',               // 期望：红
  'tests/cockpit/lib/run/deep/x.spec.mjs',          // 期望：红
  'tests/cockpit/client/defaults/deep/x.spec.mjs',  // 期望：红
]) // → [] 全绿
```

实测：在 `tests/run/ops/deep/` 放一个 spec，`test-placement` + `test-owner-mirror` + `pack-mirror`
**14/14 全绿**。而 evaluation 的 L0 行与模块头注都写着「未知子树/**深度**/顶层平铺 = 红」——
实现比承诺宽，镜像的 1:1（`tests/run/<owner>/<file>`）没有被强制。

## 分诊与授权

- 严重级：P2 — 不阻断运行；但位置规则是 BUG-191 的类级修复，深度半条腿没落地会让镜像轴继续腐烂。
- 表面 / 边界：研发面 / ② 行为（门禁自测）
- DSH 不变量：fail-loud（规则覆盖不到的形状必须红）
- 触及面：门禁与验收合同 — 改 `test-placement` 与 `pack-mirror` 的逐域深度
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）；前序 = [BUG-191](BUG-191-placement-gates-unknown-subtree-unruled.md)

## 复现

复现状态：稳定。

```sh
node --input-type=module -e '
import { placementIssues } from "./scripts/lib/repo/test-placement.mjs";
console.log(placementIssues([
 "tests/run/ops/deep/zz.spec.mjs",
 "tests/cockpit/lib/run/deep/x.spec.mjs",
 "tests/cockpit/client/defaults/deep/x.spec.mjs"]));'   # → []

mkdir -p tests/run/ops/deep && printf "import { test } from 'node:test'\ntest('p', () => {})\n" > tests/run/ops/deep/zz-deep.spec.mjs
node --import tsx/esm --test tests/checks/test-placement.test.mjs tests/checks/test-owner-mirror.test.mjs \
  tests/checks/pack-mirror.test.mjs      # 14/14 全绿
rm -rf tests/run/ops/deep
```

## 根因（已证）

三个分支的深度判据只设下限、不设上限：

- `run`：`seg.length < 4` 只挡浅的；`seg[2]` 是 owner 即通过，`seg.length` 任意大不判。
- `cockpit/lib`：`seg.length < 5` 只挡浅的；`seg[3]` 是 domain 即通过。
- `cockpit/client`：`seg.length >= 5 && !CLIENT_SUBS.includes(seg[3])`；`seg[3]` 命中已知 sub 后，
  更深的段都被忽略（`pack`/`checks`/`vendor`/`contracts`/`shared` 三个分支反而有严格等长判据）。

根因证据：上面的纯函数输出 + 三处源码判据 + `test-placement.test.mjs` 的矩阵里没有深度用例
（标题虽写「未知子树/深度/平铺根」，实测项只有 `shared`/`pack`/`checks` 的嵌套）。

## 牵出的失败类

- **M1 落点补集**的残余（只补了「未知子树」，没补「未知深度」）+ C7（文档声明与实现不一致）。
- 同机制第 2 次（BUG-191 是第 1 次）；类修 = 每个 home 都写「恰好 N 段」判据，而不是只判首段。

## 修法

1. `run`：`seg.length === 4`；`cockpit/client`：`seg.length === 4`（root spec）或 `=== 5`（sub spec）；
   `cockpit/lib`：`seg.length === 5`。`cockpit/shared`、`pack/*`、`checks`、`vendor`、`contracts` 已严格。
2. `test-placement.test.mjs` 的矩阵补四条深度负例（run / cockpit lib / cockpit client / 合法对照）。
3. evaluation 行与 Note 的「未知深度 = 红」保持（修好后为真）。

## 修复判据

- 以上四条深度路径全部红（各命中「未知深度」类报因），合法样本（`good` 列表）仍绿；
- `tests/run/ops/deep/` 的实盘探针在 `test-placement` / `pack-mirror` / `test-owner-mirror` 三门都红；
- `gates.e2e` 增一条深度注入案例（或复用 `test-placement-unknown-subtree` 加深度变体）；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。深度负例住 `tests/checks/test-placement.test.mjs` 矩阵；
实盘探针在 `test-placement` 门禁 / `pack-mirror` / `test-owner-mirror` 三门均红（见 Note）。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/repo/test-placement.mjs",
    "tests/checks/test-placement.test.mjs",
    "tests/checks/pack-mirror.test.mjs",
    "tests/checks/test-owner-mirror.test.mjs",
    "scripts/lib/harness/gates-cases.mjs",
    "tests/checks/verify-gates.test.mjs",
    "scripts/verify/gates/f-repo.mjs",
    "docs/evaluation.md",
    "tests/INDEX.generated.md",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 1, "output": "not ok 1 - tests 落点全集 − 已知子集 = 空；深度恰好（BUG-191 / BUG-200；账本重生成不能吸收）；tests/run/ops/deep/zz-deep.spec.mjs: tests/run 未知深度（收到 5 段）" },
  "green": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/pack-mirror.test.mjs" }
}
```
