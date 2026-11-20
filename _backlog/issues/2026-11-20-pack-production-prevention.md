---
status: 推敲中
opened: 2026-11-20
---

# 推敲：在 Pack 生产源头预防确定性缺陷，先收敛 plan 的解释与发布边界

> 立卡：2026-11-20 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：未定 — 建议先做有界 plan 试点，公共行为与强制接缝尚未定案 ｜ 可关闭：否

**问题与期望结果：** 研究角色直接生产文件，部分确定性错误到包外审计或后续探索才被发现。用户希望判断能否在生产源头减少这类错误及返工。目标是让相同受支持输入只有一种字段解释，并在候选 plan 成为可派工当前版之前发现坏输入；不以 schema 合法冒充研究结论正确。

**当前情况：** [生产源头研究](../research/preventive-quality/2026-11-20-pack-production-prevention.md)已提交于 `6d6fd17f`，以 `71010fef` 的源码为采样点；已有消费者读法差异的实际对照和历史因果样本。没有实现候选 decoder 或发布工具，没有证明全部写入口可强制拦截。本卡补上研究到问题卡的承接，不重开[首批 A+B 卡](2026-11-20-preventive-quality-pilot.md)的失败评测或扩大其验收。

**本轮授权：** 整理问题与质量合同、核实证据、审查并提交卡片。用户此前明确有怀疑不等于必须改产品；当前请求不授权实施此 Feature。只改本 repo，不改原生权限、全局配置、宿主或 vendor。

**未决问题：** 可用的包内生产/消费接缝能否覆盖直接 write/edit、其他角色和恢复路径？装饰表头/ID 与多表的支持域如何确定？发布、旧版快照与 Team 镜像失败时的可见状态是什么？这些不是可在实现中随意补的细节。

**下一步：** agent 先按下文技术事实缺口做有界查证并提交具体候选；当前推荐是保留 Markdown 当前版、共用严格 decoder、在使用前校验。若只能约束推荐写入路径，如实降格为辅助机制。语法兼容性或新阻断行为等产品取舍需有明确结论，才翻 ready；当前不因建卡启动产品改造。

## 已知事实与证据

| 已证事实 | 当前 owner / 证据 | 解释边界 |
|---|---|---|
| 节点表是 canonical，Team task 是镜像，重写前先存旧版 | [plan 模板](../../packages/deep-research-pack/content/templates/run/plan.md)第 3–4、16–24 行；[planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)第 92–105、132–137 行 | 声明了义务，没有证明写入与派工已被一个操作强制收口 |
| 观察解析与门的字段读取政策不同 | [plan-index](../../packages/deep-research-pack/src/lib/plan/plan-index.ts)第 113–123、163–194 行；[plan-gate](../../checks/lib/gates/plan-gate.mjs)第 56–82 行 | gate 已有 active budget/task_id 判据，不能再称“无门”；budget 的显式 `—` 不等于缺失 |
| 普通 ID 与加粗 ID 得到相同观察节点，但门分别 PASS / RED 缺 budget、task_id | [研究 §样本 1](../research/preventive-quality/2026-11-20-pack-production-prevention.md#样本-1plan-只读提示字段门补齐以及-active-budget-的旧性质)保存输入条件及完整结果；本机运行脚本 `runtime/smoke-workspace/preventive-quality/plan-consumer-contrast.mjs` 当轮 exit 0 | 证明解释差异，不证明加粗 ID 已属于受支持格式；不能据此直接要求 gate 放宽 |
| 生产源头的确定性写方已有本地实例 | [method-library-tool](../../packages/deep-research-pack/src/method-library-tool.ts)第 59–110 行；[method-library-io](../../packages/deep-research-pack/src/method-library-io.ts)第 50–70、123–130 行 | 操作身份、字段、写入、回读可集中；该锁不证明原子 CAS，也不应直接复制为 plan 事务实现 |
| dev 门不会随整个 checks 目录发布，研究角色仍有通用文件写入 | [manifest](../../packages/deep-research-pack/package.json)第 34–63 行；[lead preset](../../packages/deep-research-pack/presets/lead.patch.yml)第 53–54 行；[NODES](../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md)第 15–18、41 行 | 装态审计缺席已有显式降级；新增一个推荐工具不等于封住旁路 |

历史因果样本及当前修复核对集中在[研究 §二](../research/preventive-quality/2026-11-20-pack-production-prevention.md#二历史因果样本与当前代码核对)：BUG-267/282（plan 提示与字段门）、260（findings 外键条件）、312（关键结论阈值对象）、150（readiness 终局）及 097/114（方法库写入/锁）。这些归档卡不是新漏洞清单。本卡只针对 plan 试点，不代替[BUG-328](../bugs/BUG-328-plan-snapshot-same-text-only.md)对历史来源真实性的独立问题。

## 范围与决策依赖

- **已确认目标：** 把可确定性判断的错误尽量在生成/使用边界拦下；保留真实证据、失败和成本，不强改产品，不扩大 repo 权限。
- **首个候选范围：** 当前 plan 节点表的解释、旧性质继承、候选发布及其消费者；先验证支持域与接缝。Protocol 的投入上限仍按原口径，不把节点 budget 文本改成数值总和。
- **真实依赖：** 支持域/权威与消费者清单 → 原生可用接缝及失败模型 → 独立期望/负控冻结 → 经授权实施 → 分层验收。只有下游依赖前项，不需先实现另外两类产物。
- **未展开：** evidence/findings 关联与取证身份、review/reader 发布收口，保留在[研究候选表](../research/preventive-quality/2026-11-20-pack-production-prevention.md#四优先候选最多三项全部未实施)。未决定做/不做/延后，不拆成无独立判据的执行票。
- **排除：** 更换研究流程节点、全仓迁移、把全部 checks 搬进包、新建第二持久 JSON 正本、修改 harness loop、禁掉所有文件工具、方法库锁顺手修复、重跑 A4、模型/浏览器/真实 run，以及声称领域质量或长期缺陷率改善。

## 方案与取舍

| 方案 | 能解决什么 / 代价 | 当前判断 |
|---|---|---|
| 维持包外后验门，只补提示和案例 | 迁移成本最低；安装态和生产写入旁路仍存在，调用者继续承担解释与时序义务 | 保留为成本基线，不能称源头强制预防 |
| 共用严格 decoder，Markdown 为当前版正本；候选发布/消费前验证 | 有机会删除 raw-table 第二读、保存缺/空/显式无值的区别；需保持观察面可显示坏输入的诊断能力 | 首选技术建议，尚未批准公共行为；不要求 UI 与 gate 输出同一 PASS 状态，只要求字段解释和诊断来源一致 |
| 结构化正本生成 Markdown | 可减少自由格式；需要用户编辑、迁移、旧场恢复及所有消费方的变更证据 | 当前不选，不能无成本新增双正本 |
| 仅新增 publish 工具，通用写入仍能绕过 | 可改善推荐路径；不能证明非法当前版不被派工消费 | 可作为降格结果，不能据此通过“全部入口强制”验收 |

### 待核事实与待定取舍

1. **技术事实（agent）：** 逐一列出直接 write、edit、其他角色/worker、旧场恢复、安装态与开发态的可达写入口，以及观察、派工、plan-gate、Protocol 审计的消费入口。核对 pinned 原生合同，不能猜 API；不改 vendor，也不借 Full access 解决。
2. **兼容选择（尚未确认）：** 当前模板必保；加粗/反引号、同名多表、未知列、重复列的支持或明确拒绝须逐项写成支持域。观察面允许显示坏文档并提示，与允许派工是不同结果；不把宽松展示升级成静默通过。
3. **状态合同（尚未定案）：** 非法候选与版本冲突无副作用；快照与当前版先后失败、崩溃恢复和任务镜像同步的承诺需明确。当前 task_id 可写 `—` / `plan-only`；不能要求先有 task_id 才能建 task 而形成循环，也不能承诺多文件/Team 原子提交。
4. **产品取舍（用户）：** 支持域收窄、新增使用阻断、历史场处理及可接受维护成本。先由 agent 给出带兼容影响的具体方案，避免让用户回答源码事实。

## 判据形状

以下为候选质量合同；未决项填实前不翻 `待落地`，不把下表当已生效产品规则。

| 项 | 候选约束 |
|---|---|
| 权威事实 | Lead owning run 的 `plan.md` 节点表及头部图版本；候选文本不是当前版。一次解码保留原文、字段存在性、显式 `—`、规范值和定位诊断。Protocol 上限继续来自既有 protocol 事实；task_id 是会话映射。没有第二份可独立改写的 plan 权威 |
| 读取方 | plan-index/图与差异消费者、plan-gate、Protocol 投入审计、Lead 派工和恢复；实施前以代码搜索核全清单。UI 展示策略与硬门策略可以不同，禁止各自二次解释同一字段 |
| 坏输入 | plan 整体缺席保持既有可选/N/A；在场而空、畸形、重复身份/字段、冲突版本或未知支持形态 → 可定位 red/unknown，不能变成可派工空图。active budget 缺/空红，显式 `—` 合法；墓碑沿原条件豁免。未知输入不由模型“猜最可能值” |
| 写入/使用边界 | 推荐发布若未封所有旁路，必须标辅助路径。若声称强制，直接/替代写入后非法内容不得成为可派工当前版；以真实消费者拒绝为据，不只检查工具报错 |
| 旧路径退出 | 支持域矩阵及全部消费者回归通过后删掉 gate raw-table 第二读；旧场适配只在一个有明确测试的边界。若必须长期保留两套字段解释则试点不通过，回到方案比较；不设永久 epoch 静默豁免 |

### 不变量与变异矩阵

独立期望由未参与实现的审阅者依据本卡链接的当前合同手写，先冻结输入/结果/版本再改 decoder；禁止 renderer 或被测实现生成 expected。以下是待落成资产的验收要求，不声称已经跑过：

| 输入类 / 故意错误 | 预期可观察结果 |
|---|---|
| 缺整份 plan / 有 plan 但空、截断表、空白单元格 | 前者保持可选路径；后者 red/unknown、无派工，诊断指字段/位置 |
| active budget 缺列/空值 / 显式 `—` / 墓碑缺 budget | 前两者红；显式无预算合法；墓碑不误红。恢复“统一把 — 当缺失”须被合法控制抓住 |
| 重复 id/列、悬空 parent/dep、环、互斥版本/同名多表 | 硬冲突红；禁止 first/last-match 猜权威。多表支持策略由支持域确定，不能悄悄读另一张表 |
| BOM/CRLF/U+3000、全半角/装饰变体 | 在冻结支持域内得到同一字段解释；域外给明确诊断。恢复 raw-table 第二读必须被消费者对照抓住 |
| 跳过 active budget 检查 / 跳过 expected version | 缺预算非法候选或旧版本写入被独立 oracle 拒绝；原 canonical 与任务状态不变 |
| 先改当前版再存快照、写入故障、两个并发发布、取消/崩溃 | 不丢失已提交旧版、不覆盖另一成功版本；合法并发失败有明确冲突。故障恢复状态与允许的线性化点先定案，不从返回 success 推断磁盘事实 |
| 直接 write/edit、另一角色/worker 或恢复路径绕发布 | 若承诺强制，则实际派工/消费拒绝非法版；绕路仍可消费则该承诺 FAIL，只能交付已批准的辅助范围 |

## 验收标准

本表描述未来候选实现的最低证据，不表示用户已确认全部产品取舍；当前均未实施/未验。行为类型分开，不用一个演示证明所有层。

| 编号 / 行为类型 | 输入与正常/反面结果 | 独立信号与证据 owner | 人工判断 / 证明边界 |
|---|---|---|---|
| A1 解释一致（确定性） | 模板合法实例与支持域矩阵；缺/空/—、墓碑、重复/编码互补样本。所有消费者取得同一字段值与 diagnostics，策略差异须有合同 | [plan-index 测试](../../tests/cockpit/lib/plan/plan-index.spec.mjs)、[plan-gate 测试](../../tests/run/gates/plan-gate.spec.mjs)；`node --import tsx/esm --test tests/cockpit/lib/plan/plan-index.spec.mjs tests/run/gates/plan-gate.spec.mjs`。补独立 budget 空值断言；恢复二次解析见红，合法控制零误红 | 支持域/兼容变化由用户；unit 不证装态或模型 |
| A2 旧性质继承（确定性） | 图、active 字段、版本/快照、剩余工作与 Wave/task 映射保持旧承诺；节点 budget 不代替 Protocol 上限 | 前述测试与 [Protocol 测试](../../tests/run/gates/protocol-core.spec.mjs)按影响定向跑；每条映射到旧性质和独立反例；删除预算/冲突检查变异红 | 无新的业务判断；不能以测试标题代替真实断言 |
| A3 发布与恢复（确定性 + 持久状态） | 临时 run 的合法更新、非法/旧版本候选、并发/写故障/取消；实际旧版、当前版、版本及任务镜像符合先定状态合同 | 在未来真实生产操作的 host seam 走读写；普通文件状态可放进程内测试，跨进程/崩溃须真进程车道。新 host 操作与故障 runner 尚缺 owner，设计先明确落点；原件字节/版本/消费者实收为 oracle | 未确定多文件失败模型前本项 BLOCKED；stub task 只证 adapter，不证 Agent Teams |
| A4 真实入口与绕路（装配） | 安装/开发、公开写入口与替代路径；坏版拒绝派工，合法版可用，恢复后不误消费候选 | [preset.e2e](../../checks/smoke/preset.e2e.mjs)核真挂载能力，若改变发布集走 [release.entry](../../checks/smoke/release.entry.mjs)。这些不能单独证明旁路；另需 task-specific 真入口拒绝场景，具体 owner 在接缝查证后登记，当前 BLOCKED | 覆盖不全就不接受“强制”声明；限制不绕过，未跑不算 pass |
| A5 模型交互（仅实际改变模型面才适用） | 候选无效时收到定位诊断；不确定/拒绝/幻觉不自行造合法值或绕路重写；修正成功后才使用当前版 | 按 [开发环模型面路由](../../docs/guides/60-dev-loop.md)做 overlay/L1、请求快照 B 与真模型档；与纯件证据分列。未改变模型面需列 diff 说明 N/A | 只证冻结案例；不外推领域质量。此轮建卡不运行模型 |
| A6 义务和成本（确定性记录 + 业务判断） | 记录删除的第二读/重复规则、实际耗时、误红和维护面；与维持现状方案比较 | 当前 diff、同一机器/输入的命令耗时及实际判读记录；建议时间盒见下节，不是实测承诺。没有义务减法或旁路结论不诚实则不推广 | 用户判断收益与成本；不以 BUG 数、覆盖率或新测试数自验业务价值 |

## 成本、停止条件与关闭条件

**建议预算：** 首次接缝/设计可行性查证最多 4 小时、独立审阅最多 90 分钟；这是候选预算，未执行、不编造工时。实现预算依据接缝结果另估；新增纯件小组耗时目标 ≤1 秒须实测，不扩大默认模型/慢车道。

时间盒内无法确定受保护入口、支持域或失败状态，必须如实报告未收敛，不继续扩样求绿；若需改 harness loop/权限、增加第二持久权威或改 expected 才能通过，停止当前方案并重新比较。证据被环境阻断单列 NOT-RUN，不能删 oracle 或反复升权。

**ready 条件：** 技术事实清单、兼容选择、失败模型和证据落点有结论；验收矩阵无承诺所必需的未决项；明确选择是否实施、范围与去向，才按状态机翻 `待落地`。当前没有创建 RFC 或 implemented Note，也未选择最终去向；没有把研究推荐当产品批准。

**关闭条件：** 若实施，技术判据/负控、语义自审、用户必要的业务判断及实际载体按 [结论去向](../methods/issue-to-note.md)成立后同变更归档；若以后做/不做/并入，记录明确裁决、理由与真实 trigger/owner 后关闭。建卡完成、机械绿或时间盒耗尽均不等于 Feature 完成。

## 本次问题卡质量检查

采用 [整理方案](../methods/requirements-synthesis.md)、[验收设计](../methods/validation-design.md)、[判据设计](../methods/judgment-design.md)、[证据路由](../methods/validation-evidence.md)及[结论去向](../methods/issue-to-note.md)。`to-spec` 未注册；完整只读本地技能源作整理参考，固定版本远端路径返回 404，不能称已核对该版本。按本仓覆盖其 tracker/自动 ready/长用户故事默认，未将其调用为注册技能。

审查：独立只读对抗审查 `03a87bb3` 已核对 methods、当前源码、消费者对照与未来验收；发现的真实测试 owner/命令路径已修正并复读确认，无剩余 blocker。机械检查先抓到无效锚点，修正后 `pnpm verify` exit 0；`pnpm test` exit 0（1423 spec + 265 checks，0 fail、0 skip；本机记录 `runtime/smoke-workspace/preventive-quality/issue-quality-test.out`）。

| 证据 | 层 / 失败类 | 负控与边界 | 收尾 |
|---|---|---|---|
| 独立读源、逐项 methods 审查 | 语义：假 ready、错误 owner、证据/承诺混淆 | 实际找出路径缺陷后修正；不代替用户产品选择 | 无剩余 blocker |
| `pnpm verify` + `pnpm test` | L0：文档形状、引用及现有回归 | 锚点曾红；本轮无新机器判据，不注入产品变异 | exit 0；正常提交钩子仍执行 |

够了判据按本轮文档面：会红 ✅（锚点实红）；真入口 ✅（真实 verify/test）；验世界 ✅（真实路径存在性与读源，非产品写入）；模型可见钉住 N/A（未改）；最低层 ✅（文档/L0）；skip 可见 ✅（0 skip、产品试点未跑单列）；可重复 ✅（仓内命令与引用）。模型、安装、真实写入/派工、并发恢复和未来变异矩阵均未运行；它们是后续 A1–A6 的证据要求，本次只交付可继续推敲的问题卡。
