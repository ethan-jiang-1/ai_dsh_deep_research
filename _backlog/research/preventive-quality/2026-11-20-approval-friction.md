---
topic: preventive-quality-approval-friction
intent: 区分项目实施授权、产品阶段判断与原生工具许可，核对重复确认的现有规范和当前安装实现，给出不擅自放宽权限的减摩擦方案。
---

# 重复确认：项目授权与工具许可的分界

## 结论与证据边界

本仓已有“同一授权范围无需重复请批”的明确规则和行为探针。应先纠正执行：已授权的技术工作继续自主完成；只有必要的人类判断、范围变化或真实工具许可才使用对应交互。无需再造审批流程、授权账本或常驻门禁。

原生工具许可由 DSH 执行。当前安装实现只提供一次操作批准，没有永久 grant 或命令白名单；项目层授权不能替代它。用户已批准实施，也不意味着可以取消沙箱执行边界。反过来，原生工具许可也不等于用户认可产品取舍或交付结果。

采样日期为 2026-11-20。仓库规范来自下文逐项列出的 live owner；实际运行机制另只读当前安装的 npm DSH。安装根 `DSH_INSTALL = /Users/bowhead/.nvm/versions/node/v22.23.1/lib/node_modules/@deepseek-ai/dsh`，`package.json:4` 声明 `0.2.1-rc.5`；下文 `INST/<pkg>/...` 指该根下 `node_modules/@deepseek-ai/<pkg>/...`。安装物提供打包后的 `lib/index.js`，并无对应 `packages/*/src` 源码树；实现行号均来自该实际安装物，不以 vendor 代替运行实例。

本调查未读取真实业务会话日志、未复现父会话的 `ps` EPERM、未查询当前 profile 激活清单，也未运行模型、浏览器、服务或权限变更。父代理报告其会话为 `workspace-write + ask`；本调查子会话是 `workspace-write + never`，不能代替父代理申请升权。这两种会话事实不混写。

## 一、三种授权分别由谁拥有

| 事实 | 准确规则与 owner | 对重复确认的含义 |
|---|---|---|
| 用户直派实施 | [根入口](../../../AGENTS.md) 16–17、24–25、74 行：按本轮或已有授权工作；Backlog 不是前置门，RFC 仅用于需要显式评审的持久决定。[意图载体](../../../docs/design/60-intent-carriers.md) 21、26、38、46 行：用户当前请求拥有授权范围，plan/todo 只组织已授权工作。 | 相同范围不因多步、已建 issue、要写 Note 或要自审就重获授权。 |
| 产品取舍与阶段验收 | [研发宪章](../../../CONTRIBUTING.md) 24–29 行：能自主解决就自主；门禁、审计、判据探针、对抗自审自主做；只有人类体验、方向取舍等不可委派判断在阶段边界交用户。[验收合同](../../../docs/evaluation.md) 186–202 行把加载、行为、安装与交付批准四分离，用户批准拥有方向取舍。 | 机械全绿不能冒充用户批准；用户批准也不应被泛化为每个技术步骤都发问卡。 |
| 敏感工具操作许可 | `INST/dsh-user-approval/lib/index.js:30–41,128–143,172–176`：结果只有 `allowed-once/rejected/cancelled/unavailable`；`never` 自动拒绝，`ask` 经 answerer；每次请求单独审计。 | 已有产品授权不能跳过执行许可；一次工具批准也没有为后续工具调用创建永久 grant。 |

[开发环](../../../docs/guides/60-dev-loop.md) 11–18 行已经从“用户授权（本轮请求或已有明确授权）”直接进入工作。Plan Mode 只在复杂、用户要求或软计划有助降低风险时使用；26 行规定验收澄清不自动阻断独立且已授权的工作；35–43 行只暂停依赖未决点的判断；117 行明确用户直派直接执行。恢复时仍需读取有效授权与真实进度（277–281 行）。

[Backlog 门牌](../../AGENTS.md) 36、42–43 行的例外也必须准确理解：`修复就绪` 仅自带 P1/P2 修理型授权，P0、入口链、门禁与验收合同、文档合同、pack 公共行为或 D 号不享这项自动授权。它限制自动授权的来源，没有撤销用户已经明确给出的直接授权。`等人拍板` 不能靠沉默翻转（47 行）。

[Note 门牌](../../../notes/AGENTS.md) 9–17、36 行仅要求持久决定理由记 Note、需要显式评审才建 RFC；机械与局部编辑豁免。[Backlog 吸收决定](../../../notes/implemented/2026-10-09-backlog-methodology-absorption.md) 11–15、21–22 行记录了退役仓级 queue、拒绝“全部 issue 必先 RFC + queue”这类普遍审批通道的理由。

## 二、两个技能没有授权反复问卡

[探索性验证](../../../.agents/skills/exploratory-verification/SKILL.md) 8 行是 guidance；76–80 行要求在既有记录冻结范围、版本、失败类、预算与停止条件。78 行的“真模型批单独授权、单独预算”只适用于真模型探索批，不适用于 keyless 读码、矩阵与红绿检查；其中没有“每条 charter 必须先请用户批准”的规则。已有授权若明确涵盖真模型批及其预算，无需再索取同一授权。契约歧义交用户/D 号（66 行）、耗尽预算停止本轮、扩域另记理由，都不应变成所有技术步骤的审批前置。

[交付自审](../../../.agents/skills/reviewing-a-delivery/SKILL.md) 13–17 行将 agent 自主语义自审与用户产品取舍明确分开；39–40 行要求诚实分列四类结果；146–147 行才把产品取舍交用户。不能因存在“用户批准”一栏，就把自主查证、测试、修复、语义自审退给用户。

研究产品的明定 HITL 不宜与普通开发确认混淆：[run 指南](../../../docs/guides/61-run-playbook.md) 143–153 行规定 HITL1 三问卡与计划卡，修订意见只呈一次、落盘后直接开工；155–158 行要求中间静默自主。[验收合同](../../../docs/evaluation.md) 163 行明确检查 HITL1–HITL2 之间无 `ask_user_question`、无“要不要继续”式汇报。它们约束研究 run，不为普通改仓任务增加同样的两段卡。

## 三、已存在的不重复请批验证

- [入口链探针](../../../probes/behavior/entry-chain-probe.mjs) 98–102 行的 Q1 直接询问“用户本轮明确授权的局部修改按什么范围执行？是否需要重复请批？”；139 行以“按用户授权范围执行且无需重复请批”为判据。
- 同一[探针](../../../probes/behavior/entry-chain-probe.mjs) 91–92 行把自足只读问题中的 open ask 判为失败。
- [探针回归](../../../tests/run/probes/entry-chain-probe.spec.mjs) 7–24 行覆盖本轮、仍有效已有授权与“同一范围不用逐次请批”；46–50 行拒绝“用户授权后还必须重复请批并建立 RFC”。

对本仓 docs、开发 skills、notes 与 backlog 的定向检索，未发现要求同范围反复 `ask approval` 的通用规则。现成探针已覆盖该语义；不值得新增全仓措辞 grep 门禁。此结论描述规则和资产，不证明某次真实会话是否遵守，后者需读相应日志。

## 四、当前安装的执行许可实现

| 实现来源 | 实际行为 |
|---|---|
| `INST/dsh-sandbox/lib/index.js:30–33,99–121` | `workspace-write` 只能升到 `danger-full-access`；严格更宽的请求每次调用 approver，只有 `allowed-once` 返回目标模式；拒绝后明确要求停止，不可绕过。 |
| `INST/dsh-tool-bash/lib/index.js:348–374,655–672` | bash 执行前处理 escalation；把获批模式写入该次 request 的 `sandboxPolicy`，没有调用 session 模式 setter。后续调用仍按 standing policy。 |
| `INST/dsh-user-approval/lib/index.js:63–65,98–108,128–143,172–176` | session policy 是独立持久事件；一次 approve 请求只写 asked/decided 审计，不切换 policy。`never` 是自动拒绝需要批准的操作，不能解释为“全部允许”。 |
| `INST/dsh-permission-presets/lib/index.js:138–155` | 内置 `workspace-write = workspace-write + ask`；`danger-full-access = danger-full-access + never`。 |
| `INST/dsh-permission-presets/lib/index.js:206–228,344–388` | `/permission` 可查询当前模式及可选项；参数形式切换当前会话。新会话默认与已存在会话分开，恢复 session 保留已有有效值。 |
| `INST/dsh-permission-presets/README.md:54–64` | 当前会话 `/permission` 与 General 设置的未来 session 默认是不同控制；改默认不追溯已存在会话。 |
| `INST/dsh-bash-sandbox/lib/index.js:65–74` | `danger-full-access` 直接执行原命令；它扩大实际宿主权限范围，不能只称为“少问几次”。 |

`ask_user_question` 则属于信息与决策渠道，不是上述 approval seam。作为 pinned 合同对照，`vendor/dsh/packages/interaction/tool-ask-user/README.md` 12、28、44、74 行分别说明缺信息/选择/确认、超时不是批准、子代理不能直接问用户；`vendor/dsh/docs/subsystems/plan.md` 5 行明确它是 soft guidance，与沙箱及 approval policy 独立。前者不应被用作原生许可弹窗之前的一次重复预批准。

### `ps` EPERM 的归因限制

当前安装 `INST/dsh-sandbox-local/lib/index.js:65–74` 生成的 macOS Seatbelt profile 是 `(allow default)`、`(deny file-write*)` 和 workspace/temp 写白名单；没有禁止 process-info 或 sysctl。其 `README.md:79` 同样说明治理的是文件写。因此无法仅凭 `ps: Operation not permitted` 将故障归给这段内层 profile，外层宿主执行沙箱或其他 OS 策略仍可能限制进程可见性。

一次 `danger-full-access` 重试仅取消 DSH 这次调用的内层 confinement，不能提升操作系统账户权限，也不能保证突破外层已有沙箱。应报告父会话实际观察结果，不能承诺“批准后 ps 一定可用”，不能把身份无法验证的进程当成本任务资源清理。

## 五、可执行的减摩擦方案

1. **立即修执行行为**：相同授权范围的读码、设计、测试、自审直接完成；不再问“现在开始吗”“要不要继续”。只有缺少必要的人类判断时问具体未决项；独立已授权工作照常继续。依据为开发环、研发宪章及现成入口链探针。
2. **真实需要升权时只保留原生许可**：有实际拒绝证据后，按原工具合同对原调用一次使用最窄更宽模式及 justification，不先额外发 `ask_user_question`。获批后直接执行该具体调用，不再确认相同动作。批准被拒或不可用时停止依赖步骤并报告限制。
3. **减少不必要的重复调用**：复用仍有效的进程身份、检查结果与证据；在执行前把同一诊断问题所必需且范围明确的检查组织成一次可审查调用。不能借批处理混入未授权动作，也不能把已被拒的命令改写后走替代通道。
4. **若用户确实希望减少原生弹窗，由用户选择原生当前会话权限**：先由用户在 composer 的 Permissions 控件或 `/permission` 查看可选项。当前会话选择 Full access 会取消工作区 confinement；它不是永久允许某条 `ps` 的窄白名单。保持 General 的未来会话默认不动，不改 profile、全局安装或本仓 vendor。
5. **Auto review 仅作为已有原生可选项说明**：安装目录里有该包，尚不能据此断言 profile 已启用。只有当前 picker 出现 Auto 时用户才能直接选择；没有则另按明确插件安装授权处理。不要为减少弹窗自动安装/启用它。

Auto 的实际边界来自 `INST/dsh-permission-presets/lib/index.js:54–60`（Full access + ask），以及 `INST/dsh-experimental-auto-review/lib/index.js:21,33–39`：普通项目工作低风险允许；不可逆删除、生产操作、外部写入与权限安全变更需要明确动作/目标/范围；敏感外传硬拒。其 `README.md:38,48,60` 说明它是当前 session 的实验模式、每次工具调用仍经模型审查、拒绝才转原生人工许可。它可能减少人工卡片，但会使用 Full access，并增加逐调用模型审查，不能描述成“保持 workspace-write 且自动批准”。

父会话若保持 `workspace-write + ask`，当前实现没有“授权一次本轮全部升权”的入口；同类更宽操作仍是逐次 one-shot。若外层环境持续拒绝进程取证，报告本次未运行项；不要通过削弱测试/资源身份校验来伪装通过。

## 六、是否值得改规范与单一落点

按既有规则纠正执行；最小消歧已落[开发环 §0](../../../docs/guides/60-dev-loop.md)的两条说明，因为该页拥有“授权→实施→反馈→收尾”的执行程序。其语义为：

> 本轮或已有明确授权范围内不重复请批；能自主完成的查证、实现、验证与语义自审直接推进。必要的人类方向取舍或阶段验收按对应 owner 出场；工具/沙箱执行许可遵循 DSH 原生机制，不以实施授权或普通问卡替代。

这句话不新增审批条件，不创建每轮必填表，也不修改原生权限。用链接指向研发宪章、验收合同和原生许可 owner 即可。[意图载体](../../../docs/design/60-intent-carriers.md) 3 行只拥有总图与路由；探索技能拥有探索预算；交付自审拥有语义判断，均不应复制普通实施授权规则。

[文档门牌](../../../docs/AGENTS.md) 7–20、50 行要求一个事实一个家；[根门牌](../../../AGENTS.md) 131–135 行约束常驻入口预算。因此不向根 AGENTS 追加长许可规则，不另立授权 ledger/RFC，不添全仓问卡计数门禁。既有入口链探针可按相应文档改动的既有验收路由复用。

## 实际检查与未运行项

实际完成：只读根入口、研发宪章、意图载体、开发环、验收合同、两个指定技能、Note/Backlog owner、现成入口链探针及回归；只读当前 npm 安装的 approval、sandbox、bash、permission-presets、Auto review 实现。新增本材料；主会话另外已更新开发环 §0 的执行授权与工具许可消歧，没有改变原生权限。

本材料的子调查未运行：真实会话问卡审计、父会话 `ps` 复现/升权、当前 profile 激活清单、Auto admission、模型探针和浏览器。主会话另有 `ps` 在默认权限 EPERM、单次批准后运行隔离进程 runner 的实际记录；这只能证明单次操作，不证明后续免审批。

## 用户追加的根治要求与当前处置

用户随后明确要求消除无人值守时逐次授权卡住的问题，指出仅消歧项目说明不能解决它。主会话据此选择原生 Full access 作为不再逐次询问的处置路径：当前会话命令 `/permission danger-full-access`（或 Permissions 选择 Full access）将两项机制一起切到 `danger-full-access + never`；General 的默认 Permissions 另控制未来新会话。不要只把 approval 改成 `never` 而仍留 workspace-write，那只会把升权变成自动拒绝。

主会话已通过 Host Inspect 读取 `permissionPresets.set(session, name)` 的精确合同与当前工具目录。Inspect 只有只读查询；已提供工具没有会话权限切换操作，因此未调用该 Service、未安装绕过它的插件，也未修改会话日志模拟切换。已向用户提供一次原生切换入口；目前最新 runtime snapshot 仍为 `workspace-write + ask`，尚未观察切换生效，不宣称已根治。生效后应以新 snapshot 和不带 `sandbox_permissions` 的进程 runner 执行结果验证，并在本节更新事实。
