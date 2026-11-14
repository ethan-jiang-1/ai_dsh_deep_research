---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-162：scripts/smoke 的 registry/车道只扫顶层——嵌套 smoke 可以永不登记、永不运行

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — scripts/smoke 扁平断言；嵌套子目录红（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[tests/checks/smoke-registry.test.mjs](../../../tests/checks/smoke-registry.test.mjs) 与
> [smoke-oracle-surface.test.mjs](../../../tests/checks/smoke-oracle-surface.test.mjs) 的
> `readdirSync(SMOKE)`；消费 = [run-lane.mjs](../../../scripts/test/run-lane.mjs)。

## 症状

三个消费者都把 `scripts/smoke` 当**扁平目录**：

```js
const files = readdirSync(SMOKE).filter((f) => f.endsWith('.mjs')).sort()
```

`readdirSync` 只返回顶层项；`scripts/smoke/<dir>/<name>.e2e.mjs` 既不在 registry 对账集里，
也不会被 `pnpm test:e2e` / `test:entry` 选中。一个嵌套 smoke 可以存在而**永不登记、永不运行**，
`smoke-registry`、`smoke-oracle-surface`、`smoke-cost-budget` 全绿。

## 复现（2026-11-14 实测）

```sh
mkdir -p scripts/smoke/zz-probe-dir
printf 'process.exit(0)\n' > scripts/smoke/zz-probe-dir/zz-probe.e2e.mjs
node --test tests/checks/smoke-registry.test.mjs        # 2/2 PASS
node --test tests/checks/smoke-oracle-surface.test.mjs  # 1/1 PASS
node scripts/test/run-lane.mjs e2e --list | grep zz-probe  # 无输出
rm -rf scripts/smoke/zz-probe-dir
```

对照：顶层新增 `scripts/smoke/zz-probe.e2e.mjs` 会被 registry 立刻点名红（未登记）——差别只在嵌套。

## 根因（已证）

`readdirSync` 非递归，且没有「`scripts/smoke` 必须扁平」的结构断言；`smoke-registry` 的
「盘上每个 smoke 有且只有一条归属」只对顶层成立。目录层被当作噪声跳过，而不是红灯。

## 影响面

- 新 smoke 放进子目录（例如按族分组 `scripts/smoke/run/`）时永久不跑，没有任何门禁红。
- 与 [BUG-160](BUG-160-smoke-registry-mention-not-execution.md) 同族：资产账的**扫描面**
  窄于它声称的「盘上每个 smoke」。
- 当前所有 smoke 都平铺，属门禁钝化而非现行故障（P2）。

## 牵出的失败类

- **C2 消费者遗漏**（registry/lane/cost 三个消费者共享同一个窄枚举）+ **C7 假绿**。
- 同机制第 **3** 次（BUG-160 文本提及、BUG-161 job 名、本条目录深度）。类修：对「盘上资产」
  的空集/窄集要有显式断言（递归扫描或「禁止嵌套」红），不能只依赖调用点自觉。

## 修复判据

- 方案 A（推荐）：`smoke-registry` 递归 walk `scripts/smoke/**/*.mjs`，registry 键用相对路径；
  或方案 B：保持扁平，显式拒绝任何子目录（红：`scripts/smoke 下不得有子目录`）。
- 反证：创建 `scripts/smoke/zz-probe-dir/zz-probe.e2e.mjs` → 门禁必须红（未登记或禁止嵌套）；
  删除 → 绿。当前实测为绿 = 反例成立。
- 同一变更补 `smoke-oracle-surface` / `cost-budget` 的共享枚举（避免三处再漂移）。

## 修复关联

已修（2026-11-14）。触面 = 门禁/资产账，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`。

## 修复落地（2026-11-14）

- **改动**：`tests/checks/smoke-registry.test.mjs` 先枚举 `withFileTypes`，对 `scripts/smoke` 下的子目录判红；registry 文件集只取顶层普通文件。
- **证据**：`node --test tests/checks/smoke-registry.test.mjs` → 4/4 PASS。
- **反证**：`mkdir -p scripts/smoke/zz-probe-dir && ... zz.e2e.mjs` → 测试 1 红「脚本/smoke 下不得有子目录」；删除 → 绿。
