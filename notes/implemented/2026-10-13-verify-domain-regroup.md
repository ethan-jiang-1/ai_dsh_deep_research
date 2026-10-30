# verify.mjs 按域重排与 git spawn 收口

> 状态：implemented

> 历史注记（2026-10-30）：本页的“单文件聚合”决定已于 2026-10-27 被按域拆文件取代
> （`verify.mjs` 仅入口 + `gates/<域>.mjs` 六域 + `context.mjs`）；本页只作“当时为何不拆”的记录。
> 现行形态见 [scripts/AGENTS](../../scripts/AGENTS.md) 与
> [hygiene-round2](2026-10-27-hygiene-round2-feedback-truth.md)。

## 决定

`scripts/verify/verify.mjs`（L0 唯一聚合入口，合同见 [scripts/AGENTS](../../scripts/AGENTS.md)）保持
**单文件聚合**形态不变，内部改为**按域分组**：六条域横幅（A md 文档卫生 / B pack 驾驶舱 /
C notes 技能 / D vendor 对齐 / E 工作区生成物 / F 仓规环境）导航，门禁块与 `gates` 数组同序
（此前块序 = 加入时间序，编号 1,2,4,5,6…28,3b,11b… 无导航价值）。同时把五组完全相同参数的
重复 git spawn（ls-files 族 + submodule status）收口为顶部 `gitOnce(args)` 缓存助手——
**精确保形**：参数与选项原样（不注入 quotepath、不剥 env），返回原始结果对象，各门禁保留
自己的 fail-loud 判定与消息；需要特形 env 的 spawn（vendor-clean / hooks-active）不走该助手。
背景与动机 = 全仓代码体检（用户委托的结构评审）：verify.mjs 是最大且最高频改动的代码文件，
痛点为块序漂移与重复 spawn。

## 输掉的方案

- **拆 `scripts/verify/gates/<name>.mjs` 每门禁一模块 + 注册表**：拒绝——单文件聚合是写进
  scripts/AGENTS.md 的合同（"唯一 L0 聚合入口"），拆分要同 diff 动四处合同面（scripts/AGENTS、
  scripts/README 行、[writing-a-gate 技能](../../.agents/skills/writing-a-gate/SKILL.md) 的
  实现步骤、tests 对账面），而收益（新门禁 = 新文件而非追加块）在当前规模下不抵手术面；
  gates-smoke 拷贝全量 tracked 树、对拆分机械透明这一点不构成障碍，障碍是合同与流程 churn。
  **重启条件**：门禁继续增长、单文件追加块的编辑摩擦成为实测痛点时重估。
- **重排 gates 数组为域序但保持文件块时间序**：拒绝——数组与块两序不一致会造成"文件里找到
  的门禁在报告里不在附近"的二次混乱；两序同排才有一致导航。gate-ledger-sync 是集合比对
  （不序），登记表 docs/evaluation.md §L0 无需同动。
- **gitOnce 里顺带注入 quotepath=false / GIT_* 剥离**：拒绝——那是行为变化（改变特定 env
  语境与非 ASCII 路径下的输出形态），超出"只去重子进程不改语义"的保形边界；需要特形 env 的
  调用点维持自带 spawn。

与 [2026-10-07 runtime-scripts-layout](2026-10-07-runtime-scripts-layout.md)（scripts/ 六目录
分组）互链：本 Note 管聚合入口的**内部**组织，目录级合同仍归彼。

## 实际跑过的验证

- 变换脚本内置**逐门禁身份对账**（写盘前置闸）：每条门禁代码体剥头注、去尾白后，在
  「旧文本 + 五组 spawn 替换」归一化下与新文本逐字相等方可写盘；实测先在 doc-budgets 上
  咬住一处抽取误把域横幅计入段尾 → 修抽取逻辑后通过（对账器自身先红后绿的实录）。
- `pnpm verify` 重排前后全绿（门禁 PASS 集不变，仅报告行序随域序变化）；
- `pnpm test` 全绿（含 [tests/contracts/verify-gates.test.mjs](../../tests/contracts/verify-gates.test.mjs) 的
  案例 ↔ gates 数组静态对账——数组多行化后其正则解析仍咬合）；
- `node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入全 PASS + 全部注入案例点名报红），
  即门禁判据在重排 + spawn 收口后逐条仍会咬真实回归。

## 环境状态

Node 22.23.1（本仓钉版）；工作树起点 = 并发会话收口 BUG-025/026 后的全绿基线（verify /
test / gates-smoke / client-load-smoke / snapshot-replay-smoke 五链存档于会话实录）。
