---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-196：test-surface 的「每个 lib 模块有直测」覆盖面不含 `.cjs`——新 `.cjs` 可零测试落地

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — lib 模块全集复用 `libModulesOf`（`.mjs`+`.cjs`）+ preload 登记 SMOKE_ONLY（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — `.cjs` 探针红绿）（2026-11-16）
>
> 位置：[tests/checks/test-surface.test.mjs](../../../tests/checks/test-surface.test.mjs) 的
> `libModules()` / `coveredByTests()`；同树既有 `.cjs` =
> [scripts/lib/harness/replay-network-offline.cjs](../../../scripts/lib/harness/replay-network-offline.cjs)、
> [scripts/lib/harness/replay-network-offline-policy.cjs](../../../scripts/lib/harness/replay-network-offline-policy.cjs)。

## 症状

新增一个没有任何测试 import 的 `.cjs` 模块，覆盖边界门禁**全绿**：

```sh
echo 'module.exports = {}' > scripts/lib/shared/zz-probe.cjs
node --import tsx/esm --test tests/checks/test-surface.test.mjs      # pass 2 / fail 0
# 负控：同样无测试的 .ts（pack 侧）→ 红
echo 'export const zz = 1' > packages/deep-research-pack/src/lib/run/zz-probe.ts
node --import tsx/esm --test tests/checks/test-surface.test.mjs      # fail 1：pack src/lib 未覆盖：run/zz-probe
```

即：`scripts/lib` 的 `.cjs` 家族（离线预载、离线策略）处在覆盖合同之外；新增同类文件不需要任何证据。

## 分诊与授权

- 严重级：P2 — 覆盖合同的范围缺口，不阻断运行；但该合同存在的目的正是「新增 lib 模块不写测试也不会
  有人知道」，而 `.cjs` 恰好是预载/策略这类高风险件。
- 表面 / 边界：研发面 / ② 行为（门禁自测）
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十轮搬家探索 M1/C2 —— 同批 BUG-191…198

## 复现

复现状态：稳定（上两条命令；探针文件已删）。

## 根因（已证）

- `libModules()`：`else if (ent.name.endsWith('.mjs'))` —— `.cjs` 不入全集；
- `coveredByTests()`：`!rel.endsWith('.mjs') → continue` —— `.cjs` 即便被测试 import 也不算覆盖；
- 于是 `.cjs` 既不进「未覆盖」清单，也不进 `SMOKE_ONLY` 登记表（键必须是盘上 `.mjs`）。
- 对照：[scripts/lib/tools/test-index.mjs](../../../scripts/lib/tools/test-index.mjs) 的 `libModulesOf()`
  收 `.mjs|cjs`，说明同仓对「lib 模块」的集合定义不一致。

根因证据：上两条命令 + 两处源码行 + `test-index` 的 `\.(mjs|cjs)$`。

## 牵出的失败类

- **M1 落点/范围补集**的孪生（范围按扩展名收窄）+ C2 消费者遗忘。
- 同机制第 1 次；类修 = 「lib 模块全集」只在 `libModulesOf` 一处定义，`test-surface` 复用它。

## 修法

1. `test-surface` 的 `libModules()` 改收 `.mjs` + `.cjs`；`coveredByTests()` 同步。
2. 两个既有 `.cjs` 的处置：`replay-network-offline-policy` 已有直测（
   `tests/run/harness/replay-network-offline.spec.mjs` 直接 import）；`replay-network-offline`
   是 preload，按现有形态登记 `SMOKE_ONLY`（理由：只能在子进程 preload 生效，keyless 直测无执行面），
   或补一条 `NODE_OPTIONS` 子进程测试。
3. 保持防空语料门（模块数下限）随扩展名更新。

## 修复判据

- 新增无测试 `.cjs` → 红并点名；删除 → 绿（与 `.ts` 负控同形）；
- 两个既有 `.cjs` 有明确归宿（直测或 `SMOKE_ONLY` + 理由），且 `SMOKE_ONLY` 存在性检查对 `.cjs` 生效；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。`.cjs` 全集复用 `libModulesOf`；preload 以 `SMOKE_ONLY` 登记，
policy 由 `tests/run/harness/replay-network-offline.spec.mjs` 直测。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/checks/test-surface.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/test-surface.test.mjs", "exit": 1, "output": "not ok 1 - 覆盖边界：每个 scripts/lib 模块有直测，或登记为 SMOKE_ONLY 并给出理由；未覆盖：… shared/zz-probe" },
  "green": { "command": "node --import tsx/esm --test tests/checks/test-surface.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/test-infra/test-surface.test.mjs" }
}
```
