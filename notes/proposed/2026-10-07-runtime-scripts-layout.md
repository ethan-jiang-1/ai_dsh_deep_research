# 目录治理第二轮：运行态外移 runtime/ + scripts/ 分组

> 状态：proposed

## 问题

2026-10-07 驾驭者导览（用户逐站走查后三档全选拍板）实证：上轮治理（[2026-10-05](../implemented/2026-10-05-project-navigability.md)）选的"物理不拆、文档分组"对驾驭者不达标。两处结构性断线：

- `dev/` 同时住源码驱动（env/vendor-build/同步器/run 通道脚本）与 gitignored 运行区（harness-home/ 6000+ 文件、smoke-workspace/），`ls` 分不开"改的东西"和"跑出来的东西"；
- `scripts/` 21 个入口平铺，"命名即层"要内化后缀词汇表才生效，`ls` 不给分组信号。

## 方案

- **档 A（已落地，d4b01f6）**：README Start Here 增"跑一次研究"直达命令行。
- **档 B**：`dev/harness-home/` 与 `dev/smoke-workspace/` 外移根级 `runtime/`（gitignored 运行区，带 README）；`dev/` 回归纯源码驱动。env.sh、boot-run、hooks、冒烟/门禁/观察脚本、.npmrc、.gitignore 与现行合同文档同 diff 迁移；**历史 Note 冻结不改写**（见输掉的方案）。
- **档 C**：`scripts/` 按职责分组子目录（verify/ · smoke/ · probe/ · run-gates/ · run-ops/ · dist/，lib/ 不动）；命令正本（guides/60 §2）、closed set（smoke-contract）、layering、文档链接同 diff 迁移。

## 输掉的方案

- **维持 2026-10-05 "物理不拆"决定**：本轮重开的决定性证据 = 驾驭者本人三档全选拍板——"可操作性失败"成为上轮所无的第一手证据；上轮同轮修掉的 BUG-010/011/012 不因重开受影响。
- **同步改写 ~35 篇历史 Note 的路径提及**：伪造历史时态、成本 > 收益——Note 记录"当时的事实"；现行合同文档全部迁新路径，新旧差异由毕业 Note 说明。
- **runtime/ 内部再细分**（会话/凭据/产物分家）：两区生命周期（DSH home vs 冒烟产物）已足够定位，细分无消费方。
- **scripts/ 只加索引不改物理布局**：即上轮方案，驾驭者实证不达标，不再重复。

## 验收

1. `dev/` 下无 gitignored 运行区；`runtime/` 承接且 `ls` 可辨（根布局行同步）；
2. `pnpm verify` + `pnpm test` 全绿；
3. L1 真挂载 `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` ALL PASS（env.sh 新路径实跑）；
4. snapshot-replay 实跑绿（运行区新路径实跑）；L2 如实分列；
5. 现行合同文档（docs/ · 各 AGENTS.md · dev/ · scripts/ · tests/ · .agents/skills）`git grep` 零 `dev/harness-home` / `dev/smoke-workspace` 残留（notes/ 历史豁免）；
6. 档 C 后 `scripts/` 顶层只剩职责子目录 + README/AGENTS/doc-budgets.json；命令正本与 closed set 对账绿。

## 实施记录

- **档 B 迁移暴露既有卫生漏洞**：`dev/smoke-workspace` 下 16 个 npm 缓存件（`_cacache/_npx`）历史上已被 track 进库（gitignore 不作用于已跟踪文件——.gitignore 头注教训的本仓实例）；此前 pin-agreement 未咬是因门禁对盘上缺席的 tracked 文件 `existsSync → continue` 静默跳过，目录一移走文件在新位置被读出才现形。本次卸 track = gitignore 意图的兑现。**遗留待办**：pin-agreement 的软跳过应升 fail-loud（缺 tracked 文件即红）——走 writing-a-gate 流程另 diff，不在本条目混做。
- **档 C**：16 脚本 git mv 进六组（verify/smoke/probe/run-gates/run-ops/dist），lib/ 与 doc-budgets.json 不动，scripts/ 顶层只剩组目录 + README/AGENTS/doc-budgets.json。引用面八类全迁（脚本内部 import 与 ROOT 推导、package.json verify、tests 七件 import、smoke-contract closed set、dev/boot-run 与 hooks、合同文档、scripts/README 重写、notes 机械修链 7 文件）；映射外新发现三处消费面（research-workspace 手册与 NODES 的模型可见提法 → sync-pack-workspace 重同步种子、pack README/AGENTS、lead synthesis skill）。两处扫描面随分组适配且**加防空语料判红**（verify env 卫生扫描与 smoke-contract closed set 原本只 readdir 顶层，分组后会静默空转——零入口即红）；判据语义未动。**安装域 profile 携旧绝对路径**（迁移前 boot-run 写入的 cordis.patch.yml npm_config_cache 指向 dev/smoke-workspace，实测持续重生旧目录）：删除 profile 走 boot-run"缺席才补装"自愈，下次 run 重建。
