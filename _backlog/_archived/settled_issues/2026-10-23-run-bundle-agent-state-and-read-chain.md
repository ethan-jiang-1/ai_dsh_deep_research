---
status: 已结
opened: 2026-10-23
---

# 推敲：run bundle 宪章——独立、可删、可续（影响面、分阶段与盲续跑）

> 立卡：2026-10-23 ｜ 状态：已结 — P0–P7 落地、P8 收口（RFC 毕业，2026-10-23） ｜ 类型：Task ｜ 结论倾向：现在做（已落地） ｜ 可关闭：是
> 复核：2026-10-23，数字与口径校正见 [复核证据](../research/run-bundle-charter/2026-10-23-issue-review-verification.md)；初稿三条错误结论已撤回（§15）。

**问题与期望结果：** run bundle 已经在承载研究，但「它装什么、不装什么、断电后靠什么恢复、交付态由谁证明」没有一组同时成立的不变量；位置、mtime、日志 present、review 散文 readiness 四个外部信号互相矛盾，每遇一次事故就加一条局部规则。期望结果 = 一组可验收的不变量（独立 / 可删 / 可续 / 自描述 / 双见证），以及一棵不把步骤和指令塞进数据区的目录树；旧 bundle 不追溯改写。

**范围：** 状态模型与 bundle 布局、交付见证与恢复程序、以及它们在门禁/观察面/手册上的影响面；53 个旧 bundle 只做 epoch 解释，不迁移。
**排除：** 研究方法与节点内容（归 NODES/角色 skills）；全量迁移；新状态机/队列；per-step 子目录；per-run 指令文件；把日志/共享库塞进 bundle。

**当前情况：** 方向已定：单位 = 一任务一 bundle，rerun 是同一任务内的版本；交付增量 = C-lite（`provenance/` + `manifest.json` + `delivered.json`，批准仍走外部事件链）；位置 = 操作桶、状态 = 内容（Q1-A 已裁定，P1 修订 D17）；per-step 子目录与 per-run `AGENTS.md` 已否决。规范正文在 [RFC](../../../notes/implemented/2026-10-23-run-bundle-charter.md)（implemented），本卡是锚点、决策记录与验收入口。

**未决问题：** 五问已按 2026-10-23 授权采纳 A；剩余 = P1 的 D17/设计文档修订、P2–P8 的实施与验收；实现方自定的目录细节见 §7.2，历史偏差只作反例证据（grandfather，不修、不建卡）。

**下一步：** 已结。P0–P7 已落地、P8 记录见 §16；未跑项（正式 lead 盲测 / L2 / client-load）如实保留，不因归档暗示已验收。

## 0. 一页结论

1. **「独立」不是现状。** 归档里存在 **7 条跨 bundle 的 `[来源:]` 证据链接**（`drt_computer-use-benchmarks` → `drt_cn-agentic-parity`，14 处 `../drt_` 路径），另有 **37/46** 个归档 bundle 在散文里提到别的 bundle（45 个外部 slug）。所以工作量不是「只差可续」：续是主工程，独立也需要一条只扫「证据依赖 + `../drt_`」的窄门禁与旧场豁免。
2. **交付态大多可机械读，缺的是终局定义与升级权。** 当前 51 份 review 的终局解析 = **46 PASS / 3 FAIL / 2 判不出**；3 个 FAIL 都在 `archive/`，其中 video 是文末历史附录夺权，coding-agent 是 lead 回写升级，mcp-server 是终局 FAIL 仍被归档。先把「单一终局块 + 谁有权升级」定死，再加容错；不是把 5 种形态都写进正则。
3. **改手册不是零成本。** 手册是模型可见输入，`snapshots/replay/research-face/` 存着逐字注入 + `baselineIdentity` + digest；改一个字就红 B 层，要真模型重录四个角色。阅读链、状态表、停放语义等手册文本必须**成批一次落**，只付一次重录。
4. **门禁读结构化事件，不读文本。** DSH 已提供 `deliverables/presented`（`turn` / `callId` / `files[].path`）与 `user-question-reply`（`callId` / `outcome`）；门②③ 应读它们，而不是扫任意日志 payload 或单行 §Decisions。这才是红队反例的根除，不是再加一层前缀匹配。
5. **影响面至少八面**：人类文档、模型可见 harness、状态派生/观察面、门禁/ops、证据/溯源、交付/客户端、快照回放、backlog/RFC。逐面清单见 §8；不要把「加几行手册」当工期。

## 1. 立项来历（用户原话）

2026-10-23，用户在讨论 run bundle 是否适合承载 agent 全部工作时提出（语音转写，原文如此；
「软帮助」按上下文 = run bundle）：

> "我记得这个软帮助其实是相当于我们智能体针对一个问题，针对一个研究的所有的状态、产出物等等都在
> 这里头，我们不可能在智能体那边内容，对不对, 而且随时拿了这个runbundle 之后，我们的DSH的插件
> 实际上是知道我们跑到哪儿了, 我突然断电...断点续跑之类的都很好，然后推敲也直接可以推敲..."

随后要求把讨论整理成可判断的记录：

> "因为我看了一下，我们这个讨论确实是及时的，是吧？这里一定要想清楚，把它整理。对面的思路是乱的。"

**为什么要立卡**：这不是「要不要给 bundle 加目录」的小问题，而是**状态模型**问题——bundle 到底装什么、
不装什么、「知道跑到哪儿」是谁在知道、断电后恢复的是什么。概念一旦混用，后面每个设计动作都会错位。

## 2. 问题：六组被混用的概念

「对面的思路乱」，乱的根源不是事实不够，而是下面六组概念被当成一组用：

| # | 混在一起的两个东西 | 分开之后 |
|---|---|---|
| 1 | **研究状态** vs **执行状态** | 研究状态（问题/证据/结论/审查）在 bundle；执行状态（在飞 HITL、队友、goal、任务板）在会话 |
| 2 | **数据** vs **指令** | bundle 是数据区；指令层在 cwd 的手册与角色 skill。数据区里放 `AGENTS.md` = 开第二条指令通道 |
| 3 | **渐进披露** vs **目录深度** | 披露的单位是「指针 + 触发条件 + 按需正文」；目录只是若干种指针里最贵的一种 |
| 4 | **静态地图** vs **恢复程序** | 地图回答「有什么」；恢复程序回答「先读哪个、读到哪算够」。前者可冗余，后者不能缺 |
| 5 | **agent 现场重建** vs **plugin 状态机 / 投影** | 没有仓级状态机；「知道」是 agent 拿文件事实推导。要让插件知道，必须另做派生投影 |
| 6 | **状态声明** vs **状态派生** | 状态头是 lead 写的声明；派生是「内容 + 事件 → 状态」的纯函数。两者冲突以事实为准，门禁判红 |

## 3. 定调：三条性质 + 四类外部状态

**一次研究 = 一个自包含、可丢弃、可续跑的 bundle（作用于研究状态）。** 三条性质：

1. **独立**：研究状态之间零**必需**依赖。多个 run 并存 = 多个目录；不串 run、不做跨 run 索引、不做血缘。跨 bundle 的散文提及允许，但不得充当证据。
2. **可删**：删掉 = 删研究状态目录。没有注册表要清、没有墓碑要留、没有外部索引必需；删了就不能续，这是允许的终态。**不承诺擦除日志/共享库派生条目**；彻底删除走显式 purge 并写明边界。
3. **可续**：停掉 = 新会话 + 只读 bundle + 固定恢复程序；必须能推出「下一步并往前走」，而不只是复述历史。

**一条状态分类**（红队修正后）：bundle 之内 = 研究状态；bundle 之外有四类外部状态，各有规则，
**不能一刀切「外面都不算」**：

| 类 | 家 | 规则 |
|---|---|---|
| 批准/交付见证 | 外部事件 + bundle 回执 | 不自证；回执是指针；门禁校验事件链（`presented` / `user-question-reply`） |
| 溯源/审计 | 语料 + bundle 快照 | 派生、环境绑定；无证据 = **UNATTESTED**，不是红也不是绿 |
| 执行现场 | 会话 | 可丢；重问/重建；不承诺接上 |
| 共享学习 | workspace 库 | 版本化；run 记快照；不是 run 状态 |

- 指令 / 方法 / 模板是 **harness**，不是 run 状态 → 不进 bundle（per-run AGENTS.md 不做）；
- 目录按**产物类型**，不按执行步骤 → 步骤会变、产物稳定（per-step 子目录不做）；
- **执行现场可丢**：在飞 HITL、队友、goal、任务板丢了就重问 / 重建，不假装接上；
- **交付态 = bundle 回执 + 外部事件 + 事件链**：bundle 能说清「声明交付了什么」，但**不能自证
  「用户批准真的发生过」**。

**不承诺**：执行现场接上 · bundle 自证批准/交付 · 删目录等于擦除 · 审计脱离语料复算 ·
全量迁移 53 个旧 bundle · 零成本（状态头/回执是每次 run 的少量写入）。

## 4. 已复核的事实（2026-10-23）

> 口径与命令 = [复核证据](../research/run-bundle-charter/2026-10-23-issue-review-verification.md)。下表只留决策相关项；未复算项在复核文件 §3。
> **2026-10-23 用户告知旧 run bundle 已清**：下表是清理前/历史快照，只作反例证据；不再作为当前盘面或盲测验收样本。

| 事实 | 数据 | 证据 |
|---|---|---|
| bundle 规模 | **53 个**（4 根 + 46 `archive/` + 3 `_abandoned/`）；2,078 张证据卡；symlink 0；归档 1,800 卡 vs 408 个顶层 md（81.5% 是卡） | 盘上清点 |
| 核心契约稳定 | 归档 **6 件 46/46**（question/topics/journal/findings/final/audit）；review **45/46**、node-gate **44/46**；全量 53：review 51、audit 47、**node-gate 46**、plan 6、acceptance 2 | 逐件在场统计 |
| 尾件弱 | `leads` 32/46（全量 37/53）；`plan` 归档 1/46；`plan/vN` 全库 1/53；`acceptance` 2/53 | 同上 |
| 实际阅读面 ≠ 声明层级 | 662 个 research-workspace 会话目录（含 6 个未计入 run 组者；口径差异未逐场核）、8,094 次 read：evidence 3,610 · final.md 628 · question 529 · journal 518 · review 426 · leads 393 · topics 342 · drafts 248 · templates 212 · findings 200 · final/vN 137 · plan 35 · NODES 16 | 会话日志；分类顺序见复核 §2（**方向性指标**，含探针/开发会话） |
| 路径耦合 | 第一方 `scripts+pack src+docs` 中 **41 文件/115 处** `drt_` 字面量；29 个 bundle 文件含 `/Users/bowhead/...`；7 个 `source_url` 用 `file:///` | `grep`（复核 §2） |
| 独立性的真实状态 | **7 条跨 bundle `[来源:]` 证据链接**（computer-use-benchmarks → cn-agentic-parity）；**14 处 `../drt_`**（4 文件）；**37/46** 归档 bundle 散文提到 45 个外部 slug；symlink 0 | 复核 §4.1 |
| 注入机制 | cwd = `research-workspace/`；基线只注入手册（10,757 B / 16,384 B 预算，余量约 4.6 KB）；嵌套 `AGENTS.md` 在成功 read/write/edit **之后的下一个请求**才注入 | `vendor/dsh/packages/context/agent-instructions/README.md` |
| 前车之鉴 | 2026-09-24 一份过期的全局 `AGENTS.md` 压过新手册，整个 lead 会话按不存在的 `runs/<slug>/` 开工，7 文件 13 处旧契约返工 | [D17 Note](../../../notes/implemented/2026-09-24-run-bundle-drt-separation.md) |
| 接续是常态 | 34 次恢复/状态探针命中（32 个真探针）；5 个探针写盘；3 场无范围「继续」重做（最大 92 调用 / 23 处改写）；带「目标=交付闭合」的同类会话收敛；1 场 0 调用空转 | [续跑行为](../research/run-bundle-charter/2026-10-23-resume-behavior.md) |
| 大文件 | `review.md` 最大 201,341 B（归档）；在飞 hardware 112,043 B；`leads.md` 最大 176,083 B；`final.md` 最大 61,088 B；单次 read 上限 51,200 B | 盘上 `wc -c` |
| 图会重写 | eu-us 在飞 plan **v1→v6**，新增 W3.2–W3.6 **5 个节点**，文件零搬迁；但全库仅 1 个 `plan/vN` 快照 | plan 头「图版本：v6」 |
| 交付见证 | 38/46 归档 journal 提到 present，但那是声明；present 原始事件只在日志；`deliverables/presented` 是结构化事件（`turn`/`callId`/`files[].path`，无版本/哈希） | vendor deliverables + 实测日志 |
| readiness | 终局解析 **46 PASS / 3 FAIL / 2 null**；3 FAIL = coding-agent / video / mcp-server；null = cn-llm-infra（`PASS-with-conditions`）/ eu-us（无终局行） | `terminalVerdictLine` 逐份（复核 §1 #12） |
| 契约断代 | `deliveryDate` 用 `final.md` mtime；门禁带五个契约日（LEADS/VERSION 10-03、HITL 10-05、R 10-06、AUDIT 10-08）；复制/搬动 bundle 会改「法律年代」 | [node-gate-contracts](../../../scripts/lib/node-gate-contracts.mjs) |
| 停放语义分叉 | `_abandoned/` 被刻意排除在模型可见手册之外（`research-workspace/.gitignore.example:13-16`，为免触发 snapshot 重录）；`_abandoned/README` 写 2 个、盘上 3 个 | 手册 / 停放区 README |
| 一条交付链断了 | `drt_eu-us-cn-ai-stack` 的 `final.md:34,127` 与 `findings.md:25` 引 `evidence/t4-eu-mistral-code-license-apache.md`，磁盘实为 `t1-eu-...`；该 bundle 无 audit/node-gate，从未被机械面扫到 | 盘上核对 |
| 红队反例 | 门③ append 一行「HITL2 拍板」即 PASS；门② 任意日志含 slug 即 PASS（前缀 slug 也过）；空语料/复制改 mtime 使归档门①/② 各红 22；audit 的真相是 262MB 语料；16 个删除 bundle 仍在 `/tmp` tar 与共享库指针里；bundle 内 `AGENTS.md` 通道机制可跑（当前 0 实例） | [红队](../research/run-bundle-charter/2026-10-23-red-team.md) |

**初稿勘误（要点）**：node-gate 47 → **46**；归档 node-gate 45/46 → **44/46**；plan v7/6 节点 → **v6/5 节点**；「无 `../drt_` 互引」→ **14 处 / 7 条证据链接**；「readiness 不可机械读」→ **46/3/2，缺终局块与升级权**；「430 处路径字面量」→ 不可复算，改用两条窄指标；「656 会话 / 21 次继续」→ **662 / 27**（口径见复核）。完整表 = 复核文件 §1。

## 5. 判断

### 5.1 三条不变量逐条评估

| 不变量 | 现状 | 违约/缺口 | 判断 |
|---|---|---|---|
| **独立** | 原则成立；无 symlink、无注册表 | 7 条跨 bundle 证据链接 + 14 处 `../drt_` + 37/46 散文互引 + 29 文件绝对路径 + 7 个 `file://` 源 | 不是零改动；新 run 禁证据依赖与 `../drt_`，旧场豁免；门禁只扫来源链，不做全文禁词 |
| **可删** | 删除目录不影响别的 run；无墓碑/注册表 | `/tmp` tar、日志、共享库派生条目、散文悬空、删除无契约 | 目录级成立；需写明「删什么、留什么、purge 边界」，不承诺擦除 |
| **可续** | 事实大多在场；阶段/拍板常可推 | 无状态头/无固定程序；next 与交付态不可只凭 bundle 推；32 探针 5 写盘、3 场重做 | **唯一从零到一的工程**：状态头 + 回执 + 阅读链 + 盲探针；不能只加手册几行 |

**修正初稿的因果**：初稿说「独立与可删已是现状，唯一没契约化的是可续」。前半句对「原则」成立，对「实现」不成立；后半句低估了独立性的违约面。正确的资源分配 = 续为主、独立用窄门禁收口、可删补边界声明。

### 5.2 已经对了的部分（不要动）

1. **归档 6 件核心契约 46/46，review 45、node-gate 44**——这是 schema，不是散文件；尾件弱是演化差异，不是失败。
2. **单写者 owner 表 = 真正的接口**——多 agent 协作难在「谁能写」，不在「文件放哪」。
3. **DAG → 产物的映射住在 `plan.md` 的 `output` 列**，是数据；图重写不用搬文件。
4. **证据是数据库**：frontmatter 就是索引（`grep '^supports:'`），按需读、有界读。
5. **渐进披露已发生三层**：角色 skill（目录只露 description）· 文档指针（NODES/templates/patterns/method）· 文件首屏（final §0 / leads §0 / review readiness / evidence frontmatter）。

### 5.3 不做：per-step / per-run 指令 / 全局索引 / 全量迁移

| 不做 | 理由 | 证据 |
|---|---|---|
| 每步一个子目录 | 轴错了：现在是「产物身份/生命周期 × topic 键 × owner」；plan 会重写；打断跨节点读取；路径代价高；披露收益≈0 | evidence 3,610 次读 vs plan 35；eu-us plan v1→v6；41 文件/115 处 `drt_` 字面量 |
| 每 run 一个 `AGENTS.md` / README | 权威冲突；嵌套指令晚一拍；静态图冗余；动态状态必腐；数据区开指令通道 | 2026-09-24 化石 `AGENTS.md` 事故；agent-instructions 注入时序 |
| 全局注册表 / 跨 run 索引 | 违反独立与可删；删一个 run 要么清表、要么留悬空行 | [红队](../research/run-bundle-charter/2026-10-23-red-team.md) |
| 一次重写 53 个旧 bundle | run bundle 是交付记录；旧 epoch 按旧规则解释 | RFC §边界 |
| 第二套状态机 / 队列 / task store | D4/D11/D20 已拒绝仓库任务队列；状态用声明 + 派生，不新增服务 | [decisions](../../../docs/decisions.md) |
| 用 mtime 继续断代 | 复制/搬动改语义；每加一门加一个日期 | node-gate-contracts |

### 5.4 状态模型：一个派生，多个消费者

**三层，不要混**：

1. **声明**：`run.md`（lead 在阶段转换时写；3–5 行 + 机器可读键 `contract` / `phase` / `next` / `delivered` / `parked`）。操作侧可写交付/停放回执。
2. **回执**：`delivered.json`（门结果 / audit 哈希 / present 事件指针 / `final/vN` 哈希）与 `manifest.json`（文件角色 / 读序 / 契约版本 / 哈希）。生成物，不是指令，不承担权威。
3. **派生**：内容 + 会话事件 → 状态。**唯一算法**，消费者 = 手册状态表、`node-gate`、`run-dashboard`、`ResearchStatusTab`、`run-accept`。已有 `run-version.ts` 的 `RunVersionState`（`none/drafting/rerun-in-progress/pending-hitl2/delivered`）可作为基线扩展，**不另造第四套枚举**。派生算法的代码正本放 `packages/deep-research-pack/src/lib/`（与 `run-version.ts` 同层），门禁/观察面/CLI 共用；手册状态表是它的自然语言镜像，状态名逐字一致，夹具同时喂两者防漂移。

**冲突规则**：声明与文件事实冲突 → 以事实为准，门禁判红；声明不能自证批准/交付。回执哈希只防「present 后当前版被改」，不证批准——批准仍看 `user-question-reply` 事件链。派生失败 → 显式 UNKNOWN/UNATTESTED，不猜。

**读序**（新 run / 有 `run.md`；旧 run 用 RFC §8 推导表）：

1. `run.md`（没有就跳过，用推导表）；
2. `question.md`（含 §Decisions）；
3. `topics.md`；
4. `plan.md`（若在场；旧 bundle 无则跳过）；
5. `journal.md` 顶部 3–5 条（方向按文件头声明；无声明默认「最新在上」，旧场按日期判前后）；
6. `findings.md` / `final.md`；
7. `review.md`（若在审/已交付；只认终局块）；
8. `evidence/<id>.md` + `provenance/<id>.json`（按需）；
9. `delivered.json` / `manifest.json`（若在场）。

**注意**：状态表是 harness 提供的程序（RFC §8 + 手册），不是 bundle 文件；不要把整张表复制进 `run.md`。

### 5.5 DSH 机制映射（哪些原生能力接住哪条要求）

| 要求 | DSH 机制 | 边界/代价 | 证据 owner |
|---|---|---|---|
| 常驻研究纪律 | `agent-instructions` 注入 cwd 链（手册） | 16 KB 预算；改文本红 snapshot B 层；嵌套文件晚一拍 | `handbook-budget` + snapshot-replay |
| 渐进披露 | skills（目录只露 description）+ 文档指针 | 角色隔离；skill 正文只在加载时进上下文；不承担状态 | preset-smoke / L1 |
| 两个人机门 | `ask_user_question` + `user-question-reply`（`callId`/`outcome`） | pending 是会话态；通道死亡永久 pending；答复事件才可作为见证 | 门③/门② + 日志夹具 |
| 交付见证 | `deliverables/presented`（`turn`/`callId`/`files[].path`） | 无版本/哈希；日志尾部可能丢；只证「声明过」，不证「用户批准」 | 门② + `run-accept` |
| 执行现场 | goal（每会话一个，resume 后 disarm）+ 任务板（session-scoped） | 新会话没有旧 goal；任务板 task_id 只是会话映射，恢复后重建 | RFC §8 / guides 61 |
| 观察面 | client `workspaceFiles` + `src/lib` 纯折算；`ResearchStatusTab` 会话绑定 + 三位置回退；`run-version` 用 present + final/vN | 观察只读；位置只用于发现；派生不缓存 | cockpit tests / client-load |
| 会话检索 | `session_search`（实验性，workspace-scoped） | 只能作旁证；不是研究事实；盲测禁用 | 复核 §5 |
| 运行态投影（O5） | `agent/pre-step` / `ctx.systemPrompt` / `ctx.tools` | 每次重算、fail-soft、必须 logged；不能写 bundle；先有量再谈 | 以后做；本卡只登记 |

**结论**：DSH 已经提供了「指令注入、人机门、交付事件、会话事件、观察面折算」的原语；我们缺的是
**在 bundle 侧把这些事件收成回执与状态，并让门禁读事件而不是读文本**。不需要新状态机。

## 6. 方案与取舍

| 方案 | 收益 | 代价 | 判断 |
|---|---|---|---|
| O1 现状 | 零改动；schema 稳定 | 接续读序靠现场发挥；交付态靠日志；恢复方差大 | 可接受但不理想 |
| O2 每步一个子目录 | 空间上「像流程」 | 路径/门禁/链接/plan 重写全撞；披露收益≈0 | **不做** |
| O3 每 run 一个 `AGENTS.md` / README | 看似「本地说明书」 | 第二真相源 + 晚一拍 + 注入面 + 会腐 | **不做** |
| O4 状态头 + 回执 + 阅读链 + 盲探针 | 低成本、可验证、不动旧 schema | 手册 + 几行（但触发重录）；探针要真模型档 | **现在做（推荐）** |
| O5 run-state 投影插件（pre-step 注入 ≤10 行） | 真正让「插件知道」 | 新插件面；cache 每次重算；fail-soft；先有 O4 再谈 | **以后做，先量** |
| O6 全量迁移 / 全局索引 | 表面整齐 | 破坏独立/可删；改历史交付记录 | **不做** |

## 7. 目录提案（供 REVIEW；规范正文 = RFC §11）

> 这不是「再加一层目录」，而是把现有产物按**类型 + 生命周期**排成 agent 可读的固定布局。
> 步骤不进目录（per-step 已否决）；指令不进目录（per-run AGENTS.md 已否决）。
> **新 run 用这棵树；旧 bundle 不迁移**，按 epoch/frozen 规则解释。

### 7.1 树

```
drt_<slug>/
├── run.md                     # 状态头（新）：contract / phase / next / delivered / parked
├── question.md                # 方向契约 + §Decisions（canonical）
├── topics.md                  # 拆解（canonical）
├── plan.md                    # 执行图（可选加速器；在场即当前）
├── plan/v<N>.md               # 旧图快照（可选；重写前落）
├── leads.md                   # 侦察索引（条件件；分片时这里是登记表）
├── leads/<axis>.md            # 并行侦察分片（可选；必须在 leads.md 登记）
├── evidence/<id>.md           # 证据卡（canonical；一条一档）
├── provenance/<id>.json       # 来源证明（C-lite）：类型/URL/路径 + sha256 + 时间 + 通道 + 切片
├── findings.md                # 结论账本（canonical）
├── review.md                  # 对抗核查（条件件；单一当前终局判定）
├── final.md                   # 当前版报告（canonical；[来源:] 相对 run 根）
├── final/v<N>.md              # 版本账（canonical；交付/rerun）
├── journal.md                 # 跑案日志（canonical；最新在上；块级完整）
├── drafts/                    # 草稿（可选、非 canonical；不得承载恢复必需状态）
├── audit.md                   # 证据审计快照（ops 生成）
├── node-gate.md               # 门禁快照（ops 生成）
├── acceptance.md              # 操作验收回执（ops 生成）
├── delivered.json             # 交付聚合（C-lite，ops 生成）：门结果/audit 哈希/present 指针/final 哈希
└── manifest.json              # 目录说明书（C-lite，ops 生成）：文件角色/读序/契约版本/哈希
```

**逐件职责、Agent 读序、新 run 写入序、不放进来的东西 = RFC §11**（本节只留树形，避免双份规范）。
本卡只保留待定的实现选择：

### 7.2 实现方自定（不请用户拍板；记录进 RFC/Note）

| # | 选择 | 推荐 | 影响 |
|---|---|---|---|
| 1 | `leads/` 子目录 vs 根级 `leads-<axis>.md` | **`leads/<axis>.md` + `leads.md` 登记**；旧场豁免 | 门L 要认分片；路径变更只影响新 run |
| 2 | `provenance/<id>.json` vs 嵌进证据卡 frontmatter | **独立 JSON**（可独立校验，不膨胀证据 schema） | 多一个文件；`evidence-audit` 要读 |
| 3 | `journal.md` 单文件 vs `journal/<role>.md` 分片 | **单文件 + 追加协议**；>2 并发写者再分片 | 今天 2–4 writer 未到必须做 |
| 4 | `run.md` vs `question.md` frontmatter | **已定 `run.md`**（RFC §3/§11）；本项关闭 | — |
| 5 | `audit.md`/`node-gate.md`/`acceptance.md` 留根 vs 收进 `receipts/` | **留根**（旧 epoch 路径不变）；v2 再议 | 收进去更像交付桶，但改路径 |
| 6 | `manifest.json` 交付时 vs 每次阶段转换 | **交付/验收时生成**；在飞状态靠 `run.md` | 便宜；实时性由状态头补 |

## 8. 影响面（blast radius）

> 这张表是本期「充分改够」的下限。每行都要在分期里有对应验收，不能只改一处。

| 面 | 具体落点 | 为什么会被波及 | 验收 owner |
|---|---|---|---|
| 人类文档 / 决定 | [D17](../../../docs/decisions.md) · [design/40](../../../docs/design/40-research-cockpit.md) · [design/50](../../../docs/design/50-agent-loop-and-state.md) · [guides/61](../../../docs/guides/61-run-playbook.md) · [project-map](../../../docs/project-map.md) | 「位置=状态」仍写在三处正本；交付判定、恢复步骤、观察面语义都要改 | `docs-consistency` / `md-links` / grep 零残留（新表述） |
| 模型可见 harness | [research-workspace/AGENTS.md](../../../research-workspace/AGENTS.md) · [NODES.md](../../../research-workspace/NODES.md) · `templates/run/*` · `presets/*/skills/*` · `.gitignore.example` · pack `workspace/` 种子 · `scaffold` | 状态表/读序/停放/新模板进手册与模板；种子是生成物；手册改动红 snapshot | `pack-workspace-fresh` · `handbook-budget` · `workspace-contract` · snapshot-replay A/B + 真模型重录 · L1 |
| 状态派生 / 观察 | `run-version.ts` · `run-fold.ts` · `run-state.mjs` · `run-dashboard-core.mjs` · `ResearchStatusTab.tsx` · `final-target.ts` | 状态是声明 + 派生；观察面不能各自重算；位置只用于发现 | `tests/cockpit/*` · `tests/run/run-state.test` · `client-load-smoke` |
| 门禁 / ops | `node-gate*` · `schema-scan` · `evidence-audit` · `run-accept` · `watch-run` · `hitl-answer` · `verify.mjs` gates 数组 + [evaluation](../../../docs/evaluation.md) 台账 | epoch 替代 mtime；门②③ 读 `presented`/`reply`；观察只读；run-accept 只在绿时写 | node-gate 契约测试 + `gates-smoke` 红案例 + run-accept 红/绿双跑 |
| 证据 / 溯源 | 证据 frontmatter · `provenance/` · `evidence-audit` · 夹具 | `file://` 改 local-file 类型；sha256 + 切片；绝对路径扫描 | evidence-audit 测试 + 无语料/离线夹具 |
| 交付 / 客户端 | `present` 流程 · `delivered.json` · `manifest.json` · `ResearchFinalTab` | present 指 `final/vN`；回执哈希；页签读终局块 | `client-load-smoke` + run-accept E2E |
| 快照 / 回放 | `snapshots/replay/research-face/*`（4 角色 + snapshot.json） | 手册/模板文本 = 模型可见输入，改一字即红 B 层 | 真模型重录 + 人审 `source` 身份 |
| backlog / RFC | 本卡 · [RFC](../../../notes/implemented/2026-10-23-run-bundle-charter.md) · 9 份 research · 历史偏差记录（不建卡） | 决策/证据/反例各有家；卡不承载证据全文；旧场不追改 | `backlog-liveness` · `md-links` |

**量级提示**（不是工期）：第一方 `scripts+pack src+docs` 中 41 个文件含 `drt_` 字面量；29 个
bundle 文件含绝对路径；7 条跨 bundle 证据链接；4 个录制会话要重录。**不要用「改手册几行」估工。**

## 9. 实施分期（候选，不是授权）

> 每期 = 一个可独立验收的切片 + 真实前置；不把「全部做完」当一期。顺序可按用户答复调整；
> P0 不需要等宪章批准。

| 期 | 做什么 | 独立验收 | 真实前置 |
|---|---|---|---|
| **P0 基线与冻结** | 冻结历史 baseline（53 bundle 表、gate/audit/review 现状、旧场豁免清单）；预登记 4 个盲测样本 + ground truth；**不修历史、不建卡** | baseline 文件有命令 + 结果；ground truth 冻结；旧场零改写 | 无（可立即做） |
| **P1 决定与人类文档** | D17 修订（Q1）；design/40、design/50、guides/61、project-map 改「位置=操作桶」；记录 `_abandoned` 语义；定 plan 角色（Q3） | 四份文档零「位置=状态」残留；`md-links` 绿；D17 修订有用户裁定记录 | Q1/Q3 |
| **P2 新 run 契约** | `run.md` + `contract` epoch 进模板/scaffold/种子；`schema-scan`/`node-gate` 读 epoch 不读 mtime；旧场按 epoch 豁免 | 沙箱新建 run 有可解析 `run.md`；`cp -R`/改 mtime 判定不变；旧 bundle 判定清单不变；`pack-workspace-fresh`/`workspace-contract` 绿 | Q2；P1 的 epoch 格式（实现方定） |
| **P3 交付见证** | 门② 读 `deliverables/presented` + 精确 `final/vN` + lead 会话 + 回执哈希；门③ 读 `user-question-reply` + `callId` + 选定「定稿」+ 代理标记；UNATTESTED 三态；`run-accept` 绿才写回执、红不写 | 红队 4 反例全红/UNATTESTED（append 行、伪造 present、前缀 slug、空语料）；`run-accept` 红跑不改 bundle；绿跑写 `delivered.json`/`acceptance.md` | P2；DSH 事件形状已核（复核 §5） |
| **P4 观察面 / 位置中立** | `run-dashboard` 认三位置；`watch-run` 不靠根位置判 settled；`ResearchStatusTab` 从派生判态；`run-state` 显式三位置或只作发现；门禁/审计默认只读、`--write` 才落盘 | 移动 bundle（根/archive/_abandoned）判定不变；dashboard/client 同态；`node-gate` 默认不写盘；`client-load-smoke` 绿 | P3 |
| **P5 溯源 / 可移植** | `provenance/<id>.json` + sha256 + 切片；`file://` 作为 local-file；`manifest.json` 角色/读序/契约版本/哈希；绝对路径与 `../drt_` 扫描 | 无 sessions 的沙箱 bundle 可离线复算；`file://` 不再判「伪造」；新 run 无绝对路径；manifest 哈希可核 | P2/P3 |
| **P6 并发 / 共享库（可延后）** | leads 分片登记、journal 方向/分片、drafts canonical 指针、method-library 快照 | 并发写夹具；未登记顶层文件 RED；库快照可读；不破坏旧场 | P1/P2；用户确认是否现在做 |
| **P7 手册文本批 + 阅读链** | 一次性改手册：状态表 + 读序 + 停放一行 + NODES 措辞；`pack-workspace-fresh`；真模型重录 4 角色 | 手册 ≤ 预算；snapshot A/B + 重录后绿；L1 绿；`handbook-budget` 绿 | P1/P4；Q5；**必须成批** |
| **P8 盲续跑 + 收口** | 预登记 ground truth；4 样本盲测；非回归全矩阵；RFC → implemented Note；卡归档 | 见 §10 B4/B5；证据记录逐条；未跑项分列 | P7 |

## 10. 验收标准

> 分两层：**A 是本卡关闭验收**（判断记录）；**B 是下游实施验收**（不构成本卡关闭条件，由 RFC/分期承载）。
> 不把实施验收倒灌成卡关闭条件——卡是判断记录，不是任务队列。

### A. 本卡关闭验收（决策级）

1. §12 五问有用户的明确答复，或用户明确授权自主判断；本卡已记录 2026-10-23 授权与 A/A/A/A/A 裁定；
2. D17 的「位置=状态」修订有用户裁定记录（新 D 号或 D17 修订行），三处正本不再与宪章冲突；
3. RFC 被批准 / 并入当前合同，或明确「不批准 + 原因 + 重启条件」；
4. §13 的历史偏差已按 **grandfather** 记录（只读反例，不修、不建卡）；新 run 规则由 P2/P3 覆盖；
5. 下游实施计划（P0–P8）已记录；卡归档时明确「实施验收仍待下游」，不暗示已交付。

### B. 下游实施验收（不构成本卡关闭）

**B1 静态契约（新 run 生效，旧 run 豁免）**

- `run.md` 在场，`contract` / `phase` / `next` 可解析；`phase=delivery` 且 `delivered` 回执在场时 `final/vN` + review 终局齐；
- 无跨 bundle `[来源:]`、无 `../drt_`、无绝对路径、无 `file://` 源、无指令文件/脚本/symlink；
- 门禁/UI 从内容判状态；移动 bundle 后判定不变；`cp -R`/改 mtime 不改 epoch。

**B2 交付见证（红队回归）**

- 复制 bundle 到沙箱，append 一行「HITL2 拍板」→ 门③ 必须 **不 PASS**（UNATTESTED/RED）；
- 伪造 present / 前缀 slug → 门② 必须 **不 PASS**；
- 空 session 语料 → 门①/②/③ 记 **UNATTESTED**，不得静默绿，也不得误红；
- present 只认 lead 会话 + `deliverables/presented` 的精确路径；新 run 必须指 `final/vN`，指 `final.md` → 不 PASS（v1 也先落 `final/v1.md`）；回执哈希必须匹配；
- HITL2 的 `user-question-reply` 与 `callId`、选定标签、代理标记必须能对上；
- `run-accept` 红跑不写 `acceptance.md`/`delivered.json`；绿跑才写；`--write` 显式。

**B3 观察只读 / 位置中立**

- `node-gate`/`evidence-audit` 默认不写 bundle；`run-accept` 是唯一写回执的原子动作；
- 在 active/archive/_abandoned 之间 `mv` 一个 bundle，状态判定不变；
- `run-dashboard` 与 `ResearchStatusTab` 对同一 bundle 给出同态；`_abandoned` 不再从总表消失。

**B4 盲续跑（唯一硬验收，预登记）**

- **样本 4 个**：(a) 在飞且有 `plan.md`（hardware 或 eu-us）；(b) 旧 bundle 无 `plan.md`（browser landscape）；(c) 已交付归档且终局 PASS（mcp-security）；(d) **负样本**：停放/未交付但内容看着齐（`_abandoned/drt_semver-caret-prerelease`：HITL2/present/final/v1 都在，audit CRITICAL 7，验收未过）。
- **预登记**：盲测前把五问 ground truth 写到 agent 不可读的位置（如 `/tmp`，不入库）；冻结后不再改；记录作者/日期/依据文件。
- **协议**：新 lead 会话，cwd = `research-workspace`，只给 `drt_<slug>`，不给聊天记忆；**禁** `session_search`/日志、禁读 `_backlog`/docs/ground truth、**禁读别的 run bundle**（含 archive/`_abandoned`）、**禁写盘**；同模型/同 preset；每样本一次。
- **五问**：现在什么阶段 / 最近一次拍板（引用 + 日期）/ 最大未闭合风险 / 下一步做什么（可执行）/ 交付态到哪一步（声明 + 见证）。
- **判分**：阶段与交付态 = 精确；拍板 = 引用 + 日期；风险 = 一个具体未闭合项；下一步 = 一个可执行动作（文件/owner/范围）。**硬维度 = 下一步 + 交付态**。
- **通过**：phase/delivery **4/4**；下一步 **≥3/4**；负样本 **1/1 不得误报「已交付/PASS」**；零写盘、零禁用工具；记录读序/调用数/空转 glob。
- **baseline**：P0 先跑同一 4 样本；若 baseline 已过硬维度，则本项证明「回执/epoch 的可解释性」，不得声称「探针从红变绿」；改进只能按硬维度逐项对比。
- **记录**：结果回到本卡或 P8 的 research 文件；「未跑 ≠ 通过」。

**B5 非回归（按面，不按一句 `pnpm test`）**

- L0：`pnpm verify` + `pnpm test`；
- harness：`pack-workspace-fresh`、`handbook-budget`、`workspace-contract`、`snapshot-replay` A/B（文本改动后真模型重录 + 人审 `source`）、L1（四角色挂载）；
- 门禁：`node-gate` 契约测试 + `gates-smoke` 新红案例（先红后绿）+ `evidence-audit` 夹具；
- 观察：`client-load-smoke` + `run-dashboard`/`run-state` 测试；
- 交付：`run-accept` 红/绿双跑；L2 安装验收（发布相关时）。

**B6 证据记录**：每条验收 = 命令 + 结果 + 日期；未跑项分列；值级「下一步是否真的对」只能由盲测 + 人判，不用机械绿冒充。

## 11. 关闭条件

- §10 A 全部满足 → 状态行写结论与去向（`已结`），`git mv` 到 `_archived/settled_issues/`；
- 若用户否决定调：记录否在哪一条（独立 / 可删 / 可续 / 位置语义），卡转 `叫停` 或按新方向重开，
  **不在细节上打补丁**；不把「否决定调」伪装成「实施完成」；
- 若用户要求本卡陪跑到 P2/P8：在状态行显式写「陪跑至 P?」并保留 `可关闭：否`；此时 §10 B 的
  对应期验收才成为关闭门槛，且必须逐期记录，不能一次性宣称全绿。

## 12. 裁定记录（五问；2026-10-23 用户授权自主判断）

> **裁定**：2026-10-23 用户指令「你可以判断，自主静默执行；别什么东西都问我，除非你完全没数」。
> 据此 Q1–Q5 均采纳 **A**；依据 = §4/§5 的实测证据 + 各问的推荐档。D17 修订按 Q1-A 落地；
> 若后续用户否决，按 §11 回退，不在细节上打补丁。以下保留原问题与选项作为历史。

> 每问都给「已知事实 / 选项 / 影响 / 建议」。只答你关心的；未答项按推荐档推进并在下次边界复核。

### Q1 位置语义（D17 修订）

- **事实**：D17 第 27 行、design/40:107-109、design/50:25 仍写「位置=状态」；实测 archive 有 7 份 node-gate.md 文本含 RED（未逐门重算）、`_abandoned` 有内容全齐的场、4 个根 bundle 都已有 `final/v1`；位置无法表达「已交付待验收」。
- **选项**：A 位置=操作桶，状态=内容（推荐）；B 保留位置=状态，只修一致性问题；C 双轨过渡（读内容、写位置）。
- **影响**：A 要改三处正本 + 观察面 + 门禁；B 保留 5 个已知矛盾，宪章不能宣称位置中立；C 留两套真相，恢复仍会分叉。
- **建议**：A。这是本卡唯一必须改 D17 的裁定。

### Q2 目录树（新 run）

- **事实**：C-lite（`provenance` + `manifest` + `delivered`）已于 2026-10-23 由用户定方向；`run.md` 已由 RFC 定为状态头；旧 bundle 不迁移。
- **选项**：A 采纳 §7.1 全树，旧场豁免（推荐）；B 只加 `run.md`，暂不加回执/provenance；C 只改手册/门禁，不加文件。
- **影响**：A 新增 3 类文件/生成物，但状态、交付、溯源各有家；B 便宜，交付仍只靠日志；C 无状态头，恢复仍靠猜。
- **建议**：A（与 C-lite 已定方向一致）。

### Q3 `plan.md` 角色

- **事实**：plan 归档 1/46、全量 6/53；恢复又靠它的 W 节点重建任务；eu-us 已 v1→v6；当前只有 1 个 `plan/vN` 快照。
- **选项**：A 契约化一个「未完成节点 + owner + 下一步」机器可读小节，全图仍可选（推荐）；B 只作可选加速器，退出恢复链；C 全图进契约（重）。
- **影响**：A 让恢复可推、lead 多写几行；B 保持冷面，但「还剩什么」仍无家；C 冻结 plan 版本、与 per-step 否决冲突。
- **建议**：A（最小节，不要求全图）。

### Q4 删除边界

- **事实**：删目录不影响别的 run；但 `/tmp` tar、日志、共享库派生条目、散文互引会留下；删除无契约。
- **选项**：A 只删 bundle，日志/共享库默认保留，另给显式 purge（推荐）；B 默认连日志切片/共享库指针一起删；C 不承诺删除，只归档。
- **影响**：A 与现状一致，边界显性；B 更彻底，但可能破坏别的 run 的审计/引用；C 弱化「可删」。
- **建议**：A + 写明 purge 范围与保留期。

### Q5 停放可见性

- **事实**：`_abandoned/` 刻意不进模型可见手册（为免 snapshot 重录）；结果停放场在模型眼里「不存在」，操作侧与模型侧合同分叉。
- **选项**：A 手册加一行「停放 = 不投入但保留，复活条件在 bundle 内」（推荐，随 P7 一次重录）；B 维持现状（不进手册）；C 只经工具/状态头暴露，不入手册。
- **影响**：A 对齐两侧，成本并入 P7 的重录；B 保持现状，分叉继续；C 加工具面，模型仍不常驻知道。
- **建议**：A。

## 13. 历史偏差 = grandfather（不修、不建卡）

> **2026-10-23 用户裁定**：过去没有必要修的直接删除；只关心将来的 deep research。以下观察是清理前历史快照，**不是修复队列**，
> 只是新契约的反例证据；旧 bundle 只读、不追改、不建缺陷卡。新 run 由 P2/P3 的门禁/事件链防止重犯。

| ID | 对象 | 观察（证据） | 对未来的约束 | 旧场处置 |
|---|---|---|---|---|
| H-1 | `drt_eu-us-cn-ai-stack` | `final.md:34,127` / `findings.md:25` 引 `t4-eu-...`，实为 `t1-eu-...`；无 audit/node-gate | 新 run 的 `[来源:]` 目标必须在场且被审计覆盖 | **不修**；grandfather |
| H-2 | `archive/drt_geometry-coaching` / `drt_swebench-verified-top` | 归档位但门③/② 或 ①/③ RED；geometry `final/` 只有 README | archive ≠ 已交付；新交付必须 `run-accept` 绿 + `acceptance.md` | **不修**；位置只当操作桶 |
| H-3 | `_abandoned/drt_semver-caret-prerelease` | `node-gate.md` 写「audit 缺席」，audit 已在场（CRITICAL 7 / MAJOR 272） | 门文物带生成时间/输入哈希；先 audit 再 gate；红不写盘 | **不修**；gate 判过期 |
| H-4 | `archive/drt_2026-ai-coding-agent-landscape` / `drt_2026-ai-video-generation-landscape` / `drt_mcp-server-ecosystem` | 终局 FAIL 仍在 archive；附录夺权 / lead 回写升级 / 文末首轮块 | review 单一终局块；只有 critic 能写终局；lead 升级引用授权 | **不修**；按 epoch 解释 |
| H-5 | `archive/drt_computer-use-benchmarks` | 14 行/16 个 `../drt_`，其中 7 条 `[来源:]` 跨 bundle；依赖 `cn-agentic-parity` | 新 run 禁 `../drt_` 与跨 bundle `[来源:]`；需要复用就复制证据 + provenance | **不修**；grandfather |
| H-6 | 29 个含绝对路径的 bundle 文件；7 个 `file://` `source_url` | 换机/重装即断源；本地文件被当网页判伪造 | 新 run 禁绝对路径；`file://` 只作 local-file 类型 | **不修**；grandfather |
| H-7 | 53 个里只有 2 个 `acceptance.md` | 「已交付待验收」没有覆盖 | 新交付一律 `run-accept`；缺席 = 未验收 | **不补**；历史不回填 |
| H-8 | `archive/drt_cn-llm-infra` 与在飞 `drt_eu-us-cn-ai-stack` | review 无终局块（`PASS-with-conditions` / 无判定） | 新 run 固定 `## readiness（终局）`；旧场按 epoch 豁免 | **不修**；不追溯 |

**结论**：历史偏差的用途 = 证明为什么需要新契约，不是催着修旧场。P0 只冻结 baseline 与旧场豁免；
P2/P3 的门禁一律 **新 run 生效，旧场按 epoch 豁免**。不再开 S0/S1 bug 卡。

## 14. 载体与下游

| 层 | 载体 | 承载什么 | 何时产出 |
|---|---|---|---|
| 锚 | **本卡** | 宪章级问题、不变量、判断、影响面、分期、验收、用户裁定、缺陷分诊 | 现在（持续更新） |
| 证据 | [run-bundle-charter/](../research/run-bundle-charter/)（5 份，含复核） | 历史决定时间线、实物偏差、续跑行为、红队、数字复核 | 已收 |
| 规范 | [RFC](../../../notes/implemented/2026-10-23-run-bundle-charter.md) | 宪章正文：定义、不变量、生命周期、写入/恢复/变更程序、目录逐件职责、验收矩阵 | 已起草（proposed，待批准） |
| 历史偏差 | 本卡 §13 + [复核证据](../research/run-bundle-charter/2026-10-23-issue-review-verification.md) | 只读反例；grandfather，不修、不建卡 | 已记录 |
| 实施 | 本卡 §9 + 各期验收记录 | 分期、证据、红绿 | 批准后 |

**为什么不现在拆多张实施卡**：宪章的价值是**一组不变量同时成立**；先拆会把「为什么」分散到各卡，
最后又回到局部补丁。只有在审计发现**互相独立的具体缺陷**（S0/S1）时才开 bug 卡——本卡 §13 就是
这份清单；宪章本身保持一张。

## 15. 复核记录与证据修正（2026-10-23）

1. **撤回「独立已是现状」**：7 条跨 bundle 证据链接 + 14 处 `../drt_` + 37/46 散文互引 + 29 文件绝对路径；见 §4/§5.1。
2. **node-gate 47 → 46**（归档 44/46）；`cn-us-open-source` 也缺 gate，`agriculture-gap` 有 gate。
3. **plan v1→v7/6 节点 → v1→v6/5 节点**；`plan/vN` 全库仅 1 个。
4. **readiness「不可机械读」→ 46 PASS / 3 FAIL / 2 null**：缺终局块与升级权，不是缺正则。
5. **阅读统计重新分类**：662 会话 / 8,094 read；模板单列 212；初稿个别数字混了口径；方向性结论不变。
6. **删除「无 `../drt_` 互引」**：改为精确数；独立性修法改为窄门禁 + 旧场豁免。
7. **删除「430 处路径字面量」**：不可复算；改用 41 文件/115 处 `drt_` + 29 文件绝对路径两条窄指标。
8. **`A + C-lite` 字母冲突**：改为「单位 = 一任务一 bundle」「交付增量 = C-lite」「目录树 = §7」，不再用与方案表冲突的字母。
9. **`§8 状态推导表` 指向错误**：本卡 §8 是影响面；状态表在 RFC §8，已改。
10. **手册成本**：补 snapshot B 层 / 真模型重录；手册文本必须成批落（P7）。
11. **关闭条件与实施验收分开**：A 决策级 / B 下游实施；卡不冒充实施验收。
12. **`issue:N` 行号引用**：初稿行号已随本次重排失效；旧引用按本卡 §标题 检索，research 文件里的 `issue:N` 仅作 2026-10-23 初稿追溯。
13. **历史偏差不修（2026-10-23 用户裁定）**：删除 5 张 BUG-044–048；§13 改为 grandfather 反例；宪章只约束未来 deep research。

## 16. 落地记录（2026-10-23）

| 期 | 结果 | 证据 |
|---|---|---|
| P0 基线/grandfather | 完成；历史只读、不建卡 | [P0 基线](../research/run-bundle-charter/2026-10-23-p0-baseline.md) |
| P1 D28 | 完成；D17 位置子句改操作桶 | [P1](../research/run-bundle-charter/2026-10-23-p1-position-neutral.md) |
| P2 run.md/epoch | 完成；模板/门禁/反证 | [P2](../research/run-bundle-charter/2026-10-23-p2-run-contract.md) |
| P3 交付见证 | 完成；presented/reply/UNATTESTED/run-accept | [P3](../research/run-bundle-charter/2026-10-23-p3-delivery-witness.md) |
| P4 观察面/只读 | 完成；三桶/跨桶落定/默认只读 | [P4](../research/run-bundle-charter/2026-10-23-p4-observer-neutrality.md) |
| P5 溯源/可移植 | 完成；provenance/离线 audit/manifest/卫生 | [P5](../research/run-bundle-charter/2026-10-23-p5-provenance-manifest.md) |
| P6 并发/共享库 | 延后（触发 = 并发写 >2 或 leads 分片实证） | [P8 §3](../research/run-bundle-charter/2026-10-23-p8-final.md) |
| P7 手册/快照 | 完成；手册 15,274B/190 行、四角色重录 | [P7 baseline](../research/run-bundle-charter/2026-10-23-p7-blind-baseline.md) · [P7 manual](../research/run-bundle-charter/2026-10-23-p7-manual-batch.md) |
| P8 盲测/收口 | baseline 4/4 + post 4/4（subagent 代理；正式 lead UNATTESTED）；verify/test/snapshot/preset/client-load 绿；RFC 毕业，本卡归档 | [P8](../research/run-bundle-charter/2026-10-23-p8-final.md) |

**未跑**：正式 lead 盲测（run 通道 max-tokens 无最终文本，subagent 代理并记录偏差）· L2 安装验收（非发布轮）。旧 bundle 零改写；历史偏差只作反例。
