# 目录治理第二轮：runtime/ 外移与 scripts/ 职责分组

> 状态：implemented

## 问题

2026-10-07 驾驭者导览（用户逐站走查 + 三档全选拍板）实证：上轮治理（[2026-10-05](2026-10-05-project-navigability.md)）的"物理不拆、文档分组"在驾驭者可操作性上不达标——`dev/` 源码驱动与 gitignored 运行区同住分不开"改的"和"跑出来的"；`scripts/` 21 入口平铺，`ls` 不给分组信号。

## 决定

- **runtime/ 运行态区**：`dev/harness-home/` 与 `dev/smoke-workspace/` 整体外移根级 `runtime/`（gitignored，README = [runtime/README.md](../../runtime/README.md)）；`dev/` 回归纯源码驱动；根 [AGENTS §布局](../../AGENTS.md) 增 runtime/ 行（预算 138→140 升顶登记于 doc-budgets.json）。
- **scripts/ 职责六组**：verify/（L0 聚合）· smoke/（七件分级冒烟）· probe/（三件探针）· run-gates/（run bundle 机械门与审计）· run-ops/（盯场与投影）· dist/（出包）；`lib/` 与 `doc-budgets.json` 留顶层；[scripts/README](../../scripts/README.md) 重写为分组职责索引。
- **README 驾驭者速查**：Start Here 增"跑一次研究"直达命令行（档 A，d4b01f6）。
- **历史 Note 冻结**：历史 Note 的路径提及不改写（伪造历史时态、成本>收益）——现行合同文档全迁新路径，新旧差异由本 Note 承载；唯一例外 = `md-links` 门禁实拦的链接目标机械修链。
- **安装域 profile 重建**：迁移前 boot-run 写入的 profile 嵌旧绝对路径（`cordis.patch.yml` 的 npm_config_cache 指向 dev/smoke-workspace，实测持续重生旧目录）→ 删除 profile，boot-run"缺席才补装"自愈。
- **门禁随迁适配 + 三处收口**：verify env 卫生扫描与 smoke-contract closed set 改逐组收集 + 零入口判红（防空语料——平铺假设会让两扫描面在分组后静默空转）；pin-agreement 对 tracked 文件缺席/不可读升 fail-loud（迁移实证：npm 缓存件误入库靠缺席静默跳过漏检到目录迁移才现形）；pin-agreement 的 `git ls-files` 加 `core.quotepath=false`（非 ASCII 路径默认转义输出致 existsSync 永远 miss，`_dist/安装手册.md` 实例）+ tracked 目录型 symlink 显式放行（`.claude/skills`，结构面归 claude-symlink 门禁）。

## 输掉的方案

- **维持 2026-10-05 "物理不拆"**：重开的决定性证据 = 驾驭者本人三档全选拍板——上轮所无的第一手证据；该轮修掉的 BUG-010/011/012 不受重开影响。
- **同步改写历史 Note 的路径提及**：见决定第四条。
- **runtime/ 内部再细分**：两区生命周期（DSH home vs 冒烟产物）已足够定位，细分无消费方。
- **scripts/ 只加索引不改物理布局**：即上轮方案，驾驭者实证不达标，不再重复。

## 验证

- `pnpm verify` 全绿 + `pnpm test` 234/234（2026-10-07，档 B/C 各自收尾与本侧复核多轮实跑）。
- L1 真挂载 `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：ALL PASS 四 preset（新 DSH_HOME 实跑；档 C 改动模型可见手册后复跑一轮仍绿）。
- snapshot-replay：ALL PASS 四场景 A 回放 + B 组装请求 diff + C 渲染金标准（新 home/新路径实跑两轮）。
- pin-agreement 缺席红证：README.md 暂移离盘 → `FAIL pin-agreement` → 还原绿。
- L2 安装冒烟未跑（npm 网络安装面）——如实分列；纯路径迁移不触发布集合同，profile 重建由下次 run 的 boot-run 补装验证。
- entry-chain-probe（真模型档）：ALL PASS——Q1 命中新 ▶ 条目「ls-files 门禁族覆盖盲区清扫」、Q2 入口链步骤、Q4 guides/60；留档 `runtime/smoke-workspace/entry-chain-probe-2026-10-07T04-49-03-020Z.md` 供人工复核（Q3 软断言对"无下一条目"的复述欠准，人工复核位）。探针真值抽取顺带实证：**队列行必须带数字编号**（`1. ▶ …`）——无编号行对探针 groundTruth / parked 判定等机械消费方不可见，已同 diff 修正。

## 环境状态

- `scripts/` 顶层 = 六组 + README/AGENTS/doc-budgets.json；`runtime/` 在场（harness-home + smoke-workspace）；`dev/` 盘面纯源码驱动。
- 安装域 research profile 已删：下次 `bash dev/boot-run.sh` 自动补装（首次 boot 走 npm 安装）。
- 观察登记（未在本条目修）：其余 `git ls-files` 消费门禁（count-free / doc-now-only 等）沿用默认 quotepath 与静默跳过形态，同类非 ASCII 路径与缺席盲区可能在场——已立条目收口（[lsfiles Note](2026-10-07-lsfiles-gate-coverage-sweep.md)）。
