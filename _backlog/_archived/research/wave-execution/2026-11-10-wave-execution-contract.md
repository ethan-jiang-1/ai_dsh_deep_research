---
topic: Wave 执行：把同质层编译成 workflow（固定配方 + 报告）
intent: 在 lens 层与 claim-verdict 已落地、workflow 机制已逐源核过的前提下，重估 workflow 的挂点与范围，给出可落地的单配方执行合同、容量/失败/HITL/证据合同与试点判据。
---

# Wave 执行：把同质层编译成 workflow（v2）

> 性质：机制事实 + 设计合同。机制同 pin = `dsh-v0.2.1-rc.5` @ `b830ec950f`；升 pin 后按
> [discipline-map](../../../../docs/discipline-map.md) 复核。事实段带 vendor 源码/文档锚点；建议段标「建议」。
> **v2 相对 v1 的修正**：① 不是所有扇出层都值得脚本化——v2 只保留 **deep-dive 的 lens×topic 取证层**；
> ② claim 验证**不**搬进 workflow（critic subagent + verdicts 已落地）；③ 挂点由 A（独立
> `wave-runner` preset）改判 **B（analyst 承载）**；④ 新增「child 写产物 + 结构化回执 + 父级对账」
> 三段式；⑤ 新增 `waves/<wave>.json` 执行报告；⑥ 计划面**不加列**，用 `## Wave 执行` 节。
> 相关：[channel-policy v2](../orchestration-primitives/2026-11-10-channel-policy.md) ·
> [lens-as-data v2](../lens-abstraction/2026-11-10-lens-as-data.md) ·
> [claim-verdict 卡](../../../issues/2026-11-10-claim-verdict-quality-loop.md) ·
> [落地卡](../../settled_issues/2026-11-10-wave-execution-lens-fanout.md)。

## 0. 一句话

Wave 是计划层的拓扑投影，不是执行器。真正值得脚本化的只有**同质、独立、产物自足、无 HITL**的
deep-dive 取证层：一个 topic × 一个 lens = 一个 cell，N 个 cell 由固定配方 `lens-fanout` 扇出，
child 各写一张八字段证据卡，analyst 执行器对账后写 `waves/W<n>.json`。**建议**把 workflow 挂到
**analyst preset**，由 Lead `subagent(agent_preset=analyst)` 派一个执行器；**不新增 preset、不改
D2 角色数、不改 plan schema、不搬 claim 验证**。workflow 仍是「同质叶层执行器」，不是主编排器。

## 1. 这轮新增的机制事实（v1 没有的）

### 1.1 `agent()` 有结构化输出，不是只能收文本

- 合法 opts 闭合集 = `label / phase / schema / provider / model`
  （`vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts:32-35`）。**没有 `agentPreset`**。
- 带 `schema` 时，child 侧自动挂 `structured_output` 工具 + 一条 prompt 指令；child 必须显式调用它，
  否则即使 child 正常完成，`agent()` 也返回 `null`
  （`runtime.ts:207-220`；`packages/subagent/subagent/src/structured.ts:18-29,83-107`）。
- spawn provider 声明 `outputSchema` 能力（`packages/subagent/subagent-spawn-in-process/src/index.ts:34-42`），
  所以这条在本仓组合里可用；schema 是 object-rooted，支持
  `type/properties/required/additionalProperties/items/enum/const/oneOf`。
- **设计后果**：child 的「回执」可以是 typed JSON，不再需要从散文里猜；但**回执 ≠ 产物**。child 必须
  先写证据文件、再调 `structured_output`——`structured_output` 一旦提交会关闭后续工具调用
  （`structured.ts:104,119-121`）。

### 1.2 workflow child 不在父的 subagent catalog，也不给父发 completion notice

- child 走 `startActivation`，`delivery: 'caller'`
  （`vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:200-228`）。
- workflow 的 README 明确：workflow「records its own members and collects their results without adding
  them to the parent's subagent catalog or sending child settlement notices to the parent model」
  （`vendor/dsh/packages/workflow/workflow-ptc/README.md` §Results and failures）。
- **设计后果**：Lead 看不到 workflow child 的完成通知，也不能用 `send_message` 找它们；**唯一可信的
  回传面 = executor 自己写的文件**。executor 不能把「脚本返回了」当成「Lead 知道了」。

### 1.3 workflow run 的 durable 记录只落在 executor 会话，不在 Lead 会话

- `tool-workflow` 在顶层 transport 执行时写四条 log-only 事件：`tool-workflow/run-start` /
  `agent-start` / `agent-end` / `run-end`（`packages/workflow/tool-workflow/src/index.ts:89-151`；
  `src/types.ts`）。`phase()` / `log()` 没有 per-line durable surface（`tool-workflow/README.md`
  §Durable session records）。
- 这四条事件写在**调用 workflow 的 agent 的 session**——也就是 analyst executor 的会话，不是 Lead 的。
- **设计后果**：bundle 里必须有 executor 写的执行报告；Lead 的 journal 只写一行摘要 + 报告路径。
  想看 child 生命周期，去 executor 会话查 `tool-workflow/*`，不要指望 Lead 会话里有。

### 1.4 工具结果的 schema 有 `runId`，但模型看到的渲染文本没有

- foreground 结果 **schema** = `{kind:'foreground', runId, agentsStarted, result}`
  （`tool-workflow/src/index.ts:378-407,462-467`）；但 `render` 只输出
  `workflow "<name>" completed (<N> agents). Return value: …`——模型看到的是渲染文本，
  **看不到 `runId` 字段**。P3 实测（2026-11-10）确认：executor 只能报 `completed (1 agent)`，
  `runId` 只出现在 executor 会话的 `tool-workflow/run-start` 事件里。
- `agentsStarted` 是「尝试启动的 agent 数」，不是成功数，且渲染文本只给 `(N agent)`；
  读不到就写 `null`，不要编造。
- **设计后果**：报告写 `run_id: null` + `run_id_note`（或由 Lead 从 executor 会话事件补），
  `agents_started` 从文本读；**不要伪造 `child_ids` / `run_id`**。需要 child 证据时，用
  `session_query` 查 executor 会话。

### 1.5 脚本是纯沙箱：没有 fs / network / timer / Node API

- 工具描述原文：「The script has no filesystem, network, timer, or Node.js APIs; the agents do the work.」
  （`tool-workflow/src/index.ts:158-166`）。
- **设计后果**：配方不能预读 lens、不能检查文件是否存在、不能写报告；这些全是 executor / child 的活。
  脚本只能校验 `args`、拼 brief、调 `agent()`、收结构化结果。

### 1.6 caps 是 engine 级配置，不是单次调用参数

- `maxConcurrentAgents` 默认 `0 → min(16, max(1, cores-2))`；`maxTotalAgents` 默认 1000；
  `maxItemsPerCall` 默认 4096（`packages/workflow/workflow-ptc/src/index.ts:32-44,106-148`）。
- `WorkflowStartRequest` 可以降 `maxTotalAgents`，但 **`tool-workflow` 不向模型暴露这个字段**；模型只能
  通过 preset 里的 engine config 间接决定（`tool-workflow/src/index.ts:409-442`）。
- **设计后果**：`maxConcurrentAgents` 写进 preset（建议 4），不要指望模型在每次调用里压并发。

### 1.7 child 加入「调用者」的当前 preset 修订；team 队友加入 Lead

- workflow child：`composeFrom` 调用者，无独立 preset（`host.ts:200-228`；
  `packages/subagent/subagent/src/child-agent.ts:186-202`）。
- team teammate：`startActivation` 不带 `agentPreset`，`composeFrom` Lead
  （`packages/experimental/agent-team/src/roster.ts:264-274`）。
- 只有 `tool-subagent` 的 `agent_preset` 能钉独立 preset
  （`packages/subagent/tool-subagent/src/index.ts:320-327`）。
- **设计后果**：如果希望在 workflow child 里保留 analyst 的 persona + evidence-extraction，**执行器本身
  必须是 `agent_preset=analyst` 的 spawn child**；team 里的 analyst 队友是 Lead 组合，**没有**
  analyst preset 的 workflow 行。B 的调用链是 Lead → spawn analyst → workflow child，不是 Lead →
  teammate → workflow。

### 1.8 深度闸：subagent 有，workflow 没有

- workflow child 不传 `maxDepth`，服务只 stamp `parent+1`，不做上限检查
  （`packages/subagent/subagent/src/manager.ts:384-387`；`child-agent.ts:54-57`）。
- 但 child 自己看得到 `tool-subagent`；到达 cap 时会收到 runtime 提示
  「Delegation depth for `subagent`: current N, maximum N, remaining levels 0. Do not call `subagent`
  at this depth; carry out the work directly.」（`tool-subagent/src/index.ts:388-393`）。
- **设计后果**：B 的 child 是 analyst 克隆，带 `tool-subagent`，但 depth 2 时会被机械拒绝（且有提示），
  不会真的再派一层；**workflow 递归没有机械闸**，只能靠 brief + tool policy + 试点观察。

### 1.9 政策句是 prompt，不是闸；HITL1 卡是唯一授权点

- 原文：「Use the `workflow` tool ONLY when the user explicitly asks for a workflow or for large
  multi-agent orchestration」（`tool-workflow/src/index.ts:326-330`）。
- **设计后果**：Lead 在计划卡正文点名 `W<n> 脚本扇出 ×N`，用户点「按计划开跑」= explicit ask；
  不新增第四问、不新增选项。卡上没点名的层，即使 Lead 自己觉得同质，也不得跑脚本。

### 1.10 child 继承 host 级手册是「应然」，仍待 live 证

- `research:manual` 是 host 级 `systemPrompt.context`（`packages/deep-research-pack/cordis.patch.yml:103-104`；
  `src/content/index.ts:65-72`），所有 host 下 Agent 都应按 scope 看到。
- 但**没有**在真模型请求里抓过 workflow child 的 `request/header` 快照（v1 探针 P2 只到源码级）。
- **设计后果**：brief 必须自带证据八字段与边界；lens 传**绝对路径 + 压缩 digest** 双保险。pilot 第一场
  抓 child header，红就把 digest 升为全文。

## 2. 三张图与两个边界（不重新论证，只钉口径）

| 图 | 回答 | 载体 | 谁写 |
|---|---|---|---|
| 工作图 | 哪些节点、谁先谁后 | `plan.md`（canonical） | Lead |
| 执行图 | 这一刻谁在跑、跑到哪 | Team 任务板 / `waves/W<n>.json` / executor 会话 | Lead / analyst |
| 证据图 | 哪条结论由哪张卡支撑 | `evidence/*.md` + `findings.md` | child / analyst / Lead |

- **Wave = 工作图的层号**，不是任务、不是执行状态、不是证据覆盖。`W2` 是层，`W2.1` 是节点。
- **cell = topic × lens × depth**；一个 cell 一次可执行单元。lens 目录已落地（D43），cell 可以传路径。
- **执行层可换，计划层不换**：脚本跑完不改变 `plan.md` 的节点身份；只多一份 `waves/` 报告。

## 3. v2 的范围：只脚本化 deep-dive 取证层

判据四条，缺一不可：

1. **同质**：每个 cell 的输入 brief 形状一致、输出 schema 一致；
2. **独立**：cell 之间没有中途协商；
3. **产物自足**：每个 child 自己写一张证据卡，父级只收路径 + 摘要；
4. **无 HITL**：这一层不需要人拍板。

按判据切现有生命周期：

| 层 | v2 裁决 | 理由 |
|---|---|---|
| broad-scan（方向/来源族） | **不做** | 方向之间会互相启发；scout 是对话型角色；给 scout 挂 workflow 会多付一份 schema 税，且没有证据卡可对账 |
| deep-dive（topic × lens 取证） | **做（唯一配方）** | 同质、独立、产物自足、无 HITL；lens 已落地；evidence 八字段已有契约 |
| claim 验证 | **不做** | 已有 critic subagent + `claim-verdict` + `verdicts-r<N>.json`（D44 在落地）；role fidelity 与只读语义都比 workflow 克隆强 |
| synthesis / review / gate / reader | **不做** | 需要跨 cell 判断、取舍、叙事、拍板；单一 owner、强顺序 |
| 交付 | **不做** | HITL2 / present / 回执 |

> 这条收窄是本轮最重要的结论：v1 的「扇出层可脚本化」把 scan 和 claim 都算进去了；v2 只留
> deep-dive。**脚本化的价值必须落在证据卡质量上**，不是「用上 workflow」。

## 4. 挂点重估：A（新 preset）vs B（analyst 承载）vs C（Lead）

| 方案 | 形状 | 新事实下的优点 | 新事实下的代价 | 裁决 |
|---|---|---|---|---|
| **A. 独立 `wave-runner` preset** | 薄 preset：fs / skill / web / time / `workflow-ptc` + `tool-workflow`；无 subagent / ask / present / goal | 只有 wave 会话付 workflow schema；child 工具面最干净（无 subagent） | 第 6 个 preset：D2 角色数哨兵（`tests/pack/presets.test.mjs` 断言 5）、roster/UI 多一行、`l4-lite` 全角色 PROMPTS 必须加、snapshot scene 角色集要处理；child **没有** analyst 的 evidence-extraction，方法必须由 brief 重新携带 | **fallback** |
| **B. analyst 承载** | analyst preset 加 engine + tool group；Lead spawn `agent_preset=analyst` 作执行器 | **不新增 preset、不改 D2、不改 roster、不改 l4-lite PROMPTS、不改 snapshot 角色集**；child 直接继承 analyst persona + evidence-extraction skill；执行器本身是 analyst，方法不用 brief 重新发明 | 每个 analyst 请求付 workflow schema（约 2.5KB 文本，~700 token）；child 带 `tool-subagent`（depth 2 被机械拒绝，有 runtime 提示）与 `tool-workflow`（递归只能靠合同挡）；analyst 需要一条「不得自行发起」的边界句 | **推荐** |
| **C. Lead 承载** | Lead preset 加 engine + tool | 不改 roster | child 是 Lead 克隆：带 ask/present/goal，丢 analyst 方法；HITL 语义最脏；Lead 自己跑脚本会阻塞主编排 | **否决** |

**为什么从 A 改判 B**（v1 推荐 A）：

1. **lens 层已落地**，B 的 child 天然拿到 evidence-extraction 与 analyst 的取证纪律；A 的 child 只有
   wave-runner 的「按 brief 执行」，证据卡质量靠 brief 重新说一遍。
2. **A 的隐藏成本比 v1 估的高**：新增 preset 不只是「多一个文件」——D2 数量哨兵、`presetRoles` 全量
   smoke、`l4-lite` PROMPTS、snapshot 角色集、roster/UI 文案都要同 diff 处理。B 只动 analyst 一个
   preset 行 + 一个新 skill；snapshot 只重录 analyst 一例。
3. **B 的 schema 税可测**：workflow 工具 schema 约 2.5KB 文本；analyst 请求通常 10–20KB，量级
   3–7%。试点用 `request/header` 记 token 差；若 >5% 且脚本层使用率 <1/3，再考虑 A。
4. **B 的 team 误用已排除**：team 队友是 Lead 组合，没有 analyst preset 的 workflow 行；所以 B 的
   调用链必须显式 spawn analyst。这个约束写进 skill 与 pilot，不会悄悄走错。
5. **A 唯一的硬优势**是 child 不带 subagent；但 B 的 child 在 depth 2 会收到 subagent 的 depth 提示，
   机械上不能再派，实际退化成一个一次性的证据 worker。A 的优势不足以抵消 preset 的公共面成本。

**B 的调用链（建议）**：

```
Lead（plan 里的 W2 同质层 + 计划卡点名）
  └─ subagent(agent_preset=analyst, prompt=wave brief)   ← depth 1，executor
       └─ workflow(script=lens-fanout, args={wave,cells,...})
            ├─ agent(cell 1) → child（analyst 克隆，depth 2）→ evidence/T1-official.md
            ├─ agent(cell 2) → …
            └─ agent(cell 4) → …
       └─ executor 对账 → waves/W2.json → 返回摘要
  └─ Lead 读 waves/W2.json + 抽查证据 → 更新 plan/journal
```

> 注意：team 的 `spawn_teammate` 不能替代这条链——队友是 Lead 组合，不是 analyst preset。
> 只有 `subagent` 的 `agent_preset` 能钉 analyst。

## 5. 执行合同

### 5.1 计划面：加一节，不加列

`plan.md` 模板加一个 **`## Wave 执行`** 节（人可以读、模型可以读、`plan-index` 不解析）：

```
## Wave 执行

<!-- 只写同质、独立、产物自足、无 HITL 的层；一层一个通道；v1 最多一层。 -->
- W2：`lens-fanout` ×4；executor = analyst（spawn，depth 1）；
  cells = T1×official, T1×quant, T2×practitioner, T2×adversarial；
  报告 = waves/W2.json
```

- 节点表**不加 `engine`/`channel` 列**：`planIndex` 只读已知列
  （`packages/deep-research-pack/src/lib/plan-index.ts:137-181`），加列不解析 = 假字段；驾驶舱也不读。
- 脚本扇出的节点在 `task_id` 写 **`plan-only`**：executor 是 spawn child，不是 Team 成员，Team 板
  没有它的任务；`## Wave 执行` 是执行映射的正本。
- `output` 列写 `waves/W2.json + evidence/t1-*.md`；`acceptance` 写「4 个 cell 全部有文件 + 八字段 +
  报告计数一致」；`budget` 写 `N=4（workflow；maxConcurrentAgents=4）`。
- 计划卡的正文点名 `W2 脚本扇出 ×4`；不新增选项、不新增交互（§7）。

### 5.2 配方面：一个固定文件，不是每次现写

**建议**新增 `packages/deep-research-pack/content/waves/lens-fanout.js`，作为**脚本 body 的唯一正本**。
analyst 执行器用 `read` 读它，把全文作为 `workflow.script` 传入；`args` 只放数据。

为什么不是把脚本写进 skill：

- 脚本是可测试的代码；文件可以被 keyless 测试解析、跑 mock、做反证；
- skill 里写一大段 JS，模型每次抄写会漂移；固定文件把「过程」变成数据；
- `content/**` 已在 `package.json` 的 `files` 白名单内，随包发布。

**args schema（脚本入口强校验）**：

```json
{
  "wave": "W2",
  "bundle_dir": "/abs/path/drt_slug",
  "cells": [
    {
      "id": "T1-official",
      "topic": "T1",
      "question": "这个 topic 要回答什么",
      "lens": "official",
      "lens_path": "/abs/.../content/lenses/official.md",
      "lens_digest": "seek: … | verify: … | frame: … | refuse: … | bias: … | blind_spots: …",
      "output_path": "/abs/path/drt_slug/evidence/t1-official.md",
      "budget": "最多 3 次搜索、6 次抓取",
      "boundaries": "只按该 lens 的证据面取证；不合成、不下 verdict"
    }
  ]
}
```

- `wave` / `bundle_dir` / `cells` 必填；`cells` 1–8（v1 pilot 4）。
- 每个 cell 必填 `id/topic/question/lens/lens_path/output_path`；`lens_digest`/`budget`/`boundaries`
  可选但建议给。
- 脚本第一段做**显式校验**：缺字段、类型不对、cells 空/超 8 → `throw new Error(...)`，让 workflow
  run 以 `error` 结算，而不是静默跑 0 个 cell。
- 脚本**不做重试**；`agent()` 返回 `null` 就记 `null`，由 executor 对账。

**脚本骨架（实现时以文件为准）**：

```js
const cfg = args && typeof args === 'object' ? args : null;
if (!cfg || typeof cfg.wave !== 'string' || !Array.isArray(cfg.cells)) {
  throw new Error('lens-fanout: args.wave and args.cells are required');
}
if (cfg.cells.length < 1 || cfg.cells.length > 8) {
  throw new Error('lens-fanout: cells must be 1..8');
}
// …逐 cell 校验必填字段…

const SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'partial', 'failed'] },
    path: { type: 'string' },
    evidence_count: { type: 'integer' },
    gaps: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['status', 'path'],
  additionalProperties: false,
};

phase('lens-fanout');
log(`wave ${cfg.wave}: ${cfg.cells.length} cells`);

const rows = await pipeline(cfg.cells, async (cell) => {
  const result = await agent(briefOf(cell), {
    schema: SCHEMA,
    label: `${cfg.wave}:${cell.id}`,
    phase: 'lens-fanout',
  });
  return {
    id: cell.id,
    topic: cell.topic,
    lens: cell.lens,
    path: cell.output_path,
    child_status: result === null ? null : result.status,
    result,
  };
});

const cells = rows.map((row, index) => row === null
  ? { index, id: cfg.cells[index].id, status: 'failed', error: 'pipeline item dropped' }
  : {
      index,
      id: row.id,
      topic: row.topic,
      lens: row.lens,
      path: row.path,
      child_status: row.child_status,
      status: row.result === null ? 'failed' : row.result.status,
      evidence_count: row.result?.evidence_count ?? 0,
      gaps: row.result?.gaps ?? [],
      ...(row.result === null ? { error: 'agent returned null' } : {}),
    });

const counts = cells.reduce((acc, cell) => {
  acc[cell.status] = (acc[cell.status] ?? 0) + 1;
  return acc;
}, {});

return { wave: cfg.wave, recipe: 'lens-fanout', requested: cfg.cells.length, cells, counts };
```

**child brief 必须包含**（脚本拼）：

1. 角色：你是 analyst 执行器的证据 worker；只做这一层，不综合、不下 verdict。
2. run bundle / wave / cell / topic / lens / question。
3. lens 绝对路径 + digest；要求先 `read` lens 文件。
4. `output_path`（绝对路径）。
5. 证据八字段契约：`source_url / retrieved_at / quality / found_by / supports / source_tier / publisher / lens`；
   正文「逐字摘录」与「解读」两节分开。
6. 预算（搜索/抓取上限）与来源边界。
7. **顺序**：先取证并写文件 → 再调 `structured_output` 一次；`status` 只填 `ok|partial|failed`。
8. 禁止：调 `workflow`、调 `subagent`、向用户提问、改 `plan.md`、写 `final.md`。
9. 需要拍板/越过边界 → 写进 `gaps`/文件 `说明`，由 executor 汇总给 Lead；不要在 child 里等。

### 5.3 证据与报告面：child 写卡，executor 对账

**child 产物**：`evidence/<cell>.md`，八字段齐全；一卡一面；路径由 args 指定，child 不得改名。

**executor 报告**：`waves/W2.json`（bundle 内，新目录/文件），形状：

```json
{
  "schema": 1,
  "wave": "W2",
  "recipe": "lens-fanout",
  "plan_version": "v3",
  "run_id": null,
  "run_id_note": "rendered tool result does not expose runId; recover from executor session tool-workflow/run-start if needed",
  "agents_started": 4,
  "stop_reason": "completed",
  "requested": 4,
  "counts": { "ok": 3, "partial": 1, "failed": 0, "missing": 0 },
  "cells": [
    {
      "id": "T1-official",
      "topic": "T1",
      "lens": "official",
      "path": "evidence/t1-official.md",
      "child_status": "ok",
      "status": "ok",
      "evidence_count": 3,
      "gaps": [],
      "note": "",
      "extra_output_files": [],
      "reported_path": "evidence/t1-official.md"
    }
  ],
  "errors": [],
  "recorded_at": "2026-11-10T09:00:00+08:00"
}
```

**对账规则（executor 必须逐 cell 做）**：

| child 回执 | 文件事实 | executor 的 `status` | 处理 |
|---|---|---|---|
| `ok` | 文件在、八字段齐 | `ok` | 收 |
| `ok` | 文件在、字段缺 | `partial` | 记缺哪项；不静默补 |
| `ok` | 文件不在 | `missing` | 记 `missing`；不把回执当证据 |
| `partial` | 文件在/缺 | `partial` / `missing` | 按文件事实 |
| `failed` | 文件在且八字段齐 | `ok` + `note` | 文件事实优先，记 child 自报失败 |
| `failed` / `null` | 文件不在 | `failed` | 记失败；不重试 |
| `null` | 文件在且八字段齐 | `ok` + `note: no structured receipt` | **不要因为回执丢失就丢产物** |

- `counts` 由 executor 按最终 `status` 重算，不直接抄脚本的 counts。
- `stop_reason`：工具调用成功 = `completed`；工具报错 = `error`；被取消 = `cancelled`。不要因为
  渲染文本没有 `stopReason` 字段就写 `null`——成功与否由工具结果本身（ok/error）判定。
- child 可能在 `output_path` 之外另写同 lens 拆卡：该 cell 记 `extra_output_files[]`，
  `evidence_count` 按全部文件计；child 报的 path 与 args 不同就记 `reported_path`。
- 工具报错时也要写报告：`requested` 从 args 抄，`cells` 可空或只含已知，`errors` 写错误原文；
  **不得**写「绿」。
- `run_id` 通常在模型可见结果里没有（§1.4）；写 `null` + `run_id_note`，需要时由 Lead 从
  executor 会话的 `tool-workflow/run-start` 取。`agents_started` 从渲染文本的 `(N agent)` 读，
  读不到写 `null`；`plan_version` 从 plan 头部抄；`recorded_at` 用 time-context 读数。
  抄写错误由 Lead 抽查发现，不进机械门（v1）。

**谁读**：Lead 读 `waves/W2.json` + 抽查至少一张证据卡；critic 在报告级审查时读同一份；驾驶舱 v1
**不读** `waves/`（已知缺口，见 §10）。

### 5.4 失败/恢复合同

| 失败 | 脚本行为 | executor 行为 | bundle 留下什么 |
|---|---|---|---|
| 单个 child 失败 | `agent()` → `null`，该 cell 记 `failed` | 对账；`failed` 不重试 | 其他 cell 的证据卡 + 报告里的失败项 |
| child 正常完成但没调 `structured_output` | `agent()` → `null` | 查文件；文件在八字段齐 → `ok` + note；不在 → `missing` | 同上 |
| 脚本/args schema 写错 | 抛错 → workflow `error` | 写 `stop_reason:error` 报告；回报 Lead | 无半成品；run 未成立 |
| `AGENT_START`（槽位不足/provider 启动失败） | fatal，整脚本失败 | 不重试；Lead 把该 wave 标未执行，退回 Team/subagent 或缩 N | 其他已写文件仍在 |
| `AGENT_CAP` / `ITEM_CAP` | fatal | 同上；检查 `maxTotalAgents` / cells 数 | 同上 |
| 父 step 取消/中断 | 整个 run 取消，dispose children | 写 `cancelled` 报告或至少 journal 一行；从 bundle 恢复 | 已写文件是唯一事实 |
| 脚本绿但结果差 | `completed` | critic/Lead 判质量；不因「脚本绿」算研究绿 | 证据卡 + 报告是证据，不是 verdict |

**没有 durable 图**：脚本跑是一次执行尝试，不是状态。`plan.md` 仍是 canonical；恢复时按 plan + bundle
重建，不按 workflow run 恢复。

### 5.5 HITL 与授权

- **HITL1**：计划卡正文点名 `W2 脚本扇出 ×4（workflow）`；用户点「按计划开跑」= explicit ask。
  不新增第四问、不新增选项、不新增交互点。
- **HITL2**：不变；交付/补研究/改说法仍三点。
- 脚本运行中**没有 HITL**；child 不能 ask（`DELEGATED_CALLER`），也不该 ask。需要拍板的写 gap，
  由 Lead 在 wave 结束后统一问。
- **计划卡没点名的层不得跑**；Lead 自己加的同质层不算授权。用户在修订意见里明确说「用脚本扇出」
  = 新的 explicit ask，可跑；Lead 不能在修订里自行加。
- v1 一场 run **最多一个 workflow 层**；多层留给试点后另判。

**计划卡措辞（建议，实测按 `scripts/lib/plan-card.mjs` 口径）**：

```
问题：<一句话>。方法：<方法>（视角：<偏离才写>）。
图：T1–T4；W1 扫描 → W2 脚本扇出 ×4 → W3 综合 → W4 审查；最深 L2。
口径：<关键约束>。全文 = question.md / topics.md / plan.md。
```

- 现有 4 张卡实测 171 / 183 / 193 / 200 字（2026-11-10 `plan-card-stats.mjs`）；加「W2 脚本扇出 ×4」
  约 10 字，**必须同步删次要项**（如逐个 topic 名压成 `T1–T4`）。
- 选项仍是「按计划开跑 / 修订计划 / 放弃」；不改标签。

### 5.6 容量合同

```
活子代槽数 = teammate 数 + 1（analyst executor）+ N（workflow 并行 child）≤ maxActiveSubagents（默认 8）
Lead 是 root，不占槽；team 队友、executor、workflow child 共享同一个 root 池。
workflow 的 maxConcurrentAgents 写进 analyst preset（建议 4）；maxTotalAgents 建议 8（runaway backstop）。
```

- 试点：team = scout + critic（2）+ analyst executor（1）+ N=4 = **7 槽**，留 1 槽余量。
- 若 team 有 4 个队友（scout + 2 analyst + critic），4 + 1 + 4 = 9 > 8 → 必炸；此时 N 必须降到 3，
  或缩 team。**先算槽，再写 N**。
- workflow child 是 depth 2；executor 是 depth 1。team 队友（depth 1）与 executor 同时活跃；不要
  在同一 wave 里再派 subagent worker。
- `maxActiveSubagents` 是 host/volatile 设置；v1 **不提**到 12（产品面变更），先按 8 槽试点。

### 5.7 观察与留痕

- **Lead journal**：一行 `W2 脚本扇出：run_id=…，ok=3/partial=1/missing=0，报告=waves/W2.json`。
- **plan**：`## Wave 执行` 节 + `task_id=plan-only` + `output` 指报告。
- **executor 会话**：`tool-workflow/*` 四条 log-only 事件；需要 child 细节时用 `session_query`。
- **驾驶舱**：v1 不读 `waves/`；图里只看得到 plan 节点与 `plan-only`。这是已知缺口，不是本卡交付。
- **不新增机械门**：报告是模型写的，重算文件事实才能判真假；v1 靠 Lead 抽查 + critic 语义审。
  触发条件：连续 2 场报告与文件事实不一致 → 评估 `waves-audit` 门（另卡）。

## 6. 成本模型

- workflow child 与 teammate 都是完整 agent；**脚本省的是协调 token**（任务板、消息、wait、
  reassign），不是研究 token。
- Anthropic：multi-agent ≈ 15× chat；BrowseComp 上 token 单独解释 80% 方差。**宽度是主要成本杠杆**，
  不是「用不用脚本」。
- B 的 schema 税：workflow 工具描述 + schema + prompt section ≈ 2.5KB 文本（~700 token）/analyst 请求。
  analyst 请求通常 10–20KB；量级 3–7%。试点记 `request/header` 的 token 差，作为 A/B 回退判据。
- structured output 给每个 child 增一个 `structured_output` 工具 + 一条指令；child 本来就要写文件，
  增量主要在 tool schema 与一次工具调用，不在研究 token。
- **并行只改变墙钟，不改变 token**；不要用「并行」当省钱理由。

## 7. 与既有方向的交叉口径

- **lens（D43）**：cell = topic × lens；evidence 八字段；同 topic ≥2 lens 默认独立 activation。本卡
  直接消费，不重新定义 lens，不改覆盖表/门。
- **claim-verdict（D44 在落地）**：claim 验证走 critic subagent + `verdicts-r<N>.json`；**不进
  workflow**。workflow child 是 analyst 克隆，不是 critic；只读/角色保真都不如 critic subagent。
- **channel-policy v2**：Team 主控、subagent 做角色保真的一次性验证、workflow 只做同质叶层执行器、
  goal 只做跨轮记账；本卡不改这条总表，只把 workflow 的挂点从 A 改判 B。
- **旧卡 `2026-11-10-workflow-wave-executor`**：本卡承接 wave 执行切片；旧卡保留 channel-policy
  记录与 goal pause/resume 缺陷（`GOAL_TOOL_RESUME_PAUSED`），不在本卡修。

## 8. 备选与否决

| 方案 | 否决/保留理由 |
|---|---|
| 每层现写脚本 | 不可审计、schema 错误 fatal、无法回归；v2 用固定 `lens-fanout.js` |
| 把整场 run 编成一个脚本 | 丢 HITL、动态重写、综合与拍板；workflow 只做叶层 |
| scan 也脚本化 | 方向之间互相启发；scout 对话型；schema 税；v1 不做 |
| claim 验证脚本化 | 已有 critic subagent + claim-verdict；role fidelity/只读更强；不做 |
| 新增 `wave-runner` preset | 公共面成本（D2/roster/l4-lite/snapshot）；B 已够；A 留 fallback |
| plan 加 `engine`/`channel` 列 | parser/驾驶舱/模板连锁；v1 用 `## Wave 执行` 节 |
| 驾驶舱 v1 接 `waves/` | 新增读面/投影/测试；先让报告落文件，观察需求再另卡 |
| v1 上 `waves-audit` 门 | 报告是模型写的；先试点两场，看是否真的漂 |
| 把 `maxActiveSubagents` 提到 12 | 产品面变更；先按 8 槽试点；撞顶再议 |

## 9. 试点配方（可直接执行）

**题目类型**：P5 多维对比 / P6 尽调，3 个证据 topic、每个 2 个 lens（official + quant 或
practitioner），cells = 4（不是 6：留 2 个给 Team 对照或成本余量）。若 topic 数不足，用 2 topic × 2 lens
= 4；不要为了凑数拆 cell。

**编制**：Lead（root）+ scout + critic（2 teammate）+ analyst executor（spawn，depth 1）+ workflow
child ×4（depth 2）= 7 槽。

**步骤**：

1. HITL1 计划卡正文写 `W2 脚本扇出 ×4`；`plan-card-stats` 复核 ≤200。
2. Lead 写 `## Wave 执行` 节；节点 `task_id=plan-only`；`output=waves/W2.json + evidence/t1-*.md`。
3. Lead spawn `agent_preset=analyst`，prompt 带：bundle 绝对路径、plan_version、4 个 cell 的
   `id/topic/question/lens/lens_path/output_path/budget/boundaries`、授权句、报告路径。
4. executor 加载 `wave-execution` skill、读 `content/waves/lens-fanout.js`、调 `workflow`（foreground）。
5. executor 对账、写 `waves/W2.json`、返回摘要；Lead 读报告 + 抽查 1–2 张卡。
6. critic 正常审查；证据覆盖仍按 D43 的 `topic × lens` 表。

**硬线（任一红 → 试点失败，回卡）**：

- 4 个 cell 中任一 cell 无文件且报告写 `ok` = 静默丢证据；
- `waves/W2.json` 缺席或 `counts` 与文件事实不一致；
- `ACTIVATION_LIMIT_REACHED` / `AGENT_START` fatal；
- 观察到 workflow child 再起 workflow（递归），或 executor 自己派 subagent worker；
- 计划卡 >200 字；
- 峰值活子代 >8。

**观测指标**：

| 指标 | 口径 | 期望 |
|---|---|---|
| 覆盖 | 4 个 cell 的 evidence 文件 | 4/4 八字段 |
| 对账 | `counts` vs 实际文件 | 一致；`missing=0` |
| 失败 | `failed`/`missing` 数 | 0（硬线）；>0 必须记录 |
| 槽位 | executor 会话 `tool-workflow/agent-start` 峰值 | ≤8；不撞 `ACTIVATION_LIMIT_REACHED` |
| 递归 | child 会话里是否有 `workflow` 工具调用 | 0 |
| 越权派工 | executor 会话里是否有 `subagent` 调用 | 0 |
| 成本 | 与 team-only 基线比 token/墙钟 | 记录；token 不显著高于基线 |
| 质量 | critic 审查的 MAJOR/CRITICAL | 与 team-only 基线同量级；不因脚本绿放松 |
| 卡 | 计划卡字数 | ≤200 |

**基线**：优先用同题/同 lens 的 team-only run（`drt_ds-vs-bailian-longctx` 可作为方法参照，但不是同题）；
没有同题基线时，记录绝对读数并注明「无对照」，不伪造比较。

## 10. 什么会改变结论

- **B 的 schema 税 >5% analyst 请求 token，且脚本层使用率 <1/3** → 重估 A（新 preset），把 workflow
  从常驻 analyst 移走。
- **child 读不到 lens 路径 / manual** → brief 的 `lens_digest` 升为全文；B 仍成立，brief 成本上升。
- **观察到 workflow 递归** → 先加合同/提示；仍发生 → 评估机械 guard（host 小插件，另 D）或收回
  workflow（只留 A 的薄 preset，child 工具面仍带 workflow，需 guard 才根治）。
- **真实并发撞 8 槽** → 缩 N/team，或把 `maxActiveSubagents` 提 12（产品面变更，另卡）。
- **structured output 模型不稳定**（大量 `null` 但文件在）→ 降级为「文件 + 文本回执」，schema 只做
  可选加速；对账仍以文件为准。
- **vendor 给 `agent()` 加 `agentPreset`**（升 pin）→ B/A 的 child 保真问题消失；可重新评估「每 cell
  钉 analyst/critic」；本结论重审。
- **vendor 给 workflow 加 durable 图/暂停/HITL** → 可以讨论更长流程；v1 的「一次执行尝试」结论重审。
- **claim 验证需要 workflow**（例如 critic 不可用）→ 另卡；不把 claim 塞进 lens-fanout。

## 11. 来源

- 机制（同 pin）：
  - `vendor/dsh/packages/workflow/tool-workflow/src/index.ts`（工具 schema、policy、record、结果封套）
  - `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts`（hooks、caps、fatal/null）
  - `vendor/dsh/packages/workflow/workflow-ptc/src/host.ts`（child start、catalog/notice）
  - `vendor/dsh/packages/workflow/workflow-ptc/src/index.ts`（engine config）
  - `vendor/dsh/packages/subagent/subagent/src/structured.ts`（structured_output）
  - `vendor/dsh/packages/subagent/subagent/src/activation.ts` / `manager.ts`（8 槽）
  - `vendor/dsh/packages/experimental/agent-team/src/roster.ts`（teammate composeFrom Lead）
- 仓内：
  - [channel-policy v2](../orchestration-primitives/2026-11-10-channel-policy.md)
  - [channel-probes](../orchestration-primitives/2026-11-10-channel-probes.md)
  - [lens-as-data v2](../lens-abstraction/2026-11-10-lens-as-data.md)
  - [claim-verdict 卡](../../../issues/2026-11-10-claim-verdict-quality-loop.md)
  - [旧 wave 执行卡](../../settled_issues/2026-11-10-workflow-wave-executor.md)
  - [落地卡](../../settled_issues/2026-11-10-wave-execution-lens-fanout.md)
- 外部（证据边界见 channel-policy §6）：
  - Anthropic multi-agent research: https://www.anthropic.com/engineering/multi-agent-research-system
  - Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents
  - LangGraph open_deep_research: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
