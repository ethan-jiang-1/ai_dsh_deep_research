---
topic: 本仓「设置 / 偏好」载体现状与机制证据（项目研究默认的前置盘点）
intent: 查清「每个项目起来时按哪套偏好跑」今天由谁决定、存在哪、谁消费、缺什么；为项目默认层是否值得做、能做多大提供事实底座
---

# 本仓「设置 / 偏好」载体现状与机制证据

> 证据分级：【事实】= 本轮实读 pin 内源码 / vendor 源码（file:line）；【推论】= 由事实推出；【建议】= 方案取向。
> pin = `dsh-v0.2.1-rc.5` @ `b830ec950f`；日期 = 2026-11-12。
> 本轮**零代码改动、零卡**；只读源码与文档。收尾跑过一次 `pnpm verify` 校验文档结构（全绿），未跑 `pnpm test` / 冒烟。
> 姊妹材料 = [项目默认的设计空间与建议](2026-11-12-project-defaults-design.md)。

## 0. 结论先行

1. **本仓不是没有 setting。** 今天同时存在五层：DSH 原生设置（profile/session）、包部署钉值（preset/工具行/时区）、home 产品设置（`$DSH_HOME/deep-research/settings.json`，只存工作区与上次会话）、workspace 用户数据（`method-library.md`，含 `〔默认偏好〕` 标记）、run 设计（`protocol.json` canonical + HITL1）。缺的不是「一个设置文件」，而是**项目级、跨 run 的常设偏好**与**它的可见入口**。
2. **最刺眼的事实不是缺字段，而是已有默认没有被消费。** 方法库的 `〔默认偏好〕` 只被面板读出；模型面只有「库条目作推荐参考」与「默认只是推荐起点」两句，没有一条指令要求 Lead 在立项时优先读它。开发工作区 58 个 bundle 中 **0 个**「采用库条目」的实测（截至 2026-11-10）与这个源码形状一致。→ 先修「消费」，再谈「新增」。
3. **新增项目默认层机制上可行，但被两条已定决定夹住。** 技术面：`conversation.input.left` 槽、右栏页签、`systemPrompt.context` 活求值 provider、workspace 文件都在；而 [D25](../../../../docs/decisions.md#d25) 规定面板不直写文件、期 2（Client Remote 直写库/Settings）未授权；[D48](../../../../docs/decisions.md#d48) 的 O2（策略优先 UI）被显式否掉。→ 任何「项目策略面板」都不是零成本增量，先要回答是否推翻 O2。
4. **外部证据反对「项目一开就跑一套繁琐设置」。** 本仓已收的外部研究：定向澄清约 2.81 问最优、0–1 问无显著收益；个性化收益与事实准确率存在 trade-off（P-score 6.78 的 agent 事实准确率 3.77/10，对照 8.40）；偏好遵循在 10 轮 / ~3k token 跌破 10%。→ 项目默认必须是**短、显式、可偏离**的先验，不是硬约束，更不是启动 wizard。

## 1. 先分清五种「设置」——别把它们混成一个词

| 层 | 载体 | 谁拥有 | 作用域 | 今天怎么改 | 本仓是否该再拥有 |
|---|---|---|---|---|---|
| DSH 原生设置 | Settings / profile patch：locale、model、permission、web search、agent loop、auto-continue | DSH / 用户 | Profile / session | DSH 自己的设置面 | **不重复造**（最多链接/反映） |
| 包部署钉值 | `presets/*.patch.yml`、`cordis.patch.yml`、`fetch-fallback/config.ts` | 包版本 | Profile 安装 | 改包/覆盖 profile patch | 只放机制常量，不放用户偏好 |
| home 产品设置 | `$DSH_HOME/deep-research/settings.json` | 包 / 用户 | Home（一 home 多 workspace） | 启动行写、用户可删 | 只存「工作区/上次会话」，不扩成偏好库 |
| workspace 用户数据 | `<workspace>/method-library.md` | 用户 | Workspace | 对话/方法库页/Method Editor 窄工具 | **方法偏好已在这里**；不要再造第二份 |
| run 设计 | `<workspace>/drt_<slug>/protocol.json` + HITL1 + question.md | Run | Run bundle | HITL1 拍板/修订；rerun 三分 | **canonical 已在这里**；项目默认只能是它的输入 |

【推论】「项目起来时用哪种偏好」在本仓的正确落点是**home 与 workspace 之间的 project 层**（workspace 级用户数据），而不是把 DSH Settings、profile patch、protocol 三处再抄一遍。公司仓的 productType / deliveryMode 在本仓没有对应轴——[design/70 §7](../../../../docs/design/70-content-organization.md) 明写「不造 product-type / delivery-mode / company 层：本仓只有一套方法论，没有多公司/多产品轴」。

## 2. 逐件事实

### 2.1 home 产品设置：只记「上次在哪跑」

【事实】`packages/deep-research-pack/src/startup/settings.ts`

- 路径 = `$DSH_HOME/deep-research/settings.json`（`:59-61`），schema = 2（`:14-15`）；
- 字段只有 `schemaVersion / workspace / sessionId / updatedAt`（`:28-33`）；原子写 `writeFileSync(tmp) → renameSync`（`:118-135`）；
- 读取顺序 = `DEEP_RESEARCH_WORKSPACE` 环境变量覆盖 → 设置文件（`:180-191`）；启动行登记 workspace 后 best-effort 建 Lead 会话（`src/startup/index.ts:53-105`，`agentPreset: 'lead'` 在 `:90-94`）。

【事实】pack README 的数据卡把它登记为「Deep Research settings (workspace, last session) … Scope/key: Home」（`packages/deep-research-pack/README.md:191`）。它**不是**研究偏好设置；[D40](../../../../docs/decisions.md#d40) 的「启动期工作区」语义只到这里。

【事实·另一种「启动偏好」】启动行建会话时硬钉 `agentPreset: 'lead'`（`src/startup/index.ts:90-94`）；这是产品队形（Lead 起手，研究角色由 Lead 组队；[D2](../../../../docs/decisions.md#d2) / [D40](../../../../docs/decisions.md#d40)），不是用户可配置的项目设置。如果「项目起来时用哪种偏好」被理解成「选哪个 agent preset / 队形」，答案应是**不开放**：研究角色是执行分工，不是项目策略；开放它会把 D2 的单一 Lead 入口打散。本材料只讨论研究设计偏好，不讨论 preset 选择。

### 2.2 workspace 方法库：唯一的用户长期偏好载体（已有默认标记）

【事实】研究手册把 `method-library.md` 定义为「本工作区方法库（用户所有；工作区根；lead 维护；四字段 = 找来源/怎么核实/报告怎么写/不承诺）」（`content/manual.md:63-67`）。正文三态：在场 → 用；缺席 → 明说「还没存过偏好、本次用内置打法」；读不回 → 如实说读不到，**绝不降级成没有偏好**。

【事实】`research-brief` skill 的「用户方法库」节：

- 立项先读库；题面点名的偏好名 → 按条目执行并记 `§Decisions`；未点名但库有条目 → HITL1 方法行给推荐参考（`presets/lead/skills/research-brief/SKILL.md:133-138`）；
- 库条目格式含 `〔默认偏好?〕`，一个库至多一条；管理动词里的「设默认」= 标注「默认偏好」（`:139-140`）；
- 同节只补一句「默认只是推荐起点，题面指定仍优先」（`:140`）——**没有一条立项指令说「先看默认标记，把它作为首推」**。

【事实】客户端把默认标记读出来用于显示：`src/lib/library-fold.ts:60` 以标题含「默认偏好」判 `isDefault`；方法库页展示该标记。方法库写入唯一路径 = 窄 host 工具 `method_library_upsert` / `set_default` / `remove`（`src/method-library-tool.ts`；[D25](../../../../docs/decisions.md#d25) / [D37](../../../../docs/decisions.md#d37)），面板永不直写。

【事实·弱证据】开发工作区 58 个 bundle 中 20 个有 `- 采用:` 行，但 **0 个**「采用库条目」，1 个显式写「未采用库条目」；结论原文：「保存偏好层存在，但当前没有被消费」（`_backlog/_archived/research/external-landscape/2026-11-10-landscape-preference-layer.md:259-264`，截至 2026-11-10）。

【推论】方法默认标记目前是**面板层的事实**，不是**立项层的契约**。这是「项目起来时用哪种偏好」最便宜、最该先修的一处。

### 2.3 run 设计：protocol.json 是 canonical，HITL1 是入口

【事实】`protocol.json` 字段 = `schema/version/status/created/approved_at/approval_basis` + `method`（id/kind/四字段快照/adjustments）+ `source_scope`（families/domains/exclude_domains/recency/language/authority）+ `effort`（band/band_v/nodes_max/cells_max/waves_max/allowed_depths）+ `output`（shape/sections/length/format/audience）+ `gates` + `deviations`（模板 = `content/templates/run/protocol.json`；schema/枚举 = `scripts/lib/protocol-core.mjs`）。

【事实】闭集在源码里：

- `OUTPUT_SHAPES = ['quick_answer','full_report','one_page_memo','comparison_table','timeline','literature_review','landscape_map']`（`protocol-core.mjs:45`）；
- `BAND_TABLE` = quick/standard/deep 三档，各带 `nodes_max/cells_max/waves_max/allowed_depths`（`:59-63`）；band 表 v1 写死，`band_v` pin 住（`:59`）；
- `SOURCE_FAMILIES = ['official','web','academic','regulatory','practitioner','local']`（`:66`）、`AUTHORITIES = ['primary','secondary','any']`（`:73-76`）；
- `GATE_ENUMS` 明写「门的 policy 枚举（不作为用户偏好开放）」（`:78-88`）。

【事实】HITL1 三问（`research-brief` `:26-34`）：①研究类型；②深度与篇幅 + output shape；③时间口径与语言 + source scope（families/authority/recency）。**不新增第四问**；计划确认卡 ≤200 字（`:71-78`）。D48 把 output/source 折进现有三问（[D48](../../../../docs/decisions.md#d48)）。

【事实】`protocol.deviations` 已有 `dimension/from/to/why/authority` 五字段（`protocol-core.mjs:101`；模板同），`authority` 闭集含 `user/library/method/type_default/system/lead`（`protocol-core.mjs:90-92`）。→ 项目默认被偏离时，**已有现成的记录槽**，不必新造偏离机制。

### 2.4 HITL1：三问 + 计划卡，刻意不加第四问

【事实】研究手册：「整个 run 只有两个人机交互点……HITL1 = 两段卡：第一段固定三问（研究类型/深度篇幅/时间口径与语言），第二段计划确认卡」（`content/manual.md:179-181`）。quick_factual 免第二卡，但仍发三问（`lead.patch.yml:23` 明文「quick_factual 也照发」）。

【推论】任何「项目启动时先问一套偏好」的 wizard 都会落在**第四问**位置，直接与「三问保底、第四问只在澄清困惑/业务简报缺项时叠加」的纪律冲突（`research-brief:26`、`:45-50`）。外部证据也反对（见 §6 / 设计材料 §2）。

### 2.5 DSH 原生面：已有，不该重复

【事实】界面语言：D49 默认中文（bundle patch 钉 `locale.preference=zh`），DSH Settings 可切 English；pack 只做品牌与页签 locale。模型选择、权限 preset、web search、agent loop、auto-continue 都在 DSH 侧有面（pack 的 preset 行只是声明工具面/钉值）。时区由 `time-context` 行钉 `Asia/Shanghai`（D32）；宿主/浏览器时区解析成功时优先于该回落值（`vendor/dsh/packages/context/time-context/src/index.ts:204-205`）。

【建议】项目默认层对这些一律**只读反映/深链**，不复制存储；尤其不要新造「语言」「模型」「权限」字段。语言还要区分**界面语言**（DSH locale）、**来源语言**（`protocol.source_scope.language`）与**输出语言**（目前无字段，靠 audience/写法）——三者不是一个轴。

### 2.6 workspace `AGENTS.md`：一条现成的零代码通道

【事实】五个 preset 都挂 `@deepseek-ai/dsh-agent-instructions`（`presets/lead.patch.yml:110-111` 等）；vendor README：加载 `AGENTS.md` / `CLAUDE.md` 链，首次请求注入 durable baseline；文件变更在成功 fs 操作后可见，不是持续 watcher（`vendor/dsh/packages/context/agent-instructions/README.md` Summary / What the agent gets）。研究手册明写「项目自己的 `AGENTS.md` 由 DSH 注入；冲突时**项目指令优先**」（`content/manual.md:5`）。

【推论】用户今天已经可以在工作区 `AGENTS.md` 写「本项目研究默认：深度报告、决策层读者、official+regulatory、12m」，模型会在每个角色会话里看到。**这是零代码、零新文件的项目偏好通道**；缺点是自由文本、无校验、无面板可见性，且刷新依赖 fs 操作。它应作为「最小方案」的基线，而不是被忽略。

### 2.7 客户端面：观察与中继已就位，缺「项目级」入口

【事实】现状：

- 首屏 `StartCard` 占 `conversation.input.dock`（`src/client/index.ts:193-207`；`keys.ts:53-54`），负责选目录/三步起步；
- 右栏四个页签：研究状态 / 研究配置 / 研究图谱 / 终稿（`src/client/index.ts:110-170`；`keys.ts:10-40`）；「研究配置」已有 `readFile/listDir/follow/runSource/sendInstruction` 注入（`:219`），并且是**摘要页签**（本次研究 + 换一条 + 方法库入口）；
- 主界面「方法库」tab 占 `conversation.view`（`index.ts:238-253`）；
- `conversation.input.left` 槽在本 pin 存在（`vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts:278`），渲染点要求 `sessionId` 与 `input` 都在场（`.../skeleton/InputBar.tsx:463-469`）——有会话才有入口，与「项目跑起来才需要改」相容；
- 右栏开页签 = `sidebarRight.openTab(kind)`（`src/client/index.ts:189` 的 `revealStatusTab` 先例；vendor `ui-sidebar-right/src/client/service.ts:332`）。

【推论】要做入口，**不需要新造面板壳**：composer `left` 注册一个状态按钮 → `openTab('research-config')` → 在现有「研究配置」页签里加一块「项目默认」。这是本仓最省的 UI 形状；新开第五个页签是第二选择。

## 3. 如果要做：四个机制都是现成的

### 3.1 动态 prompt section：`systemPrompt.context` 的 provider 每次 assembly 求值

【事实】`PromptContext.text: string | ((context: AssembleContext) => string)`；「Static text or a provider evaluated at assembly and admission refresh」（`vendor/dsh/packages/core/system-prompt/src/index.ts:78-89`）；`refreshContext(assembly, context)` 在每步刷新（`:582`）。生产的 assembly 上下文由 `assembleContextFor(agent, signal)` 构造，带 `agent` 与 `scope`（`vendor/dsh/packages/core/agent-loop/src/agent.ts:272,411`；`vendor/dsh/packages/core/agent/src/dispatch.ts:174`）。

【事实】`AssembleContext` 的**声明**只有 `scope` / `signal`（`system-prompt/src/index.ts:42-50`），但生产对象带 `agent`（`dispatch.ts:174` 的返回对象含 `agent`，测试也用 `{ agent, scope }`）。vendor 自己从 agent 取 cwd 的先例 = `vendor/dsh/packages/context/session-reference/src/index.ts:203`（`agent.session.header.cwd`）。

【推论】可以写一个 provider：`(context) => { const cwd = (context as { agent?: { session?: { header?: { cwd?: string } } } }).agent?.session?.header?.cwd; ... }`；读到 `<cwd>/<defaults file>` 就渲染短文本，读不到返回 `''`。不用新 session event、不用新 RPC、每轮活读；多 workspace 各自正确。**风险**：`agent` 不在 `AssembleContext` 的公开类型里，属结构性依赖；要 fail-soft，并在 pin 升级时重校（登记 triggers）。

【事实】现有 content 行已经用 `systemPrompt.context({ name: 'research:manual', order: 205, text: manual })`（`src/content/index.ts:65-71`），并注册 `research_pack_root` 变量。→ 项目默认段可以挂在同一行（如 `research:defaults`, order 206），不必新增 bundle 行/新 peer。

### 3.2 composer 入口 + 右栏页签

【事实】`conversation.input.left` 是 `list` 槽、`scope: 'session'`、compact controls at the left of the composer tool row（`ui-conversation/src/client/contract/slots.ts:278`；slot-catalog `:1136`）；只在 `input !== undefined && sessionId !== undefined` 时渲染（`InputBar.tsx:463-469`）。右栏 `openTab(kind, options)` 是公开 navigation controller（`ui-sidebar-right/src/client/service.ts:332`）；本包已有 `RESEARCH_CONFIG_TAB_KIND`（`src/client/keys.ts:16-17`）。

【推论】按钮状态可以读同一个 workspace 文件，文案 = 生效摘要（`研究默认：自动` / `研究默认：已设 3 项`）；点击开「研究配置」页签。无会话不渲染——项目尚未起来时不需要。

### 3.3 读写：workspaceFiles 只读，客户端写入走 command / 中继

【事实】`workspaceFiles` 是只读文件预览服务（`vendor/dsh/packages/api/workspace-files/src/index.ts:1-14`，方法族 read/readBytes/stat/list/changes；无 write）。客户端命令面 = `ctx.remote.commands.execute(sessionId, line, attachments)`（`vendor/dsh/packages/client/ui-commands/src/client/service.ts:423`）。方法库的写路径 = 窄 host 工具 + operation claim + 写后回读（`src/method-library-tool.ts`；[D25](../../../../docs/decisions.md#d25)）。

【事实】DSH 的 commands 服务在 base 组合里（`vendor/dsh/packages/bundle/base/cordis.patch.yml:317-318`）。插件用 `ctx.commands.register({ name, description, input?, handler })` 注册 `/command`；handler 收到 `{ agent, rawInput, signal }`（`vendor/dsh/packages/interaction/commands/src/index.ts:41-58`），`agent.session.header.cwd` 可取当前工作区。命令**不产生模型消息**：`execute()` 在会话日志追加 `command/run` / `command/done`，UI 在模型历史之外渲染结果（`vendor/dsh/packages/interaction/commands/README.md` Summary / Lifecycle）。→ host command 是「host 写 + 会话日志 + 文件随后被 prompt 注入」的现成组合，不是 client 直写。

【推论】项目默认文件不能由 client 直接写。四条合法写入路径：①**host command**（`/research-defaults`；host 写、命令事件进日志、文件被注入；公司仓用这条；本仓今天没有 command 面，新增一个面就是新决定）；②窄 host 工具（要 claim + 读回，成本高）；③对话里让 Lead 写（模型可见、日志留痕，但 lead 只有 tool-fs，**非原子**）；④`remote.commands.execute` 到第三方既有 command（不适用）。**直接由面板写文件 = D25 期 2，未授权。**

### 3.4 DSH Config / volatile：作用域不对

【事实】DSH settings 是 profile patch + `configForms` 编辑插件 `Config` 的 volatile 字段；表单按 profile entry id 持久化到当前 profile 的 Cordis patch（`vendor/dsh/packages/settings/README.md`；company 研究 §4 同判）。本仓只有 `fetch-fallback/config.ts:29` 一个 `Config` schema，是**该 provider 的部署配置**；host 主行没有 Config schema，也没有 volatile 字段。

【推论】即便给 host 加 `Config`，作用域也是 **profile（本仓语义≈安装级）**，不是 workspace/project；且要引入 schemastery、声明 volatile、改 host 读自身 Config——成本远高于一个 workspace JSON。**不推荐**。

### 3.5 home 里放 per-workspace map：能跑，但不该跑

【事实】home 设置文件是包自有的、原子写的 JSON；可以塞 `projects: { "<abs path>": {...} }`。但：①无 workspace 生命周期清理；②路径为键，改名/搬家/换机器即失效；③改一个项目重写整份 home 设置，revision 冲突面变大；④公司级文件里藏项目级数据，语义混淆。company 研究对同款方案给过同一组理由（`/Users/bowhead/ai_dsh_company/_backlog/research/startup-settings/2026-11-12-dsh-native-landing.md` §7）。**不推荐**。

## 4. 已定决定划出的边界（先看这些，再谈方案）

| 决定 | 它禁止什么 | 对项目默认的含义 |
|---|---|---|
| [D17](../../../../docs/decisions.md#d17) harness / run bundle | harness 不持 per-run 状态；run 期间零写入 | 项目默认是 workspace 用户数据，不是 harness 常量；不能写回包内 |
| [D25](../../../../docs/decisions.md#d25) 研究配置中继面 | 面板不直写文件；期 2（Client Remote 直写库/Settings）未授权 | 面板只能中继给 Lead 或走已授权的窄 host 工具；直接写盘先要独立评审 |
| [D46](../../../../docs/decisions.md#d46) Protocol canonical | method/source/effort/output/gates 只有一个正本；投影从它抄 | 项目默认只能是 protocol 的**输入**，不能成为第二份研究设计；实际值仍落 protocol |
| [D48](../../../../docs/decisions.md#d48) + [Strategy Note](../../../../notes/implemented/2026-11-11-strategy-projection.md) 的 O2 | O2「策略优先 UI / 命名策略目录」被显式否掉：先证明用户会用 source/output/effort | 「项目策略面板」若以策略为主轴，就是 O2 回潮；需要新决定，不能悄悄做 |
| [design/70 §7](../../../../docs/design/70-content-organization.md) | 不造 product-type / delivery-mode / company 层 | 不能把公司仓的字段表搬过来；本仓的轴是 method/lens/effort/output/source |
| [D49](../../../../docs/decisions.md#d49) | 默认界面语言 = 中文，profile 可覆盖 | 语言不是项目默认的新字段；最多在面板里反映/深链 |
| [D28](../../../../docs/decisions.md#d28) | 位置只是操作桶；状态从内容读 | 项目默认文件不能当 run 状态；不得用它判断 run 在飞/交付 |

【推论】真正需要新决定的只有两件：①是否新增 workspace 级项目默认文件（D40 的工作区形状变了）；②是否推翻 D48/O2 做可编辑的「项目策略」面。其余（消费方法默认、短 prompt 段、只读摘要）可以在既有决定内做。

## 5. 枚举单源问题：面板一上，第三个副本就会出现

【事实】同一组闭集今天至少有两个家：

- output shape：`protocol-core.mjs:45` 七个（含 `literature_review`）；`lead.patch.yml:23` 与 `research-brief:28-30` 面向用户的列表是六个（无 `literature_review`）；`tests/pack/research-brief-contract.test.mjs` 只钉「输出形态」字样，不钉全集一致。
- effort band：`protocol-core.mjs:59-63` 是权威；pack 侧只有 skill/persona 的自然语言档位；client 无 band 常量。
- source families：`protocol-core.mjs:66` 顺序 = official/web/academic/regulatory/practitioner/local；模板 `protocol.json` 默认 = `["official","web"]`；`research-brief:32` 给用户的写法 = official/academic/regulatory/practitioner/web/local（顺序不同，值相同）。
- method / lens：**可动态枚举**（方法库条目 + 五个内置；`content/lenses/<id>.md` 八条），但 client 今天没有 lens 列表；内置方法名在 `config-tables.ts` 是 skill 表的手抄投影（有测试钉）。

【推论】公司仓「选项从内容目录动态枚举」只对 **method / lens** 成立；effort / output / source 是**闭集决策**，不是目录。项目默认面板若自己写一份列表，就是第三个副本。可行做法：pack 侧新增一个纯数据模块（client/host 共用）承载闭集，`tests/pack/*contract*` 直接 import `scripts/lib/protocol-core.mjs` 对账；skill 文本仍由人写，但测试扫文本。**没有这个守卫，不要做面板。**

## 6. 为什么「先别做大的」：本仓自己的外部证据

以下均摘自 [external-landscape 偏好层](../external-landscape/2026-11-10-landscape-preference-layer.md) §6（转引一手论文；这里只取结论，不重复摘录）：

- **澄清要早、要少、要值**：更好的结果只需约 **2.81 个问题**（对照 4.90）；0–1 个回答无显著收益；任何澄清拖过执行中段都比不问更差（`:311-318`）。
- **个性化与事实准确率 trade-off**：P-score 从 task-only 6.17 → persona 6.78，但最个性化 agent 事实准确率 **3.77/10**，商业化较低个性化对照 **8.40**；记忆层可能比无记忆更差（No Memory 3.69 / Mem0 3.55）（`:323-331`）。
- **偏好遵循会崩**：PrefEval 在 10 轮 / ~3k token 就低于 10%；IFScale 最好模型 500 条指令时 68%；格式反馈平均破坏 21% 既有覆盖（`:339-342`）。
- **保存偏好层存在但未被消费**：0/58 bundle 采用库条目（`:259-264`）。
- **外部主流做法**：越大的产品越倾向减少前置选择，把定制放进澄清、计划与记忆；run 配置级版本化只有 Perplexity Profiles 一家（`:182-183`、`:296-299`）。

【建议】这些证据不支持「项目一开就选六项」；支持的是「**短、显式、可偏离的常设先验** + 仍然三问 + 计划卡」。项目默认的验收必须有人（LLM judge 会漏个性化错误，`:332-337`）。

## 7. 证据缺口（如实分开）

1. 本轮**没有真人试用**，没有验证「用户会不会设、设了会不会偏离、偏离后是否更好」；这是设计材料的开放决策，不是已证结论。
2. 本轮**没有实跑** `client-load-smoke` / `preset-smoke` / `l4-lite`；机制结论来自源码实读，不是运行证据。
3. `AssembleContext.agent` 是**生产对象上的额外字段**，不在声明类型里；本轮只核到 vendor 自用先例，未在 pack 内实测 provider 取 cwd。
4. `workspaceFiles` 只读与 `remote.commands.execute` 是 vendor 事实；「面板经 Lead 中继写文件」的端到端行为未在本轮实测（方法库已有同族先例，但不同文件/不同指令）。
5. 公司仓材料（`/Users/bowhead/ai_dsh_company/_backlog/...`）是**姊妹仓、不同 pin**，只作模式参照；本材料引用的机制事实均已在本仓 vendor pin 复核（除注明外）。
