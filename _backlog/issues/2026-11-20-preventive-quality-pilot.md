---
status: 待落地
opened: 2026-11-20
---

# 预防性质量落地：有限准入与启动互斥实证

> 立卡：2026-11-20 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做（首批同时落开发环与工程实证） ｜ 可关闭：否

> 去向：implemented — 分批交付（B 技术决定已有 Note；A4 与首批整体验收仍待定）。业务验收 owner = 用户，技术证据 owner = 实施 agent。此行不表示卡片可关闭；当前 B Note 见上文链接。

**问题与期望结果：** 已有 D54/D55、类级守卫和多轮修复，新启动锁仍重犯活 owner 被时间接管、旧 release 删除新锁、两个入口各自锁定等已知问题。要把保障前移到新行为引入阶段，让公共操作与可执行性质减少重复缺陷和调用义务；探索用于预算内发现新假设，同一已声明性质不再每轮靠探索首检。

**当前情况：** 2026-11-20 研究结论与证据已评审，实施记录见本卡下方及[首批 Note](../../notes/implemented/2026-11-20-preventive-quality-pilot.md)；[研究题](../research/preventive-quality/README.md)保存依据，[综合](../research/preventive-quality/2026-11-20-prevention-synthesis.md)解释取舍，[详细落地方案](../research/preventive-quality/2026-11-20-repo-landing-plan.md)展开文件映射。本批技术改动已进入工作树，12 项真进程正向回归 exit 0，`pnpm test` 为 spec 1423 / checks 265、零失败零 skip，`pnpm verify` 全绿 exit 0；A4 未通过，最终版负控复跑因沙箱限制未跑。本卡继续保持 `待落地`、`可关闭：否`。首批 A+B 不称整体完成，也未取得用户业务验收。

**实施合同：** 基线 `48d57835`。2026-11-20 用户授权按本卡自主落地；测试接缝为公共 acquire/release Interface、两个公开 CLI 的真进程与隔离外部适配器，以及预封存非锁准入案例。启动操作保护 canonical state 与实际 dev home，固定顺序取得，持到服务组静默；同 home 的不同 profile/state 不并行，独立 home/state 可并行，端口最终由 OS bind 裁决。准备模式同样持锁；`--drift-only` 不持服务锁，仅读取镜像与原子发布可丢弃缓存。

**恢复与取消：** 不做自动 stale 接管：超龄、死 pid、owner 缺/坏均拒绝。正常释放仅 unlink 本次唯一 owner 文件后非递归 rmdir，重复 release 无效。INT/TERM、交接前断线和失败须停止 owned process group、等待退出/组静默后释放；无法证明静默保留锁。SIGKILL/掉电可能遗留子孙与锁，只能停相关启动者/服务、核实离线后归档残留再恢复，不承诺自动重启或主动 setsid 子孙清理。后台通过本次 generation 的私有 IPC READY/交接，旧日志不建立成功；无 skip-lock 开关。旧锁残留拒绝自动迁移。

**冻结预算：** 首批仅 A1–A6；设计与原型一个工作日内，实现/复核先以两个工作日为限，进入具体实施前估计并记录；达到预算只结束本轮并报告未证，不改验收或自动扩面。低层用例为活 owner 超龄、旧 release、未知残留、owner 写入故障、正常释放；真进程 runner 固定为 `node checks/smoke/channel-start.e2e.mjs`，覆盖双入口竞争、共享资源/独立资源、检查/复用、失败取消及旁路负控。

**下一步：** 本批实现与 12 项真进程正向验证、机械 verify/test 已有记录；A4 按封存判据失败，不能据此确认有限准入有效。保留现状与证据，不刷样本、不改 expected；本卡待整体验收判断和用户业务价值/成本验收后再决定是否关闭。研究材料不代替实施记录。

## 研究确定了什么

- [原生证据](../research/preventive-quality/2026-11-20-native-quality-evidence.md)：Schema 不包办业务不变量与生命周期；pinned DSH 有精确装配能力断言和独立 workspace oracle。本仓 B 快照证明请求相对基线漂移，未集成最终工作区 oracle；角色 smoke 精确比 skills，未精确比 tools。
- [复发链审计](../research/preventive-quality/2026-11-20-recurrence-audit.md)：锁、Markdown、CI、制品链的共同问题包括错误事实边界、已有性质未迁移、已写 helper 未进入全部必需路径。历史已修、当前已证、待核卡文需分开。
- [准入审计](../research/preventive-quality/2026-11-20-change-admission-audit.md)：`test-surface` 证明直接 import；oracle 分类证明来源形状；红配方/closed 证明声明与登记。它们不证明旧性质已执行或全部入口参与。309/310 同挂一个 helper 测试，shell 实际未用 helper，是可核对的具体缺口。
- 当前 helper 临时目录复现已证：活 pid 超龄可被接管、旧 release 删除新 owner 锁；未把顺序复现当真实竞争证据。BUG-339 完整启动的 trap 被后续 cleanup 覆盖，需分路径核实，不能照卡断言。

## 首批方案与明确边界

首批必须同时交付两部分。A 让 agent 在有限语义变更时识别已有性质与入口；B 让已识别家族的保障由公共操作和测试持续执行。只改规则或只修一次锁均不满足本卡。

| 部分 | 现有 owner 与预期改动 | 执行结果 |
|---|---|---|
| A：实施前识别 | [guides/60](../../docs/guides/60-dev-loop.md)任务型路由/验收门：对新增或改变 parser、机器判据、资源所有权/生命周期、共享事实写方、生产者/消费者集合、角色能力与模型可见行为，查已有 Module/Interface、旧性质和全部受影响入口 | 在既有验收记录说明复用或新建理由、正常与失败后的外部结果；普通改名、闭集常量投影、无新语义整理有免触发对照 |
| A：交付核对 | [guides/67](../../docs/guides/67-test-strategy.md)明确五关证明边界；[reviewing-a-delivery](../../.agents/skills/reviewing-a-delivery/SKILL.md)据真实 diff 核验继承与参与；[类级方法](../methods/class-level-guards.md)吸收本仓实证 | 不以表/标题/分类当充分证据；技能修改按 `writing-for-agents` 检查触发、可发现性与上下文成本 |
| A：探索退出 | [exploratory-verification](../../.agents/skills/exploratory-verification/SKILL.md)沿既有流程固定范围、版本、预算及重议条件 | 区分新类、旧类迁移遗漏、明确域外与误报；不因还可能有 bug 自动续轮 |
| B：唯一拥有操作 | [start-lock](../../checks/lib/channel/start-lock.mjs)、[run-driver](../../tools/channel/run-driver.mjs)、[boot-run](../../tools/channel/boot-run.sh)，必要时同 owner 提取支撑件 | 两公开入口委托同一启动操作，集中取得/接管/释放；删除被替代的 shell 协议；保持正常启动、复用与检查 |
| B：可执行性质 | [start-lock 测试](../../tests/checks/channel/start-lock.test.mjs)、[现有入口契约](../../tests/run/channel/run-driver-contract.spec.mjs)与合适的真进程车道 | 低层性质进 `pnpm test`；跨入口/退出用隔离真进程，静态 includes 不替代执行；按[smoke registry](../../checks/smoke/registry.json)落定影响触发与频率 |
| B：交付减法 | [guard-ledger](../../tests/fixtures/guard-ledger/ledger.json)、[asset-ledger](../../tests/fixtures/asset-ledger/ledger.json)、相关缺陷卡及交付 Note | 记录实际证明范围，退役重复实现/义务/无独立价值的测试；不以 ledger 更新替代行为证据 |

复用现有开发环和证据表；不新增全仓同类分类器、强制质量字段、常驻总账、测试 DSL 或第六关。不提高日常全量慢检查频率。首批不改研究内容合同、不启动当前 GUI；自动回归不引入真模型依赖，A4 另行记录实施上下文的模型行为观察，也不顺手处理 BUG-328/329/330 的其他合同选择。

本卡引用[低置信区第 9 轮](2026-11-19-low-confidence-40.md)的缺陷事实；相关缺陷的状态和修复证据仍归各卡，不因本卡转 ready 而宣布修复。实施若吸收这些卡，须按已有 fix-evidence 与同变更规则逐项核对真实证明面。

## 方案与取舍

| 候选 | 研究判断 |
|---|---|
| 沿两个入口逐卡补丁 | 保留重复协议和调用义务，不作为首选 |
| 公共 Module 拥有启动操作，两入口委托 | 首选；需先解决父子非重入与持有生命周期，不能只把两个锁路径改一样 |
| 语义确实不同的实现共用行为测试 | 允许；仅共享可适用性质，显式列批准实现并逐个执行，不强合并所有锁 |

## 判据形状

- 权威事实：独立不变量/状态模型定义资源、owner、存活与完成；磁盘和进程观察确认效果，不由被测算法生成全部 expected。
- 读取方：低层行为测试与跨真实入口验收分别证明公共操作、委托与生命周期；保持各自证明范围。
- 坏输入/失败：owner 创建中或写失败、活 owner 超龄、死 owner、旧 release、两个 stale 竞争、时间变化、检查与启动重叠；先核定产品语义，再固定正反例。
- 旧形态：删除被统一操作替代的 shell 锁、逐入口释放义务和重复测试；旧 run-lock/方法库锁用于追性质，不未经比较全盘移植。
- 反证：活持有者不因年龄被抢、旧 release 不删新 owner、失败不改他人状态、至多一个启动权；故意让一个真实入口绕开公共操作必须被拒。token/pid/rename 各自不足以证明整体原子性。
- 边界：`--drift-only` 可与启动事务分离，但现有检查会写缓存，需独立核定缓存并发语义；不把整个模式假称无写入。委托不得靠任意调用者可伪造的 skip-lock 开关。

## 实施顺序与当前进度

| 步骤 | 要完成的结果 | 当前状态 |
|---|---|---|
| 1. 冻结语义与旧基线 | 写清资源键、生命周期、正常/拒绝/恢复结果；确定有限反例与退出预算 | 已实施；资源/owner、取消与离线恢复边界见上方实施合同和 Note；旧低层两个性质有红证 |
| 2. 首批开发环改动 | 按上述 A 修改现有 owner，封存非锁样本及免触发样本的预期 | 已实施；更新现有 guide、review/exploration skill 与证据说明；A4 样本与 expected 已封存 |
| 3. 公共操作与低层性质 | 同一资产在旧实现红、实现后绿，覆盖失败/取消；集中所有权并删重复协议 | 已实施；旧实现活 owner / 旧 release 世界状态见红，默认低层 5 项绿；共享 supervisor 并删除重复协议 |
| 4. 真实入口及旁路负控 | 两入口竞争与检查/复用正例；恢复旧独立锁或绕委托应失败；落定 runner 和频率 | 正向 12-case runner exit 0；早期 bypass-wrapper 负控按预期 exit 1，见红；最终版本复跑因 ps EPERM 为 exit 2 / NOT-RUN。runner 已登记为影响触发 dev-only |
| 5. 准入迁移及成本复核 | 未参与调优的上下文冷读非锁 diff 与免触发 diff，记录提前发现/漏识别；核对净义务与成本 | 已执行 A4；A 未满足封存判据、B 符合静态对照但标签泄露，规则效力未证。义务减法已记录，业务成本待用户验收 |
| 6. 交付与阶段退出 | 更新本卡、实际缺陷证据与 Note；执行适用检查；满足关闭条件后归档 | 进行中；Note 与记录已建立，`pnpm test` 通过（1423 spec + 265 checks，零 fail/skip），9 项 dev-parity 注入 exit 0，增量 review 无剩余 blocker；`pnpm verify` 全绿 exit 0；最终版负控因沙箱 exit 2 未跑。source-only 非发布件，L2 未跑。A4 未通过且无用户业务验收，保持待落地、不可关闭 |

## 验收标准

以下是首批质量合同，按[验收设计](../methods/validation-design.md)区分确定性逻辑、编排与模型行为。技术证据由 agent 记录，用户判断只承担业务价值、成本与结果接受，不让机械通过代替它。

| 编号 / 行为 | 类别与输入/状态 | 通过、失败与独立期望 | 负控 / 恢复 | 证据 owner 与执行方式 | 人工判断 |
|---|---|---|---|---|---|
| A1 既有性质约束新操作 | 确定性；临时状态根，活 owner 超龄、旧 release、创建失败、正常 acquire/release | 依本卡不变量：活 owner 不因年龄失权；旧 release 不删新 owner；失败不报取得成功、不改他人状态；正常取得和释放通过。任一违反即失败 | 用旧实现复现前两项；创建失败用故障注入；以假时钟/屏障控制交错，不用长 sleep 或确定性 retry | [start-lock 测试](../../tests/checks/channel/start-lock.test.mjs)，`pnpm test`；沿公共 Interface 读实际文件系统，不抄算法作为 expected | 无；原语、目录格式与内部接缝由 agent 设计 |
| A2 真入口参与且生命周期完整 | 编排；隔离 state root 的直起/代理启动竞争，正常启动、检查/复用、失败/取消 | 两公开入口在同资源上至多一个启动权；合法检查/复用成功；失败/取消后资源和子进程已收束。helper 绿或源码 includes 不计此行通过 | 恢复独立 shell 锁或绕委托，同一 runner 必须红；保留合法启动与清理对照 | 真进程车道，候选路径 `checks/smoke/channel-start.e2e.mjs`；若复用现有资产，在第 1 步将实际命令及路径回填本卡；按[registry](../../checks/smoke/registry.json)登记，交付前必须实跑 | 无；不启动当前 GUI、不调用研究模型 |
| A3 保留多实现时不漏执行 | 确定性 + 编排；仅当设计确认必须保留不同实现 | 该家族实际执行身份集合精确等于批准集合，且逐个满足适用性质；缺一个或未执行性质即失败 | 漏适配一个批准实现应被发现；逐个注入旧错误均判红。若只保留一个实现，记录批准集合与此项不适用理由 | 同 A1/A2 的实际 suite；不新增全仓实现注册账 | 无；不能为统一而牺牲已确认语义 |
| A4 有限准入提前识别遗漏且不过度触发 | 模型行为 + 开发环编排；预先封存一个非锁 parser/新消费者 diff，以及一个无新语义的改名/闭集常量 diff | 盲评输出须指出预设的旧性质、遗漏入口及所需证据，并豁免对照；漏任一预设项或强制对照扩流程即失败。expected 由案例作者在运行前封存，不能看输出再改答案 | 正例故意仅带 happy-path 测试/漏消费者；对照保持语义不变。失败如实记录，不增加样本刷通过 | 案例、expected、完整输出与逐项判读存入本研究题的新材料，并登记题名页；未参与起草/调优的上下文只读修订开发环与案例。记录模型/版本/输入/次数；这是实际模型观察，不把 keyless 当替代 | 独立评审者判断输出是否命中封存项；用户判断这项成本与收益是否可接受。单对样本仅证明该对，不外推长期收益 |
| A5 保障进入对应执行车道 | 编排；A1–A4 的资产及触发说明 | A1 由 `pnpm test` 执行；A2/A3 真进程命令、按影响触发与 CI 频率准确登记；A4 是本次明确模型观察。manual/nightly 不写为默认 required | 真入口负控见 A2；改门禁才跑对应 `gates.e2e --gate`；未跑/skip 单列 | [guides/60](../../docs/guides/60-dev-loop.md)与实际 registry/CI；收尾 `pnpm verify`、`pnpm test`，按影响实跑 A2 | 无；不新增日常全量慢检查 |
| A6 交付减少义务且成本有依据 | 确定性证据 + 人工价值判断；同范围实施前后 diff、命令耗时及误报记录 | 删除被替代的 shell 协议、逐入口释放义务及无独立证明面的重复例；保留必要证明。只有新增规则/注释/账目，或目标回归仍靠探索首检，判未兑现 | 核对 A1/A2 红绿及删除清单；若无净义务减法或成本不可接受，停止扩面并记录原因 | 本卡执行记录、实际 diff、交付理由载体；一次性工时与常驻耗时分开记录，不用 BUG/closed 数作收益 | 用户接受首批价值与成本；agent 不自验业务收益 |

第 1 步先固定资源身份、生命周期及恢复策略，再绑定有限性质与 A2 实际 runner；具体存储原语/Interface 是技术设计待办。若事实迫使改变本卡承诺或验收，先回卡修订并重新判定 ready，不在实现后调整期望迁就代码。A4 消费实施 agent 的实际上下文，不额外启动研究 run 或默认付费 API 车道。

开始前在本卡记录代码版本、用例、分类与预算（设计/原型建议一个工作日，实现预算经第 1 步估计）。预算到结束实验、报告已证/未证；不视为验收通过。两次独立观察只作后续复核建议，不是首批验收的模糊追加条件。

## 后续阶段按什么触发

| 候选 | 推进条件与范围 |
|---|---|
| plan 严格 decoder/写入所有权 | 下一次改变 [plan-gate](../../checks/lib/gates/plan-gate.mjs) 或 [plan-index](../../packages/deep-research-pack/src/lib/plan/plan-index.ts)裁决语义，或重现读取漂移；先比共用严格解码与更换正本，历史真实性另定来源，不预建第二份 JSON 权威 |
| 一个研究交付终态场景 | 下一次要承诺研究流程的文件结果正确；复用 pinned workspace oracle，独立编写正常/缺证据预期，record/refresh 不覆盖 expected；当前 A/B 继续只承诺其已证范围 |
| 独立角色工具集合 | 下一次角色工具职责变化或装配缺口；真 Loader 有效能力对独立职责期望精确比较，和 B 请求漂移证据分工 |
| 其他状态/解析家族 | 第一批已提前拦错且减少义务，再一次推广一个家族；替换旧证明，记录相同尺度成本，不展开整仓迁移 |

这些是研究建议，未启动，也未作为已批准延后事项。它们不计本卡首批关闭验收；本卡活跃时，相关事实与决定继续同步。首批交付时，仅将仍有价值且已确认的观察条件移交实际 owning Note 或 [triggers](../triggers.md)并记去向；未采用项明确记 none。已结后出现新触发，建引用本卡的新卡，不重开或继续扩写已结卡。

## 研究验证、实施验证与关闭条件

研究阶段实际运行结果与限制见[研究 README 本轮证据](../research/preventive-quality/README.md#本轮进度与实施证据)及[综合稿验证节](../research/preventive-quality/2026-11-20-prevention-synthesis.md#九本轮验证与显式未覆盖)。研究验证不替代本卡实施验收。

### 本批实施记录（2026-11-20）

**进度：** 方案所涉实现、指南、契约与登记已进入当前工作树；这不是首批 A+B 验收完成。该记录不改变 issue 的 `待落地` 状态，`可关闭：否`。A4 判据未满足，用户业务价值/成本验收未发生。

**已取得的专项证据：**

| 证据 | 层 | 覆盖性质 | 负控/结果 | 执行状态 |
|---|---|---|---|---|
| `start-lock.baseline.test.mjs` + `live-owner.red.out` | 低层；旧实现 | 活 owner 超龄不失权 | 旧实现复现接管，exit 1 | 红已记录 |
| `release-world.baseline.test.mjs` + `release-world.red.out` | 低层；旧实现实际文件系统 | 旧 release 不删除后来 owner；oracle 为目录/内容状态，不是 release 返回值 | 旧实现删除后来锁目录，exit 1 | 红已记录 |
| `tests/checks/channel/start-lock.test.mjs` + `start-lock.green.out` | 低层契约 | 互斥、正常 release、活 owner 超龄、重复 release、未知/损坏残留与写入失败 | 新性质 5 项 pass，fail 0 | 绿已记录 |
| `focused-integration.out` | 旧集成静态契约对照 | profile guard / run-driver wrapper 的源码形状 | 3 项旧静态断言失配；其余 13 项通过 | 静态形状不匹配，不是产品行为红证，也非新实现结果 |
| `bypass-wrapper.out`（同类记录 `CNezLA`、`DJhmFY`） | 隔离真进程变异负控 | 故意绕 wrapper 后错误拒绝码应被 ownership 断言捕获 | exit 1（实际 1、预期 busy=2） | 预期负控红，断言抓到变异 |
| `bypass-wrapper.final.out` | 隔离真进程负控复跑 | 最终版本负控 | `ps` 被沙箱 EPERM 阻断，0 checks、exit 2 | NOT-RUN；保留旧版有效红证，不冒称最终复跑通过 |
| `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` | 隔离真进程正控 | direct↔driver、drift/reuse、共享/独立资源、TERM/取消/失败静默、handoff、相对路径、后台诊断 | 12 项通过，exit 0；fixture adapter，不是 DSH/GUI/model 证明 | 已实跑 |
| `checks/smoke/registry.json` | 执行车道登记 | runner 的触发与频率 | `dev-only`，启动 owner/锁变化时触发；不进默认/nightly | 已登记 |
| A4 封存材料与两份输出 | 模型/准入观察 | Case A/B 对照判读 | A 按原封存 expected 失败；B 静态等价符合对照，但标签泄露 | 未通过；guide/skill 未提供，规则效力未证。不刷样本、不改 expected |

**范围与成本口径：** 启动锁默认回归用例由 1→5；旧启动协议两套收敛为一个 supervisor；真进程 runner 一个、12 cases、dev-only。删除 driver 与 shell 重复锁、pgrep/旧日志轮询。新增代码净行较大，不称净 LOC 减少；收益只记义务减少与 owner 集中，不以 BUG 数代替业务收益。一次性工时来自本 session 多轮实施和错误诊断，无法精确计量，不编造时数。

**正向真进程结果：** 最终 review 补查 handoff cancel、relative paths、background diagnostic 后，`runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` 记录 12 项通过、exit 0，包含 handoff ACK 后 TERM 取消并以 driver exit 143 收束。runner 使用隔离 fixture adapter，不证明 DSH/GUI/model 行为。

**负控结果：** 早期 `bypass-wrapper.out`（同类 `CNezLA`、`DJhmFY`）在变异下 exit 1，实际拒绝码 1 与预期 busy=2 不同，属于预期负控红，证明断言抓住变异。最终版 `bypass-wrapper.final.out` 因 `ps` 被沙箱 EPERM 阻断，0 checks、exit 2（NOT-RUN）；旧红证不抹除，但不宣称最终版负控已复跑。

**最终检查与审查：** `runtime/smoke-workspace/preventive-quality/final-test.out` 记录 `pnpm test:spec && pnpm test:checks` exit 0：1423 spec + 265 checks，0 fail、0 skip；`final-verify.out` 记录 `pnpm verify` 全绿 exit 0。父级记录 dev-parity 9 项注入 exit 0；增量 review `547fac7b` 修复原 3 个 blocker 后无剩余 blocker。source-only 工作树不含发布件，L2 未跑。七问边界：会红 ✅（旧 TTL/release-world 反例和两项 bypass-wrapper mutation）；真入口 ✅（两个真实 public CLI）；验世界 ✅（文件系统与进程组）；模型可见钉住 ❌（本轮未改 pack 模型面，A4 实际流程也未暴露规则）；最低层 ✅（unit/entry 分层）；skip 可见 ✅（最终 mutation exit 2 单列 NOT-RUN）；可重复 ✅（runner 前置 `ps`/`lsof`/平台条件可见）。这些逐项判定不等于整体验收通过。最终版 bypass-wrapper 负控因沙箱 EPERM 未运行，旧版有效红证仍保留。A4 未满足且用户业务验收未发生，故关闭条件不成立。

## 关闭条件

本卡只交付首批 A+B。A1–A6 按各自适用性有实际证据（不适用须解释），第 1 步未遗留影响承诺的未知，技术自审与用户业务验收分别有结果，交付理由载体成立，才与本卡归档同变更；不预写 implemented Note。具体存储原语/函数签名不要求在准备阶段定死，但不能把未决承诺伪装为实现细节。

首批完成后结束该专项主动探索，资产回日常/按影响车道。两个有界复核窗口作为交付后的观察建议，不阻止首批关闭，也不预称已安排；若交付时采用，在实际 owning Note 写清触发、范围、预算与记录位置。其他候选的去向按上一节处理。后续仅新语义/入口/依赖或真实同类逃逸触发对应新工作，不以“还可能有 bug”续轮。

若试点停止或延后，记录实际原因、去向与可观察重议条件，再按问题加工流程定性；不能用耗尽预算或形式闭环宣布验收。关闭不代表系统无缺陷。

## 本卡质量复核

2026-11-20 按[问题加工](../README.md#入口两张票)、[验收设计](../methods/validation-design.md)与[去向规则](../methods/issue-to-note.md)复核：原卡载体和 ready 结构成立，但模型准入行为缺独立期望/输出/裁决，首批关闭与后续观察边界混杂。已补 A1–A6 行为与证据分工、A4 盲评记录、首批关闭及已结后新卡规则；保留 `待落地` / `可关闭：否`。这次复核修正文档质量，不代表任何实施判据已通过。
