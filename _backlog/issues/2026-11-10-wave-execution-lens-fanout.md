---
status: 待落地
opened: 2026-11-10
---

# 落地：wave 执行——analyst 承载的 lens 扇出（固定配方 + 报告）

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — 交付时写 `notes/implemented/2026-11-10-wave-execution-lens-fanout.md`（决定/输掉的方案/实际跑过的验证进 Note，docs 只写 now）
>
> **研究依据**：[wave-execution v2](../_archived/research/wave-execution/2026-11-10-wave-execution-contract.md)（新机制事实、A→B 重估、执行合同、试点）→ [channel-policy v2](../_archived/research/orchestration-primitives/2026-11-10-channel-policy.md)（通道总表/8 槽/HITL）→ [lens-as-data v2](../_archived/research/lens-abstraction/2026-11-10-lens-as-data.md)（已落地 D43）→ [claim-verdict 卡](2026-11-10-claim-verdict-quality-loop.md)（D44 在落地）。
>
> **开工授权**：用户 2026-11-10 直派「深挖 wave-execution，提交 issue，准备落地」= 授权深挖与立卡；
> **`待落地` 不是实施授权**。本卡改动面含 **pack 公共行为**（analyst 工具面、计划卡措辞、计划模板），
> 实施前请用户明确授权；按审阅分层在 P1（模型可见面）与 P4（真 run）两个阶段边界请人。
>
> **与既有卡的关系**：[旧卡（已归档）](../_archived/settled_issues/2026-11-10-workflow-wave-executor.md)
> 的 channel-policy、8 槽、HITL 仍是上游依据；本卡承接其中的 **wave 执行切片**，并按 v2 新事实
> 把挂点从 A（独立 `wave-runner`）改判 **B（analyst 承载）**。旧卡的 goal
> `GOAL_TOOL_RESUME_PAUSED` 缺陷已按 [Note](../../notes/implemented/2026-11-10-goal-hitl-alignment.md)
> 裁决并落地（HITL2 `timeout:-1`，不 pause/resume），本卡不重复。
>
> **基座同步（2026-11-10 立项前核对）**：
> ① lens 层已落（D43，`content/lenses/` 8 条、evidence 八字段、`topic × lens` 覆盖表）；
> ② claim-verdict 已落 P0/P1/P3，D44 预留；**claim 验证不进本卡**（critic subagent + verdicts 不变）；
> ③ 机制同 pin = `dsh-v0.2.1-rc.5` @ `b830ec950f`；`workflow-ptc` / `tool-workflow` 均未挂任何研究 preset；
> ④ `content/manual.md` 预算 12,288 字符，当前 **12,038**（余 250）→ 本卡**不改手册**，wave 契约住
> analyst skill + plan 模板，避开全角色 snapshot 重录；
> ⑤ 下一 D 号 = **D45**（D44 归 claim-verdict）；本卡不改 D2 角色数（仍 5）。

**问题与期望结果：** 现在的 wave 只是 `plan.md` 里的拓扑层，执行靠 Lead 手动调度：谁执行、何时停、
失败怎么办、证据落在哪，都没有机制。研究结论与 channel-policy 已把 workflow 定为「同质叶层执行器」，
但 v1 把 scan 与 claim 验证也算进可脚本化层，且推荐的新 `wave-runner` preset 会撞 D2 角色数、roster、
`l4-lite`、snapshot 角色集。期望：把 **deep-dive 的 lens×topic 取证层**做成一条可评审、可测试、可试点
的执行合同——**analyst 承载**（不新增 preset）、固定配方 `lens-fanout`、child 写八字段证据卡 + typed
回执、executor 对账写 `waves/W<n>.json`、计划卡点名授权；跑完仍由 Lead 综合、critic 审查，HITL 仍是两点。

## 当前情况（事实与锚点，逐条核过）

- **workflow child 的 typed 回执可用**：`agent()` 支持 `schema`；child 侧自动挂 `structured_output`，
  child 必须显式调用，否则 `agent()` 返回 `null`
  （`vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts:32-35,207-220`；
  `vendor/dsh/packages/subagent/subagent/src/structured.ts:18-29,83-107`；spawn 声明 `outputSchema`
  `vendor/dsh/packages/subagent/subagent-spawn-in-process/src/index.ts:34-42`）。
  **回执 ≠ 产物**：`structured_output` 提交后关闭后续工具调用，所以 child 必须先写文件、再回执。
- **workflow child 不入父 catalog、不发 completion notice**：
  `vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:200-228`；
  `vendor/dsh/packages/workflow/workflow-ptc/README.md` §Results and failures。Lead 看不到 child 的
  完成消息；**唯一可信回传面 = executor 写的文件**。
- **run 记录只落 executor 会话**：`tool-workflow` 在顶层 transport 写四条 log-only 事件
  （`vendor/dsh/packages/workflow/tool-workflow/src/index.ts:89-151`、`src/types.ts`）；`phase()`/`log()`
  没有 per-line durable surface。Lead 会话里没有这些事件。
- **工具结果 schema 有 `runId` / `agentsStarted`，但模型看到的渲染文本只有 completed + `(N agent)`**
  （`vendor/dsh/packages/workflow/tool-workflow/src/index.ts:378-407,462-467`）；`runId` 只在 executor
  会话的 `tool-workflow/run-start`，child id 只在 `agent-start`。报告写 `run_id:null` + note，
  **不得伪造 `run_id` / `child_ids`**；Lead 需要时用 `session_query` 取。
- **脚本是纯沙箱**：无 fs / network / timer / Node API（`tool-workflow/src/index.ts:158-166`）→ 脚本
  不能预读 lens、不能检查文件、不能写报告；这些全是 child/executor 的活。
- **caps 是 engine 级配置**：`maxConcurrentAgents` 默认 `0 → min(16, cores-2)`；`maxTotalAgents`
  默认 1000；`tool-workflow` 不向模型暴露这些字段
  （`vendor/dsh/packages/workflow/workflow-ptc/src/index.ts:32-44,106-148`；
  `tool-workflow/src/index.ts:409-442`）。`maxConcurrentAgents` 必须写进 preset。
- **child 加入调用者 preset**：workflow child `composeFrom` 调用者
  （`host.ts:200-228`；`vendor/dsh/packages/subagent/subagent/src/child-agent.ts:186-202`）；
  **team teammate 加入 Lead**（`vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274`）；
  只有 `tool-subagent` 的 `agent_preset` 能钉独立 preset
  （`vendor/dsh/packages/subagent/tool-subagent/src/index.ts:320-327`）。→ **B 的执行器必须是 spawn 的
  analyst child，不能是 team 里的 analyst 队友**（队友是 Lead 组合，没有 analyst preset 的 workflow 行）。
- **深度闸**：workflow child 不传 `maxDepth`，只 stamp `parent+1`
  （`vendor/dsh/packages/subagent/subagent/src/manager.ts:384-387`；`child-agent.ts:54-57`）；child 自己
  带 `tool-subagent` 时，到 cap 会收到 runtime 提示「remaining levels 0」并被机械拒绝
  （`tool-subagent/src/index.ts:388-393`）。**workflow 递归没有机械闸**。
- **政策句是 prompt，不是闸**：`tool-workflow/src/index.ts:326-330`；HITL1 计划卡是唯一合法授权点。
- **8 槽是全体活子代共享池**：`vendor/dsh/packages/subagent/subagent/src/activation.ts:24-35`、
  `manager.ts:743-744`；超限 `ACTIVATION_LIMIT_REACHED`，不排队。
- **计划卡已顶格**：2026-11-10 实测 4 张 171 / 183 / 193 / 200 字
  （`scripts/lib/plan-card.mjs` 口径；`node scripts/run-ops/plan-card-stats.mjs`）→ 加「W2 脚本扇出 ×4」
  必须同步删字；选项不动。
- **计划解析器不读未知列**：`packages/deep-research-pack/src/lib/plan-index.ts:137-181` 只读已知列；
  `planIssuesOf` 的 wave 前缀规则在 `:272-303`；驾驶舱不读 `waves/`。→ v1 **不加 plan 列**，用
  `## Wave 执行` 节。
- **既有决定/测试面**：D2 角色 = 5（`tests/pack/presets.test.mjs` 数量哨兵）；`l4-lite` 用
  `presetRoles` 全量（`scripts/smoke/l4-lite-smoke.mjs:84-105`）；snapshot 角色集 =
  `researchRoles`（`snapshots/replay/research-face/snapshot.json`）。→ B 不动这些角色集，只重录 analyst
  一例（新增 skill / 工具面会改 `skill-catalog` 与 `request/header`）。

## 结论：选 B，只做 `lens-fanout`

**为什么不是 A**：新增 `wave-runner` 是第 6 个 preset = 改 D2 哨兵、roster/UI、`l4-lite` PROMPTS、
snapshot 角色集；而它的 child 没有 analyst 的 evidence-extraction，方法要靠 brief 重新携带。B 不新增
preset，child 直接是 analyst 克隆（persona + evidence-extraction），执行器本身也是 analyst；代价只是
每个 analyst 请求付 workflow schema（约 2.5KB 文本，~700 token，量级 3–7%），且试点可测量、可回退 A。

**为什么只做 deep-dive**：scan 需要 scout 对话式启发、且给 scout 挂 workflow 会多付一份 schema 税；
claim 验证已有 critic subagent + `claim-verdict` + `verdicts-r<N>.json`（D44 在落地），workflow child
是 analyst 克隆，role fidelity/只读都不如 critic；综合/审查/交付需要单一 owner 与拍板。v1 **只**做
lens×topic 取证层，一场 run 最多一层。

## 设计合同

### 1. 挂点与调用链

```
Lead（plan 的 W2 同质层 + 计划卡点名）
  └─ subagent(agent_preset=analyst, prompt=wave brief)        ← depth 1，executor；不是 teammate
       └─ workflow(script = content/waves/lens-fanout.js, args={wave,bundle_dir,cells})
            ├─ agent(cell) → child（analyst 克隆，depth 2）→ evidence/<cell>.md
            └─ … N 个 cell
       └─ executor 对账 → waves/W2.json → 返回摘要
  └─ Lead 读 waves/W2.json + 抽查证据 → plan/journal
```

- analyst preset 内挂 **engine + tool 同 group + `isolate: workflowEngine: true`**（探针 P1 已证：
  只插 tool → `waiting for workflowEngine`；engine + tool → 绿）。
- `maxConcurrentAgents: 4`、`maxTotalAgents: 8`、`enableRunInBackground: false`（foreground；
  避免 job 依赖与 Lead 回合竞态）。
- Lead/scout/critic/method-editor **不挂** workflow；Lead 不能自己跑脚本（否则 child 是 Lead 克隆）。

### 2. 计划面（不加列）

- `content/templates/run/plan.md` 加 `## Wave 执行` 节；格式：
  `- W2：lens-fanout ×4；executor = analyst（spawn，depth 1）；cells = …；报告 = waves/W2.json`。
- 脚本节点 `task_id = plan-only`（executor 是 spawn child，不是 Team 成员）；`output` 指
  `waves/W2.json + evidence/t1-*.md`；`budget` 写 `N=4（workflow；maxConcurrentAgents=4）`。
- `research-planning` skill §4/§5 加「脚本层不建 Team task；先算槽再写 N；最多一层」。
- `plan-index` / 驾驶舱 / `schema-scan` / `node-gate` **不改**；`## Wave 执行` 不解析。

### 3. 配方面

- 新增 `packages/deep-research-pack/content/waves/lens-fanout.js`（脚本 body 唯一正本；`content/**`
  已随包发布）；analyst 用 `read` 读全文，原样作为 `workflow.script`。
- `args` 必填：`wave`、`bundle_dir`、`cells[1..8]`；每 cell 必填
  `id/topic/question/lens/lens_path/output_path`；可选 `lens_digest/budget/boundaries`。
- 脚本先**显式校验** args（缺字段/空/超 8 → throw，workflow `error`）；再 `pipeline(cells, …)`；
  `agent(prompt, { schema, label, phase })`。
- child schema：`{status: ok|partial|failed, path, evidence_count, gaps[], note}`，object-rooted，
  `additionalProperties:false`，`required:[status,path]`。
- child brief 必含：八字段、绝对路径、lens 路径 + digest、预算/边界、**先写文件再调
  `structured_output`**、禁止 workflow/subagent/ask、拍板写 gap。
- 脚本**不重试**；`agent()` 返回 `null` 就保留为失败项；返回值含每个 cell 的 id/status/path，**不静默
  filter**。

### 4. 证据与报告面

- child 产物：`evidence/<cell>.md`，八字段（D43 契约），一卡一面。
- executor 报告：`waves/<wave>.json`，字段：
  `schema/wave/recipe/plan_version/run_id/run_id_note/agents_started/stop_reason/requested/counts/cells/errors/recorded_at`。
  `run_id` 在模型可见结果里通常不可得 → `null` + note；`agents_started` 从 `(N agent)` 读，读不到 `null`；
  `stop_reason` 按工具调用成功/报错/取消写 `completed|error|cancelled`，不写 `null`；child 多写同 lens
  拆卡时该 cell 记 `extra_output_files[]`、`evidence_count` 按全部文件计。
- 对账：child 回执 `ok` + 文件在八字段齐 → `ok`；文件缺字段 → `partial`；回执 `ok` 但文件不在 →
  `missing`；`null` 但文件在八字段齐 → `ok` + `note: no structured receipt`（**不要丢产物**）；
  `failed`/`null` 且无文件 → `failed`。`counts` 按最终 `status` 重算，四个键（ok/partial/failed/missing）
  固定在场，缺省 0。
- 工具报错也要写报告：`stop_reason:error`，`errors` 原文，**不得写绿**。
- Lead：读报告 + 抽查 ≥1 张卡；journal 一行摘要；critic 报告级审查读同一份。v1 **不新增机械门**。

### 5. 失败/恢复（摘要）

- 单 cell `null` → 记 `failed`，不重试；其他卡仍在。
- `AGENT_START` / `AGENT_CAP` / `ITEM_CAP` → fatal，整脚本失败；executor 回报，Lead 标「该 wave 未
  执行」或退回 Team/subagent，不重跑碰运气。
- 父 step 取消 → run 取消、dispose child；已写文件是唯一事实。
- 没有 durable 图：`plan.md` 仍 canonical；恢复按 plan + bundle 重建，不按 workflow run 恢复。
- 脚本绿 ≠ 研究绿：critic/Lead 判质量；seed/证据卡是证据，不是 verdict。

### 6. HITL

- HITL1 计划卡正文点名 `W2 脚本扇出 ×4（workflow）`；用户点「按计划开跑」= explicit ask；不新增
  第四问/选项/交互点。
- HITL2 不变；脚本运行中无 HITL；child 不能 ask，需要拍板写 gap，由 Lead 在 wave 结束后统一问。
- 计划卡没点名的层不得跑；Lead 不能自行加；用户修订里明确说「用脚本扇出」= 新的 explicit ask。
- 计划卡措辞与删字方案见 v2 §5.5；实测 ≤200 是 pilot 硬线。

### 7. 容量

```
teammates + 1 (analyst executor) + N (workflow children) ≤ 8
Lead root 不占槽；executor depth 1，children depth 2；同一 wave 不再派 subagent worker。
```

- 试点：scout + critic（2）+ executor（1）+ N=4 = **7 槽**，留 1 槽。
- team 4 人时 4+1+4=9 > 8 → N 必须降到 3 或缩 team；先算槽再写 N。
- `maxActiveSubagents` v1 不提到 12（产品面变更）；撞顶先缩 N/team，另卡再议。

### 8. 观察与留痕

- `plan.md` 的 `## Wave 执行` + `task_id=plan-only` + `output` 指报告；
- `waves/W2.json` 为执行报告；Lead journal 一行；executor 会话 `tool-workflow/*` 可查 child 生命周期；
- 驾驶舱 v1 不读 `waves/`（已知缺口）；不新增 client 面。

### 9. 不做（本卡）

- 不做 scan/claim/synthesis/review/delivery 的脚本化；不新增 `wave-runner` preset（A 只作 fallback）；
- 不改 D2 角色数、roster、`l4-lite` PROMPTS、snapshot 角色集；
- 不改 `plan.md` schema/加列、不改驾驶舱、不加 `waves-audit` 门；
- 不改 `content/manual.md`（避开全角色 snapshot；`waves/` 契约住 skill/模板）；
- 不改 vendor、不改 goal pause/resume（旧卡持有）；
- 不做多层/多 wave、后台 job、跨 run 恢复。

## 落地计划（六段；每段一个可独立提交的窄片）

| 段 | 内容（改动面） | 红先 / 必跑 | done |
|---|---|---|---|
| **P0 配方核**（keyless） | 新 `content/waves/lens-fanout.js`；新 `tests/pack/wave-recipes.test.mjs`（vm 解析 + mock `agent`/`pipeline` + 缺 args/空 cells/超 8/`null` 不丢 + 禁 fs/network 源扫描） | 先写红：把 `args.cells` 校验删掉 / 把 `null` filter 掉 → 测试红；还原绿；`pnpm test` | 配方文件可解析、mock 下 4 cell 返回正确 counts、null 保留 |
| **P1 挂载核**（模型可见；请人） | `presets/analyst.patch.yml` 加 workflow group（engine + tool + isolate + caps）；`package.json` peerDeps `@deepseek-ai/dsh-workflow-ptc`/`dsh-tool-workflow`；`tests/pack/presets.test.mjs` 加「analyst 有/其余无」结构钉 | `node dev/render-overlay.mjs` → `pnpm verify`（preset-structure/row-deps）→ `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` | L1 全绿；analyst roster 不 broken；其余 preset 无 workflow |
| **P2 内容面**（模型可见；请人） | 新 `presets/analyst/skills/wave-execution/SKILL.md`；`presets/lead/skills/research-planning/SKILL.md`（§4/§5）；`research-brief/SKILL.md`（计划卡措辞/删字）；`content/templates/run/plan.md` 加 `## Wave 执行` | `node dev/render-overlay.mjs` → `snapshot-replay-smoke`（analyst 先红 = 已捕获）→ 重录 analyst → `l4-lite-smoke`；`plan-card` 样例 ≤200 | snapshot B analyst 绿；lead/scout/critic 不因本卡改动重录；l4-lite 绿 |
| **P3 试点 A**（机制，1–2 cell） | 复用已交付 bundle 副本；真模型；Lead spawn analyst executor → workflow 1–2 child；抓 `request/header`、child header、槽位峰值 | 自动化断言：workflow 工具在 analyst、不在 Lead；child 有 manual/`research_pack_root`；`waves/*.json` 生成；无递归 | 五条判据全绿；会话 id/报告路径进 Note |
| **P4 试点 B**（真 run，4 cell；用户在场） | 一场 P5/P6 真 run：3 topic × 2 lens → 4 cells；plan 卡点名；executor 跑 `lens-fanout`；critic 正常审 | HITL1/HITL2 由用户点；`plan-card-stats` ≤200；峰值 ≤8；报告 counts 与文件一致 | 4/4 八字段；`missing=0`；无递归；成本/质量读数进 Note |
| **P5 收尾**（与交付同变更） | `docs/decisions.md` D45；`docs/design/30` wave 执行段；`docs/design/20` analyst 能力一句；pack README 已知限制；`notes/implemented/2026-11-10-wave-execution-lens-fanout.md`；卡 `git mv` 归档 + 状态行 `已结`/`可关闭：是`；`issues/README` 移行；wave research 题名页按消费者离开决定归档 | `pnpm verify` + `pnpm test` 终跑；归档同变更 | 全绿 + D45 + Note + 用户验收 |

**不做的事**：见 §设计合同 9。P0 绿再动 P1；P1/P2 不并行开两个面；P3 只证机制，不替代 P4 真 run。

## 实施进度（2026-11-10）

- **P0/P1/P2 已落**（commit `6ada0e3`）：`content/waves/lens-fanout.js` + keyless 配方测试；
  analyst preset 的 workflow 组（engine + tool + isolate + caps）；`wave-execution` skill；
  Lead 的 `research-planning` / `team-assembly` / `research-brief`；plan 模板 `## Wave 执行`；
  D30 映射补行；`count-free` 录制夹具豁免。验证：`pnpm verify` 绿、`pnpm test` 1089 绿、
  L1 5/5 真挂载、snapshot lead/analyst 重录后 4 场景 ALL PASS（commit `ac7421d`）、l4-lite ALL PASS。
- **P3 机制试点已跑**（真模型，direct analyst executor，隔离 profile `wave-pilot`）：
  session `418e46b5-…`、child `04c21dfb-…`；`waves/W2.json` 1 cell `ok`；`evidence/t1-official.md`
  12KB、八字段齐；child request header 确认 `research:manual` + `structured_output` +
  `workflow` + `subagent`（递归风险真实存在，本场未递归）；executor 未用 subagent。
  证据 = `research-workspace/drt_wave-pilot/`（运行数据，不入库）。
- **P3+ 4-cell 容量试点已跑**（真模型，direct analyst executor）：
  session `ccd969bb-…`；`requested 4 / ok 3 / partial 1 / failed 0 / missing 0`；4 个请求路径全部
  在场、八字段齐；`t1-practitioner` 自报 partial（预算超支/单源，如实记）；`t2-official` 另写
  2 张同 lens 拆卡（报告 `extra_output_files[]`，`evidence_count=3`）；4 个 `agent-start`，
  无 `ACTIVATION_LIMIT_REACHED`；无递归。证据 = `research-workspace/drt_wave-pilot4/`。
  **由此回写合同**：`stop_reason` 按成功/报错/取消写 `completed|error|cancelled`（不写 null）；
  child 拆卡记 `extra_output_files[]`。
- **P3b Lead→analyst spawn 试点已跑**（真模型，隔离 profile `wave-pilot`）：
  session `4cc4bde0-…`。**第一次 Lead 用 `spawn_teammate`**（尽管 prompt 说 analyst）——队友
  composeFrom Lead，没有 workflow/wave-execution，child 如实报 `TOOL_NOT_IN_SESSION`；
  **更正为 `subagent(agent_preset=analyst)` 后成功**：child `ff73f513-…` 加载 skill、前台调
  workflow、写 4 张 evidence 卡 + `waves/W2.json`（counts ok=1）；Lead 在 completion notice 后
  读报告并回报。`wait_agent` 看不到 subagent（非 Team 成员），Lead 结束回合等通知是正确形态。
  **由此回写 skill**：team-assembly 钉「脚本层唯一通道 = subagent，不要 spawn_teammate」与
  「等 subagent 不要 wait_agent」；`wave-contract` 测试钉住两句。
- **P3 的环境 caveat**：`workspace-write` 下 workflow 首次失败：
  `workflow execution failed (sandbox-unavailable): sandbox-exec: sandbox_apply: Operation not permitted`
  ——本机 DSH 进程本身在沙箱内，PTC 再套 `sandbox-exec` 被拒。隔离通道以
  `DSH_PERMISSION_MODE=danger-full-access` 重跑成功；这是**试点环境**限制，不在代码里放宽默认策略。
  P4 真 run 需在非嵌套沙箱（或用户同意的 full-access 试点环境）跑。
- **P3 的新事实（已回写合同）**：模型可见的工具结果只有 `workflow "..." completed (N agent)`，
  **没有 `runId` 字段**；`runId` 只在 executor 会话 `tool-workflow/run-start`。报告写
  `run_id:null` + note，不得伪造。
- **P4 未跑**：需要一场带 HITL1/HITL2 的真 run 与用户在场；当前默认 run 通道有在飞会话
  （未打扰），且 P4 的 HITL 不能由代理冒充。待用户安排一场 run 时补。
- **P5 部分**：D45 / design/20 / design/30 / pack README 已知限制已落（commit `2b075a2`）；
  `release-smoke --install-only` **ALL PASS**（pack → 干净 profile → plugin add → 安装域
  preset-smoke 5/5 → remove/端口释放）——workflow peer 行在安装域可解析，A11 的 L2 面已补。
  implemented Note 与卡归档**不先写**——P4 未跑，写了就是把未验项写成 implemented。P4 过后同变更
  写 `notes/implemented/2026-11-10-wave-execution-lens-fanout.md` 并归档。

**P4 开跑清单（待用户在场，一轮跑完）**：

1. `node dev/run-driver.mjs up`（默认通道；不要另起）；HITL1 正常走三问 + 计划确认卡，
   卡正文写 `W2 脚本扇出 ×4`；`plan-card-stats.mjs` 复核 ≤200。
2. plan 写 `## Wave 执行`；节点 `task_id=plan-only`；Lead `subagent(agent_preset=analyst)`
   （**不是 spawn_teammate**）。
3. HITL2 时抓 `tool/call` 参数：必须是 `timeout: -1`（不是 600/省略）；观察 goal 是否保持 active、
   无 goal 轮空转。
4. 验收：`waves/W2.json` 四键 counts 与文件一致、`missing=0`、无 `ACTIVATION_LIMIT_REACHED`、
   child 不递归 workflow、峰值 ≤8；把 run/critic 结果写进本卡 §实施进度 + Note。
5. 失败 → 回 `推敲中`/`等人拍板`，附读数；不硬写 Note。

## 验收标准

| # | 行为 | 类 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人 |
|---|---|---|---|---|---|---|---|
| A1 | 固定配方可解析、可 mock、不静默丢 cell | 确定性 | `content/waves/lens-fanout.js`、`tests/pack/wave-recipes.test.mjs` | vm 可解析；缺 `args.wave/cells`、空 cells、>8、cell 缺字段 → throw；mock 2 cell 返回 id/status/path；`null` 保留为 `failed`；源扫描无 `require/import/fs/fetch/process`；先红后绿 | 删校验/把 null filter 掉 → 测试红；不靠「只测绿」 | keyless test | 无 |
| A2 | analyst 挂 engine + tool，其余不挂 | 确定性 | `presets/analyst.patch.yml`、`package.json` peerDeps、`tests/pack/presets.test.mjs` | group 内 engine + tool + `isolate: workflowEngine: true`；`maxConcurrentAgents: 4`；`enableRunInBackground: false`；只有 analyst 有；peerDeps 齐；`pnpm verify` 绿 | 只插 tool → `preset-smoke` 红（P1 已复现）；漏 peerDeps → row-deps 红 | presets test + L1 | 无 |
| A3 | 工具可见性 | 编排 | 真挂载 / 请求头 | analyst 的 `request/header.tools` 含 `workflow`；Lead/scout/critic 不含；workflow child 含（递归风险记录）；snapshot/header 证据 | 任一错位 → 停，修 preset 行；child 递归另记 | P3 探针 + snapshot | 无 |
| A4 | 计划面不加列、可读 | 确定性 | `content/templates/run/plan.md`、`research-planning/SKILL.md` | `## Wave 执行` 节格式；`task_id=plan-only`；`output` 指 `waves/W2.json + evidence/…`；`planIndex`/`planIssuesOf`/`schema-scan` 不因新增节红；无新列 | 加列/改 parser → 回退；plan 节缺失 → A6 无报告 | test + 人工 grep | 无 |
| A5 | HITL1 只点名、不加交互 | 模型行为 + 编排 | 新 run 的计划卡 | 卡正文含 `W2 脚本扇出 ×4`；选项仍三路；`plan-card-stats` ≤200；无第四问/新选项；用户拍板落 §Decisions | >200 → 删字；新选项 → 回退；未点名跑脚本 = 违纪 | `plan-card-stats` + 真卡 | **用户**：卡可读、授权语义 |
| A6 | 报告与对账 | 模型行为 + 编排 | 试点 bundle | `waves/W2.json` 字段齐；`counts` 与文件事实一致；`missing` 不静默；child 证据八字段；`run_id` 可为 `null` + note（渲染文本不暴露），`agents_started` 从 `(N agent)` 读；`stop_reason` 为 `completed|error|cancelled`，不写 null；多写拆卡记 `extra_output_files[]`；错误时不写绿 | 回执 ok 但文件缺 → `missing`；报告缺 → 停；counts 不一致 → 停；伪造 run_id/stop_reason → 停 | pilot bundle + Lead 抽查 | 无 |
| A7 | 失败不重试、不伪造 | 编排 | 单 cell null / fatal / 取消 | 单 null → `failed`；`AGENT_START/AGENT_CAP/ITEM_CAP` → fatal 记账；取消 → 已写文件保留；无「重跑碰运气」；报告不写绿 | 任一静默重试/伪造 → 停 | P3/P4 证据 | 无 |
| A8 | 容量 | 编排 | 试点 | `teammates + 1 + N ≤ 8`；峰值 ≤8；无 `ACTIVATION_LIMIT_REACHED`；`maxConcurrentAgents=4`；N 写 plan `budget` | 撞顶 → 缩 N/team；不先抬 12 | P4 槽位计时 | 无 |
| A9 | 角色边界 | 确定性 + 编排 | 全树 | 不新增 preset；D2 仍 5；claim 验证仍 critic subagent/verdicts；scan/synthesis/review 不变；Lead 无 workflow 工具 | 新增 preset/搬 claim → 停，回卡 | tests + review | **用户**：公共行为 |
| A10 | 试点 A/B | 模型行为 + 编排 | 真模型 | P3 五条（工具可见/manual/报告/无递归/槽位）；P4 4/4 八字段、`missing=0`、报告一致、无递归、executor 不派 subagent、卡 ≤200；成本/质量读数 | 任一硬线红 → 回 `推敲中`/`等人拍板`，不硬收 | 两场证据进 Note | **用户**：P4 HITL |
| A11 | 回归与证据档 | 确定性 | 全树 | `pnpm verify`、`pnpm test` 绿；`render-overlay` 后 `overlay-fresh` 绿；L1 绿；snapshot B analyst 重录且 lead/scout/critic 不无意变化；`l4-lite` 绿；`release-smoke --install-only` 绿 | 任一红 → 不交付；keyless 绿不替代 l4 | guides/60 路由 | 无 |
| A12 | 文档与 D 号 | 确定性 + 人 | 同 diff | D45 登记（≤800 字，含与 D43/D44 边界）；design/30 wave 段；design/20 analyst 能力一句；pack README 已知限制；Note；卡/研究互链 | 文档仍写「workflow 未挂」/漏 D45 → 红 | `pnpm verify` + 用户签 | **用户** |

**Out of scope（本卡不做）**：scan/claim/synthesis/review/delivery 脚本化；新 `wave-runner` preset；
plan 加列/改 parser；驾驶舱读 `waves/`；机械 `waves-audit` 门；`maxActiveSubagents` 提到 12；vendor 改动；
goal pause/resume 修复；多层/后台/跨 run 恢复；`content/manual.md` 改动。

## 未决（默认按推荐，用户改任一项先回卡）

1. **B vs A**：默认 B（analyst 承载）；A 只在「schema 税 >5% 且脚本层使用率 <1/3」或 B 试点失败时重估。
2. **计划面**：默认 `## Wave 执行` 节 + `plan-only`，不加列；若用户要求驾驶舱可见，另卡（改 parser/UI）。
3. **报告门**：默认 v1 不加机械门；触发 = 连续 2 场报告与文件事实不一致。
4. **`waves/` 是否进手册**：默认不进（避开全角色 snapshot）；若 critic 需要，再以一行加进 manual（同 diff 全角色重录）。
5. **`maxTotalAgents`**：默认 8（4 cells + 余量）；若要更多 cell，先改 plan N 与试点。
6. **执行器位置**：默认 spawn `agent_preset=analyst`；不用 team 队友（队友是 Lead 组合，无 workflow）。
7. **计划卡措辞**：默认 `W2 脚本扇出 ×4`；若用户觉得「脚本」不等于 workflow，可改「W2 脚本扇出 ×4（workflow）」，但需删字保 ≤200。
8. **旧卡处置**：默认保留旧卡（goal 缺陷 + channel 政策）；本卡不关旧卡。

## 已知与未决（诚实边界）

- **B 的 schema 税**：workflow 工具描述 + schema + prompt section 常驻 analyst 请求；试点测 token 差，
  不靠猜。若不可接受，A 是 fallback，但要付 preset 公共面成本。
- **executor 自己仍带 `tool-subagent`**：B 的执行器是 depth-1 analyst，可以派 depth-2 worker；skill
  禁止，但**无机械闸**。pilot 检查 executor 会话是否出现 `subagent` 调用；若发生，先加合同/提示，
  仍发生则评估 A 或 host guard（另 D）。
- **递归无机械闸**：child 继承 `tool-workflow`；brief + tool policy 只能降低概率，不能证明为 0。
  试点观察；若发生，先加合同，再考虑 host 小 guard（另 D）。
- **child manual 继承未 live 证**：源码应继承；pilot 抓 `request/header` 确认；红则 brief 内联证据
  八字段/lens 全文。
- **typed 回执依赖模型**：child 可能忘调 `structured_output`；对账以文件为准，回执只作加速。
- **计划卡 200 字**：措辞是模板，不是保证；每场实测，超限删字。
- **8 槽**：算术已定，真实峰值未压测；P4 记录 start/end。
- **驾驶舱看不到 wave**：v1 缺口；报告是文件，图只到 plan 节点。
- **没有 durable 图/pause**：workflow 是一次执行尝试；恢复按 plan + bundle。
- **claim 验证不动**：D44 的 critic subagent 路径不变；本卡不把 verdict 搬进 workflow。

## 关闭条件

- A1–A12 全绿；P3/P4 证据进 Note；用户验收（pack 公共行为 + pilot 结果）。
- `notes/implemented/2026-11-10-wave-execution-lens-fanout.md` 同变更写就：决定、输掉的方案（引本卡）、
  实际跑过的验证、残余风险（schema 税/递归/manual 继承/卡预算/驾驶舱缺口）。
- D45 登记；docs/design/30、design/20、pack README 同 diff；卡 `可关闭：是` 后 `git mv` 归档，
  `_backlog/issues/README.md` 移行；wave research 题名页按「消费者离开」决定是否迁 `_archived/research/`。
- 硬线失败（A10）→ 回 `推敲中` 或 `等人拍板`，附读数与重议条件；不硬收、不静默归档。
