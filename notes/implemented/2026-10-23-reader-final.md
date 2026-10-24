# 读者版终稿层（reader-final，已落地）

> 状态：implemented
>
> 首提 2026-10-23 ｜ 决定 [D29](../../docs/decisions.md) ｜
> 流程位 [NODES §读者版步骤](../../research-workspace/NODES.md) +
> [guides/61 §4](../../docs/guides/61-run-playbook.md) ｜
> 模型面 [reader-final skill](../../packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md) ｜
> 机械面 [node-gate-reader-gate.mjs](../../scripts/lib/node-gate-reader-gate.mjs) +
> [run-receipt.mjs](../../scripts/lib/run-receipt.mjs) ｜
> 观察面 [ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) +
> [final-target.ts](../../packages/deep-research-pack/src/lib/final-target.ts) ｜
> 卡 [流程位](../../_backlog/_archived/settled_issues/2026-10-23-readable-final-process.md) +
> [可读层](../../_backlog/_archived/settled_issues/2026-10-23-run-final-human-readable.md) ｜
> 证据 [研究材料](../../_backlog/_archived/research/reader-final/2026-10-23-reader-final-design.md) ·
> [样张](../../_backlog/_archived/research/reader-final/2026-10-23-sample-readable-cn-us-hardware.md)

## 决定

**canonical 不动，新增一份同版、可机械验的读者版。** 用户 2026-10-23 读完 427 行
`final.md` 后要「人能读懂的终稿」，但同时要求不删证据、不造第二份事实、不改研究结论；
卡 1（流程位）与卡 2（可读层）据此合并成一个显性步骤：

- **阶段 / owner**：Lead 在 critic `review.md` 终局 `readiness: PASS` 后、HITL2 之前，
  加载 `reader-final` skill 写 `final/readable.md`；不新增 run phase、不新增角色（D2 四角色不变）。
- **两件产物**：工作件 `final/readable.md`（HITL2 前用户先读）；用户定稿后忠实复制为
  `final/readable-vN.md`（与 `final/vN.md` 同 N），与 canonical 一起 `present`（reader 第一、
  canonical 第二）。
- **内容合同**：六节（结论 / 为什么 / 这对你意味着什么 / 什么会改变这个结论 / 目前不能判断 /
  依据与延伸）；目标 1–3 页（硬顶 4,500 字 / 180 行）；不新增事实、数字、来源；正文不出现
  `[来源:]`、`evidence/`、`drt_` 路径；依据只链 canonical（reader 在 `final/` 内，
  canonical 副本用 `vN.md`、工作稿/账本/审查用 `../final.md` / `../findings.md` / `../review.md`）。
- **机械门 C**：新契约 run 非 quick_factual，`final/vN` 在场即要求 `final/readable-vN.md`；
  判同版、六节、长度、无来源路径、相对链接可解析；数字子集只 WARN（中文排版会假红）；
  旧场（无 `run.md`）与 quick_factual N/A，pre-contract 不追溯。
- **观察面**：终稿页签认领终稿地址族（`final.md` / `final/vN.md` / `final/readable.md` /
  `final/readable-vN.md`）；有读者版默认读者版，`看审计版` / `看读者版` 切换；静音条只讲
  盘上事实；present 同时带两份时优先打开 reader。
- **回执**：`manifest.json` 给 `final/readable-vN.md` 记 `reader-final` 角色与哈希；
  `delivered.json` 记 `readable.path/sha256`；`receiptProblems` 校验 reader 哈希；
  `acceptance.md` 增读者版行。
- **交付链**：新 run 的「研究完成」链由六件扩为七件（加 `final/readable-vN`），
  机械把守 = 门②③④ + 门A + 门C。

## 输掉的方案

- **B. 把 `final/vN` 改成 reader-first**：交付副本先写人话、引用/版本进附录。这会把
  canonical 降为附录，critic / gate / 审计的读法全要改，违背 D17/D28 的 canonical 合同；
  读者版独立文件让审计面零改动。
- **C. 只改 `final.md` 的写法**：把正文写浅。审计信息被压缩、critic 无法复核，用户要的是
  「人能读懂」不是「研究做浅」；不做。
- **D. 只做读者探针，不设产物**：探针逼 Lead 写人话，但探针不是交付件，无法 present/复用/
  审计，每次重生成；不可预期。
- **放 run 根 / 新 phase / 新角色**：run 根 `readable-final.md` 触发 D28 顶层白名单违约；
  新 phase 会牵动 schema-scan、恢复读序与观察面；新 editor/ops 角色推翻 D2。三者都不做。

## 实际跑过的验证

- **keyless 回归**：`pnpm test`（769 通过，含新增 `node-gate-reader` 11 例、
  `final-target` 16 例、`schema-scan` 20 例、`run-receipt` 8 例、`node-gate` 73 例、
  `node-gate-witness` 14 例、`presets` 15 例；计数以 `pnpm test` 实跑为准）。
- **结构门**：`pnpm verify` 全绿（含 `handbook-budget` 17,904B ≤ 18,944、`doc-budgets`、
  `pack-workspace-fresh`、`overlay-fresh`、`client-keys`、`evaluation-contract`）。
- **真实 run 端到端**：`research-workspace/drt_cn-open-vs-us-closed-agentic`
  （claim_verification，非 quick_factual）在 2026-10-23 完成：
  `final/readable.md` → `final/readable-v1.md`；`present` 两份
  （present callId `call_00_kaLh46w4vfKOpWW3Znlu0132` 指向 `final/v1.md`，同声明含 reader）；
  `node-gate` 门①③②L④R A C 全 PASS（门④ N/A：仅 v1）；`run-accept` 写
  `delivered.json`（`readable.path=final/readable-v1.md` + sha256）/`manifest.json`
  （role `reader-final`）/`acceptance.md`（读者版行）。
- **观察面真浏览器**：`client-load-smoke` 在已交付 bundle 上以真实 reader 走
  「默认读者版 → 看审计版切换 → 静音条 = 读者版 · v1」全 PASS
  （临时 reader 用于探针，已移除；同一轮也验证旧 bundle 无 reader 时回退审计版）。
- **真实 run 抓出的四个门禁缺陷，同 diff 修复并各带回归**：
  1. `runType` 全文子串把题面「不是快速事实核查」误判 quick_factual → 改读 HITL1 字段/节，
     无字段时才回退子串并排除否定引用（`schema-scan.test` 新增 runType 例）。
  2. `hitl2RowGate` 把 `final/readable.md` 当版本记账 → 只认 `^vN.md$`（`node-gate.test` 新例）。
  3. `leadsGate` 同样用全文子串误豁免 quick_factual → 改用 `runType`；暴露并修复 T3 覆盖
     记账缺口（真实 run 的 leads.md 补结构化四行）。
  4. timed ask 的真实答复落在 `tool/result` 而非 `user-question-reply` → 门③/② 认同一
     ask callId 的 tool/result 答复（`node-gate-witness.test` 新例）。
- **读者版链接**：真实 run 的 reader 首写把 canonical 链成 `final/v1.md` / `final.md`
  （相对 `final/` 解析成 `final/final/…`）；门 C 现在对相对链接做在场检查，reader 改为
  `v1.md` / `../final.md` / `../findings.md` / `../review.md`；skill 同步写明解析基准。
- **可读性人工判断**：用户 2026-10-24 选择 A「收口归档」；ops 按 5 分钟三问复核
  （结论 / 为什么 / 什么会改变结论均可在 `final/readable-v1.md` 内直接答出），未逐题
  记录用户原话；机械与真实 run 证据已绿。
