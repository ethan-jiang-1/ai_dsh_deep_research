---
topic: Deep Research 研究方法配置
intent: 为研究方法配置总卡及单次研究、长期复用子卡提供统一的概念、机制证据与候选落地依据。
---

# Deep Research 研究方法配置：综合研究依据

## 当前结论与使用边界

用户意图已明确：提供可理解的研究方法预设，允许自定义，使一次研究的相关节点采用连贯的方法；同时推敲 DSH 内的选择、管理和复用体验。用户认可名称“研究方法配置”，当前是推敲打磨阶段，可研究、规划、拆卡并做隔离可逆实验；正式落地前须提交有证据支持的详细方案供用户 review，尚未授权功能实现。授权正本见总卡。

推荐把预设作为配方，把本次实际采用的方法解析成 run 快照，再由 Lead 按任务节选传递。研究类型回答“研究什么形态的问题”，深度/篇幅回答“投入多少、交付多长”，方法配置回答“怎样调查、核验和综合”。三者可有关联，但不能互相偷偷改写。

本材料是当前综合依据，不是产品合同。已确认意图、现行架构事实和方案建议分别列出；首批预设、字段、默认选择、快照位置、变更边界和长期管理范围仍待推敲。决策与未决问题由 [总卡](../../settled_issues/2026-10-12-research-preference-templates.md) 及其子卡承载；本页不重复维护决策状态。

## 概念与配置模型建议

| 概念 | 承载内容 | 与现有实现的关系 |
|---|---|---|
| 研究问题与用途 | 为谁解决什么问题、范围、待回答事项 | 复用 question.md 的 Purpose/RQ/Scope，不造第二份问题正本 |
| 研究类型与判型 | 任务形态、topic 骨架和既有编制依据 | 现有三分法与 question-patterns；配置应协调它们，不能直接替代 |
| 研究方法预设 | 可理解的默认调查路径与适用说明 | 用户选择的起点；不等于 DSH agent preset 或 DSH profile |
| 本次方法快照 | 预设身份/版本、实际采用内容、用户覆写和未决限制 | 属于 drt_<slug> run 变量；不能只存一个预设名 |
| 执行预算与交付长度 | 快答/标准/深度、时间、篇幅 | 继续由现有用户输入承担；方法名称不隐含改变预算 |
| 共同质量底线 | 来源链、摘录、独立性、日期、缺口与 readiness | 复用研究手册与角色技能，不能通过自定义降低 |

底层维度建议收敛为五组：目标模式、范围与覆盖、信息源策略、检验策略、综合与呈现。预设提供默认；用户可调整被允许的字段并补充文字。Scope、Purpose、深度等已有事实仍有原 owner，方法配置只关联或提供待确认建议，避免重复存储成两份可编辑值。字段名与存储格式尚未定。

需要区分三种内容：既有不可降低的质量要求；可检查的显式参数；依靠模型执行和判断的指导。比如“优先官方来源”是指导，不能据此宣称已实现搜索 provider 的域名硬过滤；固定来源数或检索轮数也不能凭预设名称新增。

建议的解析原则是：共同质量与权限边界约束所有配置；已明确的用户要求高于预设默认；预设只填未指定项。不能兑现的要求或彼此冲突的硬约束须显性说明，不能静默忽略或将用户立场当结论。自由文本可成为已确认的研究任务指导，但不授权工具、改变角色权限或覆盖共享纪律。

## 候选预设与承诺边界

下表是待验证的用户语言与行为草案，数量和是否首发由总卡裁定。事实核查与主张核查可能过于接近，需要用实际题面和选项说明验证是否值得分开。

| 候选预设 | 主要调查路径 | 可观察变化 | 承诺限制 |
|---|---|---|---|
| 事实核查 | 对具体事实、数字或状态校准对象、时点与口径 | 官方/原始来源优先；检查易变信息和独立确认 | 不承诺领域覆盖；“快速”由预算决定 |
| 领域地图 | 发现概念、子领域、阵营与开放问题 | topics 和来源覆盖拓宽，显式标盲点 | 不把未覆盖说成不存在；“深度”由预算决定 |
| 主张核查 | 拆成可证伪命题，查支持与反证 | 对称检索、原始材料和来源依赖分析 | 不预设主张真伪，不支持只找赞同材料 |
| 方案比较 | 明确决策对象、选项与一致比较标准 | 对各选项查相同维度、限制和适用情境 | 价值权衡与事实分开；不替用户决定偏好 |
| 研究证据综合（高级候选） | 对明确问题整理论文/数据及研究设计差异 | 抽取样本、测量、方法、局限；按目的判断是否做质量评价 | 不自动宣称 systematic/scoping review 或穷尽检索 |

“科学/学术研究”可作为证据综合的说明，但太宽，不能单独代表一种严密研究程序。“系统综述”属于高承诺专门模式：需要协议、可复核检索式与信息源、资格标准、筛选/排除记录、适用时的 appraisal 和报告材料。当前不把它列作普通预设候选；如将来要支持，需另证工具和流程具备相应能力。

## 本仓已核实事实

- [问卡模板](../../../../research-workspace/templates/run/question.md) 的 Constraints 已含来源偏好和 User Research Controls，HITL1 Snapshot 已含类型、深度、口径；缺的是跨节点解析和传递，不是所有输入都要新造。
- [research-brief](../../../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md) 先查判型模式库，未知标 open。HITL1 有三问与计划确认两段，quick_factual 豁免第二段；计划确认 question 字段总长 ≤200 字，修订附加且一轮制。skill 写“已给信息不重复问”，而 [Lead persona](../../../../packages/deep-research-pack/presets/lead.patch.yml) 明确即使已给答案仍发三问供确认；两处存在表述张力，不能用新方法规划悄悄选择一种解释。新增问法需核对实际合同与模型行为。
- [team-assembly](../../../../packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md) 以研究类型组织编制，派发五件包含读文件、写文件、验收、验证和方法论装载。当前 teammate composeFrom Lead，不会因名为 Scout/Analyst/Critic 自动获得该角色技能；派工要显式读取对应技能文件。一次性查证通道也需同样得到本次方法要求。
- [NODES](../../../../research-workspace/NODES.md) 以文件作为节点接口，缺输入不得猜；两点交互不新增日常停点。补研究回挖掘并增加报告版本，表述修订不变版本，结构性变更另起 run bundle，HITL1 永不重开。
- [状态模型](../../../../docs/design/50-agent-loop-and-state.md) 规定 run bundle 是研究事实正本，session log 是执行事件正本，goal/任务板是辅助，Cockpit 是只读派生观察。新会话只凭 bundle 应能恢复研究，不能重新从当前全局预设解析旧 run。
- [D7/D17/D18](../../../../docs/00-index.md) 规定框架不持 per-run 状态，pack 的自写 JS 例外用途限定观察/调试。[Cockpit 设计](../../../../docs/design/40-research-cockpit.md) 不提供方法编辑或长期管理正本。新增配置管理代码不能因为已有 client 构建链就视为已获授权。
- [策略 benchmark](../strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) 是外部参数系统与本仓的对照研究，不是本仓已有参数计算器。本仓深度主要是 prompt/topic 规模指导，不代表已有强制 token、延迟或检索预算；新增方法不另起冲突的来源数、独立性或补搜上限合同。
- [Critic 轻量模式](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md#轻量模式quick_factual-薄路径) 豁免完整反例/交叉验证狩猎；自定义不可削弱现有适用要求，不等于每种方法都必须做同样检查。新增方法承诺是否进入 MAJOR/FAIL 或 UNVERIFIED 需设计，原 readiness 不会自动检验新承诺。
- [synthesis](../../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md) 规定首屏六段与 quick 缩略及来源清单。方法呈现应在既有格式内调整分析重点；替换报告硬要求属于待决改动。角色会话无命令执行能力，audit.md 由操作侧写；方法偏离的角色记录不能派给 Lead 写入 audit。

## DSH 可借用能力及限制

机制依据以本仓 pinned vendor 为准；日用 GUI 的 Inspect 结果只说明那个运行版本，不能代替开发基线。

| 能力 | 已核实依据 | 对本需求的含义与限制 |
|---|---|---|
| spawn prompt 与上下文模式 | tool-agent-team〔V1〕、Agent Teams〔V2〕 | fresh 不继承 Lead 历史，派工须自包含；不能仅存预设名或指望聊天记忆 |
| 共享工作目录与指令发现 | agent-instructions〔V3〕、in-process spawn〔V4〕 | 初始指令链按 cwd 加载；更深 AGENTS 在该 agent 成功触到更深路径后下一请求才生效，不是即时广播 |
| prompt section/context | system-prompt〔V5〕 | 可做 agent-scoped 注入，但需要安装和生命周期关联；当前 spawn 工具不提供调用者的 child setup hook，不是最薄首选 |
| Settings UI 扩展 | ui-settings〔V6〕、槽类型〔V7〕 | 有 settings.section 页面与 settings.general.item 行；它们是 UI 位置，不自动提供本产品的字段、持久化 owner 或模型送达 |
| 持久配置与修订写入 | settings〔V8〕 | active profile 的 patch 持久化；仅暴露活动、唯一可寻址 entry 的 volatile 字段；旧 revision 写入被拒；声明 schema 不会自动得到一张现成管理页 |
| 当前会话与未来默认分开 | permission UX〔V9〕 | 可借鉴“默认只影响以后创建的对象”；不能推断已存在研究方法命令、选择器或保存工具 |
| Cockpit 文件与事件通道 | [client 入口](../../../../packages/deep-research-pack/src/client/index.ts) | 现有 remote.session.follow 与 remote.workspaceFiles 读取当前 run；读取失败要与空配置区别，观察面不写入研究事实 |

Settings 是候选管理路径，需要新增真正消费方法数据的 owner，评估 profile 范围、配置重载、部署与现行代码边界。另一候选是工作区内独立的用户预设库，由 Lead 在开跑前显式读取；它便于携带但同样需要确定位置、写权限与读取协议。两者尚未选定，也不能两处同时成为权威库。

不把 method 配置塞进每个 DSH 角色 preset；这会把每次研究变量变成框架组合变更。run 下的 AGENTS 可作为自说明补充，但不能作为 fresh child 首次开工的唯一送达途径。

## 候选单次研究闭环

| 节点/场景 | 方法配置的作用 | 保留的 owner 与边界 |
|---|---|---|
| HITL1 | 显示推荐及理由、接收覆写、暴露重要冲突，确认实际内容 | question 的已有字段仍是正本；快照放 question 还是独立文件由单次研究卡比较 |
| 组队 | 提供节点动作和审查重点，与题型编制协调 | 不因预设擅自跳过 Critic、改变授权或重写团队拓扑 |
| Scout | 来源版图、搜索角度、支持/反方路线、覆盖限制 | 输出仍由 Scout 写 leads |
| Analyst/一次性查证 | 证据抽取、核验动作、适用的研究方法比较 | 证据七字段、摘录与 Question List 不降级 |
| Lead 综合 | 按地图/主张/比较/证据综合组织 findings 与报告 | findings/final owner 不变，Scope/Purpose 不复制成第二份可编辑值 |
| Critic | 检查覆盖遗漏、非对称比较、反证缺失或研究限制 | 原 readiness 与证据底线仍适用；方法名不证明质量 |
| HITL2/交付 | 报告实际采取的方法、重要偏离与限制 | 延续现有补研究/表述修订/结构性另起语义 |
| 恢复/重派 | 从本次快照重建节点要求 | 不受全局预设改名、删除或升级影响 |

推荐 HITL1 固定初始快照；后续不能原地改写当时确认内容。允许哪些调整，须映射既有 Decisions 与回边：保持方法的补证据沿用快照；表述修订不触发换方法；改变研究结构或整体方法的情形需判断是否另起 bundle。冻结不等于模型能保证全部执行，不能兑现时要留下偏离依据。

旧 run 没有方法快照应如实标“未记录”，不能按当前默认回填为用户曾选定。损坏、未知版本或未解析的配置与“未选择”不是同一状态；禁止默默退回默认后继续假装按原方法执行。问卡仍 pending、答案已返回但文件未落盘、半成品快照也不能被视为已确认；恢复应核对可追溯依据，不把沉默当接受。

[运行指南](../../../../docs/guides/61-run-playbook.md) 已有 steer 方向修订：Lead 记 Decisions 后补搜，不等于 HITL2 rerun。冻结初始内容不能取消该通道；需定义允许变化、送达已有队员及旧产物的处理。归档续跑、路径迁移和并行 run 也应绑定各自 bundle，不串用当前默认。具体恢复与修正行为归单次研究卡。

## UX 与长期管理候选

当次选择应贴着研究问题：用户可接受推荐、选其他方法或微调；展示“会怎样做”与限制，不要求先完成复杂管理。用户没指定不能被记录成显式偏好；默认/推荐与用户确认的来源要分开。新增问法须与现有三问、计划确认和 quick 豁免协调，避免多一套近义菜单。

长期复用的候选体验：内置预设可查看，单次调整不自动修改原预设；用户显式“另存为”才得到可复用定义。Settings 可作为管理入口候选，默认值只影响新 run。另一方案先只做内置预设与当次覆写，以减少初期配置管理负担；它并不排除以后增加保存能力。两种范围都还未由用户裁定。

Cockpit 建议只读展示已绑定 run 的方法摘要、关键实际选项和配置缺失/偏离，指向研究事实；既不显示当前全局默认冒充运行配置，也不因读取成功标记“方法已兑现”。方法编辑、长期库管理和额外运行停点不随观察展示一起引入。

长期管理还需定：配置作用于哪个 profile 或工作区；如何确保新 Lead 实际读取保存内容；内置更新如何保护自定义；删除预设怎样影响未来默认；并发写冲突/保存失败如何保留草稿。精确字段、API 与交互可在路径选定后查证；当前不承诺跨设备同步、模板分享或完整版本管理。

## 验证路线与证据限制

验证区分三层，不把提示词在场当作行为成立：

1. 确定性：选择来源、预设版本、覆写、缺失/冲突与恢复处理；快照不因库变化被重解析。固定格式后在既有文件读取/折算接口设计断言，不预造 schema 或数量门。
2. 编排：真实 Lead 派工与 fresh child 请求/读取中有同一快照的任务要求；查证 worker 也覆盖。L1 只证明挂载，keyless 回放只证明声明的装配面；若节点硬输入变化，按既有拓扑同步方法另行处理。
3. 模型：同题同预算，以领域地图与主张核查作候选对照；先写预期差异，再观察实际 query、来源、证据与综合/审查动作。至少覆盖不同角色；内容相同而只改名称即不成立。真模型观察可在已授权的隔离推敲实验范围内开展，本轮未跑；实验成功不等于用户已批准正式落地。

UX 另需真人判断选项能否理解、临时调整与保存是否分得清；keyless 浏览器可证控件与磁盘真值一致，不能证用户负担或研究质量。具体标准与证据 owner 在承载该行为的 issue，机械检查不替代人判断。

## 外部先例与来源复核范围

- [Perplexity Agent API presets](https://docs.perplexity.ai/docs/agent-api/presets)：深度、来源覆盖、延迟的取舍及 request override 是配置分层先例；属于开发者 API，不能当本仓消费者 UI 或搜索 provider 能力证据。
- [OpenAI Academy: Deep research](https://academy.openai.com/public/clubs/work-users-ynjqu/resources/deep-research)：目标、范围、时间、输出与来源选择是用户语言先例；不据此推断其内部多节点机制。
- [Cochrane Chapter 4](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04)：检索需按问题和资格条件规划，覆盖与精确度存在取舍，不能等同于增加搜索次数。
- [JBI 问题框定](https://jbi-global.atlassian.net/wiki/spaces/MANUAL/pages/355862687/10.2.3+Defining+and+aligning+the+objective+s+and+question+s)、[JBI critical appraisal](https://jbi-global.atlassian.net/wiki/spaces/MANUAL/pages/355862791/10.2.8+Critical+appraisal+or+risk-of-bias+assessment)：范围综述与系统综述目的有别，质量评价是否适用依研究目的，不能默认对所有 web research 套统一评分。
- [PRISMA-ScR](https://www.prisma-statement.org/scoping)、[PRISMA-S](https://www.prisma-statement.org/prisma-search)：报告指引与可复核检索材料的参照，不是研究质量认证。
- [OpenAI 发布页](https://openai.com/index/introducing-deep-research/) 与 [Help Center 入口](https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt) 保留为定位来源；Help Center 正文 HTTP 403，未据其细节作结论。Anthropic 正文未复核，不用来支撑参数或硬性规则。

前轮研究代理报告以只读 HTTP 获取 Academy、Perplexity、Cochrane、JBI 与 PRISMA 全文；主会话 web_fetch 对部分外站 DNS 失败。本轮保留这些结论的归因，没有重新获取外部全文，也没有将代理报告升级成独立二次复核。仓内机制依据来自本轮与前轮直接读取；外部产品页面会漂移，需要精确借用字段/数值时应重新复核。

## Vendor 源面定位

机制来源位于本仓 `vendor/dsh`（pinned submodule）；下列路径相对仓根，编号仅用于本页定位，不是产品或门禁编号。

```text
V1: tool-agent-team — vendor/dsh/packages/experimental/tool-agent-team/src/index.ts
V2: Agent Teams — vendor/dsh/packages/experimental/agent-team/README.md
V3: agent-instructions — vendor/dsh/packages/context/agent-instructions/README.md
V4: in-process spawn — vendor/dsh/packages/subagent/subagent-spawn-in-process/README.md
V5: system-prompt — vendor/dsh/packages/core/system-prompt/README.md
V6: ui-settings — vendor/dsh/packages/client/ui-settings/README.md
V7: 槽类型 — vendor/dsh/packages/client/ui-settings/src/client/contract/slots.ts
V8: settings — vendor/dsh/packages/settings/settings/README.md
V9: permission UX — vendor/dsh/packages/client/ui-permission-presets/README.md
```
