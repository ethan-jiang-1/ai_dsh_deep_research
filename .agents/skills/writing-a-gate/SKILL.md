---
name: writing-a-gate
description: Use when adding, widening, or retiring a mechanical check in scripts/verify/verify.mjs — proving it fails on a real regression before it lands, registering it in the evaluation ledger, and choosing a scope that does not sweep runtime areas.
---

# 新增一条机械门禁

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/reviewing-a-delivery`](../reviewing-a-delivery/SKILL.md)。

门禁的价值只在"它会红"。一条永远为绿的脚本不是保护，是假安全感（DSH testing policy：
*A guard only guards if the regression fails it*）。所以顺序是：**先想红，再写绿**。

## 1. 先证明"值得机械化"

问：这条规则能不能由一个固定条件判真假？

- 能 → 门禁（`scripts/verify/verify.mjs`）或契约测试（`tests/`）；
- 不能（需要读语境、权衡设计）→ 写进 owner 文档或 Skill，别造一条会漂移的假门禁。

选择了门禁就用 `fail()` 报**失败对象 + 违反的规则 + 修正入口**——下一次行动由可读的
失败驱动，而不是从"检查失败"猜原因。

## 2. 定范围（最常错的一步）

**防空语料**：扫描型门禁必须对"扫到 0 个文件/范围被收窄"判红——静默变成空集的门禁等于不存在；
**边界形态要测**：每个被纳入与被排除的形态各留一条断言（含空格路径、symlink、忽略目录）。

- 覆盖面用 `git ls-files` 驱动 = **tracked-only**：运行区（`runtime/harness-home/`、
  `research-workspace/drt_*`）不进 L0，否则 pre-commit 会被 run 产物拦红（实测教训）；
- 扫描目录时跳过 `.git` / `node_modules`；稀疏态（文件不存在）用 `continue` 防御；
- 别把"运行区数据完整性"塞进 L0——那属于 run 内的 critic + 观察面谓词。

## 3. 写实现并登记（同一步，三处 + 自测两处）

1. `scripts/verify/verify.mjs`：加 `gates` 数组项 + 实现块（块注释写设计依据与实证出处）；
2. `docs/evaluation.md` §L0 门禁登记表：加一行（断言什么 + 反证记录），
   与 `gate-ledger-sync` 门禁对账——**两处不同步即红**；
3. 需要新契约断言时同步 `tests/`（keyless，零依赖）。

门禁逻辑有增删时另有两处随行：`scripts/lib/gates-cases.mjs` 的案例表 `CASES`（注入案例
增删同 diff）与 `tests/contracts/verify-gates.test.mjs`（案例 ↔ gates 数组静态对账）；改完必跑
`node scripts/smoke/gates-smoke.mjs`（[scripts/AGENTS.md](../../../scripts/AGENTS.md)）。

## 4. 反证（完成判据）

1. 注入真实回归（改文件内容，不是 `touch`——`touch` 只改 mtime，git 不红）；
2. 跑 `node scripts/verify/verify.mjs`，**看到该门禁红**；记下原始输出；
3. 还原，再跑到全绿；
4. 把这条红→绿实证写进登记表的"反证记录"列所指的 Note。

跨面改动按 guides/60 §2 补跑：pack 行 → L1；安装形状 → L2；模型可见面 → 真模型档。
