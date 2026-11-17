---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-202：asset-ledger 的 claim 路径检查只认 `tests/…`——`scripts/…` 的失效路径照样固化

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — claim 路径按仓内根前缀闭集（scripts/docs/packages/…）+ 前缀计数可见（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — scripts 假路径红 / 真账绿）（2026-11-16）
>
> 位置：[tests/checks/asset-ledger.test.mjs](../../../tests/checks/asset-ledger.test.mjs) 的
> `uniqueClaim` 路径检查（BUG-198 的修复件）；生成器 =
> [scripts/lib/tools/asset-ledger.mjs](../../../scripts/lib/tools/asset-ledger.mjs) 的 `uniqueClaimOf`。

## 症状

把某个 spec 的首行注释改成指向不存在的 **`scripts/…`** 路径，重生成资产账后，新加的 claim 检查
**全绿**；只有 `tests/…` 前缀才会红：

```sh
# header 改成 // scripts/lib/__gone__.mjs —— probe ；重生成账本
node --import tsx/esm --test tests/checks/asset-ledger.test.mjs   # pass 5 / fail 0
# header 改成 // tests/run/gates/__gone__.spec.mjs ；重生成账本
node --import tsx/esm --test tests/checks/asset-ledger.test.mjs   # fail 1（claim 路径检查红）
```

`uniqueClaim` 是资产账的「唯一证明什么」字段，可引用任何仓内路径（源模块、脚本、文档）；
检查只覆盖 `tests/….(mjs|cjs)`，等于把 BUG-198 的类修做成了实例修。

## 分诊与授权

- 严重级：P2 — 生成物会继续固化不存在的路径（BUG-198 的同一后果），只是入口从 spec 头注换成
  任意 `scripts/…` 引用。
- 表面 / 边界：研发面（生成物）/ ② 行为（生成器 + 对账）
- DSH 不变量：fail-loud
- 触及面：文档合同（资产账生成物与 claim 文本）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（文档合同触面）」解除
- 批：第十一轮探索（199–208）；前序 = [BUG-198](BUG-198-spec-header-stale-path-frozen-into-ledger-claim.md)

## 复现

复现状态：稳定（临时改头注 + 重生成 + 还原；git status 复原后为 0）。

```sh
cp tests/run/gates/plan-card.spec.mjs /tmp/plan-card.bak
sed -i '' '1s#.*#// scripts/lib/__gone__.mjs —— probe#' tests/run/gates/plan-card.spec.mjs
node dev/record-asset-ledger.mjs
node --import tsx/esm --test tests/checks/asset-ledger.test.mjs     # 5/5 绿
sed -i '' '1s#.*#// tests/run/gates/__gone__.spec.mjs —— probe#' tests/run/gates/plan-card.spec.mjs
node dev/record-asset-ledger.mjs
node --import tsx/esm --test tests/checks/asset-ledger.test.mjs     # 1 红（负控）
cp /tmp/plan-card.bak tests/run/gates/plan-card.spec.mjs
git checkout -- tests/fixtures/asset-ledger/ledger.json
```

## 根因（已证）

检查器写死了前缀与扩展名：

```js
const TOKEN = /tests\/[A-Za-z0-9_./-]+\.(?:mjs|cjs)/g
```

`uniqueClaimOf` 取注释正文时不限前缀，因此 claim 可以引用 `scripts/`、`packages/`、`docs/` 等任何
仓内路径；检查器只对 `tests/` 生效。防空 `>= 10 条 claim` 也只统计 `tests/` 命中数。

根因证据：上面的红/绿对照；`TOKEN` 一行；`uniqueClaimOf` 取首行的实现。

## 牵出的失败类

- **M3 非 JS 字面量**（claim 文本也算路径消费者）+ C11 生成物固化错误事实；同机制第 2 次（198 是第 1 次）。
- 类修 = 「claim 里的仓内路径 token」统一按仓内根前缀识别（`tests|scripts|packages|docs|dev|probes`），
  而不是按这次碰巧坏掉的 `tests/` 前缀。

## 修法

1. `TOKEN` 改为仓内根前缀闭集：`(?:scripts|tests|packages|docs|dev|probes|snapshots)/…`，
   扩展名闭集保持（`.mjs|cjs|ts|tsx|md|json|yml` 按 claim 实际使用取舍）。
2. 防空语料改为「含仓内路径 token 的 claim ≥ 10」，同时报告各前缀计数（可见性）。
3. 修好后重跑生成器（声称无需重生成——claim 文本未变，只变校验面）。

## 修复判据

- `scripts/…` / `docs/…` 的不存在路径 → 红并点名；`tests/…` 仍红（负控保持）；
- 现有 ledger（7 条 tests/ claim + 若有的 scripts/ claim）全绿；
- `pnpm test` + `pnpm verify` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。claim 路径 token 按仓内根前缀闭集识别；前缀计数进防空报因。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/checks/asset-ledger.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/asset-ledger.test.mjs", "exit": 1, "output": "not ok 3 - uniqueClaim 里的仓内路径 token（tests/scripts/docs/…）必须存在（BUG-198 / BUG-202）；tests/checks/asset-ledger.test.mjs: uniqueClaim -> scripts/lib/__gone__.mjs（不存在）" },
  "green": { "command": "node --import tsx/esm --test tests/checks/asset-ledger.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/test-infra/asset-ledger.test.mjs" }
}
```
