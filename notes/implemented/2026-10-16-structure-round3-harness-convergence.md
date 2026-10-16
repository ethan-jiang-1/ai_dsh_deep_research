# 第三轮结构收敛（round3）：web harness 单一正本 + 小件收口

> 状态：implemented

## 决定

2026-10-16 用户委托的全仓结构评审（结构 / 臃肿 / SOLID 三问）收敛为一张计划卡
（[2026-10-16-structure-round3-convergence](../../_backlog/issues/2026-10-16-structure-round3-convergence.md)；
取代检查已对齐前两轮裁决——[repo-structure-refactor](2026-10-13-repo-structure-refactor.md)（输掉的方案：
`clientHistoryWindowOf` 下沉、`readLog` 换 canonical、内闭包 rpc 硬收敛）与
[verify-domain-regroup](2026-10-13-verify-domain-regroup.md)（`verify.mjs` 拆分重启条件））。
三点已拍板：① Phase B 做 B1+B2 全量、真模型档五站点逐件复跑取证；② `verify.mjs` 不拆（重议条件登记
[triggers](../../_backlog/triggers.md)）；③ hitl-answer 长函数本轮不动。执行纪律 = 每阶段独立 diff →
验收判据全绿 → 报告（实际跑过 / 未跑分列）→ 用户确认 → 才进下一阶段。

**Phase A（本 Note 记录的已交付部分）**：两处**逐字重复**收敛为中立小件，**参数保形、零行为变化**：

1. **`scripts/lib/frontmatter.mjs`**（新）= `splitFrontmatter` 唯一正本。run-dashboard-core 与
   evidence-audit-core 曾各持一份**逐字相同**的实现；evidence-audit 侧当年"独立副本——audit 不依赖
   dashboard 的副作用面"的理由，在两核都纯化为 lib 纯件之后已经失效——中立第三方模块比任一消费方更小。
   契约逐字搬运（按首个 `---` 块拆、扁平 `key: value`、无围栏返回 `fm: null`），不是改写。
2. **`scripts/lib/zstd-read.mjs`**（新）= `readZstdText`，两壳逐字相同的
   `spawnSync('zstd', ['-dc', p], { maxBuffer: 64MB })` 段。**只收敛调用段，不收敛失败契约**：
   node-gate 解压失败按空语料继续（`''`）、evidence-audit 返回 `null` 跳过该文件——这是两壳各自判据的
   载重墙（"缺失偏红" vs "半份语料不得当全份"），失败语义与 stderr 线索留在消费方。

## 输掉的方案

- **evidence-audit 侧保留独立副本**（"不依赖 dashboard 副作用面"）：理由在两核纯化后失效——
  共享件是 `lib/` 里的纯函数，不含任何一方的副作用面；保留副本 = 让逐字重复继续漂移。
- **`readLog` 整体换 canonical `session-log`**：解压通路（zstd CLI 多帧拼接 vs node zlib）与失败契约
  双差异 = 行为变化，超出本轮"零行为"边界（前轮结构评审已裁过，本卡不重开）。
- **把两壳的失败契约也统一**：`''` 与 `null` 各自承载判据语义（继续算 vs 跳过文件），统一即行为变化。
- **`verify.mjs` 文件级拆分 / 域级拆分**：既有裁决维持，重议条件（门禁继续增长 / 追加块编辑摩擦成
  实测痛点）登记进 triggers。
- **内闭包形态 rpc 硬收敛**（cdp-ask / snapshot-replay / run-kickoff）：形态差异非逐字重复，
  与前轮"测试须知模态两处刻意不收敛"同原则。

## 实际跑过的验证

Phase A 验收判据（计划卡 §验收标准 A-1…A-5）逐条：

| # | 判据 | 结果 |
|---|---|---|
| A-1 | `pnpm test` 全绿 | ✓ 468/468（run-dashboard / evidence-audit / node-gate 的 1:1 测试即反证记录） |
| A-2 | `pnpm verify` 全绿 | ✓ 全门禁绿（含 navigability 对账 `scripts/README.md` lib 表两新行） |
| A-3 | 仪表盘零行为 | ✓ `run-dashboard` 对同一 bundle：exit 0 + stdout + HTML **逐字一致**（时间戳归一后） |
| A-4 | node-gate 零行为 | ✓ exit 0 + stdout + `node-gate.md` **逐字一致** |
| A-5 | 审计零行为 | ✓ 内容场 exit 0 逐字一致；红样本（零证据 bundle）维持 **exit 1 + CRITICAL 1**，`audit.md` 逐字一致 |

**零行为比对的做法**（可复跑）：把 Phase A 五个改动 `git stash` 回退到改前态 → 用同一脚本跑三壳并留档
（显式 bundle 路径，避免 `--latest` 随 mtime 漂移）→ `git stash pop` 还原 → 复跑 → 逐文件 diff
（时间戳归一）；stdout / 报告件 / HTML / exit code 全部一致。

**第一次基线的教训（如实记）**：首版基线在 `--latest` 上取，而当日未归档 bundle 被处置移走后
`--latest` 解析目标漂移；且报告件在两次运行之间被重写，导致 node-gate 读数变化——该差异来自
基线顺序而非重构。改用显式路径 + stash A/B 后差异归零。

## 环境状态

- 只动 `scripts/`（两 core 改 import、两壳改调用、README lib 表两行、两个新 lib 件）；无门禁逻辑改动、
  无 pack 行为改动、无凭据面；Phase A 全程 keyless。
- 未跑：Phase B1（web-harness 单一正本 + keyless 三站点）与 B2（真模型档五站点）、Phase D（触发登记）
  ——按计划等用户逐阶段发令；B2 与主线真模型段排开跑。
