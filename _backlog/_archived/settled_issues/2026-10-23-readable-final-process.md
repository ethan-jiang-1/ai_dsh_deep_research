---
status: 已结
opened: 2026-10-23
---

# 推敲：可读终稿没有流程位（阶段 / owner / 合同 / 验收）

> 立卡：2026-10-23 ｜ 状态：已结（2026-10-24） ｜ 类型：Task ｜ 结论倾向：现在做（已落地） ｜ 可关闭：是


## 结案（2026-10-24）

- **结论**：可读终稿层已落地——`reader-final` skill + `final/readable.md → final/readable-vN.md` +
  node-gate 门C + 回执 reader 哈希 + 终稿页签双视图；不新增 phase/角色。
- **验收**：真实 run `drt_cn-open-vs-us-closed-agentic` 产出 reader 并完成 present；门C PASS；
  `run-accept` 写 reader 哈希/角色；`pnpm verify` 全绿、`pnpm test` 769 通过、`preset-smoke`
  四角色挂载、`client-load-smoke` 读者版默认/切换 PASS。
- **可读性**：用户 2026-10-24 选择 A「收口归档」；ops 按 5 分钟三问复核（结论 / 为什么 /
  什么会改变结论）均可在 reader 内直接答出，未逐题记录用户原话。
- **去向**：[Note](../../../notes/implemented/2026-10-23-reader-final.md) · [D29](../../../docs/decisions.md) ·
  [研究材料](../../research/reader-final/2026-10-23-reader-final-design.md) 留活跃索引
  （消费者改为本已结卡 + Note/D29）。

## 审阅上下文（先看这一节）

- **触发**：可读终稿现在不是一个显性的 run 阶段：`final.md` 完成后直接进 review → HITL2 →
  delivery，没有“把它变成人读版本”的步骤、owner、合同和验收。临时写一份也无法保证下一次出现。
- **现状证据（2026-10-23 复核）**：`NODES.md` 的节点输出只有 `final.md` / `final/vN`；
  [guides/61](../../../docs/guides/61-run-playbook.md) 的交付路径是 review PASS → HITL2 →
  `run-accept`；`node-gate` 门②/④/门A 不检查 reader-facing 产物；`ResearchFinalTab` 只承接
  `final.md` 地址并按 `final/vN` 读正文；`schema-scan` 的新 run 顶层白名单会拦 run 根的
  `readable-final.md`。逐条代码位置与复算 = [研究材料 §2](../../research/reader-final/2026-10-23-reader-final-design.md)。
- **机制约束（逐条核验后的结论）**：
  1. **落点**：`final/` 内新增 `.md` 不触发 D28 顶层白名单；run 根新增 `readable-final.md`
     会核心违约。选 `final/`，不改白名单（`scripts/lib/schema-scan-core.mjs:90-136`）。
  2. **门禁**：门②（present）、门④（版本账）、门A（交付完整性）都没有 reader 对象；
     需要一个独立可机械判的读者版合同门（本卡定名 **门C**），不把读者版塞进门A 的语义里。
  3. **回执**：`run-receipt` 的 manifest 已列 `final/vN.md`（role `version-ledger`），但没有
     reader 角色；`delivered.json` 只记 final/audit 哈希。读者版随交付走 → 两处都要绑定
     `final/readable-vN.md` 的角色与哈希（`scripts/lib/run-receipt.mjs:13-42`、`:97-173`）。
  4. **观察面**：「终稿」页签的**地址认领**只认 `drt_*/final.md`；页签体默认读最高 `final/vN`。
     若 present 只点名 reader 与 vN，自动打开监听不会触发；必须把页签扩成「终稿地址族」并让
     默认视图优先读者版（`final-target.ts:70-205`、`client/index.ts:131-146`）。
  5. **交付**：`present` 原生支持多文件（1–`maxFiles`，默认 8；推荐 1–2 个主交付）；交付顺序
     定为 reader 第一、canonical 第二，用户先看到人话，审计源随时可切。
  6. **不新增 phase / 角色**：`run.md` phase 闭集不扩；reader 是 `review` 后、HITL2 前的
     Lead 显性步骤，不是第七个 phase，也不新增 editor/ops 角色（D2 四角色不变）。
  7. **旧场**：旧 bundle 无 `run.md` → 门C N/A、页签回退 canonical；新 run 才要求，缺失可见。
     quick_factual 沿用既有编制豁免语义，门C N/A。
- **不在本卡范围**：改研究结论、重做证据、把 reader 做成第二份事实、替换 `final/vN`、
  给旧场补 reader、改变两点交互纪律。

**问题与期望结果：** 可读终稿缺少显性流程位：没有阶段、owner、合同、验收。期望它成为 run 的
一个显性步骤，像 `final/vN` 一样可预期；缺失时可见，而不是靠 lead 临场发挥。

**当前情况：** 上面 7 条机制约束已逐条核验；内容面的受众与结构问题见
[可读终稿缺面向人的可读层](2026-10-23-run-final-human-readable.md)。读者版样张 =
[cn-us v2 样张](../../research/reader-final/2026-10-23-sample-readable-cn-us-hardware.md)（原型，
不是交付物）。

## 结论（建议：现在做）

采用 **A. 独立派生文件**：canonical 不动，新增读者版工作件与交付件；Lead 在 review 终局 PASS 后、
HITL2 前派生；交付时与 `final/vN.md` 同版复制并一起 present；机械门 + 回执 + 页签双视图把
「读者版不是第二份事实」变成可检查的结构。

| 项 | 决定 |
|---|---|
| 阶段 | `review` 终局 PASS 后、HITL2 之前（不新增 phase） |
| owner | Lead（新 `reader-final` skill）；D2 四角色不变 |
| 工作件 | `final/readable.md`（HITL2 前；未交付，不能先落 `vN`） |
| 交付件 | `final/readable-vN.md`（与 `final/vN.md` 同版、不可变） |
| canonical | `final.md` / `final/vN.md`（审计、critic、receipt 仍以它为准） |
| 机械门 | **门C**：同版副本 + 六节结构 + 长度 + 无 `[来源:]`/`evidence/` 路径 + 数字 WARN |
| 观察面 | 「终稿」页签默认读者版，`看审计版` / `看读者版` 切换 |
| 回执 | manifest 记 `reader-final` 角色与哈希；`delivered.json` 记 reader 哈希 |
| 豁免 | 旧场（无 `run.md`）N/A；quick_factual N/A；pre-contract 不追溯 |

### 执行者合同（Lead 视角，逐字可执行）

1. **触发**：critic 的 `review.md` 终局块 `readiness: PASS` 后，加载 `reader-final` skill；
   PASS 前不写读者版（canonical 还会改）。
2. **输入**：当前 `final.md`（canonical 当前版）、`question.md` 的 Purpose/业务决策简报、
   `findings.md`、`review.md` 终局块；不新增搜索、不新增证据。
3. **输出工作件**：`final/readable.md`，按六节结构写（见
   [研究材料 §5](../../research/reader-final/2026-10-23-reader-final-design.md)）。
4. **自检**：5 分钟三问（结论/为什么/什么会改变结论）、数字逐字回查 canonical、反证与
   「目前不能判断」未删、无 `[来源:]`/`evidence/`、canonical 链接可解析。
5. **HITL2**：审阅摘要写明「读者版在终稿页签；审计源 = `final.md`」；不新增 ask 点。
6. **用户定稿后**：先把 `final.md` 忠实复制为 `final/vN.md`（既有步骤），再把
   `final/readable.md` 复制为 `final/readable-vN.md`；然后
   `present([final/readable-vN.md（读者版）, final/vN.md（审计源）])`；最后 `update_goal complete`。
7. **用户选补研究/改说法**：按既有 D17 语义处理；`readable.md` 是工作件，不复制为 vN；
   下一版 review PASS 后重写。
8. **异常**：canonical 缺明确结论时，读者版必须写「目前不能判断」及原因，不硬给建议；
   reader 与 canonical 不一致时，以 canonical 为准并重派生。

### DSH 载体（不发明机制）

| 需求 | 载体 | 不新增 |
|---|---|---|
| Lead 知道何时写、怎么写、怎么自检 | 新 skill `presets/lead/skills/reader-final/SKILL.md` | 新工具 / 新角色 |
| 跨角色与恢复仍知道这是交付件 | `research-workspace/AGENTS.md`（注入）+ `NODES.md` | 新状态文件 |
| 用户看到人话 | 现有「终稿」页签默认读者版 + 切换 | 新页签 / 新交互点 |
| 交付两份 | `present` 的 `files[]` | 新交付系统 |
| 机械验收 | `node-gate` 门C + `run-receipt` | 新验收队列 |
| 可读性判断 | HITL2 用户读 | 模型替人打分 |

## 方案与取舍

- **A. 独立派生文件（选）**：`final.md` 保持 canonical；`final/readable.md` →
  `final/readable-vN.md`，附录/链接回 canonical。审计面零改动；`final/` 已合法；可机械绑定与
  双视图。代价 = 两份可能漂移，用门C + 数字 WARN + HITL2 对照处置。
- **B. 把 `final/vN` 改成 reader-first**：交付副本先写人话，引用/版本进附录。会削弱 canonical
  角色，牵动 critic/gate/receipt/页签；不做。
- **C. 只改 `final.md` 的写法**：把正文写浅，审计信息被压缩，critic 无法复核；不做。
- **D. 只做读者探针，不设产物**：探针不是交付件，无法 present/复用/审计；不做。
- 完整取舍账与风险反证 = [研究材料 §3/§10](../../research/reader-final/2026-10-23-reader-final-design.md)。

## 已知与未决

- 已知：`final/` 是安全落点；`latestRunVersion` 只认 `vN.md`，`readable-vN.md` 不会污染版本账；
  `present` 支持多文件；门②/④/A 当前都没有 reader 对象；旧场样本无 `run.md`。
- 已知：HITL2 的 composition 确认（读者是谁/用来做什么/前景化重点）发生在成稿之后；读者版的
  受众输入改从 `question.md` 的 Purpose 与 HITL1 业务决策简报读，HITL2 只做确认，不靠临场追问。
- 未决（用户面，不阻塞实施）：受众是领域决策者还是完全外行；长度是 1–3 页还是「一页纸」。
  本卡按「领域决策者 + 1–3 页」先行；样张供纠偏。
- 未决（技术面，实施时定）：门C 的 `READABLE_CONTRACT_DATE` 具体日期；页签地址族的具体
  pattern 与 `canOpen` 收窄形态；manifest 是否同时给 reader 一个独立顶层摘要行。

## 验收标准

| # | 行为 | 类 | 输入/状态 | 通过信号 | 反例/恢复 | 证据 owner | 人工判断 |
|---|---|---|---|---|---|---|---|
| 1 | `final/` 放 reader 不触发 schema-scan；run 根放 reader 违约 | 确定性 | 新契约 fixture：`final/readable-v1.md` vs `readable-final.md` | `final/` 版无核心违约；run 根版报「未登记顶层条目」 | 两条 fixture 都跑；根版必须红 | `tests/run/schema-scan.test.mjs` + `node scripts/run-gates/schema-scan.mjs <fixture>` | 无 |
| 2 | 门C 同版/结构/长度/来源面可机械判 | 确定性 | 新契约 + `final/v1.md` + reader | 合法 reader → 门C PASS；缺 reader/版本错/缺节/超长/`[来源:]`/`evidence/` → RED | 每个失败形态一条 fixture；quick_factual/旧场 → N/A；pre-contract → PRE-CONTRACT | 新 `tests/run/node-gate-reader.test.mjs` + `node scripts/run-gates/node-gate.mjs <fixture>` | 无 |
| 3 | 回执绑定 reader 角色与哈希 | 确定性 | `run-accept` 写 manifest/delivered | manifest 有 `reader-final`；delivered 有 reader 哈希；篡改 reader → 红 | 旧回执无 reader 字段不误红；新回执缺 reader 哈希 → 由门C/测试判 | `tests/run/run-receipt.test.mjs` + `run-accept` 真 bundle | 无 |
| 4 | 终稿页签默认读者版、可切审计版 | 确定性 + 浏览器 | 有 reader 的交付 bundle / 无 reader 的旧 bundle | 有 reader 默认 reader，切换在场；无 reader 回退 canonical | 旧 bundle 不误红；负例不泄漏 `question/topics/evidence/drafts` 路径 | `tests/run/final-target.test.mjs` + `scripts/smoke/client-load-smoke.mjs` pass-5 | 视觉/可读性 |
| 5 | Lead 技能、persona、手册、NODES 同步 | 编排 | preset 源 + workspace 种子 | skill 被 `skill-filesystem` 发现；persona/手册/NODES 有 reader 步骤；seed 同步 | `preset-structure`/`preset-smoke` 红则缺挂载；`pack-workspace-fresh` 红则种子漂移 | `tests/pack/presets.test.mjs` + `preset-smoke`（keyless）+ `pnpm verify` | 无 |
| 6 | 真实 run 产出 reader 并完成交付 | 模型 + 编排 | 新开一场非 quick_factual run | review PASS 后出现 `final/readable.md`；定稿后出现 `final/readable-vN.md`；present 两份；门C 绿；`run-accept` 写回执 | 若 reader 未出现/超长/带来源 → 门C 红，Lead 重派生；不静默交付 | L4 真 run + `node-gate` + `run-accept` + bundle 证据 | 用户读 5 分钟三问 |
| 7 | 旧场不回溯、quick_factual 豁免、缺失可见 | 确定性 | 旧样本 `drt_cn-us-ai-models-hardware`（无 `run.md`）；quick_factual fixture | 门C N/A；页签回退 canonical；detail 明示豁免原因 | 不补文件、不改旧 bundle；若被要求回填 = 新卡 | `node-gate` 对旧样本 + quick_factual fixture | 无 |
| 8 | HITL2 不新增交互点 | 编排 | run 的 ask 事件 | 仍只有 HITL1 + HITL2；读者版在既有终稿页签 | 多一次 ask = 违两点交互纪律 | 手册/persona 文本 + `preset` 测试 + 真 run 事件 | 无 |

**门C 的“数字子集”只 WARN（不红）**：中文排版/区间写法会产生假红；`RED` 只保留结构、同版、
来源面可机械判的事实；“不新增事实”的语义判断归 Lead 自检 + HITL2 用户 + critic canonical 审查。

### 验收现状（2026-10-23）

| # | 现状 | 证据 |
|---|---|---|
| 1 | 通过 | `tests/run/schema-scan.test.mjs` 的 `final/readable-v1.md` 合法 / run 根违约两例 |
| 2 | 通过 | `tests/run/node-gate-reader.test.mjs` 11 例；真实 run 门C PASS |
| 3 | 通过 | `tests/run/run-receipt.test.mjs`；真实 `delivered.json` / `manifest.json` 的 reader 哈希与角色 |
| 4 | 通过 | `tests/run/final-target.test.mjs` 16 例；`client-load-smoke` 真浏览器读者版默认/切换 |
| 5 | 通过 | `tests/pack/presets.test.mjs`；`preset-smoke` 4 preset 真挂载；`pnpm verify` |
| 6 | 通过 | 真实 run 的 reader/present/门C/run-accept 已绿；用户选择 A（收口）；ops 三问复核 |
| 7 | 通过 | `drt_cn-us-ai-models-hardware` 旧场门C N/A；reader 测试的 quick_factual N/A / pre-contract 例 |
| 8 | 通过 | 真实 run 只有 HITL1（含计划确认）+ HITL2 两个交互点；3 次 ask 都在两点内 |

## 需要你确认（只剩可读性）

技术决定（阶段/owner/落点/门C/页签/回执）已按本卡落地；受众/长度归
[可读层卡](2026-10-23-run-final-human-readable.md) §需要你拍板，不在这里重复。

本卡只剩一项：读真实 reader 的 5 分钟三问（结论 / 为什么 / 什么会改变结论）。

- 认可 → 两张卡一起归档（`git mv` 到 settled_issues，状态行记去向）。
- 要改 → 指哪一节/哪段；回改 `reader-final` skill 与门C 上限后重派生。

## 执行计划（落地顺序，按依赖排序）

> 本计划已于 2026-10-23 执行完毕（P0–P5）；下面是执行记录，不是待办。
> 每一步的完成判据 = 该步证据绿且不破坏前一步；红先绿后只用于新门禁。

**P0. 合同冻结与样张（本卡 + 研究材料）**
- 事实核验、A/B/C/D 取舍、读者合同、门C 判据、页签/回执设计、样张。
- 判据：两张卡与研究材料链接可解析；样张是原型、不改 canonical。

**P1. 模型可见合同（先定“写什么”，再写机制）**
1. 新增 `packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md`（六节结构、自检、
   交付复制、失败处理）。
2. 改 `lead.patch.yml` persona：review PASS 后加载 skill；定稿后复制 + present 两份。
3. `synthesis` skill 末尾加一行指针（不重复合同）。
4. 改 `research-workspace/AGENTS.md`：`final/readable.md`/`readable-vN.md` 的 owner、交付链、
   完成判据；同步 `packages/deep-research-pack/workspace/AGENTS.md`（`dev/sync-pack-workspace.mjs`）。
5. 改 `NODES.md`：node 7/8 输入输出 + 「读者版 = 显性步骤，不是新节点/phase」注 + 门C 图例。
6. 改 `docs/guides/61` §4：HITL2 前写/看 reader，定稿后复制并 present 两份。
7. 改 `docs/design/40`（终稿页签双视图）、`docs/design/50`（交付判定链加 reader）、
   `packages/deep-research-pack/README.md`（当前行为/产物）。
- 证据：`pnpm verify`（`doc-budgets`/`handbook-budget`/`pack-workspace-fresh`/`overlay-fresh`）、
  `pnpm test`、`preset-smoke`（skill 挂载）；手册 ≤200 行或按处置序登记升顶。

**P2. 机械合同（红先绿后）**
1. 新 `scripts/lib/node-gate-reader-gate.mjs`（纯函数）+ `node-gate-core` 聚合 + CLI 报告行。
2. 新 `tests/run/node-gate-reader.test.mjs`：合法 PASS；缺件/错版本/缺节/超长/来源路径/旧场/
  quick_factual/pre-contract/数字 WARN。
3. `run-receipt`：manifest 加 `reader-final` 角色；`delivered.json` 加 reader 哈希；
  `receiptProblems` 校验；`tests/run/run-receipt.test.mjs` 增补。
4. `schema-scan`：加 `final/readable-v1.md` 合法 + run 根 `readable-final.md` 违约两条 fixture。
5. `NODES.md` 门图例、`docs/guides/61`/`evaluation` 的 run-gate 证据行同步。
- 证据：`node --test tests/run/node-gate-reader.test.mjs`（先看红）、`pnpm test`、`pnpm verify`、
  `node-gate <fixture>` 的 PASS/RED 两态。

**P3. 产品面（页签默认读者版）**
1. `final-target.ts`：地址族（`final.md` / `final/vN.md` / `final/readable.md` /
   `final/readable-vN.md`）、读面定表、`latestFinalDelivery` 优先 reader、
   `latestPresentedFinalVersion` 兼容 reader 版本。
2. `ResearchFinalTab.tsx`：默认 reader、`看审计版`/`看读者版` 切换、静音条三态、轮询目标。
3. `client/index.ts`：extension patterns 扩族，`canOpen` 收窄到 `drt_*` + 三位置。
4. `client-load-smoke` pass-5：有 reader 默认 reader、切换在场；无 reader 回退 canonical；
   负例不泄漏过程路径。
- 证据：`tests/run/final-target.test.mjs`、客户端构建、`client-load-smoke`（旧 bundle 回退；
  真实 reader 待 P4）。

**P4. 端到端真实 run（用户可读性探针）**
1. `node dev/run-driver.mjs up`（已起则用当前 URL）；新开非 quick_factual run。
2. HITL1 两段卡、HITL2；从 review PASS 到 `final/readable.md`，定稿后 `final/readable-vN.md`
   + present 两份。
3. `node-gate`（门C 绿）+ `run-accept`（写回执）；`client-load-smoke` 对这场的新会话。
4. 用户读真实 reader，5 分钟三问；未答前记为 `human judgment pending`，不冒充验收。
- 证据：run bundle、`node-gate.md`、`delivered.json`/`manifest.json`、client smoke 报告、
  用户反馈。

**P5. 收口**
1. 持久决定理由写 `notes/implemented/`（为什么独立文件、为什么不是 phase/角色、门C 的
   WARN/epoch/UI 取舍）；必要时登记 D 号（D28 交付链的扩展）。
2. 更新 `docs/evaluation.md` 的验收台账（若新增证据行）、卡内证据与状态。
3. 两张卡：验收满足后 `git mv` 到 `_archived/settled_issues/`，状态行记结论与去向；
   可读性人工判断未答则保留活跃并明示缺口。
4. `pnpm verify` + `pnpm test` + `git status` 终检；无生成物漂移。

**顺序理由**：先冻结“写什么”（P1），门C/回执才不会把不稳定合同编码成假牙齿；先有门C 再跑
真实 run（P4），否则端到端只是演示；先有页签双视图再让用户读，否则用户仍只能读 canonical；
P5 最后写 Note/D 号，避免用文档追认一个尚未验证的实现。

## 关闭条件

- P1–P4 的验收矩阵全绿，且一场真实 run 产出 `final/readable-vN.md`、present 两份、门C 绿、
  `run-accept` 回执在场；用户对真实 reader 的 5 分钟三问通过（或明确接受当前可读性）。
- 或用户拍板选择 B/C/D 或并入已有合同：关闭时记去向与未做事项；不伪造实现计划。

## 落地记录（2026-10-23）

- **P1–P3 已进树**：`reader-final` skill + lead persona/synthesis + 手册/NODES/guides/design/README；
  node-gate 门C + run-receipt manifest/delivered reader 绑定 + schema-scan 落点 + 终稿页签地址族/双视图；
  `pnpm verify` 全绿、`pnpm test` 769 通过。
- **P4 真实 run**：`research-workspace/drt_cn-open-vs-us-closed-agentic`（claim_verification，非
  quick_factual）在 2026-10-23 交付：`final/readable.md` → `final/readable-v1.md`；present 两份；
  node-gate 门①③②L④R A C 全 PASS（门④ N/A：仅 v1）；`run-accept` 写
  `delivered.json`（`readable.path=final/readable-v1.md` + sha256）/`manifest.json`
  （role `reader-final`）/`acceptance.md`（读者版行）。
- **观察面**：`client-load-smoke` 在已交付 bundle 上验证「默认读者版 → 看审计版切换 →
  静音条 = 读者版 · v1」全 PASS；旧 bundle 无 reader 时回退审计版同轮通过。
- **真实 run 抓出并修复**：`runType` 否定引用误判 quick_factual；门③把 `final/readable.md`
  当版本记账；`leadsGate` 同一误判（并暴露 T3 覆盖缺口）；timed ask 的答复落在 `tool/result`
  而非 `user-question-reply`；reader 相对链接解析基准。各带回归/门C 检查。
- **P5**：Note = [2026-10-23-reader-final](../../../notes/implemented/2026-10-23-reader-final.md)；
  D29 已登记。
- **仍缺**：用户本人对真实 reader 的 5 分钟三问（结论 / 为什么 / 什么会改变结论）与可读性认可；
  在答前不把人工判断标成已验收。
