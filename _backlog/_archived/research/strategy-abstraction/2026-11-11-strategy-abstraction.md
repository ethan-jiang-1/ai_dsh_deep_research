---
topic: 固定权重下的策略抽象：UI 输入 → Protocol 数据层 → DSH 行动层
intent: 在模型权重不可改、只有 preset 层（knowledge / orchestration / workflow / gates）可变的约束下，验证「UI → 数据 → 行动」三层抽象；盘清现有 UI 输入能否编译成不同的 Deep Research 策略、Protocol 与 protocol-audit 实际咬住什么、DSH 原语能兑现什么；给出 UI 保留/改/停与下一步选项。不改实现。
---

# 策略抽象：固定权重下，UI → 数据 → 行动

> 材料日期：2026-11-11。证据边界：3 个有 `protocol.json` 的 run bundle、pack 源码、四遍外部
> landscape、[orchestration-alignment](../orchestration-alignment/2026-11-11-orchestration-alignment.md)、
> `protocol-audit` 红队实验。**没有新跑真模型 run，没有用户研究**；UI 结论是静态源码推断
> （未起 GUI），标注「待 GUI 复核」的条目不能当已观测行为。

## 0. 一句话

**三层抽象成立，但当前系统只有「Protocol 数据记录 + 行动层技能」，中间缺一个 typed 的
Strategy 层；shipped UI 实际只剩「换一条」一个研究偏好输入（静态推断；且只在 run 已记录后
出现），Protocol 的枚举一个都没暴露；`protocol-audit` 只咬形状/一致性，不咬策略。** 转换的
瓶颈不在 UI 控件数量，而在「UI 意图 → Protocol → Strategy → DSH 原语」的**编译与可行性**
没有显式化。下一步应先做**派生 Strategy 投影 + 3 场试点**，再决定是否升 typed 对象。

## 1. 口径：策略是什么

在权重固定、只有 preset 层可变的约束下，把「策略」定义成一个四元组：

```text
S = (K, O, G, B)
K  knowledge     手册 / 方法四字段 / lens / source_scope / output 模板
O  orchestration channel 组合（team / spawn / workflow）、角色/preset 组合、
                 plan 拓扑（nodes / cells / waves）、重写策略
G  gates         HITL1/HITL2、critic 模式、claim 复核、覆盖、验收 profile
B  budget        nodes / cells / calls / depths / activation 槽
```

- **Protocol** 是「设计」：用户批准的研究设计（method / source_scope / effort / output / gates /
  deviations）。它是 S 的输入，不是 S 本身。
- **Strategy** 是「行动配置」：把 Protocol 解析成 K/O/G/B 的具体选择。它今天散在
  `team-assembly` / `research-planning` 两个 skill、`plan.md` 和 Lead 的临场判断里。
- **Plan** 是「实例」：本次 run 的 DAG。Plan 可以重写，Strategy 不必每次升 Protocol。
- **UI** 是「输入面」：用户能表达的意图。它只该暴露能改变 S 的杠杆；只改一句 prompt 的是
  「措辞偏好」，不是策略。

判定一个 UI 输入「可编译」当且仅当：它能在 K/O/G/B 至少一个元素上产生**结构变化**，且该变化
在决策点可被读取或机检。只改文案、不改结构的不算。这个判定贯穿全文。

## 2. 三层现状

### 2.1 UI 层：实际输入面

以 shipped 源码为准（未起 GUI）。完整表见 §2.1.1；这里先给结论。

**观察（static reading，待 GUI 复核）**：

1. **shipped「研究配置」页签实际只剩一个输入**：`COMPACT=true` 写死
   （`src/client/research-config/useConfigFeed.ts:50`），卡片、⋯ 菜单、详情/新建/编辑/删除弹窗
   全挂在 `!COMPACT` 分支（`ResearchConfigTab.tsx:328-340`）；唯一可点的「换一条」只在
   `adoption.kind === 'recorded'` 时渲染（`:276-293`）。no-run 空态文案却指引用户去点不存在的
   「⋯ → 用于本次研究」（`:296-300`）。
2. **「起草 / 沉淀」是死 UI**：`DRAFT_INSTRUCTION` / `DISTILL_INSTRUCTION`
   （`src/lib/config-tables.ts:94-95`）只被 `LegacyManagementPane` 使用
   （`:100-101`），而 legacy 面板在 shipped 分支不渲染——但 `research-brief` skill 仍把这两个
   入口写成逐字指令（`presets/lead/skills/research-brief/SKILL.md:130-132`）。
3. **方法库是全 UI 唯一「硬」写入面，硬的是命令、不是内容**：四字段被渲染成 markdown 文本，
   真正 typed 的只有 `operationId / action / name / payloadHash` 一行 + host 侧校验
   （`useOperationQueue.ts:289-316,360-372`；`src/lib/method-library-operation.ts:14-16`；
   `src/method-library-tool.ts:76-120`）。sha256 让这条成为全仓唯一「用户字符串字节级落盘」的
   路径；其余路径都是模型转述。
4. **枚举全在 Protocol，UI 一个不暴露**：method 五值、source families、band、output shape、
   gates 都有机械闭集（`scripts/lib/protocol-core.mjs:25-43,47-51,60-75`；
   `content/templates/run/protocol.json:9,22-26,30,38`），界面只有中文标签 + ≤200 字散文卡
   （`research-brief/SKILL.md:50-59`），JSON 由 Lead 按模板抄（`:80-88`）。**typed 在下游，
   prose 在上游。**
5. **计划卡是打包授权（伪选择）**：一个「按计划开跑」同时批准 method + source_scope + effort +
   output，不能逐项否；`W<n> 扇出 ×N` 不是控件而是卡上一行字，却是脚本层唯一授权点
   （`research-brief/SKILL.md:58-62,66-67`）。想拆开只能走「修订计划」自由文本。
6. **输入形状与库格式不匹配，且不报错（static）**：textarea 允许多行
   （`src/client/method-library/views.tsx:337-342`），库格式一行一字段
   （`src/lib/library-fold.ts:141-153`），回读只取前缀行、续行被丢弃（`:66-82`）；两侧同解析，
   快照对账照样通过（`src/lib/method-library-operation-state.ts:34-66`）。改名同理：instruction
   写「更新（原「X」）」（`useOperationQueue.ts:365,371`），expected 按新名新增、旧条目保留
   （`:44-56`），tool 只按新名 upsert（`method-library-tool.ts:97`）→ 实际是「另存为新条目」。
7. **两处 prose 装 typed**：① 访谈回填靠 assistant 文本里的 ```method-draft 围栏正则，无
   schema，坏字段留 null → 「待定」（`src/lib/method-draft.ts:11-36,24-26`；
   `MethodLibraryView.tsx:285-317`）；② 用户手改四字段后，页面 900ms 去抖把字段拼成中文散文发给
   方法编辑（`MethodLibraryView.tsx:334-346`），「手改优先」实际由客户端 merge 保证
   （`method-draft.ts:96-100`）。
8. **只在 Lead 自然语言层存在的输入 + 根本不存在的输入**：视角 lens、研究要求、口径细则、
   业务决策简报只有对话一条路（`research-brief/SKILL.md:25-39`；`content/templates/run/question.md:31-49`），
   方法库/配置页签完全不触达；反向清单——client 全树无 checkbox/multi-select、无
   protocol/gates 控件（`SKILL.md:82`；`protocol-core.mjs:68-75` 明示 gates 不作为用户偏好开放）、
   内置偏好只可复制（`config-tables.ts:25-76`）、compact 页签无刷新/无清默认、库无版本史
   （`SKILL.md:133`）；另两条冗余：内置参考两个入口语义不同（读页「以此开始」只预选 vs 来源页
   「以此为基础开始」抄四字段，`MethodLibraryView.tsx:450,471`；`useDraftState.ts:236-282`）、
   `saveInstruction` 无生产调用（`library-fold.ts:129`）。

#### 2.1.1 UI 输入全表

| 输入面 | 用户动作 | typed 程度 | 落点 | 下游改什么 | UI 校验 |
|---|---|---|---|---|---|
| 研究配置 · 换一条 | 从内置+库点一条 | 枚举（名字）→ 中文指令 | session prompt（steer→queue，`lead-prompt.ts:12-23`） | question.md（Lead 自定节） | 无；只有已发出/已回话 |
| 研究配置 · 卡片 ⋯ | 用于本次/设默认/基于此自定义/编辑/删除 | 枚举菜单 | session prompt | method-library.md（Lead 用 fs 写） | **不可达**（`!COMPACT`） |
| 研究配置 · 新建/编辑/删除弹窗 | 名称+四 textarea | 自由文本 | session prompt | method-library.md 四字段 | 仅名称非空；**不可达** |
| 方法库 · 我的库/内置参考 | 分段切换 | 按钮 | 无 | 无 | 无 |
| 方法库 · 搜索/刷新 | 过滤/重读 | 自由文本/按钮 | 无 | 无 | 无 |
| 方法库 · 新建/来源选择 | 从零/内置/run | 按钮+枚举 | 草稿 | 无 | run 须 eligible |
| 方法库 · 名称+四字段 | 键入 | 自由文本 | 草稿 | 保存后 method-library.md | 五格非空 |
| 方法库 · 保存/保存并默认 | 点保存 | 按钮 | 方法编辑会话 + host tool `method_library_upsert` | 整条+默认标记 | 非空+sha256+回读 |
| 方法库 · 设默认/清除/删除 | 按钮 | 按钮 | 同上 + host tools | 默认标记/删条目 | 唯一默认+回读 |
| 方法库 · 访谈/聊天 | 自由对话 | 自由文本 | 方法编辑会话 | 草稿回填 | 仅围栏正则 |
| 方法库 · 手改回传 | 停 900ms | 自由文本转发 | 方法编辑会话 | 上下文 | 无 |
| HITL1 · 三问卡 | 类型/深度/口径 | 枚举+自由文本 | ask_user 答案 | question.md Snapshot/Constraints/Scope | 无 |
| HITL1 · 计划卡 | 开跑/修订/放弃 | 三选一 | ask_user 答案 | Decisions + protocol status | 无长度校验 |
| HITL1 · 修订 | 自由文本 | 自由文本 | ask_user 答案 | Decisions + protocol v2 + plan | 一轮制 |
| HITL1 · 授权行 | 无独立控件 | 文字（伪控件） | 无 | plan `## Wave 执行` | 无 |
| 首屏 · 选目录（范围外） | 选目录 | 按钮→路径 | workspace/session | 工作区/会话 | 仅错误文案 |

**一句话**：UI 的 typed 面在**下游**（Protocol 枚举、method 库的 payloadHash），prose 面在
**上游**（用户输入、计划卡、方法四字段）。用户能「说」，但不能「选字段」。

### 2.2 数据层：Protocol 是设计记录，不是策略规格

Protocol v1 的六个面（`content/templates/run/protocol.json:2-51`；审计入口 =
`scripts/lib/protocol-audit-core.mjs:31-53`）。全字段的实际消费面：

| 面 | 字段 | 消费点 | 强制力 |
|---|---|---|---|
| 元数据 | schema/version/status/created/approved_at/approval_basis | core + audit + run-accept | machine（版本三处一致、approval 链、快照） |
| method | id | 五条闭集 + §Protocol/§研究方法子串 | machine（**子串级**） |
| method | kind/library_name/library_fields_sha256 | schema 互斥；无生产者 | **none**（live 反证：landscape run `library_name=null`，question.md 却写参考「格局调研」） |
| method | fields.{source,verify,report,limit} | 派发切片、critic §4b | **prose**（不进投影；audit 明文不核） |
| method | adjustments | 卡/投影渲染 what+owner | machine（形状）+ prose；`role`/`lens` 子键被投影丢弃 |
| source_scope | families/domains/exclude/recency/language/authority | scout 检索算子、派发、critic §4b | **prose**（只有 slug/语法形状；无域名过滤、无 source-tier 门） |
| effort | band/nodes_max/cells_max | plan 节点/cells、audit | **machine**（节点 ≤ min(声明,band)、cells ≤ min、深度标签 ∈ band） |
| effort | band_v | 必须等表 | machine（只 pin 表） |
| effort | waves_max | audit | machine（**WARN 不拦**） |
| effort | allowed_depths | plan `depth` 字符串 | machine（只查标签，实际深浅在 skill 散文） |
| output | shape | 投影/final 头/critic | machine（**存在性**）+ prose（兑现） |
| output | sections/audience | 派发/critic | **prose**（无门核 final 标题/读者） |
| output | length.{min,max,unit} | 仅形状 | **none**（无字数门；两场 deep 超带只靠 critic + deviations） |
| output | format | 必须 md | machine（常量） |
| gates | hitl1 | approval_basis / 是否核 Decisions 版本 | machine（仅此）+ prose（发不发第二段卡） |
| gates | hitl2/evidence_threshold/critic/claim_verification | **除枚举外零引用** | **none**（`claim_verification=off` 也关不掉 verdict-audit，它看研究类型） |
| deviations | dimension/from/to/why/authority | review/journal/final | **prose**（只查形状；完整性无门） |

**一句话**：机器面 = 自洽性 + 三个计数（节点/cells/waves）+ 批准链；**语义零消费**。
`source_scope.*`、`output.sections/audience/length`、四个 gates 字段、`method.fields` 都只是
话术；**机器面能直接改 run 结构的只有 `effort.band/nodes_max/cells_max`**，其余靠 Lead 对
prose 的解释。workflow 形状、并发（`analyst.patch.yml:59-77` 固定 4/8）、角色/工具面
（四 preset 静态）、知识装载（手册 + lens）不受任何 Protocol 字段影响。

**数据层有、但不在 Protocol 里的**：lens（`topics.md`，D43）、channel/team 组合
（`plan.md` + `team-assembly`）、workflow 授权（`plan.md ## Wave 执行`）、activation 槽
（`team-assembly` 散文）、重写策略（`research-planning` §6）、style/acceptance profile（v2）。

**两个实证**：

- 漂移穿门：regulatory `question.md:48` 写「≤18 节点」，同 bundle `protocol.json` 是
  `nodes_max:12`；实跑 audit → **PASS**（`audit-core:91` 只查档位中文标签「深度」）。
- 计数确实能改结构：quick 场曾因 `topics 3 lens > cells_max 2` 判红，修法是把 `topics.md`
  T3 的 lenses 改 `[]`（`drt_openai-api-pricing-context/question.md:70` 用户原话）；memory 场
  预检把 `nodes_max` 16→12 并回改 question/plan（`drt_llm-memory-landscape/plan.md:64`）。

**结论**：Protocol 是**设计记录**（用户批准了什么），不是**策略规格**（这次怎么执行）。
它能约束预算/输出形状/批准链，但不能表达「用哪条通道、谁当 worker、workflow 在哪一层、
失败怎么回边」。这些在行动层。更严重的是：**UI 全树 grep `protocol` = 0 命中**
（`packages/deep-research-pack/src`；配置页读的是 question.md §研究方法，
`ResearchConfigTab.tsx:1-5`）——协议在用户面完全不可见。

### 2.3 行动层：DSH 原语，不是自由编排

[orchestration-alignment](../orchestration-alignment/2026-11-11-orchestration-alignment.md) 的
六条不变量，对本研究最要紧的四条：

1. **只有 in-process spawn 能钉独立 preset**；teammate 走 `composeFrom Lead`，workflow 分支继承
   executor 的组合（orchestration §3 #3、§4.2 通道表）。
2. **角色边界在主通道是政策，不是组合**：critic teammate 仍能看到 `ask_user_question` /
   `create_goal` / `present`（G1）；`subagent` 的 `send_message` 承诺在 Team 组合里不可达（G2）。
3. **深度是绝对量，容量是局部 8 槽，没有全局公平调度**；plan 是设计图，不是执行引擎
   （§3 #2、#5；G8）。
4. **挂载绿 ≠ 行为绿**：声明/挂载/实际工具面/行为四层各证各的（§3 #6）。

行动层真正的策略语言在：

| 策略维度 | 住哪 | 机制 |
|---|---|---|
| 组队 | `team-assembly` 路由矩阵（一次性→`research-worker` / 角色；多轮→Team；wave→`research-wave`） | 政策（Lead 按 skill 执行） |
| 通道 | `team-assembly` §通道选择（team / subagent / workflow）；workflow 只在 `research-wave` | 政策；workflow 需卡上授权 |
| 拓扑 | `research-planning` W<wave>.<index>、deps、cells、depth、budget | 政策 + plan 门禁（节点数/深度/cells） |
| 重写 | `research-planning` §6 回边/墓碑/快照 | 政策 + 模型判断 |
| 槽 | `team-assembly` 8 槽公式（**全 run**，D47 合同） | 政策；无全局 scheduler |
| 门 | persona + ask + critic + claim/verdict | 部分机器（claim/verdict），部分行为 |

**结论**：行动层能兑现的策略，受原语能力矩阵约束；UI/Protocol 不能承诺矩阵外的策略
（例如「critic 绝不能问用户」在 team 主通道只能靠政策，不能靠组合）。这是「可行性」的来源。

### 2.4 2026-11-11 后续落地：D47 与两份合同

本材料初稿基于 D47 之前的行动层。同一天又落了三条，直接改变本文的「可行性」判断：

| 落地 | 内容 | 对本文的影响 | 仍残留 |
|---|---|---|---|
| [`team-subagent-contract`](../../../../notes/implemented/2026-11-11-team-subagent-contract.md) | Team 组合里 subagent = one-shot（child 不是 Team 成员，Team `send_message`/`interrupt_agent` 不能寻址它）；派发加角色边界四禁（ask/goal/present/spawn_teammate）；8 槽公式扩到全 run；docs 限定 root preset | G2 从「假承诺」变「合同明说」；8 槽从「仅脚本层」变「全 run」；G1 仍是政策，但派发合同显式 | vendor `subagent` 描述仍带 steer 句；显式指令仍可让 Lead 撞 namespace；G1 无机器边界 |
| [`worker-profiles`（D47）](../../../../notes/implemented/2026-11-11-worker-profiles.md) | 新增 `research-worker`（薄叶子）/`research-wave`（wave executor）；Lead/Scout/Analyst 默认 `agentPreset: research-worker`；workflow 从 analyst 移到 wave；角色 skill 进 `customSkillDirs`；路由矩阵 | G3/G4/G5 部分落地：省略 preset 不再落 Lead 克隆；workflow 只在 wave；角色 skill 可用 `skill` 加载 | teammate 仍 composeFrom Lead（G1）；worker/wave 出现在用户选择器；`present` host 穿透；无真模型 workflow child header 证据 |
| [`provenance-hash-contract`](../../../../notes/implemented/2026-11-11-provenance-hash-contract.md) | provenance sha256 owner = ops/Lead，不是 analyst；缺 hash = UNATTESTED；不新增工具 | 行动层的「知识/门」少一条越权路径；不是策略杠杆 | 无 run 内 hash 审计；若以后要 run 内 hash 需窄工具 |

**读法**：

- **D47 改变了默认 spawn 目标**：矩阵里的 spawn 现在默认 `research-worker`，不再是 Lead 克隆；
  角色任务显式传 `agent_preset=scout/analyst/critic`；wave 用 `research-wave`。
- **workflow 只在 `research-wave`**：普通 analyst 不再有 workflow；`research-planning` /
  `team-assembly` 的 executor 改为 `research-wave`；workflow child 继承薄 executor。
- **Team 主通道仍是 Lead 克隆**：G1 的机器边界仍需 Package C（spawn-first / teammate preset），
  但 G2、角色边界四禁、8 槽已合同化；critic 的硬边界仍只能靠派发合同 + 人工验收。
- **provenance hash 是 ops 合同，不是 strategy 字段**：它影响证据链的 UNATTESTED 语义，
  不影响 K/O/G/B 的选择。
- 因此 §6.3 的 A/B/C/D 需要按 D47 修订；§3 的三场是 **D47 之前**的 pilot，channel 结论仍成立，
  但具体 preset 名要按 D47 读（quick 的 `subagent(analyst)` 今天默认会是 `research-worker`）。

## 3. 三个 run 的实证

三个 bundle 都有 `protocol.json`（全部 `/63` 中的 3 个），覆盖 quick / deep-landscape /
deep-regulatory。

| 维度 | quick 价目 | deep 记忆全景 | deep 监管对比 |
|---|---|---|---|
| method | 事实核查（kind=preset） | 领域地图（preset） | 方案比较（preset） |
| source_scope | official+web，4 域，as-of | paper/conference/benchmark+web-secondary | official+web，11 域，24m |
| effort | quick：3 nodes/2 cells/L1–L2 | deep：12/12/L1–L3 | deep：12/12/L1–L3 |
| output | quick_answer，300–700 words | landscape_map，3500–6000 | full_report，8 sections，3500–6000 |
| gates | hitl1 none / critic light / claim off | protocol_projection / both / on | protocol_projection / both / on |
| approval | auto | card | card |
| channel（plan  prose） | **不组队**：subagent(analyst) + 轻量 critic | team：scout-1 + analyst-a/b + critic-1 | team：scout + analyst + critic |
| plan | 3 节点，2 Wave | 12 节点，6 Wave，9 cells | 12 节点，5 Wave，11 cells，**图 v2 加 3 个回边** |
| 偏离 | 0 | output length 超 2–3×；source/language 各 0 条 | output length 超 2.3 万汉字 |

> **时点**：三场都是 D47 之前的 pilot。今天 quick 的 `subagent(analyst)` 默认会落
> `research-worker`，同质 wave 会用 `research-wave`；channel 结论（quick 不组队 vs deep 组队）
> 不受影响，但具体 preset 名要按 D47 读。

**读法**：

1. **Protocol 改的是「信封」**：quick vs deep 的节点/深度/输出形状/gates 是真实结构差异；
   audit 能咬住节点数、深度、cells、投影。
2. **channel 改的是「形状」**：quick 明确写「不组队」；deep 走 team + spawn。这个差异不在
   Protocol，在 `plan.md` 的散文和 `team-assembly` 的矩阵里。**同一份 Protocol 可以走两条
   完全不同的通道**——这正是 UI→策略转换缺的那一层。
3. **library 影响没有被记账**：landscape run 的 `adjustments` 写「参考用户方法库条目「格局调研」」，
   但 `method.kind=preset`、`library_name=null`；它没有算「采用库条目」。所以 0/63 的采用率
   是**低估计**：库可以通过 Lead 的解释影响 run，却不留 adoption 痕。UI 与数据层都没有
   「这条 run 用了/没用库」的 typed 字段。
4. **投影漂移是活的**：regulatory 的 `question.md §Protocol` 写「≤18 节点」，`protocol.json`
   写 `nodes_max=12`；`protocol-audit` PASS（它只查档位中文标签，不查节点数字）。UI 的
   「本次研究」读 `question.md`，所以可能显示一个与 JSON 不一致的数字。
5. **输出长度偏离是常态**：两个 deep run 都把 3500–6000 写到 2–3 倍，靠 `deviations` 记账；
   没有 output 机检（v2 才做）。这说明「输出形状」目前是**承诺**，不是**门**。
6. **方法四字段是 prose**：三个 run 的 method.fields 各不相同、写得很细，但 audit 只检查
   method.id 出现在投影里；字段内容改掉也能 PASS（红队 G）。
7. **Protocol 的语义面没有行动层消费者**：`source_scope.*` 只改 query 文本/验收措辞；
   `output.sections/audience/length` 只改报告骨架/头行（synthesis 不读 Protocol）；
   `gates` 的四个字段（hitl2/evidence_threshold/critic/claim_verification）除枚举外零引用；
   `method.fields`/`adjustments` 只改派发话术；`deviations` 纯记账。**Protocol 内真正改
   run 结构的只有 `effort.band/nodes_max/cells_max`**（节点数、cells 数）；行动层的
   worker/wave 路由是 D47 的另一层。这是「UI 偏好无法转换成策略」的另一半原因：不是 UI
   没给，而是给了也没有行动层消费者。

## 4. 红队：`protocol-audit` 咬住什么

**做法**：复制 `drt_openai-api-pricing-context` 到临时目录，删除 `protocol-audit.md` 与
`protocol/`（避免 hash 检查干扰），每次只改一个变量，跑
`node scripts/run-gates/protocol-audit.mjs .`。

| 变异 | 结果 | 说明 |
|---|---|---|
| 基线 | PASS | — |
| A. `source_scope.families` 改 `academic` + `domains` 改 arxiv | **PASS** | 来源语义不检查 |
| B. `output.shape` 改 `full_report` | **RED**（projection） | 投影里没有 `full_report` |
| C. `method.id` 改「领域地图」+ 投影同步 | **PASS** | 方法四字段没改也 PASS；id 只是字符串 |
| D. `gates.critic=none` / `claim_verification=off` | **PASS** | gates 不检查 |
| E. band `quick→deep` + 投影同步（≤12 节点） | **PASS**（waves warning） | 预算带可自洽地放宽 |
| F. plan 加一个假节点（owner=critic） | **PASS** | 只数节点/深度，不查 owner/通道 |
| G. `method.fields` 全部改写 | **PASS** | 四字段不检查 |

**补充**：如果保留 `protocol-audit.md`，任何改动都会触发 `protocol-changed`（hash 不一致）；
但这是**批准后的防篡改**，不是**策略语义检查**。首次 audit 前改 JSON，没有 hash 可对。

**结论**：`protocol-audit` 是**一致性检查器**（投影字符串/版本/effort 上限/plan ref/hash），
不是**策略检查器**。它能回答「JSON 和 plan 是否自洽」，不能回答「这次 run 是否符合用户
意图」「channel/角色是否兑现」。这正好对应外部证据的判词：**没有 acceptance，参数只是愿望**
（style §2.4；`external-landscape/2026-11-10-landscape-style-space.md:545-557`）。

## 5. 外部证据：配置 → 策略只有三种真机制

四遍 external landscape 的第三/四遍（偏好层 / style 空间）给出的结论，压缩成一张表：

| 机制 | 代表 | 用户输入 → 策略 | 强制点 |
|---|---|---|---|
| 服务端整套解析 | Perplexity effort/profile、DeerFlow 词→布尔 | 一个枚举/ID → model+search+steps+prompt+tools 整套 | 服务端 admit 时解析；effort 与 profile 互斥 |
| 请求参数 | OpenAI/Qwen/豆包 API | 单个参数 → reasoning/verbosity/search_context/domains | 请求层 |
| 计数上限 | DeerFlow hard stop、LangGraph 并发/迭代、STORM max_perspective | 数字 → 截断/拒绝 | 执行层 |

**typed ≠ 被强制**：GPT-Researcher 的 17 种 tone 是 typed 枚举，但只渲染成一句 prompt；
DeerFlow `report_style` 5 值只进 prompt；Elicit 的 per-stage depth 才是 typed 且被执行。
（`2026-11-10-landscape-preference-layer.md` §2.5；`2026-11-10-landscape-style-space.md` §2.4）

**对 UI→策略的 8 条启示**（提炼自外部 agent 的对照表）：

1. 先归寿命层（出厂 policy / 保存配置 / per-run 覆盖），再谈控件；不要一屏等权开关。
2. 能在决策点拒绝/截断/解析的输入才配 typed 控件；语义项（tone/report_style/perspective）
   无一家执行。
3. 来源范围是第一优先编译成结构（8 家 table stakes）；我们拆成自由文本 + lens + 方法三处。
4. effort 控件必须自带「改什么 + 代价」，并把 research depth 与 reasoning effort 分开。
5. 输出形态做成「模板 + 可机检 acceptance」；tone 不进 UI。
6. 计划门必须是状态机（accept/edit-with-patch/reject），不是自由文本。
7. bias/立场/人格/账户 memory 不进 UI；lens 只给「挖哪些面」，不包装成立场。
8. 保存级决定写入路径与可审性；先证采用，再加 version/provenance。

**三条硬约束**：

- 前置问题 ≤3（Ask Early/Ask Late：2.81 问优于 4.90；0–1 问无显著收益）。
- 每 run 新增可调项 ≤3；总字段以 6 个策略面为上限（PrefEval 10 轮/~3k token <10%）。
- 任何新增字段必须带机检门或明确标「只提示」；否则是偏好剧场。
  （PrefEval / IFScale / 个性化 DR Bench / Mr-Dre：见 preference §6.2）

## 6. Strategy 参考模型

### 6.1 编译器

```text
Brief（用户意图，question.md 三节）
  → Protocol（设计：method/source/effort/output/gates/deviations）
  → Strategy（行动配置：K/O/G/B）
  → Plan（实例：W<wave>.<index> + deps + owner + depth + budget）
  → DSH 原语（team / spawn / workflow / goal / task board）
```

今天的「编译器」是 **Lead 模型 + skills**，不是确定性函数。它读 Protocol + method 四字段 +
lens + `team-assembly`/`research-planning`，写出 Strategy（在 plan/角色/通道里）和 Plan。
UI 只能通过 HITL1 答案、方法选择、自由文本影响它。**没有 typed 的 UI→Protocol 通道，
也没有 typed 的 Protocol→Strategy 通道。**

### 6.2 Protocol 字段 → Strategy 元素 → DSH 原语

| Protocol | Strategy | 原语/载体 | 强制力 | 缺口 |
|---|---|---|---|---|
| method.id/fields | K：方法四字段 + skill 选择；O：默认拓扑 | skill + plan | id 检查；fields prose | 四字段不进 gate；方法到拓扑的映射在 skill 散文 |
| source_scope | K：scout/analyst 检索面；G：source-tier | web/fs 工具 + evidence 八字段 | 枚举形状；语义不查 | 没有 source-tier 门；域名过滤不是硬能力 |
| effort | B：nodes/cells/depths/waves；O：拓扑上限 | plan + protocol-audit | 机器（节点/深度/cells） | waves 只 warning；calls/time 无读数 |
| output.shape/sections | K：综合模板；G：final 检查 | final 模板 + review | shape 投影检查 | sections/length 无 output 门（v2） |
| gates | G：HITL/critic/claim | persona/ask/tools + verdict | 枚举；claim/verdict 部分机器 | gates 可被改（红队 D）；critic readiness 是行为 |
| deviations | Record：偏离记账 | review/journal/final | schema；完整性不查 | 没有「偏离必须出现」门 |

**不在 Protocol、但在 Strategy 里的**：

- channel mix（team/spawn/workflow）← `team-assembly` §通道选择；
- 角色/preset 组合 ← `team-assembly` 矩阵 + `research-planning` §4；
- workflow 授权 ← `plan.md ## Wave 执行` + 计划卡授权行；
- activation 槽 ← `team-assembly` 8 槽公式（**全 run**，D47 合同）；
- 重写政策 ← `research-planning` §6；
- acceptance profile / style ← v2（style §8.3/§8.5）。

### 6.3 DSH 原语能力矩阵（草案）

| 策略维度 | team | spawn subagent | workflow | goal | plan / task board |
|---|---|---|---|---|---|
| 角色/工具边界 | 政策（Lead 克隆） | **机器**（preset） | 继承 executor | — | — |
| 持久多轮协作 | **是** | 可续但控制面不可达 | 否 | — | task board 镜像 |
| 同质并行扇出 | 可（多 teammate） | 可（多 child） | **是**（脚本） | — | — |
| 深度控制 | 绝对量 | 绝对量 | child=executor+1 | — | depth 列 |
| 知识装载 | Lead 技能目录 | 角色 preset | 继承 executor | — | — |
| 门/HITL | ask 在 Lead（teammate 继承） | 无 ask | 无 HITL | 跨轮 | — |
| 中途 steer | 两点 HITL | 无 | 无 | — | — |
| 预算/容量 | 8 槽共享 | 8 槽共享 | 8 槽共享 | — | 节点/cells 上限 |
| 重写 | Lead 判断 | — | 脚本不可改 | — | plan vN |

（来源：orchestration-alignment §3/§4.2/§6/§7；`team-assembly` §通道选择；`research-planning` §4–6。）

**D47 后的 spawn 形态**：上表是通道级能力；spawn 列现在分三形态——默认
`research-worker`（薄叶子）、显式 `scout/analyst/critic`（角色 preset）、`research-wave`
（唯一 workflow executor）。worker profile 是 spawn 的目标，不新增通道；team 仍不能给
teammate 钉 preset。

**四个硬约束（比策略清单更先）**：

1. **当前会话的组合在首回合后锁定**：`agent-preset-registry.select` 在 `lastTurn > 0` 时抛
   `agent-preset/locked`（`vendor/dsh/packages/preset/agent-preset-registry/src/index.ts:349-355`；
   调用侧 `session-controller/src/agent.ts:516-527`）。任何要换**当前会话 preset / 工具面**或
   全局 depth cap 的策略 facet，必须在**首回合前**（新会话/新 run）决定；否则编译器只能拒绝
   或降级为政策。worker preset 可以在 spawn 时选（发生在 run 内），但 spawn 改不了 Lead 的
   组合。部署级 `maxDepth` / `maxActiveSubagents` 是全局 volatile，不能 per-run
   （`subagent/src/index.ts:188-197`）。
2. **UI 写入通道是闭集**：会话 prompt（queue/steer）、问卡答案、方法库窄工具写、空白会话的
   workspace/preset 选择；观察面（驾驶舱）只读。**策略不能写进观察面；写进观察面等于不存在**
   （model-visible ⟺ logged；`docs/design/50-agent-loop-and-state.md:23-26`）。
3. **策略记录必须有 canonical 地位**：run bundle（研究事实正本）或 session log（执行事件正本）；
   goal/任务板是镜像，驾驶舱是派生。可写面 = `protocol.json` / `plan.md` / `question.md` /
   任务板描述 / goal objective。
4. **UI 文本 = 人类授权**：UI prompt 是 `source.kind === 'user'`，会满足 goal 的
   `requireDirectHuman`（`vendor/dsh/packages/goal/tool-goal/src/authority.ts:80-108`）；编译器
   不能把 UI 文本只当「偏好」——它同时是授权。反过来，UI 不能凭空制造 HITL/批准（问卡只有
   模型能发起）。

**可行性清单（按通道分类）**：

- **A. team 主通道不可兑现**：角色工具隔离、team 不能给 worker 钉角色 preset、teammate 跑
  脚本层、对 subagent child 中途 steer/续驶、角色边界/角色技能不是 teammate 自己的组合
  （技能可加载，边界仍是政策）、per-role 深度/容量、任务板当验收门、队友 present 当交付。
- **B. 必须走 spawn**：要钉死角色 preset 的执行（claim 复核、role worker）、需要独立上下文的
  复核。默认已是 `research-worker`，角色任务显式传 `agent_preset`（省略不再落 Lead 克隆）。
- **C. 需 Package C（Package B 已由 D47 落地）**：critic 硬边界、teammate 角色 preset。
  省略 preset 落薄 worker、workflow 只挂 executor 已不再是 C。
- **D. 只能合同纠偏 + 事后审计**：workflow explicit-ask、派发五件/方法论/lens 装载、
  readiness PASS、证据判据、goal 完成判据。**D47 已把 subagent one-shot、角色边界四禁、
  8 槽全 run 落进合同**；这些从「待做」变「合同已写，仍是文本不是机械闸」。

**编译器检查顺序**：1（能否在首回合前定）→ 2（通道能不能兑现）→ 3（记录写哪）→ 4（谁授权）
→ 再看具体策略维度。这个顺序解释了为什么「换一条」在 run 中只是提示：它既改不了 preset，
又只能走会话 prompt；真正的策略切换必须在首回合前发生。

### 6.4 编译器该长什么样

不建议新增 host 工具/调度器。最小形态：

- **Strategy 投影**：从 Protocol + plan + preset 组合派生一段只读的 K/O/G/B（可以住
  `plan.md` 头部或 `strategy.md`，但**不成为第二份真相**；值从 plan/Protocol 抄）。
- **映射表**：`team-assembly`/`research-planning` 已有散文；把「Protocol 字段 → 通道/角色/
  拓扑」的默认规则写成一张可核对的表，并在 HITL1 卡/plan 头显示。
- **可行性检查**：在 HITL1 或 plan 定稿时，按 §6.3 清单检查；不可兑现的策略在卡上明说
  「本组合只能政策保证」。
- **门**：`protocol-audit` 增加 strategy 投影的形状检查（channel/roles 与 plan/实际会话一致）
  是 v2；v1 先只读投影 + 人工/critic 审。
- **UI**：只暴露能改变 S 的少量输入（见 §6.6/§7）；其余保持只读。

### 6.5 三个命名策略（从三个 run 反推）

三个 run 已经是三种**策略实例**，但没有被命名/复用为一个对象。把它们写成「命名策略卡」，
就是 Strategy 层的候选形态：

| 策略 | promise | Protocol 默认 | K | O | G | B |
|---|---|---|---|---|---|---|
| `quick_fact_check` | 可核价的单点数字/状态 | 事实核查；official/primary；quick；quick_answer | 方法四字段 + official lens | **不组队**：spawn `research-worker`（取数）+ `critic`（复核），3 节点/2 Wave | hitl1 none；critic light；claim off | 3/2/L1–L2 |
| `landscape_deep` | 谁在哪、关系、边界、截至何时 | 领域地图；academic+web；deep；landscape_map | academic/structural/practitioner/adversarial | team：scout + 2 analyst + critic；一次性取证可落 `research-worker`，12 节点/6 Wave | hitl1 protocol；critic both；claim on | 12/9/L1–L3 |
| `regulatory_compare` | 法域 × 义务 × 条文/生效/罚则 | 方案比较；official+regulatory；deep；full_report | regulatory/official/historical/adversarial | team：scout + analyst + critic；一次性取证可落 `research-worker`，12 节点/5 Wave + 回边 | hitl1 protocol；critic both；claim on | 12/11/L1–L3 |

**读法**：这三张卡不是新 schema，而是把「method + source + effort + output + gates」和
「channel + roles + topology + budget」放在同一行。它们对应 style 空间里的
fact_check / landscape / regulatory_compare 三个原型
（`external-landscape/2026-11-10-landscape-style-space.md:301-314`）。**命名策略 = 可复用的
K/O/G/B 默认 + 一段 promise/not_for**；新增策略 = 新增卡，不是新增轴。

**边界**：三场是 pilot，策略名是描述性的，不是已批准 catalog；`literature_review` 仍是高承诺
（v1 只能近似），不在这三张卡里。

### 6.6 UI 最小输入面（如果要编译）

如果要让 UI 输入能编译成策略，UI 只需暴露下面几个杠杆；其余从策略卡/Protocol 派生：

| 输入 | 映射到 | 形态 | 现状 | 备注 |
|---|---|---|---|---|
| 承诺/策略族 | 选 `quick_fact_check` / `landscape_deep` / … | 单选（6 个原型） | 无；HITL1 只推荐 method | 一句话 promise + not_for；不新增交互点 |
| 来源范围 | `source_scope.families/authority/recency` | 多选 + 枚举 | 自由文本「来源偏好」 | 外部 8 家 table stakes；应编译成检索参数 + source-tier |
| 投入 | `effort.band` | 3 档 + 代价一句 | HITL1 深度问已有 | 加步数/节点/时长增量；不加 6 档 |
| 输出形态/读者 | `output.shape/audience` | 枚举 + 文本 | 无 | 模板 + acceptance；tone 不进 |
| 批准 | `gates.hitl1` | 恒开 | 计划卡已有 | 不可关；不做开关 |
| 方法库 | 策略卡的可选覆盖 | 选一条 | 四字段 prose | 库 = 命名策略目录，不是策略编辑器 |

**规则**：折叠进 HITL1 现有三问（不新增第四问）；计划卡从「打包授权」变成「策略审阅」；
方法库从「四字段编辑器」变成「命名策略目录 + 一段方法 rationale」。这正好是外部证据
「前置问题 ≤3、每 run 新增可调项 ≤3」的约束（preference §6.1；style §8.6）。

## 7. UI 审计：哪些合理、哪些不合理

### 7.1 合理的（保留）

1. **不直写文件**：配置页签/方法库都经 Lead 或 host tool；方法库写入有 operationId +
   payloadHash + 回读对账，是全仓最硬的写路径（`method-library-tool.ts:76-120`）。
2. **空态/读不回分清**：`libraryReadStateOf` 把 absent/unreadable/ok 分开
   （`library-fold.ts:199-210`），不把「读不到」冒充「没有」。
3. **内置只读 + 库可写**分离；「偏好只能往上加要求，不能减底线」的文案（`ResearchConfigTab.tsx:220-227`）。
4. **HITL1 早、少、值**：三问 + 5 维 ≤200 字卡；外部证据支持「早问少问」（preference §6.1）。
5. **方法编辑的访谈式共创**：四字段对不熟的用户难填，Method Editor 降低门槛（D37）；
   这是「方法散文」的正确形态，不是策略编辑器。
6. **回执三态**（已发送/已回话/已落盘）：不把「发出去了」冒充「改好了」
   （`useConfigFeed.ts:131,152`；`receiptOf`）。

### 7.2 不合理的（改/停）

| # | 问题 | 证据 | 判定 |
|---|---|---|---|
| U1 | shipped 配置页签只剩「换一条」，且只在 run 已记录后出现；no-run 文案指向不存在的卡片菜单。**即使可达，它也只是 session prompt；当前会话的 preset 在首回合后锁定（`agent-preset/locked`），换不了 Lead 组合/工具面；worker preset 只能在 spawn 时选** | `useConfigFeed.ts:50`；`ResearchConfigTab.tsx:276-300,328-340`；`vendor/dsh/packages/preset/agent-preset-registry/src/index.ts:349-355` | **改**：把「选方法」放在新 run/首回合前，或明确它是「建议下一个 run」；删掉指向死 UI 的文案 |
| U2 | 「起草/沉淀」逐字入口在 shipped UI 不可达，但 skill 仍写 | `config-tables.ts:94-95`；`LegacyManagementPane.tsx:100-101`；`research-brief/SKILL.md:130-132` | **改**：把入口接回方法库，或从 skill/文案删掉 |
| U3 | 方法库四字段是多行 textarea，库格式一行一字段；续行被丢弃；改名=另存为新条目（static） | `views.tsx:337-342`；`library-fold.ts:66-82,141-153`；`method-library-operation-state.ts:44-56` | **修**：先是数据保真 bug，再谈策略；修前不要用它存长文本 |
| U4 | UI 管理的是「方法」，不是「策略」；六面里只覆盖 method（加 HITL1 的 depth/scope）。**方法切换不改变 channel/roles/tool face；这些由 preset + plan 决定** | §2.1；Protocol 枚举未暴露；§6.3 硬约束 1 | **改**：把「研究偏好」正名为「方法库」；策略输入另设或从 HITL1 派生；不在 run 中承诺换策略 |
| U5 | 计划卡是打包授权；不能逐项否；授权行是文字 | `research-brief/SKILL.md:58-62,66-67` | **改**：v2 做结构化 patch（orchestration-alignment Package A 之外的另一条） |
| U6 | 面板显示的是 question.md 的投影，不是 protocol.json；投影可漂移（regulatory ≤18 vs 12，audit PASS） | `ResearchConfigTab.tsx:310-312`；`protocol-audit-core.mjs:85-100` | **改**：显示从 JSON 派生；gate 查数字，不只查档位标签 |
| U7 | 库 adoption 无记账；0/63 可能是低估计 | landscape run 的 adjustments；`protocol.json` 无 adoption 字段 | **改**：Protocol 或 journal 加 `library_adopted`（先只读/记账，不改库 schema） |
| U8 | 两个管理面（配置页签指令 vs 方法库 host tool）语义重叠、回执不同 | §2.1；D25/D37 | **改**：留一个入口；另一个做只读摘要 |
| U9 | D47 的 `research-worker` / `research-wave` 会出现在用户 preset 选择器（DSH 无 hidden 标志）；UI 无过滤；产品命名已做 | `notes/implemented/2026-11-11-worker-profiles.md`；`packages/deep-research-pack/workers/` | **改**：产品决定——接受命名，或按 id 过滤；不要把 worker 混成研究角色 |

### 7.3 不建议加的（外部证据判「不做」）

- bias/立场旋钮、tone/style 枚举、6 档 effort、账户级 memory、per-style 模型、per-stage depth
  用户面（超 200 字卡）、可关闭的批准门（gates 是出厂 policy）。
  （preference §8 G；style §8.6；外部 agent 的「不该出现在 UI」清单）

## 8. 设计选项

| 选项 | 内容 | 证据 | 代价 | 可逆 | 结论 |
|---|---|---|---|---|---|
| **O0 只测量** | 加 adoption/strategy 记账；不改 UI/schema | 0/63 采用；投影漂移 | 低 | 高 | 不够；只证问题 |
| **O1 编译器显式化** | 派生 Strategy 投影（K/O/G/B）+ 3 个 typed 输入（source families / output shape / effort 代价）+ 投影 gate + M0 修 U1/U3；方法库保持 prose | 外部「typed 只在决策点强制」；红队；UI 审计 | 中（skill/模板/gate） | 高 | **决策：先做（已立卡）** |
| **O2 策略优先 UI** | 6 个命名 style 作为主输入；选承诺→source→effort→output；计划卡变策略审阅；库=style catalog | style §6/§8；外部「模板+acceptance」 | 中高（HITL1 合同、UI） | 中 | 试点后做 |
| **O3 编排优先（Package C）** | spawn-first / teammate preset，让 team 主通道的角色边界也变成机器边界；**Package B（worker/wave）已由 D47 落地** | orchestration G1；D47 | 高（D2/主通道） | 低 | 只有「G1 也是硬要求」才做 |

**决策（2026-11-11）**：**O1 先做，已立卡——
[策略投影 + HITL1 typed 输入（O1）](../../settled_issues/2026-11-11-strategy-projection.md)**；
M0 先修 U1/U3，再做投影与 typed 输入；O2 等库采用证据；O3 只剩 G1 条件触发
（worker/wave 已由 D47 落地）。最小可证动作不是改 UI，而是：

1. 在 3 个现有 bundle 上生成**只读 Strategy 投影**（channel/roles/topology/gates/budget），
   对照 plan 和实际会话，看投影是否可读、是否与执行一致；
2. 在 HITL1 加 3 个 typed 输入（source families / output shape / effort 代价），
   看用户是否真的改、改了是否进 Protocol；
3. 记录 library adoption（不论是否采用），看 0/63 是否真是 0。

**时机约束**：策略选择必须发生在**新 run / 新会话的首回合前**；run 中的「换一条」只能影响
Lead 的下一条回复，不能改当前组合（Lead preset 锁定、worker preset 只在 spawn 时选）。UI 应把
策略选择放在「新研究」入口；HITL1 只做「确认/修订」，不做「换组合」。

## 9. 下一步实验与判据

| 实验 | 做法 | 判据 |
|---|---|---|
| P1 Strategy 投影 | 3 个现有 bundle 手工/脚本派生 K/O/G/B，放 plan 头或独立只读节 | 3/3 能写全；与 plan 节点/通道一致；用户能复述 |
| P2 HITL1 typed 输入 | 下一场 run 加 source families / output shape / effort 代价 | 用户至少改 1 项；Protocol 与投影一致；不超 200 字卡 |
| P3 库采用 | 2–4 周内是否出现「采用库条目」的 run | ≥1 场；否则 O2 的 catalog 不立项 |
| P4 投影门 | 给 `protocol-audit` 加 source/output 数字检查，跑 3 个 bundle | 0 误伤 + 抓到 regulatory 的 ≤18 vs 12 |
| P5 角色边界（G1） | 读一次真 run 的 critic teammate 工具面 | 若出现不该有的 ask/goal，O3 优先级上升 |
| P6 组合锁 | 新会话首回合后尝试换 preset/工具面；观察 `agent-preset/locked` | 确认锁；把策略选择前移到新 run 入口 |
| P7 D47 路由 | 读一次 D47 后的真 run：一次性任务是否落 `research-worker`、wave 是否只由 `research-wave` 调、普通 analyst 无 workflow | 路由矩阵 3/3；否则回 D47 |

**决策点**：P3 仍 0 → 先修 U1–U3，不要做 O2；P2 用户不改 → 说明 source/output 不是用户
想控的，O1 缩到只读投影；P5 出现越界 → O3 进入议程；P6 若锁不存在（DSH 放开）→ 「run 中
换策略」才值得做，U1 的「前移到新 run」可放宽。

## 10. 什么会改变结论

1. **用户根本不看 strategy 投影/计划卡**：O2 的「策略审阅」不成立，O1 也应缩到 HITL1 一句话。
2. **库采用仍为 0**：O2 的「命名策略目录」不立项；先修 UI 死路径/保真 bug。
3. **DSH 给 `spawn_teammate` 加 preset**：G1 的约束消失，O3 可降级；team 也能机器边界。
4. **真 run 出现 critic 越界（ask/goal/present）**：O3 从条件变必须。
5. **外部出现「用户可选策略 + acceptance」并证明收益**：O2 从试点变对标；我们的差异转到执行/审计。
6. **output/source 门误伤高**：先 warning，不急 hard fail（Mr-Dre 21% 破坏率）。
7. **试点显示「更多输入 = 更差事实」**：缩输入，而不是加输入；偏好越多越伤准确率
   （preference §6.2）。
8. **DSH 放开 preset 锁**（首回合后可换 preset/工具面）或给 `spawn_teammate` 加 preset：
   策略切换可以在 run 中发生，UI 的「换一条」才可能变成真策略切换；否则只能在**新 run
   首回合前**选。
9. **D47 已落**：`research-worker` / `research-wave` 改变了行动层基线，O3 的 Package B
   不再是待办；若 G1（team teammate 的角色边界）仍可接受「政策 + 人工验收」，O3 只剩
   Package C，优先级下降。反过来，若 D47 的路由矩阵在真 run 里没被遵守，O3 的
   spawn-first 反而更必要。

## 11. 未覆盖

- 没有新跑真模型 run；3 个 bundle 是 pilot，不代表总体。
- 没有用户研究；「用户能不能复述策略」只有纸面判断。
- UI 结论是静态源码推断，未起 GUI 实测；U1/U3/U6 需要一次 GUI/真 run 复核。
- 没有测 `protocol-audit` 对真实新 run 的误伤率；红队是单 bundle。
- 外部消费端帮助页仍被挡；2026 论文数字是 benchmark agent，不是产品 A/B。
- 没有测 8192 skill 裁剪、8 槽实际峰值、workflow 授权越权。
- 没有实测 `agent-preset/locked`（读 vendor 源码；P6 待跑）；没有测「首回合前换策略」的真实体验。
- D47 的 worker/wave 路由没有真 run 证据（P7 待跑）；workflow child 的 `request/header` 未证；
  `present` 的 host 穿透按「非 lead = 过程稿」接受，未做 host scoping。
- `provenance-hash-contract` 未跑 quick_factual pilot；缺 hash = UNATTESTED 的实际行为待观察。

## 12. 来源与锚点

**本仓**
- Protocol：`packages/deep-research-pack/content/templates/run/protocol.json`；`scripts/lib/protocol-core.mjs`；
  `scripts/lib/protocol-audit-core.mjs:55-125`；`scripts/run-gates/protocol-audit.mjs`。
- UI：`packages/deep-research-pack/src/client/ResearchConfigTab.tsx`；`research-config/useConfigFeed.ts`；
  `research-config/config-model.ts`；`src/client/MethodLibraryView.tsx`；`method-library/views.tsx`；
  `method-library/useOperationQueue.ts`；`src/lib/library-fold.ts`；`src/lib/method-library-tool` 同族。
- 行动层：`presets/lead/skills/team-assembly/SKILL.md`；`presets/lead/skills/research-planning/SKILL.md`；
  `presets/lead.patch.yml:25-35`；`packages/deep-research-pack/workers/`；`docs/decisions.md` D43/D46/D47。
- 后续落地：`notes/implemented/2026-11-11-team-subagent-contract.md`；
  `notes/implemented/2026-11-11-worker-profiles.md`；
  `notes/implemented/2026-11-11-provenance-hash-contract.md`；
  归档卡：`_backlog/_archived/settled_issues/2026-11-11-team-subagent-contract.md`、
  `2026-11-11-worker-profiles-and-routing.md`、`2026-11-11-provenance-hash-contract.md`。
- run 实证：`research-workspace/drt_openai-api-pricing-context/`、`drt_llm-memory-landscape/`、
  `drt_ai-model-regulation-cn-eu-us/` 的 `protocol.json` / `question.md` / `plan.md`。
- 并行：[orchestration-alignment](../orchestration-alignment/2026-11-11-orchestration-alignment.md)
  §3 六不变量、§4.2 通道表、§6 G1–G8、§7 方案包。

**外部**
- [preference-layer](../external-landscape/2026-11-10-landscape-preference-layer.md) §2.1–2.6、§3.1、§4、§6.1–6.4、§7、§8。
- [style-space](../external-landscape/2026-11-10-landscape-style-space.md) §2.4、§3.3、§5、§6、§8.1–8.8。
- [first-pass](../external-landscape/2026-11-10-landscape-first-pass.md) §0、§4；
  [second-pass](../external-landscape/2026-11-10-landscape-second-pass.md) §2–4。
- 关键 URL（材料内已给）：Perplexity effort/profiles/skills；Elicit Setup/Full-Text/Report；
  Gemini collaborative planning；Qwen Deep Research API；Kimi；GPTR config；PrefEval；IFScale；
  个性化 DR Bench；MyScholarQA；Cited but Not Verified；Reference Hallucinations；Ask Early。

## 13. 给决策者的五句话

1. **三层抽象成立，但「数据层」要拆成 Protocol（设计记录）+ Strategy（行动配置）；现在缺的是
   后者。** Protocol 记录用户批准了什么；Strategy 才回答「这次用哪条通道、谁当 worker、
   workflow 在哪一层、预算怎么分」。
2. **现有 UI 不是策略输入面。** shipped 配置页签只剩「换一条」，且只在 run 已记录后出现；
   首回合后 preset 锁定，换不了组合；方法库是 prose 作者工具，不是策略编辑器。
3. **Protocol 的机器面只咬自洽性 + 三个计数**（节点/cells/waves）。source_scope、output
   sections/length、四个 gates 字段语义零消费；**Protocol 内**唯一能改 run 结构的只有
   effort 计数；行动层的 worker/wave 路由是 D47 的另一层。
4. **行动层的硬约束是 DSH 原语**：team 主通道的角色边界仍是政策；但 D47 已落 worker
   profiles——默认 spawn=`research-worker`、wave=`research-wave`、workflow 只在 wave；
   深度只计数、8 槽共享、没有全局调度器。
5. **下一步不是加控件**，而是「派生 Strategy 投影 + 3 场试点 + 投影门」；O2 等库采用证据，
   O3 只剩 G1 的 Package C。

## 14. 决策记录（2026-11-11，agent 判断）

用户 2026-11-11 授权「按最合适的做」；以下为按证据取的判断，已落卡
[策略投影 + HITL1 typed 输入（O1）](../../settled_issues/2026-11-11-strategy-projection.md)。业务验收归用户，
但不再把选项原样抛回。

1. **Protocol = 设计 / Strategy = 行动配置：做。** 只用一个数据层会把 channel/roles 塞进
   Protocol，和 D46 的「设计记录」语义打架；Strategy 先做派生投影，不新建 canonical 文件。
2. **先修 U1/U3，再做 O1。** U1 让唯一的 method 切换在 run 前不可达；U3 让库长文本丢续行、
   改名变另存。pilot 前不修，试点数据不可信。
3. **方法库先保持 prose 方法库，不做策略目录。** 0/63 采用；先证明 source/output/effort
   三个输入有人用，再把库变成命名策略目录（O2）。
4. **G1 暂不做 Package C。** D47 已落 worker/wave；team 主通道的角色边界仍是政策，但证据是
   「潜伏，不是已发生」。触发条件 = 真 run 出现 critic 调 ask/goal/present；届时再升级。
5. **接受「策略选择只在新 run 首回合前」。** preset 在首回合后锁定；run 中「换一条」只能
   影响 Lead 下一条回复，不能改组合。UI 应把选择放在新研究入口，不在 run 中承诺换策略。
6. **worker/wave 在用户选择器里先接受命名，不加 id 过滤。** DSH 无 hidden 标志；产品命名
   已做；是否过滤是后续产品决定，不阻塞本卡。
