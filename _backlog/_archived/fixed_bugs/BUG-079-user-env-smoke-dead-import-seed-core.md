---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-079：user-env-smoke 引用 D40 S3 已删除的 seed-core.mjs——启动即 ERR_MODULE_NOT_FOUND，README 仍宣称该关键面无覆盖

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 取方案 A（复活）：`sha256` 改本地 `node:crypto`，删除已删文件 `seed-core.mjs` 的死 import；真跑 `user-env-smoke` ALL PASS（已有 bundle + overlay + session/凭据/workspace 共存）（2026-11-12，去向：none — 冒烟修复，审查：agent 自审 + 真跑）。
>
> 位置：`scripts/smoke/user-env-smoke.mjs:10`（import）与
> `packages/deep-research-pack/scripts/lib/seed-core.mjs`（已被删除）。

## 症状

```
$ node scripts/smoke/user-env-smoke.mjs
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/Users/bowhead/ai_dsh_deep_research/packages/deep-research-pack/scripts/lib/seed-core.mjs'
  imported from /Users/bowhead/ai_dsh_deep_research/scripts/smoke/user-env-smoke.mjs
```

即：该冒烟**在 import 阶段就崩溃**（不是断言红，是根本没跑起来）。

## 根因（已证）

- `seed-core.mjs` 在 **D40 S3**（commit `33eea10b`，2026-11-01「delete launcher/scaffold … and their
  tests/smokes」）被删除；
- `user-env-smoke.mjs` 第 10 行仍 `import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'`；
- 该冒烟**未随同删除**，README 仍把它列为 keyless 关键面：
  `scripts/README.md:32`、`:55`（「已有用户环境（别的 bundle + overlay + session/凭据/workspace）」）；
- `smoke-contract` 测试只做成员/档位对账，不做「每个冒烟能启动」的解析检查，所以一直绿。

## 影响面

- 声称覆盖的「已有用户环境共存」面（别的 bundle + overlay + session/凭据/workspace + 安装/卸载）
  **自 11-01 起零覆盖**；README/项目地图仍把它当证据；
- 与 [BUG-077](BUG-077-protocol-audit-write-reference-error.md) 同类：**声称的检查没在跑**，但那条是门禁
  崩溃，这条是测试死链；
- 任何把「冒烟清单 = 覆盖清单」当真的读者都会被误导。

## 修复判据（二选一）

**A. 复活**（推荐，若该场景仍需要）
1. 用现有机制实现 `sha256`/seed 行为（`seed-core` 已并入别处？若没有，改用 `node:crypto` 本地 3 行，
   或复用 `scripts/lib/web-harness` 的 seed 物化）；
2. 先红后绿：修复前 `ERR_MODULE_NOT_FOUND` → 修复后冒烟能完成（真 dsh + tarball 前置可达时）；
3. 若依赖 `_dist` 旧包，注明前置与档位。

**B. 退役**（若 D40 已判定该场景不适用）
1. 删除 `scripts/smoke/user-env-smoke.mjs`；
2. 同步删除 `scripts/README.md` 的两处行（成员表 + 「谁消费 lib/env」列）；
3. 若 `tests/contracts/smoke-contract.test.mjs` 有成员清单，同步移除；
4. 在承接该场景的测试（如 `workspace-isolation-smoke` / `release-smoke`）的说明里写明覆盖边界。

无论哪条：
- 增加一条**冒烟可启动性**的机械检查（例如逐个 `node --check` 不够——import 解析失败要真 spawn 或
  静态解析 import 图；keyless 冒烟可统一 `--help`/dry-run 启动一次）；
- `pnpm test` + `pnpm verify` 绿。

## 修复关联

与 077（写盘崩溃）同属「测试/门禁声称在跑但实际没跑」；与 D40 S3 的删除清单相关。发现方式 =
探索协议 §E1（冒烟清单全量跑）——本轮跑 L2/隔离面时撞到。

## 已落地（2026-11-12）

- 证据 = `node scripts/smoke/user-env-smoke.mjs` 13/13 PASS（安装/卸载共存全绿）。
- 未做 = 「冒烟可启动性」的通用机械检查（卡内建议项，另案）。
- 去向 = none（冒烟死链修复）。
