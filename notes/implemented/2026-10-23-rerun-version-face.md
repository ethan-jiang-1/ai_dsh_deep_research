# rerun 版本面：plan 快照、`run-version` 与终稿版本账（已落地）

> 状态：implemented

> 历史注记（2026-10-30）：2026-10-23 [D29](../../docs/decisions.md#d29) 后终稿页签默认读者版，
> 标签集扩为「读者版 vN / 审计版 vN / 当前工作稿 / 审查未过」；`present` 可点名 `final/vN`
> 与 `readable*`。版本面、plan 快照与 rerun 声明仍现行。
>
> 首提 2026-10-23 ｜ 设计卡 [_backlog/issues/2026-10-23-rerun-versioned-graph.md](../../_backlog/_archived/settled_issues/2026-10-23-rerun-versioned-graph.md)（§7 决议）
> ｜ 合同 [design/40 §2](../../docs/design/40-research-cockpit.md) · [guides/61 §5](../../docs/guides/61-run-playbook.md)
> ｜ 折算 [run-version](../../packages/deep-research-pack/src/lib/run-version.ts) ｜ 测试 [run-version.test.mjs](../../tests/cockpit/run-version.test.mjs)

## 决定

**rerun 的版本面只用盘上事实说，不从散文猜。** 新增 `src/lib/run-version.ts`，把四类事实折成一行：

- **plan 版本**：`plan.md` 头部 `图版本：vN`（机器可读）+ 重写记录里的 `图版本 vM`（append-only 记录）；
  两者不一致时**两个都报**，不静默挑一个；连头声明都没有就显示「plan 版本未声明」，不从 H1
  「plan v2」或快照文件名反推。
- **旧图快照**：`plan/vN.md`（重写前把当前 `plan.md` 复制过去，N = 被取代的版本）；快照编号
  ≥ 当前图版本 = 编号异常，不当旧图用。
- **交付版本**：`final/vN.md` 版本账最高号 + journal 里指向终稿的 `present`；`present` 不携带
  版本号（vendor 事件只有 turn/callId/files），所以版本账 >1 时文案标「按版本账推定」。
- **rerun 声明**：`question.md` 标题下 `> rerun: vN · evidence-expansion|polish|structural · 日期 ·
  触发：…`。polish 没有盘上版本痕迹，只有声明能表达；结构性 rerun 另起 bundle，本面只认声明。

**显示面**：状态页 ⑤ 加一行（`v1 已交付 · v2 证据扩张 rerun · 当前工作稿 · HITL2 待审`；
HITL2 待审 = hitl-fold 的 anchor-2 pending）；终稿页签默认看版本账最高版、可切「当前工作稿」，
永不写「已交付」（该页签没有 journal，design/40 §2 早已定过）。

**图谱版本轨**：`plan/vN` 快照在场时，图谱顶部给「当前图 / 看 vN 旧图 / 看差异」三个只读切换；
结构 diff 折算住 `src/lib/plan-diff.ts`（只比 id/lifecycle/deps；重编号只认 `superseded_by:`/
`merged_into:` 结构化后缀，alias 目标不算新增）；没有快照就如实写「无旧图快照，不能 diff」，
不重建旧图。旧图视图只列节点结构，不与当前 Team 板对板。

**契约同 diff 落四处**：`research-workspace/AGENTS.md` / `NODES.md` / `templates/run/plan.md` /
`templates/run/question.md` + lead 的 `research-planning`（重写先落快照、版本号两处一致）与
`synthesis`（rerun 声明 + `final/vN` 版本账 + present 顺序）；`sync-pack-workspace` 同步种子。

## 输掉的方案

- **终稿页签「默认打开已交付 v1」**（卡 §5.3 原案）：该页签注入面没有 journal，`present` 读不到；
  给页签加 `follow` 会重复订阅，且窗口外的旧交付仍看不见。改为「默认版本账最高版 + 可切工作稿」，
  交付事实留在状态页（present 见证）。
- **让 `present` 直接指 `final/vN.md`**：`final-target` 的地址判据只认 `final.md`（`FINAL_RELATIVE`），
  改它要动读面定表/三位置回退/地址认领与全部测试，收益不抵风险。登记为触发条件：将来出现
  `final/vN` 不是交付时忠实副本的实例再上。
- **从 `question.md §Decisions` 散文里解析 rerun**：模型写法漂移，读法不可靠；改用显式 `> rerun:` 行。
- **把版本号读自 H1「plan v2」**：机器不可读（`drt_cn-us` 的 v2 只在 H1 里）；解析器只认 `图版本：`。
- **无 present 窗口内见证时判「未交付」**：过严——窗口外的老交付会被说成没交。改为
  「vN 版本账 · 交付未见证」。
- **改 anchor-2 / 步态的 `final.md` 在场语义**：2026-10-20 已定（⑤ 只认 present，步态/锚点用
  文件在场）；本轮版本面不重开那条决定，只把 supported 的版本事实接到 ⑤。
- **在 `node-gate` 加版本/覆盖率门**：Team 任务不在盘上、归档 bundle 无会话；版本面住观察面。
- **结构性 rerun 血缘条**：需要新字段且零真实实例，暂缓。
- **在图谱里画 v1 的完整 DAG**：工作量和“旧图 + 当前 Team 对板”的歧义都大；当前只列旧图节点
  结构 + 摘要差异。第一份真实快照对出现后再决定要不要升成双图。

## 实际跑过的验证

- 基线：`pnpm verify` 全绿、`pnpm test` 639 pass / 0 fail。
- **红**：`run-version.test.mjs` 在模块缺席时 import 失败（1 文件 / 1 fail）；实现后 11 条全绿。
- `pnpm typecheck` 通过；`pnpm test` 656 pass / 0 fail（含 `plan-diff` 6 条）；`pnpm build`（pack 双半）通过。
- `client-load-smoke` ALL PASS：新增「终稿页签版本切换在场（版本账 / 当前工作稿）」，首标题对账
  已改为跟默认视图（`final/vN`）走。
- `preset-smoke`（L1 真挂载）ALL PASS：4 个 preset 全绿。
- `snapshot-replay`：B 层在改动前基线即 9 项漂移（Wave 文本/NODES/subagent 工具 schema 旧金标准 +
  本轮 handbook 文本）；四个角色 fixture 已用真模型重录、`snapshot.json` 的 source 身份同 diff
  更新，回放全绿。
- `pnpm verify` 全绿（`cockpit-doc-registry` 登记 `run-version`、fixtures taxonomy `run-rerun/`）。
- 图谱版本轨：没有带 `plan/vN` 快照的**绑定会话**可做浏览器断言（dev home 的 run 都没有快照，
  绑定只来自 journal，keyless 造不出）——UI 证据 = `pnpm build` + `client-load-smoke` 零回归；
  切换/差异逻辑由 `plan-diff` 单测与 `run-rerun` 夹具钉住。
- **受控 v1→v2 E2E（真模型）**：`drt_e2e-rerun-2026-10-23`（已归档 `research-workspace/archive/`）。
  v1：HITL1 代理代答 → 1 证据节点 / 2 抓取 → `final/v1.md` + present → node-gate 门②③ PASS（门A
  待审计，补跑后 PASS）。rerun：`> rerun: v2 …` 行 + `plan/v1.md` 快照 + `图版本：v2` + W2.2 补证 →
  `final/v2.md` + present → node-gate 七门全 PASS（门④ 扩张版本记账 PASS）；evidence-audit
  CRITICAL=0；`run-accept --archive` PASS 并落 `acceptance.md`。
- **浏览器现场**（run 通道真渲染）：状态页 ⑤ 显示 `v2 证据扩张 rerun 已交付 · 当前工作稿`
  （`runtime/scenes/e2e-v2-status.png`）；图谱顶部显示 `版本轨（只读）：当前 plan v2` +
  「当前图 / 看 v1 旧图 / 看差异」，且该 run 的 `task_id` 整列空白 → 现场显示「映射缺口：图谱
  无法判断 5 个 plan 节点的进度」与逐节点「状态未知（未映射 task_id）」
  （`runtime/scenes/e2e-v2-graph-live.png`）。
- E2E 过程中抓到并修掉的三处解析缺陷（都有测试）：
  1. plan 版本声明被**模板样板**（`图版本：v1（每次重写递增）`）和**HTML 注释里的示例**
     （`图版本：vN`）夺权 → `plan-graph` 与 `run-version` 改为先剥注释、取最后一条；
  2. 模板里的 `> rerun: v2 · … · YYYY-MM-DD · 触发：<一句话>` 示例行被当成真实声明 →
     声明必须带真实日期且不含占位符，模板同步改成 `v<N>`；
  3. `present` 事件**不带版本号**：改为读 present 点名的 `final/vN.md`
     （`latestPresentedFinalVersion`）；只点名 `final.md` 且版本账 >1 时说「已交付（版本未记载；
     版本账 vN）」，不拿版本账最高号冒充。
- **未跑**：结构性 rerun / 表述修订的真实样本（polish 无盘上版本痕迹，只有 `> rerun:` 声明能表达）；
  旧 run 的实例化视图（`drt_cn-us` 无 `plan/vN` 快照，只按诚实缺省显示）。

## 环境状态

- 现行真实样本：`drt_cn-us-ai-models-hardware`（plan 正文 v2 但无机器可读 `图版本`、`final/` 只有 v1、
  HITL2 pending）——观察面显示「版本账 · 交付未见证 · 当前工作稿 · HITL2 待审」，不伪造 v2。
- `drt_eu-us-cn-ai-stack` 的 `图版本：v6` 与重写记录 v7 不一致——版本面会如实报「版本声明不一致」，
  不替它改历史 plan。
- 旧 run 不回填 `plan/vN`；图谱版本轨只对有快照的 bundle 可切（Phase 3）。
