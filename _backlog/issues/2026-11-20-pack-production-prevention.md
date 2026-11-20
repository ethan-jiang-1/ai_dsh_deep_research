---
status: 等人拍板
opened: 2026-11-20
---

# 推敲：Pack 生产源头预防——D 节点表解释已落地，P 生产强制仍待裁决

> 立卡：2026-11-20 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 结论倾向：现在做 — D 节点表解释切片已交付；P 生产强制未定 ｜ 可关闭：否
> 去向：implemented — [实现说明](../../notes/implemented/2026-11-20-pack-production-prevention.md)；业务验收：用户（待）

**问题与期望结果：** 研究角色直接生产文件，部分确定性错误到包外审计或后续探索才被发现。希望把这类错误的解释与诊断集中，减少反复修同类输入的义务。完整方向是尽早发现坏产物；D 切片只完成 plan 节点表单次解释及既有消费者的正确使用，不声称已经阻止坏 plan 写入或派工，也不以 schema 合法代替研究质量。

**当前情况：** [生产源头研究](../research/preventive-quality/2026-11-20-pack-production-prevention.md)已提交于 `6d6fd17f`，源码采样点 `71010fef`。D 切片的兼容/结果合同已冻结并由独立审阅者写独立期望，实现提交于 `e646efbc`；观察与硬门共用解码事实、各自裁决，gate 的 raw 第二读已删除。业务验收与 P 的取舍未完成。

**本轮授权：** 用户 2026-11-20 授权按已审查范围自主实施并验证 D，要求实际证据与质量；P 仍未授权。只改本 repo，不改权限、全局配置、宿主或 vendor。[首批 A+B 卡](2026-11-20-preventive-quality-pilot.md)的失败评测、未决验收保持独立。

**未决问题：** 用户是否接受 D 的兼容变化（装饰表头/ID 进入 gate 支持域；多表、重复语义列、错列、转义管道成为明确拒绝）与其有限收益。P 的真实保护点仍未证明，是否以后做/不做未裁决。

**下一步：** 用户确认 D 的业务结果与兼容取舍；P 单独裁决，未裁决前本卡活跃、不可关闭。agent 不再改产品，除非用户明确扩大授权。

## 核心思想审查

| 判断 | 理由与对方案的约束 |
|---|---|
| **方向对：把确定性解释及其错误归到一个 Module** | 观察层与 gate 对同一表做两次解释，是已证局部成因；把列定位、原始值/规范值与诊断集中可删除调用者的重复知识。首片 Interface 应是纯输入→解析结果，不混入文件写入、Team 调用、UI 策略；测试和消费者经过该 Interface |
| **一致不等于正确** | 两个消费者用同一错误 decoder 也会一致。必须按独立合同冻结 expected，分别证明字段解释与各消费者策略；见 [类级守卫 §旧性质](../methods/class-level-guards.md#01-旧性质随变更继承) |
| **目前不支持把事务发布列为最低试点** | 现有证据支持解释收口，尚未证明需要自建发布操作及其接缝。任务创建、回填、快照、当前文件是不同副作用；不能用统一 decoder 证明它们可原子化 |
| **首片的收益有限且要明说** | D 能减少解释漂移和后验门误判，不改变通用写入/派工链；距离“在生产源头强制预防”还有 P 的机制证据。若用户只接受生产强制收益，D 单独通过不满足该目标 |

## 已知事实与证据

| 已证事实 | owner / 证据 | 解释边界 |
|---|---|---|
| 节点表 canonical，Team task 是镜像；重写前保存旧版 | [plan 模板](../../packages/deep-research-pack/content/templates/run/plan.md)、[planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md) §1/4/6 | 文本义务不是事务实现；task_id 是先建 task 后回填的会话映射 |
| 观察层规范化表头和单元格，丢掉 budget 及空/显式占位符区别；gate 又按 raw table 查 budget/task_id | [plan-index](../../packages/deep-research-pack/src/lib/plan/plan-index.ts) `normalizeHeader/cellValue/planIndex`；[plan-gate](../../checks/lib/gates/plan-gate.mjs) 56–82 行 | gate 已有 active 字段门；显式 `—` 合法，不能为同源化丢掉该性质 |
| 普通 ID 和 `**ID**` 的观察节点相同，gate 分别 PASS / RED 缺 budget/task_id | [研究 §样本 1](../research/preventive-quality/2026-11-20-pack-production-prevention.md#样本-1plan-只读提示字段门补齐以及-active-budget-的旧性质)保存条件与完整结果；本机对照脚本当轮 exit 0 | 只证消费者差异；未证加粗 ID 必须合法，更未证生产坏计划已被派工 |
| 缺 plan 与坏 plan 在观察层都可得到空索引；UI 可回退显示 Team tasks，硬门对在场空表 RED | [plan-index 测试](../../tests/cockpit/lib/plan/plan-index.spec.mjs)；[ResearchGraphTab](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)；[plan-gate](../../checks/lib/gates/plan-gate.mjs) | 保留观察的可用性，不能把解析诊断变成 UI/整个 run 新硬阻断；门 P 缺席 N/A 不代替 schema-scan 在场级判断 |
| 角色仍有通用 write/edit；包发布不包含整个 checks | [lead preset](../../packages/deep-research-pack/presets/lead.patch.yml)、[NODES](../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md)、[manifest](../../packages/deep-research-pack/package.json) | 包内存在 parser 不等于装态存在硬门；推荐 publish 路径不等于强制唯一写方 |
| 集中写操作已有实例，但不能直接借用其锁证明 CAS | [method-library-tool](../../packages/deep-research-pack/src/method-library-tool.ts)、[method-library-io](../../packages/deep-research-pack/src/method-library-io.ts)；[研究 §三](../research/preventive-quality/2026-11-20-pack-production-prevention.md#三现有源头能力到底证到哪里) | 是可行形态参考，不是 plan 操作合同或原子并发证明 |

历史 267/282、260、312、150、097/114 的因果与当前修复核对见[研究 §二](../research/preventive-quality/2026-11-20-pack-production-prevention.md#二历史因果样本与当前代码核对)，不是新漏洞清单。快照历史来源真实性另属 [BUG-328](../bugs/BUG-328-plan-snapshot-same-text-only.md)，D 不宣称解决。

## 范围与方案取舍

| 候选 | 独立结果 / 不承诺 | 判断 |
|---|---|---|
| 现状：包外后验门 + 提示/案例 | 成本基线；保留两次表解释和装态缺少 dev 门的现状 | 对照方案，未被“测试数量更多”自动击败 |
| **D：共用节点表解释** | 保留 Markdown 唯一当前版；纯解析保留缺/空/显式无值与诊断；gate 删除节点表 raw 第二读；观察与硬门各按合同消费 | 当前技术推荐；不用先新增 host 操作、权限或存储格式。它是解释缺陷的预防，不是生产强制 |
| **P：生产/消费前强制保护** | 先找到真正覆盖操作的保护点，再判断是否需 publish；包含快照/当前版/Team 的分阶段失败语义 | 仍未展开的可行性分支，缺 owner；不作为 D 验收项，D 不自动授权 P |
| 结构化正本生成 Markdown | 需迁移全部编辑/恢复/消费路径，改变公共格式 | 当前证据不支持该额外代价；不新增双正本 |
| 仅加推荐 publish 工具 | 可能改善推荐路径；通用文件写入仍可绕过 | 不能称强制。只有用户接受辅助收益且另有具体方案，才可选 |

D 排除：计划文件写入/快照事务、任务创建/回填/派发、跨进程并发恢复、全仓迁移、Protocol 数值上限重算、判研究内容质量。budget 仍是节点预算文本，不求和代替 Protocol 投入合同。新流程节点、harness loop、全局权限、vendor 修改、禁用全部文件工具、A4 重跑、真实模型/研究 run 均不在本轮。

evidence/findings、review/reader 等候选继续在[研究候选表](../research/preventive-quality/2026-11-20-pack-production-prevention.md#四优先候选最多三项全部未实施)，未选择做/不做/延后；不预建执行票。

### D 已核消费者与旧性质

这是对 `0d67a076` 源码的静态调用链核对，不是运行覆盖证明；实施 diff 有新消费者时重新查核。

| 真实 reader / owner | 当前决定与必须继承的性质 | 定向证据 owner |
|---|---|---|
| [useGraphFeed](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts) 当前/快照文本 → planIndex；[ResearchGraphTab](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) → planIssuesOf | 只读、不 throw；坏 plan 仍可观察任务及提示；无映射是未知，不冒充未执行/完成；快照不参与派工 | [plan-index](../../tests/cockpit/lib/plan/plan-index.spec.mjs)、[graph-model](../../tests/cockpit/lib/plan/graph-model.spec.mjs)、[plan-diff](../../tests/cockpit/lib/plan/plan-diff.spec.mjs)。hook 轮询/浏览器不是这些纯件测试所证 |
| [graph-model](../../packages/deep-research-pack/src/lib/plan/graph-model.ts)、[plan-diff](../../packages/deep-research-pack/src/lib/plan/plan-diff.ts) | 精确 task_id/id 映射、不按后缀猜；active/墓碑、父子、差异及重编号语义继承 | 同名两份测试；图算法归 [plan-graph](../../tests/cockpit/lib/plan/plan-graph.spec.mjs) |
| [plan-gate](../../checks/lib/gates/plan-gate.mjs) 当前/前版快照 → [node-gate-core](../../checks/lib/gates/node-gate-core.mjs) | 缺文件 N/A，在场空/畸形 RED；active 必填/墓碑豁免、hard/soft、版本/快照、剩余工作与 Wave/task 原性质保留；仅删除重复节点表解释 | [plan-gate](../../tests/run/gates/plan-gate.spec.mjs)；不得以标题声称已测全部 budget 状态 |
| [protocol-audit-core](../../checks/lib/gates/protocol-audit-core.mjs)、[strategy-core](../../checks/lib/gates/strategy-core.mjs) → planIndex | Protocol 顶层节点/深度/Wave 上限；strategy 为派生观察，不判断领域策略好坏。**D 候选保持当前策略**：坏表仍可能投影为 nodes=0；这不是有效零投入的证据，必须同时看门 P/解析诊断，不把 strategy/protocol 单项绿作为表合法证明。把零值改 unknown 或新增 protocol 阻断不在首片，需另审输出兼容 | [protocol-core](../../tests/run/gates/protocol-core.spec.mjs)、[strategy-core](../../tests/run/gates/strategy-core.spec.mjs)；非法输入如何传播须在冻结合同中明确，不借此更改整个 protocol policy |
| [client-load](../../checks/smoke/client-load.entry.mjs) 读取 planIndex 的 active 节点数 | 是消费面与必要时的真显示证据，不是派工保护点 | 原有 browser 入口；D 若不改显示/装配，不以额外浏览器演示代替纯件证据 |
| [run-version](../../packages/deep-research-pack/src/lib/run/run-version.ts) 另读头部/重写记录版本 | **相关但本轮排除版本 codec 改造**；它不仅读节点表，头部与记录冲突要分别展示。不能声称“全部 plan 解释已统一” | [run-version 测试](../../tests/cockpit/lib/run/run-version.spec.mjs)保回归；如 D 必须改变版本读法则扩大范围前重审 |

Lead 的“读 plan → 调 Team 工具”由 [planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)规定，不是上述观察 reader 的机器守卫。D 不改变这条调度链。

### D 支持域：先核合同，后冻结期望

以下为具体技术候选，不把所有源码问题抛给用户；未冻结前不实施 parser。

| 输入族 | 已有依据 | 建议及未决边界 |
|---|---|---|
| 当前模板单一节点表、12 列、普通 W id | 模板及 planning §1；可选缺席由 gate 自己判 N/A | 必保基线；模板占位样例不是填好后的合法 plan，不能拿模板原文当 PASS expected |
| N / flat W 旧文档、缺字段、墓碑及部分图 | 观察测试与 planning 只读兼容，硬门可能分别告警/拒绝 | 保留只读解释兼容与原提示；不把旧文档或编制中输入强制迁成新格式 |
| 反引号/加粗、表头大小写及 `_`/`-`/空白、行尾/前后空白 | 当前 parser 的规范化是实现事实，不能据此声称 gate 已支持 | 候选保留已有观察解释，明确哪些形式升级为 gate 支持、哪些给结构诊断；兼容影响由 agent 先产冻结清单，用户只确认新增公共支持/拒绝取舍 |
| 重复列、同名多表、表格在注释/代码块中、转义管道与错列数 | 当前 first-match/split 不是充分合同 | 每族给位置/歧义诊断及 UI/门行为，不能凭首/末匹配猜权威。未知普通列不自动等于非法；支持或忽略需有依据，禁止无限 Markdown 语法扩展 |
| BOM/CRLF/U+3000、全半角及装饰组合 | judgment-design 的输入维度，非全部同义 | 只对明确为语义等价的变换要求值不变；全角 ID/标点等未经批准形态不自动折成合法 |

#### 建议采用的精确结果（待确认，不是当前实现事实）

为避免把查证留成无限待办，D 的最小候选如下；它不更改版本选择、剩余工作或 Wave 的既有裁决。

| 族 | 解码/位置诊断 | 观察 / 门 P |
|---|---|---|
| 文件缺席 | source absent，table absent，无节点 | 保持缺席/任务回退 / N/A；schema-scan 另管在场级 |
| 在场空白、无节点表、有效列但零数据行 | source present，table invalid，分别 empty-source / table-missing / empty-table | 保持任务可见并提示 / RED，不是合法空图 |
| 唯一表、唯一规范列、行列对齐 | table decoded；字段逐个保存存在性与值；缺必填列不伪造 cell | 允许部分图观察 / 原有字段及图性质决定 PASS/RED，不因 decoded 自动 PASS |
| 表头/值反引号和加粗、表头大小写/空白/下划线/连字符 | 按现观察层 normalize 取值，同一列映射也用于 gate；普通未知列保存或忽略，不参与业务规则 | 候选保留观察兼容并消除 raw 第二读；有效字段形态不因装饰误报缺列。**这是 gate 支持域的明确扩大，须确认** |
| 两个已识别语义表头规范化为同一列、多个 id 节点表、行列错位 | table invalid；duplicate-column / ambiguous-table / row-arity，报告各位置；不给 first/last 权威节点。未知扩展列忽略，不参与语义重复冲突 | 任务/原文仍可看，不以选中一表生成权威映射 / RED。**这是部分旧输入的新拒绝，须确认** |
| 注释/代码块内伪表 | 不作候选节点表；若外面有唯一真表，只解真表；只有伪表则 table-missing | 观察只取真表 / 仍按有无真表判；不让示例夺权 |
| 转义管道、任意复杂 Markdown | 首片不新增完整 Markdown 文法；节点表检测到 `\|` 则 invalid / unsupported-escaped-pipe，不寄望错列计数抓全语义错分；其他可检测错列为 row-arity。该新拒绝与现支持输入的冲突必须列入兼容清单 | 不静默改写为猜测字段 / 未支持形态有诊断；不能为过例子引入整套新引擎 |
| BOM/CRLF、首尾普通空白/U+3000 | 仅容器级无语义差异的变换保字段值；不把全角 ID、冒号等任意折成 ASCII | 已声明同义族结果一致 / 非同义族不被误接受，逐族 independent expected |
| active budget 缺列/空 cell/空白；显式 `—`；墓碑缺 budget | 分别 missing-column / empty / explicit-placeholder；墓碑字段存在性也不丢 | 观察不阻 / 前组 RED、显式 `—` 不因缺预算红、墓碑沿原豁免 |
| task_id 缺/空；`—`；task-N；plan-only | 保真到对应 presence/value；`—` 观察未映射，task-N 精确映射，plan-only 原投影 | 保持现有 gate 各条件，不顺便修 task_id 终态 gap；这条限制须进入交付记录 |
| 旧 N/flat W、头部多版本/正文历史版本 | 节点兼容及原图提示；版本继续既有 owner，D 不新增冲突裁决 | 原观察及 hard/soft 结果不变；版本不在本次新解析支持承诺内 |

独立审阅 `535a040b` 已核此候选 baseline，发现的转义管道漏判及未知扩展列重复规则已精化。可据此写独立 expected，但**尚未逐格冻结输入 bytes 为可执行资产**；这不是声称变异矩阵已通过。对新增拒绝与装饰支持的确认是一个 D 兼容取舍，不逐个追问用户源码规则。若用户不接受该变化，回到保留现有域的较窄 D 方案，不能为求 ready 把取舍藏进实现。

**落地前准备表：** 证据可在实现前冻结；新代码测试及负控真正运行在实施期，不要求 ready 前已经完成实现。

| 必要准备 | 本轮进度 | 完成信号 / owner |
|---|---|---|
| 用户结果及 D/P 依赖分开 | 已在本卡收窄为建议；未当作用户批准 | 用户确认 D 的有限收益是否值得先做；不确认 P 强制收益 |
| 全部受影响 reader 与旧性质 | 静态清单已核，补入 strategy、snapshot 和排除的 run-version | 实施前对最终 diff 复查调用链；agent 负责，不需用户回答源码事实 |
| 支持域/状态/兼容输出 | 已按输入族给具体候选结果；装饰支持/歧义拒绝属于兼容变化，尚未批准 | 审阅者核对候选后，用户确认兼容取舍；逐格冻结输入 bytes、presence/value、diagnostic 与观察/门结果，不留“红或 unknown”二选一 |
| 独立 oracle 与真实 runner | 现有 owner 已列；支持域 expected 尚未冻结 | 审阅者按合同手写字段/结果，变换生成输入而非从实现抄 expected；记录 baseline 与负控对应规则 |
| 义务减法与成本 | 明确删 gate budget/task_id 第二查表；未实测新成本 | D 不新增 public publish/配置/持久数据；定向耗时实录、合法对照无误红；是否值得由用户判断 |
| 方案去向及授权 | 未做现在做裁决，未创建 Note | 若批准 D，记录 `结论倾向：现在做`、非空验收、去向与最终方案后才 ready；实施授权单独取实际请求 |

## 判据形状

此节针对 D；P 没有已批准判据，不预写成 D 的隐藏义务。

| 项 | D 候选合同 |
|---|---|
| 权威事实 | Lead owning run 的 plan.md **节点表字段**；Markdown 仅为容器，结构化表字段是事实。允许通用工具按同一合同编辑，不以绝对唯一工具写方作为前提；并发写语义归 P。Protocol 上限、Team 任务、头部/记录版本不变成 decoder 的第二正本 |
| 读取方 | 上述清单。共享节点表原始/规范事实与位置诊断；观察投影与硬门分别决定结果，不强求 verdict 或 UI 文案相同 |
| 结果最小语义 | 保留 source absent / present；table absent / invalid / decoded；字段 missing-column / missing-cell / empty / explicit-placeholder / value，以及原始值、规范值、行列位置与 diagnostics。具体 TS 类型和是否分开函数由已有 Module 的小 Interface 决定，不把内部 AST 全部暴露给调用者。decoded 不等于 gate PASS |
| 坏输入策略 | source absent：观察保持现状、门 P N/A；source present 且无表/空白/截断：观察可用并有显式诊断，门 RED；重复/矛盾不能被 first/last 默认选择后作为权威。合法但不完整的观察图不升级为 run 全局阻断。各支持域 exact 结果先冻结 |
| 字段性质 | active budget/task_id 缺列或空值仍 RED；budget 的显式 `—` 合法。task_id 的 `—` 只保真为 explicit-placeholder，观察仍为 unmapped：当前 gate 的单项检查接受它，但 planning §4 要求回填后真实 task-N 或 plan-only，二者存在合同缺口，不能称“允许的终态”。D 的支持域冻结须明确保持当前 gate 行为并记录该限制，或把收紧列为单独公共行为选择；不得悄悄新增派工门。`plan-only` 仍只限现有 Wave 条件，墓碑按原条件豁免 |
| 旧路径退出 | D 通过独立期望、消费者旧性质与负控后，同一变更删除 gate 的 budget/task_id raw 第二解释；旧观察适配可保留，但必须来自同一解码事实。版本/剩余工作/Wave 另节解析不在“节点表第二读”删除承诺内 |

### D 不变量与变异矩阵

每条新增/修改验收规则在其真实 runner 下有针对性负控；相等断言仅证同源，不作正确性 oracle。冻结 independent expected 后才改实现，禁止 renderer 或被测 decoder 生成期望。

| 输入族 / 故意回归 | 不变量与互补检查 |
|---|---|
| 缺整份 plan / 在场空白、无表、截断/错列数 | 缺席不误红；在场坏表有位置/状态诊断，硬门 RED；观察不崩且仍可看 Team tasks。不是一律空数组再算成功 |
| active budget 缺列/空 cell/空白 / 显式 `—` / 墓碑缺字段 | 前组 RED，显式无预算不误红，墓碑条件豁免；恢复把占位折成缺失、漏 active 校验分别被独立正常/反例发现 |
| task_id 缺列/空 / `—` /真实 task / plan-only + Wave 有无 | 保存存在性、按原语义分别判断；无映射保持未知、无后缀猜测；建任务前后映射时序不由 D 改写 |
| 重复 id/列、多表、代码/注释内伪表、编码/装饰组合 | 由冻结支持域生成同义和非同义族；矛盾不给猜值；普通合法输入零误红。恢复 raw 第二解释必须被一个邻近变体发现，不能只重放已报的加粗例 |
| DAG/父子/墓碑、旧 N/flat W、版本/快照与 strategy 投入 | 独立旧性质在实际 reader 上运行；UI 可提示，gate 维持 hard/soft；恢复旧版本/预算错误需对应 owner 见红，不改变 Protocol 计量口径 |

## 验收标准

下表仍是 D 的合格合同。D1–D4 已按该合同实施并有实际证据（见“本轮实施记录”），但**业务验收归用户、尚未完成**；P 不在本表，也不能因本表全绿被称完成。

| 编号 / 类 | 输入与正常/反面结果 | 信号、owner 与命令 | 人工判断 / 证明边界 |
|---|---|---|---|
| D1 字段解释（确定性） | 支持域逐族给 raw/presence/value/diagnostic 独立 expected；active 预算和任务缺/空/—、墓碑互补，合法样例不误红 | [plan-index](../../tests/cockpit/lib/plan/plan-index.spec.mjs) + [plan-gate](../../tests/run/gates/plan-gate.spec.mjs)；`node --import tsx/esm --test tests/cockpit/lib/plan/plan-index.spec.mjs tests/run/gates/plan-gate.spec.mjs`。已补 budget/task_id 缺列与空值断言（gate spec）。恢复第二读、丢占位区别及漏校验各自见红 | 新增支持/拒绝的公共行为由用户；既有性质正确性由独立合同判断 |
| D2 消费策略与旧性质（确定性） | 当前/快照、旧图、映射/墓碑、差异、版本/投入、strategy；相同表字段同源，各 reader 结果符合自己的合同 | D1 与 [graph-model](../../tests/cockpit/lib/plan/graph-model.spec.mjs)、[plan-diff](../../tests/cockpit/lib/plan/plan-diff.spec.mjs)、[plan-graph](../../tests/cockpit/lib/plan/plan-graph.spec.mjs)、[protocol-core](../../tests/run/gates/protocol-core.spec.mjs)、[strategy-core](../../tests/run/gates/strategy-core.spec.mjs)、[run-version](../../tests/cockpit/lib/run/run-version.spec.mjs)。复用这些 owner 的定向 `node --import tsx/esm --test <files>`；每条受影响旧性质对应反例 | 无新业务判断；纯件只证调用逻辑，不证 hook 轮询、浏览器或调度 |
| D3 真实使用（装配，按实际 diff） | 所有改动 reader 实际调用共用解释；真实门对坏 bundle RED、合法/缺席各按合同；不能只测 helper | [node-gate](../../checks/run-gates/node-gate.mjs) 入口对隔离 bundle 运行，用 `node --import tsx/esm checks/run-gates/node-gate.mjs <隔离 bundle 绝对路径> --sessions <空会话目录绝对路径> --no-write --no-review`，读取 stdout 的门 P 状态/诊断；当前 CLI 没有 `--json`。逐门断言 P，其他子门可能因不完整 bundle 为 RED/UNATTESTED，不以整体 exit 冒充 P 结果。若显示/locale/客户端装配有变化，按 [开发环](../../docs/guides/60-dev-loop.md)走 [client-load](../../checks/smoke/client-load.entry.mjs)真显示档；包结构改动再走 [release.entry](../../checks/smoke/release.entry.mjs) | 无新业务判断；入口只证所走面，不证装态生产强制。环境阻断写 NOT-RUN，不换 helper 冒充 |
| D4 义务减法与回归（确定性 + 业务判断） | gate 第二节点表读实际删除；重复纯件断言收敛但旧性质保留；合法矩阵无误红；无新 public publish/配置/第二存储 | diff、定向命令耗时、`pnpm verify` + `pnpm test`；修改代码必须类型检查。新 UI 诊断中英同步；不改模型工具/skill，模型证据 N/A，若实际扩面先重审 | 用户判断收益与维护成本；不拿测试数/BUG 数代替业务收益，不外推长期缺陷率 |

## 本轮实施记录（D 切片，`e646efbc`）

实现说明与残余风险 = [implemented Note](../../notes/implemented/2026-11-20-pack-production-prevention.md)。机器证据在 `runtime/smoke-workspace/preventive-quality/`（运行区，不入库）。

| 证据 | 层 / 覆盖的失败类 | 负控（见过红） | 结果 / 边界 |
|---|---|---|---|
| [plan-index 表事实与观察诊断](../../tests/cockpit/lib/plan/plan-index.spec.mjs) + [plan-gate 字段/装饰/占位](../../tests/run/gates/plan-gate.spec.mjs) | 确定性：缺席 vs 空白、占位 vs 缺失、短行、重复语义列、多表、伪表、转义管道、装饰、BOM/CRLF | 改前装饰用例实际 RED；六次源码变异各 1 红后还原 | 35/35、39/39 定向通过；`pnpm typecheck` exit 0。纯件不证浏览器/hook |
| [node-gate 真入口](../../checks/run-gates/node-gate.mjs) 隔离 bundle | 装配：实际 run 门读取同一解码事实 | 无独立变异；坏/缺席/合法三态对照 | 合法与装饰表 P=PASS exit0；空白与多表 P=RED exit1；缺席 P=N/A exit0。聚合退出不冒充 P |
| [GraphNotices 静态渲染](../../tests/cockpit/client/research-tabs.spec.mjs) | 显示：中英诊断文案与英文零 CJK | 文案删改即红 | 3/3 pass；不证浏览器加载 |
| `pnpm verify` + `pnpm test` + `pnpm build` | L0：引用/形状、现有回归、构建 | 无新增门禁变异 | verify exit0；1435 spec + 265 checks，0 fail/skip；build exit0 |
| `client-load.entry --seed` | 真浏览器装配回归 | 无坏表种子，不能证明新诊断显示 | **NOT-RUN**：主机 load 3.62 > 1.5，exit 2；未跑 ≠ 通过 |
| 生产写入/派工拒绝、并发恢复、安装形态、模型 | P / 其余层 | — | 未运行；D 不声称这些 |

## P 仍未展开的生产强制问题

P 先回答“在哪里真正阻止使用非法 plan”，再设计工具，不能反过来。需要一份可查证的操作链：直接 write/edit、其他角色/worker、恢复与安装态 → 真实消费者/派工 → 可用原生接缝与 owner。没有覆盖依据时只可声称推荐路径辅助，不能声称唯一写方或全部拒绝。

若选择 P，才设计候选/当前版的成功点、旧快照及版本冲突、取消/崩溃、并发、Team 创建/回填/派发的阶段与补偿。保持 `task_id` 先建后回填，不能先要求映射存在才允许建任务。文件与 Team 没有已证原子事务；临时 adapter 的绿不能证明真实状态恢复。必须先命名可运行 owner、读取协议、世界状态 oracle 与正反控制；缺 owner 记 BLOCKED。需要改 harness loop 或扩大权限时停止本候选。

## 成本、停止条件与关闭条件

**成本建议：** D 先冻结支持域与独立期望，再估实现成本；不以未经测量的 ≤1 秒或 4 小时当收益依据。记录定向 suite 的输入、命令、机器与实际耗时。D 应减少调用者重复解释；若需新增复杂 Markdown 引擎、public 发布系统或持久正本才能做成，回到方案比较。P 单独预算，不扩进 D。

**ready/落地状态：** D 的支持域、结果合同、独立 expected、证据路由与实现均已落地（`e646efbc`），技术负控与真实入口见上表。用户业务验收尚未完成，因此卡片停在 `等人拍板`，不归档。P 没有可运行保护点，仍未展开；它不因 D 通过而自动成立。

**去向：** D 的持久理由已由 implemented Note 承载；业务验收归用户。P 的后续选择留本卡依赖分支，以后做/不做需用户明确裁决并记录重议 owner。

**关闭条件：** 用户对 D 的业务结果与兼容取舍给出明确答复，且 P 的重议去向被记录后，按 [结论去向](../methods/issue-to-note.md)与归档规则关闭。机械绿、文档齐全或第一切片绿均不等于整 Feature 完成。

## 审查与实际证据

建卡提交 `0d67a076`：独立审查 `03a87bb3` 修正真实测试路径后无文档交付 blocker；`pnpm verify` exit 0，`pnpm test` exit 0（1423 spec + 265 checks，0 fail/skip）。这些是文档及现有回归证据，不是 D/P 实现结果。

本轮思想审查以 `0d67a076` 为基线，调用 [reviewing-a-delivery](../../.agents/skills/reviewing-a-delivery/SKILL.md) 并读完整 codebase-design/DEEPENING。按 [整理方案](../methods/requirements-synthesis.md)只读完整本地 to-spec 作来源适配，未注册调用、不执行其远端发布/自动 ready 默认。两名独立审阅者 `ce1ebf9b` / `535a040b` 均认为方向成立但首片过宽；本版分开 D/P，补状态/支持域/reader 和独立 oracle。修订后定向复核确认 D/P 拆分成立；提出的 task_id 占位/终态差异、strategy 零值投影限制与 node-gate CLI 参数均已核源码并修订。两项仍阻 ready 的准备是兼容取舍确认与独立 expected 最终冻结，不阻本轮 review/卡片提交。`pnpm verify` exit 0；`pnpm test` exit 0（1423 spec + 265 checks，0 fail/skip），本机输出 `runtime/smoke-workspace/preventive-quality/issue-review-test.out`。

| 证据 | 层 / 失败类 | 负控与证明边界 | 结果 |
|---|---|---|---|
| 源码/旧决定/双审阅 | 语义：把解析一致冒充正确、把推荐发布冒充强制、事务范围过大 | 指出了具体过度承诺并收窄；未验模型或生产拒绝 | 静态审查完成，非产品验收 |
| 六 owner 定向现有测试（审阅者执行） | keyless：plan-index/gate、protocol-core、graph-model/diff、strategy-core 现有性质 | 未改代码、未做新变异；不证 D 已实现 | 103 pass、0 fail/skip；当前机器约 549ms |
| 本轮文档 verify/test | L0：引用/形状与现有回归 | 不新增机器判据，不注入产品变异；不证候选成立 | exit 0；1423 + 265，0 fail/skip；提交仍走正常钩子 |

够了判据（D 交付 + 本卡收尾）：会红＝装饰缺口改前实红、四次变异各自见红；真入口＝node-gate 隔离 bundle 三态实跑（浏览器显示 NOT-RUN）；验世界＝磁盘 bundle 的 P 状态与退出码、负控后源码逐字节还原；模型可见钉住＝N/A（未改模型面）；最低层＝纯件 + 真实 run 门 + SSR；skip 可见＝浏览器/安装/模型/P 未跑与已跑分列，0 skip 不包含它们；可重复＝仓内命令、输入与输出路径在运行区。生产写入、派工拒绝、并发恢复、安装形态与模型仍未运行；D 只证明节点表解释与现有消费面，不证明整 Feature。
