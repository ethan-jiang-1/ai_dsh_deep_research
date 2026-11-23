> 状态：implemented

# 结构治本：判别联合收紧、Skill↔Parser 双向扫描与状态机抽干

> 2026-11-23 ｜ 决定载体：[artifact-read](../../packages/deep-research-pack/src/lib/run/artifact-read.ts) · [brief-fold](../../packages/deep-research-pack/src/lib/run/brief-fold.ts) · [run-fold](../../packages/deep-research-pack/src/lib/run/run-fold.ts) · [final-target](../../packages/deep-research-pack/src/lib/run/final-target.ts) · [status-state](../../packages/deep-research-pack/src/client/research-status/status-state.ts) · [graph-state](../../packages/deep-research-pack/src/client/research-graph/graph-state.ts) · [plan-gate](../../checks/lib/gates/plan-gate.mjs) · [skill-parser-contract](../../tests/contracts/skill-parser-contract.spec.mjs) · [semantic-guardrails](../../tests/checks/repo/semantic-guardrails.test.mjs) · [design/40 §5.1](../../docs/design/40-research-cockpit.md#defensive-redlines) · [discipline-map](../../docs/discipline-map.md)

## 决定

在 [Issue 1](../../_backlog/_archived/settled_issues/2026-11-23-static-semantic-guardrails.md) 与 [Issue 2](../../_backlog/_archived/settled_issues/2026-11-23-l0-client-and-property-testing.md) 提供的静态防线与 L0 行为测试保护下，完成三层结构性收敛并内化上游防御模式：

1. **强判别联合与边界 Schema 解码（Make Illegal States Unrepresentable / Parse, Don't Validate）**：
   - [artifact-read.ts](../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 去掉文本工件的 `.json: unknown` 字段，增加编译期重载签名：读取 `delivered.json` 与 `review/readiness.json` 时强制传入 `{ decoder }` 才能得到 typed `.value`，并在运行时以 `JsonDecoderRequiredError` fail-closed；[final-target.ts](../../packages/deep-research-pack/src/lib/run/final-target.ts) 提供 `decodeDeliveredReceipt` 与 `DeliveredReceiptData`，[ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 与 [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 统一经边界解码消费。
   - [useGraphFeed.ts](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts) 移除最后一处裸 `view.read('plan.md')`，迁移为 `readArtifact(view, 'plan.md', { signal })` 并显式区分 `truncated` / `missing` / `error`；[semantic-guardrails.test.mjs](../../tests/checks/repo/semantic-guardrails.test.mjs) 的 `LEGACY_RUNVIEW_CALLS` 清零为 `new Map()`。
   - [run-fold.ts](../../packages/deep-research-pack/src/lib/run/run-fold.ts) 收紧 `StepSignal = 'unknown' | 'absent' | 'present'`、`EvidenceSignal = 'unknown' | number` 与穷举 `assertNever`；[brief-fold.ts](../../packages/deep-research-pack/src/lib/run/brief-fold.ts) 将 `BriefInputs` 收紧为按 `kind` 判别的状态联合（`unbound | kickoff-hold | bundle-error | bound`）与 `BriefQuestionState` / `BriefReviewState` / `BriefHitlState`，消除互斥布尔并存空间。
2. **Skill / 模板 ↔ Parser 双向契约自动扫描 + 真实门禁缺陷修复**：
   - 新增 [skill-parser-contract.spec.mjs](../../tests/contracts/skill-parser-contract.spec.mjs)，直接从 `presets/*/skills/*/SKILL.md` 与 `content/templates/run/*` 抽取样例送入真实解析器与门禁（`parseReadinessDeclaration`、`parseClaims`/`parseVerdicts`、`EVIDENCE_FIELDS`、`leads`、`LENS_IDS`、`foldLibrary`、`validateProtocol`/`planIndex`/`planGate`）。
   - **当场捕获并修复真实契约冲突**：多节点 `Wave 执行` 层要求层内节点共用 `task_id = plan-only`，但 [plan-gate.mjs](../../checks/lib/gates/plan-gate.mjs) 原先将该占位值按 Team 任务重号判红；已在 `plan-gate.mjs` 豁免 `taskId !== 'plan-only'` 并于 [plan-gate.spec.mjs](../../tests/run/gates/plan-gate.spec.mjs) 固化回归。
3. **Hook 纯状态机抽干、数据驱动通知与停损界定**：
   - 将 [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 的分散状态迁移整合进纯 Reducer [status-state.ts](../../packages/deep-research-pack/src/client/research-status/status-state.ts)（`reduceStatusFeed` 保持同 `trustKey` 的对象引用稳定性，以单次 `reset-session` 原子复位 session 与 policy 状态），并将 [ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 中多段重复告警区块收敛为数据驱动列表 `collectStatusNotices`（单测 = [status-state.spec.mjs](../../tests/cockpit/client/research-status/status-state.spec.mjs)）。
   - 将 [useGraphFeed.ts](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts) 状态迁移整合进纯 Reducer [graph-state.ts](../../packages/deep-research-pack/src/client/research-graph/graph-state.ts)（单测 = [graph-state.spec.mjs](../../tests/cockpit/client/research-graph/graph-state.spec.mjs)）。
   - **按 Issue 停损止步于 `useConfigFeed.ts`**：`useConfigFeed.ts` 主体是 `sendInstruction` 后串行 20×3s 对账轮询的线性异步流程，核心判定早已收在纯函数 `receiptOf` / `libraryDiff` / `foldMethodAdoption` 并具 99.55% 行覆盖；强行拆出 Reducer 仅增加消息中转样板而不消除缺陷类，故保持现状并在本 Note 留证。
4. **本地化 `vendor/dsh/docs/defensive-patterns/` 规则与 `discipline-map` 重估落定**：
   - 在 [docs/design/40-research-cockpit.md §5.1](../../docs/design/40-research-cockpit.md#defensive-redlines) 沉淀与本仓强相关的防御式与契约红线（对应 `One value states one fact` / `Honor public contracts on BOTH sides` / `Identity, initial state & disposal` / `Narrow injection face` / `Timing correctness`），并由 `semantic-guardrails.test.mjs`、`skill-parser-contract.spec.mjs`、`status-state.spec.mjs`、`graph-state.spec.mjs` 机检兜底；[docs/discipline-map.md](../../docs/discipline-map.md) 与 [docs/alignment-ledger.json](../../docs/alignment-ledger.json) 同步切换为「带证据适配」。

## 判据形状

- **权威事实**：状态流转与告警矩阵唯一权威 = `reduceStatusFeed` / `collectStatusNotices` / `reduceGraphFeed`；JSON 工件类型唯一权威 = `readArtifact` 边界 `{ decoder }`；产物体例与门禁同步权威 = [skill-parser-contract.spec.mjs](../../tests/contracts/skill-parser-contract.spec.mjs)。
- **读取方**：`pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm verify`、`pnpm test:spec`、`pnpm test:checks`。
- **坏输入**：向 `readArtifact` 请求 `delivered.json`/`review/readiness.json` 却缺 `decoder`、访问文本工件 `.json`、向 `deriveSteps`/`deriveBusinessBrief` 传入非法或残缺判别联合字段，以及篡改 skill fenced 样例/模板必填键。
- **旧形态**：删掉 `BriefInputs` 冗余平铺布尔与 `TextArtifactResult.json`，清零 `LEGACY_RUNVIEW_CALLS` 旧逃逸名额，不保留平行旧接口。
- **反证**：[semantic-guardrails.test.mjs](../../tests/checks/repo/semantic-guardrails.test.mjs) 新增编译器负控子测在内存中构造成员缺失与无 decoder 四例验证 `tsc` 真实报红；[skill-parser-contract.spec.mjs](../../tests/contracts/skill-parser-contract.spec.mjs) 与 [plan-gate.spec.mjs](../../tests/run/gates/plan-gate.spec.mjs) 验证样本缺失与多节点 `plan-only` 边界。

## 输掉的方案

- **另建一份独立冗长的五卷防御式文档副本**：脱离仓内自动化检查的人肉清单易随代码演化失真，改为把可机械化条目直接接进 `tsc` + `semantic-guardrails` + `skill-parser-contract`，[design/40 §5.1](../../docs/design/40-research-cockpit.md#defensive-redlines) 只保留紧凑对照表。
- **对 `useConfigFeed.ts` 机械套用 Reducer**：按 Issue 停损原则拒绝为线性 RPC 轮询流程制造无收益的 Reducer 样板代码。

## 实际跑过的验证

- **先红后绿证据**：
  - `skill-parser-contract.spec.mjs` 初跑直接抓出 [plan-gate.mjs](../../checks/lib/gates/plan-gate.mjs) 对多节点 `Wave 执行` 层共用 `task_id = plan-only` 误报 `BUG-283` 重号的真实契约冲突（修复前 `exit 1`，补豁免与回归用例后全绿）。
  - `semantic-guardrails.test.mjs` 内新增 TypeScript 编译器负控用例实证 4 类非法状态组合均在编译期产生诊断错误，且全源码无 `RunView.read`/`hasFile` 逃逸。
  - `oxlint` 实跑捕获 `useStatusFeed.ts` 抽干后的两处 `no-shadow`（`state` 与 `receiptDelivery`），重命名清零后转绿。
- **收口构建、门禁与全量回归**：
  - `pnpm build` / `pnpm lint` / `pnpm typecheck`：**PASS**（0 错误 / 0 警告）。
  - `pnpm verify`：**PASS**（全项绿，含 `md-links`、`md-anchors`、`align-ledger`、`discipline-state-vocab`、`discipline-na-trigger`、`cockpit-doc-registry`、`pack-lint`、`dist-freshness`、`staged-change-pairing`）。
  - `pnpm test`：`test:spec` 与 `test:checks` 全量 **PASS**（包含 Issue 2 全部 Hook+JSDOM 行为测试与恶意 `RunSource` 故障矩阵、五组 PBT/差分、`status-state.spec.mjs`、`graph-state.spec.mjs`、`skill-parser-contract.spec.mjs`、`semantic-guardrails.test.mjs`）。
  - **独立浏览器真入口环境边界说明**：尝试运行 `node checks/smoke/cockpit-truth.entry.mjs` 时返回 `exit 2`（未跑：当前本机工作区缺少 `node-addon-require-builtin` 编译产物 `napi-v9-darwin-arm64/require_builtin.node`，DSH web 子进程无法拉起），如实记为未跑（不作通过宣称），由 JSDOM+RTL 进程内行为与故障矩阵全量验证状态迁移与 UI 渲染等效性。
