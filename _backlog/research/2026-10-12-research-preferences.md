---
topic: Deep Research 研究偏好
intent: 为研究偏好模板 issue 梳理本仓机制、现有先例与候选设计。
---

# Deep Research 研究偏好：初步研究

## 研究问题

如何让用户选择常见的研究偏好模板，并允许自定义，使偏好在一次 Deep Research 的各阶段中持续影响方法选择，同时保持证据合同和研究流程可控？

## 结论摘要

这不是单纯的“搜索设置”。用户要控制的是研究方法：不同偏好应改变问题拆解、搜什么、如何选择来源、何时交叉核验/寻找反证、如何表达不确定性，以及最终报告面向何种用途。搜索只是其中一部分。

建议把它作为一次 run 的**研究方法配置**（working label: research profile），而不是新增研究角色、改 Agent Teams 编排，或把长篇全局指令注入所有会话。用户选模板并可覆写少量字段；Lead 在立项时将配置固化进 run bundle，再将与当前任务相关的摘要明确写入派工 prompt。各角色仍执行已有的角色 skill 和共享证据合同。

此处是方案建议，不是已决定的产品合同。偏好类别、可编辑字段、每次 run 是否允许变更，以及哪些维度能被机械门禁验证，仍需产品裁定。

## 本仓当前机制

### 已存在的相关输入

- HITL1 已询问研究类型、深度与篇幅、时间口径/语言；`quick_factual`、`exploratory_map`、`claim_verification` 影响立项和组队。这些回答定义任务形态，但不是完整的方法偏好配置。
- question.md 模板的 `Constraints` 已有“来源偏好”和“User Research Controls: 未提供 <或用户的硬性控制指令>”字段。因此原始用户约束已有落点；缺少的是把选中的 recipe 解析为跨节点可操作的共享方法，并显式区分硬性用户控制与模板默认。
- `question-patterns.md` 是题型判型库，命中后指导问卡、topic 骨架和分派；它按题目类型应用，不是用户选择的跨题型研究风格。
- 本仓已有“策略层参数化”先例：策略 benchmark 记录了来源数量、交叉验证、反例搜索、补搜轮次、质量偏好等不同性质参数。其结论指出，确定性数量项适合显式参数与 gate；质量判断留给 agent guidance；不能把隐藏默认散落在 prompt。

### 跨节点传递

- 研究角色共享 cwd，`research-workspace/AGENTS.md` 适合放跨角色、不随 run 改变的证据合同；它明确规定一次 run 的变量只写在 `drt_<slug>/`。
- run bundle 已有 `question.md`（研究方向、范围与 HITL1 决定）、`topics.md`、`journal.md` 等运行态文件。偏好选择属于 run 变量，宜与方向契约关联并在 bundle 中保留可追溯快照。
- DSH `agent-instructions` 将适用的工作区指令作为 durable context 加载给每个 agent，但它的职责是 workspace 指令发现，不是按 run 选择偏好的配置系统。
- DSH `spawn_teammate` 的输入是 Lead 明确构造的 `prompt`，`fresh` 默认不继承 Lead 历史；`fork` 继承历史。当前 team-assembly 规则也要求派工自包含，并显式让队友读取其角色 skill。因此不能假设所有 teammate 自动看到 Lead 曾选择的偏好；派工时应传递任务相关的精简摘要或指向可读的 run 文件并明确先读。

## 领域先例与来源

### 研究偏好应是多维取舍

本仓既有 strategy benchmark 把研究策略分成预算分配、迭代深度、终止条件，并对具体参数区分“可机械判定”与“Agent guidance”。它已列举每 topic 来源地板、独立支撑、质量层级、反例搜索、交叉验证和补搜轮次。可复用此分类，不应另起一套相互冲突的数量合同。

Perplexity Agent API 当前档位明确把 research depth、source coverage、latency 作为取舍面，并以 request overrides 调整预设配置；可见预设应是可解释、可覆写的默认值，不应把所有研究差异压成一项“深度”。这属于开发者 API，不等同于消费者 UI。来源：[Perplexity Agent API presets](https://docs.perplexity.ai/docs/agent-api/presets)。

Anthropic 工程团队的多代理研究系统也可作架构先例，但本次取得的具体研究证据主要来自以下可直接核实的官方文档，故不以 Anthropic 摘要支撑数值或硬性规则。

### 学术方法不是一个“更深”档位

Cochrane Handbook Chapter 4 将识别符合条件研究的搜索视为有计划的方法：预先计划搜索，尽量高敏感度地覆盖合格研究，相关时间段和信息源不应随意排除语言或出版状态。扩大覆盖通常会接受较低精确率，说明穷尽程度、来源覆盖、时间和筛选标准需要明确，而不是简单增加搜索次数。

JBI 方法手册区分范围综述与系统综述问题：探索证据版图可用 PCC（Population, Concept, Context）等宽问题框定，目的不同可以采用其他结构。JBI 对范围综述通常不主张默认进行 risk-of-bias appraisal，除非研究目的需要映射证据质量等；这说明不同研究目标应使用不同方法合同，而不是同一方法的“轻/重”强度旋钮。

PRISMA-ScR 提供范围综述的报告清单。PRISMA/PRISMA-S 是报告指引，不是质量认证，也不能单凭套用模板就宣称一次 AI web research 是系统综述。若产品提供系统证据综述预设，必须明确其要求的 protocol、可复核检索式/信息源、资格标准、筛选过程、适用时的 appraisal 和报告材料；普通 web 搜索不能冒充数据库级穷尽检索。

- [Cochrane Handbook, Chapter 4: Searching for and selecting studies](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04)
- [JBI Manual, Defining and aligning objectives and questions](https://jbi-global.atlassian.net/wiki/spaces/MANUAL/pages/355862687/10.2.3+Defining+and+aligning+the+objective+s+and+question+s)
- [JBI Manual, Critical appraisal or risk-of-bias assessment](https://jbi-global.atlassian.net/wiki/spaces/MANUAL/pages/355862791/10.2.8+Critical+appraisal+or+risk-of-bias+assessment)
- [PRISMA-ScR](https://www.prisma-statement.org/scoping)
- [PRISMA Search (PRISMA-S)](https://www.prisma-statement.org/prisma-search)

### 面向用户的深度研究产品先例

OpenAI Academy 的 Deep Research 官方指南建议在 prompt 中具体说明目标、范围、时间框架和所需输出；同时支持连接来源应用、限制或优先特定域名而仍允许开放 web，并在执行中调整方向。这证明用户可理解并使用的控制项是目标/范围/输出与来源策略，不只是一个抽象“风格”名称。它描述产品使用方式，不是可复现的多节点编排规范，不能据此推断本仓应模仿其内部机制。

- [OpenAI Academy: Deep research](https://academy.openai.com/public/clubs/work-users-ynjqu/resources/deep-research)
- [OpenAI: Introducing deep research](https://openai.com/index/introducing-deep-research/)
- [OpenAI Help Center: Deep research in ChatGPT](https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt)

Perplexity 当前 Agent API 文档提供 fast/low/medium/high/xhigh 档位，说明档位与研究深度、来源覆盖和延迟的取舍相关；来源域过滤与优先级可以独立配置。文档还体现产品标签会变更，因此本仓宜持久化解析后的偏好内容，而不只存外部产品式的模式名。

- [Perplexity Agent API presets](https://docs.perplexity.ai/docs/agent-api/presets)

OpenAI Academy、Perplexity、Cochrane、JBI 与 PRISMA 官方页面由研究代理只读 HTTP 获取全文；当前会话的 web_fetch 对部分外站域名解析失败。Anthropic 页面仅有搜索入口，未将其细节作为确定性结论。

## 候选偏好模板

下列是待验证的用户语言草案，不是定稿清单。首版宜用少量清晰、互斥度较好的“默认取向”，并允许用户自定义/覆写；同一个模板不得替用户更改事实方向或硬性证据规则。

| 候选模板 | 主要目标 | 可能改变的研究行为 | 不应改变 |
|---|---|---|---|
| 快速事实核查 | 尽快核实单一事实、数字或状态 | 优先权威一手来源；尽量短检索链；对高风险/易变事实做独立确认；精简报告 | 不得把未取得写成不存在；仍标单源和口径限制 |
| 科学/学术研究 | 理解研究证据及其限制 | 优先原始论文、注册/标准/数据；比较方法、样本、测量和局限；区分共识与单篇结果 | 不自动宣称系统综述；除非用户选定，不保证穷尽检索 |
| 系统证据综述 | 可复核地汇集某个明确领域的研究 | 规定数据库/信息源、时间、查询式、纳排标准、筛选与排除理由、覆盖缺口 | 不能把普通 web 搜索伪装成数据库级穷尽检索 |
| 深度探索/领域地图 | 发现新兴领域结构与未知问题 | 扩宽来源和主题图；容许多轮探索；整理概念、阵营、时间线、开放问题与反例 | 不以来源数量代替覆盖质量；保留事实/推断区分 |
| 断言/决策核查 | 判断主张或支持实际选择 | 对称搜索支持与反对证据；比较选项、约束、情境和时效性；显式列反证与不确定性 | 不让偏好预设结论；事实证据与推荐价值判断分开 |

“市场/竞品比较”可能是一个常见场景模板，但更可能是问题模式或报告视角，不一定应与“科学研究/深度探索”并列为同一分类轴。需要用户体验验证。

## 建议的配置模型

用一个轻量结构表达 profile，而不是每个模板各自复制长篇 prompt：

- `goal`：核实事实 / 理解证据 / 探索领域 / 支持决定等；
- `source_policy`：优先信息源、排除或谨慎来源、是否要求原始来源；
- `search_policy`：广度/深度倾向、必须探索的反方/反例、时效与地域限制；
- `evidence_policy`：独立核验强度、适用的质量评估、不能确认时如何标注；
- `output_policy`：读者/用途、篇幅、呈现结构；
- `overrides`：用户自由文本或对有限字段的覆写。

需把确定性参数与指导性原则分开：

- **硬合同**：既有证据字段、引用可追溯、独立来源的定义、诚实报告单源/缺口等，不能被偏好降低。
- **显式参数**：若用户选择系统证据综述，检索信息源、时间范围、纳排标准等可作为 run 内要求；能机械检查的才加门禁。
- **Agent guidance**：探索方向、来源优先级、何时追问反例、面向读者的分析角度，应作为可执行的指导语并由角色分别应用。

## 机制建议

1. HITL1 现有研究类型回答继续负责任务形态；增加一个可选“研究方法”选择，避免与 quick/standard/deep 篇幅深度混为一谈。
2. 选择模板后，把解析后的 profile 快照落到该 run bundle 的方向/决策记录中。模板是初始值；模板标识与用户覆写同时可追溯。
3. Lead 负责把 profile 映射成各节点需要的少量动作：Scout 收来源发现策略；Analyst 收证据提取、核验与反证要求；Critic 收与 profile 对应的审查问题；Lead 收综合与报告视角。
4. 所有派工 prompt 指向同一 run profile，并内联当前派工相关的必要摘要，满足当前的自包含派工约定。不能只依赖 `fresh`/`fork` 历史继承。
5. 保留用户自定义的“其他/自定义”入口；明确自定义可以增加方法指导，但不能覆盖证据合同、工具权限、HITL 边界或 Team 编排授权。
6. 先对一个样本 run 做可逆试写，检查各角色是否真的采取不同且一致的行为，再决定是否建标准模板、改问卡/模板和种子镜像。结构字段固定后再考虑机械验证。

## 主要风险与待决问题

- **概念重叠**：现有研究类型、深度、判型模式、研究偏好可能让 HITL1 变成多张近义菜单；交互需证明新增选择带来用户可感知的控制，而非仅增加术语。
- **偏好歧义**：“深度探索”不代表学术证据；“科学研究”也不必然等于系统综述。建议用模板一句话说明使用场景、默认行为与不保证事项。
- **偏好冲突**：用户可能既要快又要穷尽。需要说明冲突时何者优先，是提示用户选择，还是系统将偏好降级并记明缺口。
- **过强默认**：数量阈值和质量等级可能制造假牙齿；先复用现有 benchmark 证据，新增数值需有实测依据。
- **资料核验限制**：OpenAI Help Center 消费者帮助页面返回 HTTP 403，Anthropic 页面正文未复核；OpenAI Academy、Perplexity API、Cochrane、JBI 与 PRISMA 官方页面已由研究代理全文核实。API 能力不等于消费者 UI 能力，学术报告指引也不等于研究质量认证。

## 引用的本仓材料

- [研究手册](../../research-workspace/AGENTS.md)：run 变量归 bundle；跨角色证据合同；当前 HITL1 选择。
- [节点契约](../../research-workspace/NODES.md)：八节点输入/输出与现有 run 节点边界。
- [research-brief skill](../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md)：HITL1 的研究类型、深度和口径问法。
- [team-assembly skill](../../packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md)：spawn prompt 自包含及方法论显式装载。
- [策略 benchmark](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md)：策略参数的三轴对照及参数化先例。
- DSH vendor 源码 pin：`packages/context/agent-instructions/README.md`；`packages/experimental/tool-agent-team/src/index.ts`（spawn prompt/context contract）。

## 来源复核状态

本材料包含本仓源码/文档直读，以及由研究代理只读 HTTP 取得的 OpenAI Academy、Perplexity、Cochrane、JBI、PRISMA 官方页面。当前会话的 web_fetch 对部分外站 DNS 失败；Anthropic 页面仅有搜索入口，未用作确定性结论。没有据此引用未验证数字。

## 深挖综合：偏好应是“配方”，维度才是稳定模型

外部产品给用户的是可理解的预设或控制项，内部实现把它们拆成不同配置。学术方法的对照进一步说明，研究目标不同，流程也会不同：scope map 的 PCC 问题框架与系统综述 PICO/资格条件不是更浅与更深的同一流程；质量 appraisal 也不是默认适用于所有综述。因此用户入口可以是模板，底层不应是互斥的一个枚举字段，而应由有限的维度组成。

建议的概念分层：

1. **研究问题/用途**：要理解的现象、待核验主张或待支持决策。这与现有 `question.md` Purpose、RQ、Scope 同源，不重复造另一份。
2. **方法配方**：为达到目的采取什么调查路径，例如探索地图、断言反证、方案比较、研究证据综合。
3. **执行预算**：快答/标准/深度、时间或步骤预算。复用已有 HITL1 深度，不让“深度探索”模板暗中覆写预算。
4. **交付形式**：目标读者、篇幅和报告结构，复用现有问卡与报告合同，允许模板提供默认。
5. **不变质量底线**：真实来源链、明确证据不足、独立性口径、日期/摘录约定等，所有方法共享，用户偏好不可关闭。

底层 profile 维度建议控制在五类，避免直接暴露过多滑杆：

| 维度 | 对 Agent 的影响 | 首版建议表达 |
|---|---|---|
| 目标模式 | 立项提问、topics 组织方式 | 地图探索 / 主张核查 / 方案比较 / 证据综合 |
| 范围与覆盖 | 包含/排除、时间/地域/语言、覆盖广度 | 用户给的硬边界 + 模板建议；未知保持 open |
| 信息源策略 | 来源优先/允许/排除、域名限制或优先 | 例如官方/原始研究优先；默认仍可开放 web |
| 检验策略 | 支持/反对证据、交叉验证、质量 appraisal 是否适用 | 由方法配方指定动作，质量/风险判断按领域适用，不用统一分数代替 |
| 综合与呈现 | 比较逻辑、结构、读者 | 决策摘要、证据地图、主张-反证、研究限制等可读结果 |

**搜索预算/延迟不列作方法本身**：它应继续是已有深度/篇幅选项或运行时约束。Perplexity API 的产品设计明确把深度、覆盖、延迟作为预设取舍；本仓已有快答/标准/深度。若后续引入 profile-specific stop behavior，仍要把它映射回一个可见的预算/停止说明，而不是制造第二个隐形“深度”。

## 建议的首批模板边界

建议把模板做成预填上述维度的 recipe，每项均可查看和调整；模板不是不可组合的模式锁。

| 模板草案 | 目标与主路径 | 主要交叉核查 | 不应宣称 |
|---|---|---|---|
| 事实核查 | 尽快答一个具体事实/数值/状态；问清时点、口径、对象 | 官方或原始来源优先；对易变/高影响事实找独立确认 | 不承诺领域覆盖或系统综述 |
| 领域地图 | 界定主题后发现概念、阵营、子领域和开放问题；适合探索与摸底 | 不同视角/来源类型，识别盲点与结构性分歧 | 不把未覆盖方向说成不存在 |
| 主张核查 | 将一个 claim 拆成可证伪命题；同时搜支持与反例 | 反方证据、原始材料、来源依赖关系、时效 | 不预设用户主张为真或假 |
| 方案比较 | 明确决策者、选项、标准、约束与时间；按一致维度比较 | 每个选项都用相同标准；查官方规格、局限、反证和适用条件 | 不把价值权衡伪装成客观事实 |
| 研究证据综合（高级/显式限制） | 对明确研究问题总结论文/数据，说明研究设计与证据差异 | 方法、样本、测量、局限；是否评价偏倚要按目的决定 | 除非工具与流程确实支持，否则不宣称 systematic/scoping review，也不宣称穷尽 |

“科学/学术研究”太宽，宜作为“研究证据综合”入口的通俗别名/说明，而非让用户以为选它就会自动成为系统综述。系统综述若将来支持，应是带协议、筛选记录和可复现检索产物的专门高承诺工作模式，不应作为一般偏好预设伪实现。

建议首版不提供通用的“说服型/只找支持材料”风格，也不允许用户将反证检查设为禁用；可以调节篇幅和分析重点，但不能让偏好将用户立场预设成研究结论。

## 对应本仓八节点

| 节点 | profile 的实际作用 | 适合持有的位置/机制 |
|---|---|---|
| HITL1 立项 | 显示模板及一句话结果预览；读取用户覆写；检查问题、方法、预算是否冲突；将最终解析结果冻结 | question.md 的 HITL1 snapshot/Constraints 或一个 profile 子文件；最终位置需避免和 Purpose/Scope 重复 |
| 组队 | 根据方法需要决定 Scout/Analyst/Critic 是否参与、派工顺序和验收焦点；不可擅自推翻现有编制经验 | Lead skill 将 profile 摘要与 topics 共同用于 team-assembly |
| Scout wave0 | 定来源版图、要搜的角度、域优先/排除、反方路线；标示覆盖边界和已排除理由 | 每个 spawn prompt 明确“读取 profile + Scout 节选”；产出仍用 leads.md |
| Analyst wave1 | 按 topic 收证据、回答 question list、执行交叉核验或方法学抽取；不对所有领域强制套同一 appraisal | spawn prompt + evidence-extraction skill；证据卡已有字段不变 |
| 综合 wave2 | 依据 profile 的综合逻辑组织 findings：地图/比较/claim 主张-反证/研究结果综合 | Lead synthesis skill 读取冻结 profile；findings/final 保持 owner 不变 |
| Critic | 以该方法的失败模式审查：覆盖遗漏、非对称比较、反证缺失、研究限制失真；仍共享 readiness 硬门 | Critic spawn prompt 明确方法特定审查 checklist；review.md readiness 不降级 |
| HITL2 | 将结论、残余风险与方法承诺是否兑现呈给用户；补研究仍由用户拍板 | 现有 HITL2，不新增交互停点 |
| 交付 | 报告标明实际方法、重要覆盖限制和偏离；不可把 profile 名称当质量证明 | final.md 或 audit/journal 中显式记录完成/偏离状态，最终合同另定 |

节点不需要各自再发明“风格”。应该有一个 run profile 正本，由 Lead 在阶段派工时投影成小而具体的动作要求。Profile 对一次 run 内可见但按节点节选，避免所有角色重复收到整份配置。

## 适配 DSH：首选 prompt payload，不首选插件机制

### 已核实能力

- 工作区 instructions：`dsh-agent-instructions` 在每个 agent 的 session cwd 上读取适用的 `AGENTS.md`；初始 baseline 包含 project root 到 cwd 的链。成功通过工作区工具读/写/编辑更深层目录后，**该 agent 自己的下一步**才收到对应局部指令。参见 vendor `packages/context/agent-instructions/README.md:28-36`、`src/index.ts:127-150,296-337`。
- Team spawn：`spawn_teammate` 接受完整 `prompt` 和 `fresh|fork`，默认 fresh；in-process 子代理继承工作目录，但 fresh 不继承 Lead 对话历史。child 会收到 Lead 填写的 prompt 作为初始用户消息。参见 vendor `packages/experimental/tool-agent-team/src/index.ts:175-210`、`packages/subagent/subagent-spawn-in-process/README.md:30-32`。
- 可选 prompt API：DSH `systemPrompt.section()` / `context()` 支持注册全局或 agent-scoped 的 prompt 内容；Agent scoped 注册在其生命周期内生效，模型可见 prompt/context 要进入 session log。参见 vendor `packages/core/system-prompt/src/index.ts:52-123,451-497` 与 `packages/core/system-prompt/README.md:135-151`。

### 为什么局部 AGENTS 不是首选 profile 通道

run 下的 `drt_<slug>/AGENTS.md` 可能被 instruction loader 发现，但不会因目录创建或 Lead 读取自动传给 fresh child：child 有自己的 session 与文件 touch projection，且初始 cwd 是 `research-workspace/`。局部指令仅在该 child 用受支持的 filesystem tool 成功触到 bundle 内文件后，才会在其下一个 step 生效。它可作为 run 内容补充/自说明，但初次派工仍必须自包含，不能把“指向文件”误作“文件已注入”。

### 推荐的最薄适配路径

1. **用户入口**：现有 HITL1 结构化卡加一个可选研究方法模板选择；沿用研究类型、深度、口径问题，不把三个维度塞进同一组选项。选项说明模板“默认会怎样做”与“不会保证什么”。
2. **run 正本**：把用户选项解析成有版本的 profile 快照放入新 bundle。可先沿用 `question.md` 的 `Constraints` / `HITL1 Alignment Snapshot`，或另设 `research-method.md`；优先选择一个家，避免 question 与 profile 双写。固定 profile label + 解析字段 + user overrides + 已知不支持/冲突。
3. **model delivery**：Lead 先读 run profile，再把节点适用的有限字段连同现有五件派工要素放入每个 `spawn_teammate` prompt/任务描述。prompt 用稳定小节和逐字字段投影，不依赖 child 的历史或 child 先读嵌套 AGENTS 才能开工。
4. **角色知识**：固定角色技能仍定义“怎样做好 Scout/Analyst/Critic”；profile 只决定这次优先做哪些研究动作。角色 skill 可加一条指令：“每个 run 先读取该 bundle 的方法配置，并按派工提供的节点映射执行”；不必复制所有模板文本到每份 skill。
5. **验证**：先把 2 个 profile 写成样例快照，用同一个问题做差分试写；检查真实 search query/source pattern、证据对象、反证覆盖、报告结构是否产生预期差异，并检查共同硬底线没变。确定 schema 后再增加 L0 契约测试与 pack workspace 镜像门禁；模型行为需要真组合/session snapshot，不靠静态文案断言证明。

这一路径借用 DSH 现有 bundle/preset、agent-instructions、工具 schema、Agent Teams prompt 与 session logging。新增 plugin、Config 字段、Service 或 Host extension 仅在后续要跨 preset/run 复用并且确有模型可见性/可追溯需求时再考虑。运行时 `systemPrompt.context()` 不是首选：它需要代码态 session→bundle 关联和 per-agent 安装，当前 `spawn_teammate` tool schema 没有向调用者提供 child setup hook，增加改造面。

## 可靠验收：判断“影响行为”而非“提示在场”

分四层验收，不用“看到模板出现在 prompt”当成功：

1. **实例化正确**：HITL1 的选择、模板版本、覆写与冲突结果被持久化；用户回看能复述本次 profile。
2. **送达正确**：每份派工任务含 profile ID/版本和与节点匹配的字段；fresh child 不依赖 Lead history；重派/补研究沿用同一 run snapshot，除非有明确方向变更记录。
3. **行为区分成立**：相同问题/预算下，两个方法配方的 Scout query/来源分布、Analyst evidence/质疑结构或 Critic checklist 至少一项按预期不同；不能只看模型自述。
4. **不变量保留**：引用真实可追溯、证据摘录合同、未取到≠没有、单源和不确定性明确、不伪称系统综述、Critic readiness 仍按原门判。

建议首个验证对照用“领域地图”vs“主张核查”，因为它们会带来明确可观察差异：topic 结构/来源广度 vs claim 分解/对称反证。先用记录回放或可逆样例试写，无需先扩成完整商业 UI。用户体验人工判据仍是：能否从短说明选对模板、能否找到自定义入口、HITL1 是否因新增一问过载。

## 仍需用户 review 的判断

- 用户入口是否选“研究方法”一个预设，还是允许多个独立 recipe 维度组合；建议一期预设为主、详情可覆写。
- 适合首发的三四个模板：建议事实核查、领域地图、主张核查、方案比较；“研究证据综合”在严格承诺和局限说明下另列高级选项。
- profile 正本先放 question.md snapshot 还是独立文件；建议 schema 未稳定前最小化，冻结字段增多后再拆独立 `research-method.md`。
- 是否允许 run 中途变更 profile；建议初始选定后冻结，方向性变化走已有 Decision/HITL2，记录影响范围，避免队员对同一个 topic 套不同隐式方法。
