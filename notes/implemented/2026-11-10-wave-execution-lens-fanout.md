> 状态：implemented

# Wave 执行：analyst 承载的 lens-fanout（D45）

## 决定

把同质 deep-dive 取证层做成 **analyst 承载的固定 workflow 配方**，而不是新增角色、主编排器或第二个调度器：

- **范围**：只脚本化 `lens-fanout`（topic × lens 取证 cell）。scan、claim 级验证、综合、审查、交付
  **不脚本化**；claim 验证继续走 critic subagent + `verdicts-r<N>.json`（D44）。
- **挂点 B**：analyst preset 内挂 `workflow-ptc` + `tool-workflow`（同 group、`isolate:
  workflowEngine: true`、`maxConcurrentAgents: 4`、`maxTotalAgents: 8`、前台）。Lead 用
  `subagent(agent_preset="analyst")` 派 executor；**不用 `spawn_teammate`**（队友 composeFrom
  Lead，没有 analyst preset 的 workflow/skill）。
- **配方**：`content/waves/lens-fanout.js` 是脚本 body 唯一正本；args 显式校验（1–8 cell）、
  `agent()` 带 object schema、`pipeline` 按 cell 返回、`null` 不静默丢；child 写八字段 evidence，
  executor 对账写 `waves/<wave>.json`（`run_id` 常为 `null`，`stop_reason` 按调用成败）。
- **计划面**：`## Wave 执行` 节；该层节点 `task_id=plan-only`；**不加 engine/channel 列**。
- **HITL**：仍两点。HITL1 计划卡正文点名 `W<n> 脚本扇出 ×N`（≤200 字，选项不动）；HITL2 用
  `ask_user_question timeout: -1` 保持开放回合，goal 不 pause/resume（另一半决定 = 旧卡
  [2026-11-10-workflow-wave-executor](../../_backlog/_archived/settled_issues/2026-11-10-workflow-wave-executor.md) + [HITL2 Note](2026-11-10-goal-hitl-alignment.md)）。
- **容量**：`team + 1 executor + N child ≤ 8`；N=4 → team ≤3。不要按组队矩阵先招 4 人再跑 4 child。
- **测试资产**：配方 VM 契约、模型可见文本契约、preset 挂载/容量句、真模型 wave 探针。
- **探针**：`probes/behavior/wave-execution-probe.mjs`（单 analyst + 单 child；六判据；红对照
  `--role scout`）——改配方/挂载/skill 时跑它，不跑全量 run。

## 输掉的方案

- **A：独立 `wave-runner` preset**：child 没有 analyst evidence-extraction，方法要靠 brief 重带；
  还撞 D2 角色数、roster/UI、l4-lite PROMPTS、snapshot 角色集。B 的 schema 税可测，A 只作 fallback。
- **C：挂 Lead**：child 是 Lead 克隆，带 ask/present/goal、丢 analyst 方法；HITL 语义最脏。
- **把 scan 也脚本化**：scout 是对话型；给 scout 挂 workflow 多付 schema 税，且无证据卡可对账。
- **把 claim 验证搬进 workflow**：critic subagent 的角色保真、只读纪律与 `verdicts` 门是现有更强路径。
- **plan 加 engine/channel 列**：parser/驾驶舱/模板连锁；v1 用自由节。
- **改 `content/manual.md` 承载 wave 契约**：会触发全角色 snapshot 重录；契约住 skill + plan 模板。
- **v1 就上 `waves-audit` 门**：报告是模型写的；先试点，连续两场报告与文件不一致再立门。
- **host 小插件自动 pause/resume goal**：绕过 DSH「durable paused 归用户」的权限分割；HITL2
  开放回合已解决，不需要新机制。
- **为 pilot 抬高 `maxActiveSubagents`**：产品面变更；先缩 team/N。

## 实际跑过的验证

**keyless / L0**

- `pnpm verify` 全绿；`pnpm test` 1093 pass（wave 三件 = `wave-recipes` 5、`wave-contract` 4、
  `presets` 19；均带负例红→绿）。
- `node dev/render-overlay.mjs`；`pnpm verify` 的 `overlay-fresh` / `preset-structure` / `row-deps` 绿。

**真挂载 / 安装 / 模型行为**

- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：5 preset 真挂载 ALL PASS；
  `--role scout` 的 wave probe 红对照证明 workflow 不在 scout 工具面。
- `snapshot-replay-smoke`：lead/analyst 重录后 4 场景 ALL PASS（lead `codeAnchor=cc492a1` /
  analyst `6ada0e3`；C5 一行金标准人审重写）。
- `l4-lite-smoke`：全角色（含 method-editor）ALL PASS。
- `release-smoke --install-only`：ALL PASS（pack → 干净 profile → plugin add → 安装域
  preset-smoke 5/5 → remove/端口释放）——workflow peer 行安装域可解析。
- `wave-execution-probe`：ALL PASS（C1 header workflow / C2 tool-workflow 生命周期 /
  C3 waves 报告 requested=1 ok=1 / C4 八字段 / C5 child 不递归 / C6 executor 不调 subagent）；
  `--role scout` 红对照 5 处失败；端口 3120 回收。

**真模型试点（隔离 profile，不动默认 run 通道）**

- 1-cell direct analyst：`ok=1`，12KB 八字段证据卡；tool result 渲染不暴露 `runId`。
- 4-cell direct analyst：`requested 4 / ok 3 / partial 1 / failed 0 / missing 0`；12 张卡，
  同 lens 拆卡；无 `ACTIVATION_LIMIT_REACHED`；无递归。
- Lead→analyst spawn：Lead 首次误用 `spawn_teammate`（child 报 `TOOL_NOT_IN_SESSION`），
  更正为 `subagent(agent_preset=analyst)` 后成功；team-assembly + 测试已钉正确通道与「先算 8 槽」。

**P4 代理预演 + 用户验收 A**

- bundle = `research-workspace/drt_api-selection-ds-openai`；隔离 `wave-pilot` profile
  （`danger-full-access`，嵌套沙箱限制）。
- HITL1/计划卡代理作答并标「代理模拟」；计划卡 **193 字**、含 `W2 脚本扇出 ×4`；HITL2
  `tool/call` 实测 **`timeout: -1`**（seq 1114）。
- W2 `4/4 ok`（16 张证据卡）；W3/W4/critic 三轮后 **readiness PASS，CRITICAL 0 / MAJOR 0**；
  `final/v1.md` + `final/readable-v1.md` + present 落盘。
- 用户 **2026-11-10 选择 A**：接受代理交付的 `final/v1` + `readable-v1` 作为业务验收，不重跑
  全量；代理 HITL 与结果已在 question/journal 标注。P4 因此成立为「代理预演 + 用户验收 A」，
  不是用户在场的真 run。
- `run-accept` 修复后 **全绿**：`audit.md`（CRITICAL 0 / MAJOR 4）落盘；claim 裁决按当前
  claims 重做 r1（旧转录存 `verdicts-r1.superseded.json`），`verdict-audit` 8/8 critical 覆盖；
  `leads.md` A-6 补 A 级来源；`acceptance.md` / `delivered.json` / `node-gate.md` /
  `review/verdict-audit-r1.md` 已写。未 `--archive`（保留现场供复核）。

## 残余风险

- **环境**：`workspace-write` 下 PTC 需 OS `sandbox-exec`；本机 DSH 进程自身在沙箱中，嵌套
  `sandbox-exec` 被拒，试点用 `danger-full-access`。产品用户需非嵌套沙箱或显式 full-access；
  未把默认策略放宽。
- **模型可见结果不含 `runId` / `stopReason`**：报告写 `run_id:null`/按成败推导 `stop_reason`；
  真实 child id/run id 只在 executor 会话事件里，Lead 可用 session-query 取。
- **递归没有机械闸**：child 继承 `tool-workflow`；brief 禁令 + 探针/试点未观察到递归，但非机械
  保证。若复发，加 host guard 或收窄 tool 面（另 D）。
- **计划卡 200 字**：wave 行会挤占；试点 193 字合规，模板要求先删字再呈卡。
- **驾驶舱 v1 不读 `waves/`**：报告是文件；图只到 plan 节点。观察需求出现再另卡。
- **P4 不是用户在场 run**：用户以 A 接受代理交付；若后续要求“用户在场真 run”，仍需另跑。
- **claim-verdict 修复是操作侧重做**：旧 r1 转录与 claims 不同步；新 r1 由当前 claims 的
  critic child 原文重建，旧件存档；语义审仍归 critic/用户。

## 环境状态

- pack：`content/waves/lens-fanout.js`、analyst workflow group、`wave-execution` skill、
  Lead `research-planning`/`team-assembly`/`research-brief`、plan 模板 `## Wave 执行`、
  `package.json` peerDeps、`docs/design/30`、D45、design/20、pack README 已知限制。
- 测试：`tests/pack/wave-recipes.test.mjs`、`wave-contract.test.mjs`、`presets.test.mjs`；
  `probes/behavior/wave-execution-probe.mjs` + 索引/REAL_MODEL/README 消费列；
  snapshot lead/analyst 重录；`dev/research.overlay.yml` 生成物。
- 运行：`runtime/smoke-workspace/wave-execution-probe-last/`（探针留档）；
  `research-workspace/drt_api-selection-ds-openai/`（P4 代理交付 + acceptance 回执；运行数据不入库）。
- 默认 run 通道 3083 未被本卡停止/重启；隔离通道 3084 只用于试点。
