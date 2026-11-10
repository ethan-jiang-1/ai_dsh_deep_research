# research/ · 研究题（名头）与活跃材料

研究按**研究题**组织：一个研究题 = 一个目录 + 一张题名页（`README.md`）。题名页是这轮研究的
**名头**：它回答「研究什么、服务谁、长出了哪些卡、有哪些材料」。研究材料住在题名目录内；研究
收结、委托它的消费者离开后，整个目录原样迁入 [`_archived/research/`](../_archived/research/README.md)。

总流程见 [_backlog 入口](../README.md)；与 issue / bug 的边界见 [AGENTS.md](../AGENTS.md)。

## 一个研究题长什么样

```
research/
  README.md              ← 本页：活跃题名索引
  <slug>/                ← 研究题（目录名 = 稳定 slug）
    README.md            ← 题名页（不是研究正文）
    2026-..-<slug>.md    ← 研究正文
    ux/...               ← 同题资产
```

题名页模板（`> 归档：` 行只在归档后填）：

```markdown
---
status: 调研中
opened: YYYY-MM-DD
---

# <名头>：<一句话>

> 状态：调研中
> 问题：这轮研究要回答什么
> 消费者：<发起 / 使用它的卡、bug、Note 或授权工作；写链接>
> 产出的卡：<研究结论落地后新立的卡；没有写 —>
> 结论：—（已定性时写一句话或链接）
> 归档：YYYY-MM-DD（归档后补）

## 材料
| 文件 | 作用 | 日期 |
|---|---|---|
| [YYYY-MM-DD-<slug>.md](YYYY-MM-DD-<slug>.md) | 一句话作用 | YYYY-MM-DD |
```

## 状态

题名页 `status` 是研究题当前阶段的唯一家：`调研中 → 已定性`。`已定性` = 结论写进 `> 结论：` +
证据评审 + `产出的卡` 已链；归档靠目录 + `> 归档：` 行，**不设** `待定性/已归档` 状态。材料不设
status——材料的状态就是题的状态。

## 约定

- **slug**：小写 kebab-case，不带日期；归档不改名。已有目录名保持原名，题名页给可读名头。
- **研究正文**：`YYYY-MM-DD-<slug>.md`，frontmatter 首字段 `topic`、第二字段 `intent`，不写 `status`。
  文件名日期 = 材料首写日期；`topic` / `intent` 说这份材料自己，不替代题名页。题名页另有
  `status` + `opened`（初始 `调研中`），状态行 `> 状态：` 镜像；材料与题名页分工不混。
- **材料**：题名页必须逐份点名 `.md` 材料（`pnpm verify` 的 `backlog-liveness` 对账）；资产
  （图片、原型）在题名页里按目录或文件点名即可。题名页的 `> 状态` / `> 问题` / `> 消费者` /
  `> 产出的卡` 四行由门禁检查；`已定性` 另查 `> 结论：` 非空——缺一行就是名头没交代清楚。
- **消费者与产出的卡**：消费者 = 谁委托 / 使用这轮研究；产出的卡 = 研究结束后由它长出来的
  issue / bug 卡。两者都写相对链接，没有就写 `—`。「产出的卡」是研究 → 卡的反向线索；卡正文里
  再链回题名页，形成双向可回溯。
- **归档**：最后一个活跃消费者离开后，`git mv` 整个题名目录到 `_archived/research/<slug>/`；
  题名页补 `> 归档：YYYY-MM-DD`，`status` 保持 `已定性`（归档靠目录，不设 `已归档`），归档索引只加
  题名一行。材料正文不重写，只修搬迁所需的相对链接。归档后仍可被活跃卡引用；引用不等于让研究「复活」。

## 共享上下文（所有方向必读）

> 六个方向的共同底座。**新上下文先读完本节，再读方向 README**；方向 README 的「本方向上下文」只写增量。
> 目的：没有父会话历史的 agent 也能复述问题、事实、约束与已决项，不重新论证、不猜路径。

### 1. 这次研究要回答什么（用户 2026-11-10 原始约束）

- 对象 = `packages/deep-research-pack/presets` 这一层，不是整个 pack；只关心这个子目录好不好。
- 要充分利用 DSH 的 `workflow` / `subagent` / `goal`；wave 概念保留——它控制了一个 workflow。
- 核心是**抽象层**：Deep Research 有不同的 bias/视角去挖；抽象层做好最理想。
- 参照 `ai_dsh_company` 的 5 张卡：producer/verifier、content charter、materiality、docs 分层两篇。
- 外部 research 要回答「多少人借鉴过」；不沿老思路；老思路有好的，也有该改的。
- 结论全部存 `_backlog/research/<slug>/`，一方向一目录；不写回手册/模板。

### 2. 仓内必读（按序，只读）

| 路径 | 为什么 |
|---|---|
| `AGENTS.md` | 布局、命令、纪律、入口链 |
| `docs/design/20-roles.md` | 四角色职责与产物 |
| `docs/design/30-methodology-mapping.md` | wave 语义、证据四层、gate 精神 |
| `packages/deep-research-pack/presets/lead.patch.yml` | persona、工具面、content 注入 |
| `packages/deep-research-pack/presets/scout.patch.yml` / `analyst.patch.yml` / `critic.patch.yml` | 各角色工具面（有无 subagent/bash/写） |
| `packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md` | 现行组队矩阵 + 队友读 skill 的补偿 |
| `packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md` | W<wave>.<index>、L0–L3、Team 物化 |
| `packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md` | P1–P8 判型 |
| `packages/deep-research-pack/content/manual.md` | run bundle 契约、证据七字段（lens 落地后八字段）、HITL |
| `packages/deep-research-pack/content/templates/run/` | plan/evidence/findings/final 模板 |
| `docs/decisions.md` | D2 角色、D17、D28、D40、D41 |

### 3. 机制正本（vendor/dsh，只读；勿改）

- `vendor/dsh/packages/subagent/tool-subagent/README.md`（`agentPreset`/`maxDepth`）
- `vendor/dsh/packages/workflow/workflow-ptc/src/host.ts`（子代无 preset）
- `vendor/dsh/packages/experimental/agent-team/src/roster.ts`（teammate composeFrom Lead）
- `vendor/dsh/packages/goal/tool-goal/src/index.ts`（phase/activation、blocked 3 轮）
- `vendor/dsh/packages/experimental/agent-team/src/task-board.ts`（CAS/ready）
- 外部语料（作者本地，不随仓）：`/Users/bowhead/deepseek-harness/_digested/delegation-and-orchestration/00-map.md`；重点页 `primitive-selection/02`、`delegation-primitives/01/04/06`、`composition/01/06`、`observation/06`、`design-perspectives/04`。

### 4. 已定事实（不要重新论证）

1. 只有 in-process `subagent` 能钉独立 `agentPreset`；`workflow` 的 `agent()` 无 preset；team 的 `spawn_teammate` composeFrom Lead。
2. `workflow` 未挂到任何研究 preset；base 有 engine；工具政策「仅用户显式要求」。
3. `goal` 的 phase 持久、activation 不持久；resume 后 disarmed；只有 lead 挂 goal。
4. `plan.md` 的 `W<wave>.<index>` 是 deps 算出的拓扑层；Team 板是当前会话镜像；bundle 是 canonical。
5. 证据卡七字段（lens 落地后八字段，见 lens 材料）；review 终局 PASS 是 HITL2 前提；整个 run 只有 HITL1/HITL2 两个交互点。
6. 角色 skill 按 preset 硬隔离；teammate 读不到，靠派发时指路。

### 5. 术语与口径（以本节为准；材料冲突时改材料）

- **channel**：三条委派通道 = subagent / workflow / team；`goal` 是跨轮生命周期原语，不算委派通道；`todo_write` 是轮内清单。材料里「四条通道」的措辞以本节为准。
- **wave**：deps 算出的拓扑层，不是任务；`W2.1` 是层内节点。材料里的 `W1.5/W2.5` 只是示意，**不要假设小数层合法**；验证层用整数 W + `kind=cross-check`。
- **cell**：一次可执行单元 = topic × lens × depth。
- **lens**：一种**证据面**（同一道题从哪个面挖），是数据不是角色/persona、不是报告模板；九字段见 lens 材料，`bias`/`blind_spots` 是它与「多搜几篇」的分界。
- **verdict**：claim 级结论 `supported|partially_supported|unsupported|unverifiable`；`unverifiable` 聚合为 `UNVERIFIED`，**不算 PASS 覆盖**。
- **UNVERIFIED**：第三态，不是 PASS 也不是 FAIL；永不静默放行。
- **两轴**：题型（P1–P8）决定深度/编制；lens 决定来源/核实/写作/不承诺。两者正交。
- **四槽 + 实例**：人（preset）/ 流程（wave+handoff）/ 方法（lens）/ 政策（证据门槛、HITL）；实例 = 这次 run 的 question/topics。
- **method-library vs lens 目录**：method-library = 用户对**整场方法**的偏好（四字段，workspace，人所有）；lens 目录 = 出厂**证据面**集（pack content，只读）。**同名条目不覆盖 lens**（v2 撤销 v1 的覆盖规则）；单场自定义视角写 `topics.md` 的 `custom:<名>`，重复 ≥2 run 才评估出厂化/工作区覆盖。
- **HITL1 的「执行方式」**：仍在 HITL1 内，不新增交互点；它是 workflow「explicit ask」的授权点。
- **PASS 与覆盖**：v1 的 PASS 要求全部 critical claim 有**结论性** verdict；仍有 `unverifiable` → readiness 只能是 FAIL（可交付但如实标缺口），不能把「带缺口的 PASS」写成 PASS。**lens 覆盖另算**：静默空格（无卡也无 gap）= MAJOR + FAIL；显式 gap（写原因/渠道）可 PASS 但必须在 final「目前不能判断」出现；两者都不是 `UNVERIFIED`。

### 5.1 格式速查（被引用的 schema，免得再猜）

- **Lens 九字段**：`id/name`、`when`、`seek`、`verify`、`frame`、`refuse`、`bias`、`blind_spots`、`pairs_with`（**前八必需**；`pairs_with` 可选。盲区处置三选一：配对 / 本题不 material / 显式接受单镜风险）。
- **Evidence 八字段**（lens 落地后；现行 pack 仍七字段）：`source_url`、`retrieved_at`、`quality`（A–D）、`found_by`、`supports`（topic）、`source_tier`（primary/secondary/tertiary/weak）、`publisher`（注册域）、`lens`（单个面 id；多面拆卡）。
- **method-library 四字段**：找来源 / 怎么核实 / 报告怎么写 / 不承诺。
- **题型 P1–P8**：单点事实/状态核查、数据表/价目核查、领域全景梳理、断言验证、多维对比/差距、尽调/评估、方法/方案指导、事态跟踪/时间线。
- **plan 节点列**：`id / parent / lifecycle / kind / question / owner_role / deps / output / acceptance / budget / depth / task_id` + 头部 `图版本：vN`。
- 正文正本：lens → `lens-abstraction/2026-11-10-lens-as-data.md`；evidence/plan → `content/manual.md` 与 `content/templates/run/`；method-library → `research-workspace/method-library.md`；P1–P8 → `presets/lead/skills/question-patterns/SKILL.md`。

### 5.2 机制锚点与取值（审计要求补齐的）

- **workflow 政策句（原文）**："Use the workflow tool ONLY when the user explicitly asks for a workflow or for large multi-agent orchestration"——`vendor/dsh/packages/workflow/tool-workflow/src/index.ts:329`。HITL1「执行方式」是唯一合法授权点，但卡片字节预算需实测。
- **workflow 失败/上限**：`AGENT_CAP` 默认 1000、`ITEM_CAP` 默认 4096、并发槽 FIFO、无整体 elapsed deadline；child 失败 → 该项 `null`；`WorkflowError` fatal 杀脚本；无 durable 图、无中途 HITL。锚点 = `_digested/delegation-and-orchestration/delegation-primitives/01-scripted-workflow-and-sandboxed-fan-out.md` §失败语义/§PTC 进程模型 + `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts`。
- **plan kind 合法值**：`broad-scan | deep-dive | cross-check | synthesis | review | gate`；子节点可用 `search | fetch`。**lifecycle**：`active | retired | merged_into:<id> | superseded_by:<id>`。**图版本**：头部 `图版本：vN`，每次重写递增；重写前把旧版复制到 `plan/v<旧版本>.md`；重写记录写同一版本号。锚点 = `presets/lead/skills/research-planning/SKILL.md` §0/§1/§6 + `content/templates/run/plan.md`。
- **run 门**：`scripts/run-gates/schema-scan.mjs`（plan 在场级）、`node-gate.mjs`（节点判据）、`evidence-audit.mjs`（URL/摘录）、`path-hygiene.mjs`；L0 = `scripts/verify/verify.mjs`。**已实测**（2026-11-10 keyless fixture）：evidence 加 `lens` 不改 evidence-audit 硬五字段判定（额外键被 `splitFrontmatter` 收下但不判）；topics 加 `lenses:` 不改 schema-scan（只查在场）。实施后在新 run 复核一次。
- **驾驶舱读取面**：`docs/design/40-research-cockpit.md` + `packages/deep-research-pack/src/lib/plan-index.ts` / `plan-graph.ts`；当前只读 plan/task，**不读 evidence/topics frontmatter**——覆盖矩阵 v1 由 critic/Lead 填在 review 表，cockpit 接入是后续工作。
- **lens 目录（提议，未建；v2 定为 `content/lenses/<id>.md`）**：`packages/deep-research-pack/content/lenses/<id>.md`；未建前 workflow args 只能传全文或 brief 内联。路径用 `{{research_pack_root}}/content/lenses/`（`src/content/index.ts:52-70`）；workflow child 是否继承该 context 待探针，读不到就 brief 内联全文。
- **method-editor / method-library 条目模型**：`presets/method-editor/skills/method-interview/SKILL.md`、`presets/method-editor.patch.yml`；四字段条目见 `research-workspace/method-library.md`。不新增第五字段 = 不改 method-interview 的输出契约。

### 6. 外部证据入口

- 两遍 landscape：[第一遍](external-landscape/2026-11-10-landscape-first-pass.md) / [第二遍](external-landscape/2026-11-10-landscape-second-pass.md)。
- 最强证据：Anthropic 90.2% / 15× / prescriptive roles 无大差别（不是「inert」——原文是 did not make much difference）；STORM unique refs 99.83→54.36；self-critique 16→2；judge self-preference 59.3% vs 18%；FACT 78–90% citation accuracy；LangGraph brief string + max+1；Google roles→steps；GPTR 2026 +89%（厂商自报）。
- 被挡来源：Perplexity / You.com / Consensus 官方页；Co-STORM 正文未读。
- 第三遍（不是第二遍）：补 Co-STORM、Perplexity / You.com、中国产品（Kimi / Qwen / 智谱）、BrowseComp / DeepResearch Bench 全量。

### 7. 参照项目（仓外，只读）

- `/Users/bowhead/ai_dsh_company/_backlog/issues/2026-11-10-producer-verifier-quality-loop.md`
- `/Users/bowhead/ai_dsh_company/_backlog/issues/2026-11-10-content-charter.md`
- `/Users/bowhead/ai_dsh_company/_backlog/issues/2026-11-10-materiality-and-trace-decision.md`
- `/Users/bowhead/ai_dsh_company/_backlog/_archive/settled_issues/2026-11-10-docs-layer-restructure.md`
- `/Users/bowhead/ai_dsh_company/_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md`
- 注：以上绝对路径是作者本机；公开读者用仓内 `docs/external-materials.md` 的登记替代。

### 8. fresh context 协议

- 一个方向一个 fresh context；本会话只做编排/审阅/合并，不在这里把六个都挖完。
- 第一消息 = 方向 README + 本节 + 一个 objective + 完成判据。
- 产出回写本方向材料（v2），并在 README `> 结论：` 写一句话；跨方向冲突回本会话裁决。
- 禁止：重开已定事实、把 lens 做成第五个角色、用「≥N 源」当覆盖、把 workflow 当主编排器。

### 9. 完成判据的优先级（三种说法只留一种）

- **方向 v2 = 挖透**：五件（结论 + 锚点 / 备选与否决 / decision table / pilot plan / 「什么会改变结论」）。
- **`已定性` = 题名页状态**：`> 结论：` 非空 + 证据评审 + `产出的卡` 已链；没有卡就写 `—` + 一句理由。
- **元方向（research-shelf）豁免 pilot plan**：用「协议已应用 + 冷读复跑」代替 pilot。
- 冲突时：v2 五件是工作完成度；`已定性` 是状态翻转；两者不互相替代，但可同时满足。

### 10. 冷读「阻塞项」定义

只算三种：①方向上下文缺失；②消费者/产出未写；③claim 无锚点（文件或 URL）。探针未跑、pilot 未做不算上下文阻塞，算「待执行」——不要把「还需要做实验」误判成「上下文不够」。

## 索引

| 名头 | 问题 | 消费者 | 材料 |
|---|---|---|---|
| [编排原语](orchestration-primitives/README.md) | 哪类工作该由 subagent / workflow / team / goal 承载 | 本轮设计推演；已产出推进卡 | 2 份 |
| [Wave 执行](wave-execution/README.md) | 计划图如何编译成可执行工作流 | 本轮设计推演 | 1 份 |
| [研究视角层](lens-abstraction/README.md) | 把 bias / lens 做成数据层 | 本轮设计推演；已产出推进卡 | 2 份 |
| [产出/验证分离](quality-loop/README.md) | 独立复核与裁决留痕 | 本轮设计推演；已产出推进卡 | 2 份 |
| [外部 landscape](external-landscape/README.md) | 外部系统已走到哪、哪些是 table stakes | 本轮设计推演 | 2 份 |
| [研究货架](research-shelf/README.md) | 多方向研究的题名、材料与留痕 | 本轮研究自身 | 2 份 |

归档题名见 [_archived/research/README.md](../_archived/research/README.md)；本页只列活跃题名，不重复逐文件清单，也不抄状态（状态正本 = 题名页）。

## 收什么 / 不收什么

- **收**：服务活跃卡、值得保留的调研材料——推敲时攒的、被卡引用的、喂毕业判断的；半成品合法。
- **不收**：抛弃型草稿（按 [AGENTS.md](../../AGENTS.md) 留在树外）；价值越过所有卡的留存型参考
  （留存语义归 docs 索引——[00-index §外部研究材料](../../docs/00-index.md)）。

## 维护

- 新研究先建题名目录与题名页，再写材料；不要先在 shelf 根落文件。
- 题名页的「消费者 / 产出的卡」随卡的生命周期更新；卡片归档时，若研究已无活跃消费者，整目录迁走。
- 本页只列活跃题名一行；归档索引一题一行。逐文件清单不在两个索引里重复。
