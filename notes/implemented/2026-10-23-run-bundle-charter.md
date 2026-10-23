# run bundle 宪章——独立、可删、可续（已落地）

> 状态：implemented

> 落地 2026-10-23 ｜ 锚点卡 = [_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 证据 = [_backlog/research/run-bundle-charter/](../../_backlog/research/run-bundle-charter/)（历史决定、实物偏差、续跑行为、红队）
> ｜ 影响面 = D17 位置语义、研究手册、guides/61、run 门禁、驾驶舱、模板、`run-accept`
>
> 2026-10-23 用户拍板：**单位 A**（一任务一 bundle，rerun 版本在内；独立是 bundle 之间）；
> **C-lite**（`provenance/` + `manifest.json` + `delivered.json`；批准仍外部事件链）。第 3 件（删除边界）待定。

## 问题

run bundle 已经是研究事实的载体：53 个 bundle、2,078 张证据卡、核心 6 件在归档里 46/46 稳定（review 45/46、node-gate 44/46）。
但**状态**没有唯一家，长期靠四个外部信号拼：**位置**（根/archive/_abandoned）、**mtime**、
**session log 的 present**、**review.md 里的散文 readiness**。四个信号都可错：

- 位置：archive 里有保留红门的场；`_abandoned` 里有内容全齐的场；工作区根里有已交付场；
  `_abandoned/README.md` 手写登记已腐（写 2 个、盘上 3 个）。
- mtime：契约断代用 `final.md` mtime + 五张契约日期表（LEADS/VERSION/HITL/R/AUDIT）；
  复制或搬动 bundle 就改"法律年代"。
- present：交付唯一见证在会话日志；日志尾部通道死亡会丢；已有 PASS-RELAY 补丁。
- readiness：51 份 review.md 有 5 种形态、3 例"末次匹配是历史轮"；还有已交付场无 review。

后果不是单点 bug，而是**每次事故加一条规则**：三位置回退、PASS-RELAY、五张契约日、豁免登记、
`_abandoned` 刻意不进手册。红队实测更硬：门③ append 一行「HITL2 拍板」即 PASS；门② 任意日志
payload 含 slug 即 PASS（前缀 slug 也过）；空语料/复制改 mtime 使归档门①/② 各红 22；audit 的
真相是 262MB session corpus。**bundle 不能自证批准/交付。** 宪章要做的，是把这些局部规则收回到
**一组不变量 + 五类状态分层**，并给未来变更一个判断程序。

## 决定

### 0. 地位

本宪章是 run bundle 的最高约束。任何文档、脚本、门禁、UI 与它冲突时，以本宪章为准；修改本宪章
需另开 RFC，不得用局部补丁绕过。宪章只管**状态与生命周期**，不管研究方法与节点内容（后者归
NODES.md 与角色 skills）。

### 1. 定义与状态分类（五类）

| 类 | 例子 | 家 | 规则 |
|---|---|---|---|
| **研究状态** | question/topics/plan/evidence/findings/review/final/journal | **bundle** | 正本；自包含；可续；见 I1–I3 |
| **批准/交付见证** | HITL1/HITL2 的 ask/answer、present、acceptance | 外部事件 + bundle 回执 | **不自证**；回执是指针；门禁校验事件链 |
| **溯源/审计** | session corpus、audit.md、node-gate.md | 语料 + bundle 快照 | 派生、环境绑定；无证据 = **UNATTESTED**，不是红也不是绿 |
| **执行现场** | goal、任务板、队友、在飞 HITL | 会话 | 可丢；不承诺接上；从 bundle 重建/重问 |
| **共享学习** | method-library、question-patterns | workspace 共享库 | 版本化/append-only；run 记快照；不是 run 状态 |

- **run bundle**：一次研究任务的全部**研究状态**，落在 `drt_<slug>/`，可在任意目录。
- **harness**：presets、skills、手册、NODES、templates、patterns；只读，不进 bundle。
- **自包含的范围**：bundle 自包含的是**研究状态**；批准/溯源/执行/学习各有自己的家与规则。
  "bundle 单独拿走"能回答"研究到哪、下一步是什么、交付声明是什么"，**不能证明批准真的发生过**。

### 2. 三条不变量（作用于研究状态）

- **I1 独立**：研究状态之间零必需依赖。删除、移动、复制一个 bundle，不影响另一个 bundle 的
  研究状态恢复；不允许把别的 bundle 的路径/证据当作本 bundle 的输入。共享 harness 只读；
  共享学习库按 §1 分类。外部见证/审计不构成 bundle 之间的依赖。
- **I2 可删**：删除 bundle = 删除研究状态目录。没有注册表要清、没有墓碑要留、没有外部索引必需；
  删除是研究状态续跑的终态，这是接受的。**不承诺擦除**外部证据（session log、attestation、
  /tmp 备份）与共享学习库的派生条目；若要彻底删除，走显式 purge 并写明删了什么、留了什么。
  删除单位 = bundle + 可选日志切片 + 由它派生的共享库条目，不是"删目录"三个字的绝对承诺。
- **I3 可续**：只读 bundle + 固定程序 → 能推出研究状态的"下一步并继续"。**语义续跑，不是执行现场
  接上**：goal/任务板/队友/在飞 HITL 丢了就重问/重建；批准/审计按 §1 的外部类复核。

### 3. 自描述（I4）

每个 bundle 必须自己说清三件事，且只有一个家：

1. **它产自哪个契约纪元**（contract epoch）——写于创建时，跨时间解释用；
2. **它现在处于生命周期哪一段**——至少区分：在飞、已交付待操作验收、已验收、已停放、已弃用；
3. **下一步做什么**——在飞时必须可执行；终态写"无"。

实现形态 = `run.md`（已定；`question.md` frontmatter 不再采用）：3–5 行 + 机器可读键；字段至少
`contract` / `phase`（或 `state`）/ `next` / `delivered` / `parked`。写作纪律：lead 在阶段转换时写；
操作侧可写交付/停放回执；**状态是声明，事实是正本**——声明与文件事实冲突时以事实为准，门禁判红。
不得把整张图、整份证据清单复制进状态头。

- **回执 / 清单（可选生成物）**：`delivered.json`（门结果、audit 哈希、present 事件）与
  `manifest.json`（文件角色、读序、状态表、契约/pack 版本、快照哈希）是生成物，不是指令、
  不承担权威；缺省时按 harness 读，存在时校验。

### 4. 位置中立（I5）

`根 / archive/ / _abandoned/` 是**操作桶**，不是状态。移动 bundle 不改变它的语义；状态从内容读，
不从位置读。位置可以用于发现与展示，不得用于恢复或交付判定。位置与内容冲突时，以内容为准，
并把位置/工具当 bug 修，而不是改内容迁就位置。

### 5. 生命周期

```
创建 → 在飞（可停/可续）→ 研究交付（HITL2 + final 版本账 + present）
     → 操作验收（audit/node-gate/acceptance）→ 归档（可选）→ 删除（终态）
     ↘ 停放（可选，附原因与复活条件，写在 bundle 内）
```

- **停放**：原因与复活条件写进 bundle 状态头，不写外部 README；停放不是删除，可移回继续。
- **归档**：可选操作桶；"已归档"不是交付证明，交付证明见 §6。
- **冻结**：不是状态。已交付 bundle 可显式 rerun/resume；默认无新写入，但可重开。
- **删除**：终态；不要求归档、不要求墓碑；别的 bundle 的文字引用可能悬空，但不得作为证据依赖。
  删除研究状态 ≠ 擦除日志/共享库派生条目；后者按 §2 I2 的边界处理。

### 6. 交付见证（I6）

交付 = **bundle 回执 + 外部事件 + 事件链**，三者都要：

- bundle 回执：状态头/`journal.md`/`§Decisions` 的 `delivered: vN @ time · by …`，并带外部事件指针
  （session id / turn / tool call id）；
- 外部事件：`present` 调用在 session log；门② 以日志为准，但**必须精确匹配 slug 且事件链完整**
  （ask → answer → 拍板行 → present）；前缀 slug、任意 payload 含 slug、单行文本都不算；
- 回执与事件冲突 → 红；日志丢失/语料缺席 → **UNATTESTED**（无证据 ≠ 负证据），不得静默绿，
  也不得凭 bundle 单行文本判 PASS；
- `acceptance.md` 是操作验收回执；缺席 = 未验收，不是未交付；
- `review.md` 必须有**单一当前终局判定**（文末附录/历史轮不算当前）；状态头镜像该判定；
  留存的 5 种旧形态按 epoch 豁免；
- **批准链**：HITL2 必须有日志锚定的 ask/answer 事件，绑定 lead 会话与最终 `final/vN` 哈希；
  `present` 只认 lead 且只指向不可变快照（`final/vN` 或哈希），不指当前工作稿；bundle 文本永不
  作批准证据；无日志 = UNATTESTED，不是 PASS。
- **不承诺 bundle 自证批准/交付**；用户批准是外部行为，bundle 只能携带回执与指针。
- **实现面（2026-10-23 落地 + 复核修订）**：门② 读 `deliverables/presented` 的
  `files[].path`（精确相对路径）与 `callId`；present 指向在场的 `final/vN`（不可变快照）才
  作数，指 `final.md` → **RED**（有事件但对不上 = 红；无语料才是 UNATTESTED）；门③ 读
  `user-question-reply` 的 `callId` / `outcome` 与选定标签，§Decisions 行只作回执镜像。
  **见证必须归属本 run**：只认**绑定本 bundle 的 lead 顶层会话**（写过 `drt_<slug>/`）——
  跨 run / 子 agent 会话不作证；事件日期早于 `contract` 纪元不计（同名 slug 重开不继承旧见证）；
  present 时间早于 HITL2 答复 → RED（事件链顺序）。`delivered.json` 的 final/audit sha256 由
  门A 复算——交付后被改即红（回执不是自证，是校验点）。前缀 slug、单行文本、失败调用都不算。
  事件字段正本 = vendor `deliverables` 与 `user-questions` 包 README。

### 7. 写入与并发（I7）

- 单写者 owner 表；append-only（Decisions/journal）vs 原位改（plan/final 当前版）vs 版本账
  （final/vN、plan/vN）；
- 并发：一个写作用域一个写者；并行写必须分片并在 owner 文件登记；journal 条目必须块级完整；
- **bundle 内禁止**：`AGENTS.md`/`CLAUDE.md`/local 变体等指令文件（含 symlink 目标）；可执行脚本；
  symlink；绝对路径（`/Users/`、`/home/`、`/tmp/`、盘符、`~/` 族）；`file://` 本地源作
  `source_url`；把别的 bundle 的路径当证据。机械面 = `schema-scan.hygieneOf`（新 run 才扫）：
  指令文件/脚本/symlink/绝对路径族/未登记顶层条目/`leads/` 分片未登记 → 核心违约；
- **观察只读**：状态探针、驾驶舱、门禁检查不得写 bundle；只有显式 ops 动作可写
  `acceptance.md`/`audit.md`/`node-gate.md`，并在回执里标明；`node-gate` 每次运行都写盘 = 违约；
- `drafts/` 是无主草稿区，不得承载恢复必需的状态；协调状态住状态头/journal/plan；
- **分片与白名单**：journal 分片（`journal/<role>.md`）或单写者追加协议；leads 目录 + 索引
  （或禁分片）；drafts 有 canonical 指针；未登记顶层文件 = RED；
- 共享可变库：append-only/版本化；run 记录本次读到的条目与摘要；库的变化不改变已交付 run 的
  可解释性。

### 8. 恢复契约（I8）

- **最小恢复集**：`run.md`（若在场；状态头）+ `question.md`（含 §Decisions）+ `topics.md` + `journal.md` + `findings.md` +
  `final.md`（+ `final/` 若有）+ `review.md`（若有）+ `evidence/`（按需）；`plan.md` 是加速器，
  不是必需——若在场，必须与当前状态一致；
- **固定程序**：读最小集 → 判五问（阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态）→
  **先定范围**（状态头的 `next`/`phase`；范围不明时只问一个带范围的澄清问，不重跑全流程）→
  重问 pending HITL（状态头记 `pending: HITL1/HITL2`；只重发一次，不把沉默当拍板）→ 从
  plan/topics/findings 重建任务板 → 继续；不重做已完成；
- **状态推导表（harness 提供，不是 bundle 文件）**：

  | phase | 先读 | 下一步 |
  |---|---|---|
  | briefing | question/topics | HITL1 定稿 |
  | research | question/topics/plan/journal | 派工/续节点 |
  | synthesis | evidence/findings | 写 findings/final |
  | review | final/findings | critic 审查 |
  | delivery | final/review/§Decisions | HITL2 → present |
  | accepted | final/final/acceptance | 无（可 rerun） |
  | parked | 状态头原因/复活条件 | 移回或另起 |

- **不靠会话记忆**：session_search 只能作旁证，不能当研究事实；HITL 历史从 question.md
  §Decisions 与状态头读，不从聊天记录猜；
- **路径**：所有路径相对 cwd，写作 `drt_<slug>/...`；不重复拼工作区前缀；
- **不承诺执行现场接上**：goal/任务板/队友/在飞 HITL 丢了就重问/重建；`next` 必须能从状态头或
  推导表得出；
- **验收**：盲续跑——新会话、只给 bundle、不给聊天记忆，能说出五问且下一步可执行。

### 9. 变更程序（I9）

- 新增 run 级文件/目录必须回答六问：研究状态还是 harness？恢复必需还是可选？正本还是派生？
  owner 是谁？删除后是否断链？属于哪个契约纪元？
- 契约变更 = 新 epoch；旧 bundle 按旧 epoch 解释，不追溯改写、不新增契约日期表；
- 任何"为单个事故加规则"必须先映射到本宪章的一条不变量；映射不上的一律按 bug 修，不进宪章；
- **批准/见证是外部类**：bundle 只存回执 + 指针；不得用单行文本自证；门禁必须校验事件链；
- **审计是派生类**：语料缺席 → UNATTESTED；`file://` 本地源不是可移植证据；
- 新增外部类字段必须写明：谁产生、怎么校验、丢了怎么办；
- **契约戳与回执**：创建写 `contract`；交付写 `delivered.json`（门结果/audit 哈希/present 事件）；
  门禁读戳不读 mtime；改名 = 新身份需重盖章；旧 bundle 迁移补戳；
- **可移植性**：要么生成 `manifest.json`，要么明文"bundle 只在配套 harness 下可读"；
  不得两者都不说；
- 门禁/UI 读内容，不读位置与 mtime；位置只用于发现。

### 10. 落地记录（P0–P7；P8 验收见锚点卡）

- **R1 文档与观察面收口**：D17、[design/40](../../docs/design/40-research-cockpit.md)、
  [design/50](../../docs/design/50-agent-loop-and-state.md)、[研究手册](../../research-workspace/AGENTS.md)、
  [guides/61](../../docs/guides/61-run-playbook.md) 的「位置=状态」统一改为「位置=操作桶，状态=内容」；
  驾驶舱与 `run-dashboard` 都从内容判态（现状：dashboard 只扫根+archive，不认 `_abandoned`）。
- **R2 状态头 + 契约戳**：模板与新建 run 落 `run.md`（或 question frontmatter）；门禁读 epoch；
  **删除 mtime 断代**；复制/移动不改语义；旧 bundle 无状态头 → 走 frozen 旧规则，不追溯判红。
- **R3 交付回执 + readiness 单一当前判定**：`run-accept` 写 `acceptance.md`（+ 新契约的
  `delivered.json`/`manifest.json`）；门②/③ 见证绑定本 run（写过 `drt_<slug>/` 的 lead 顶层会话）
  + 契约纪元 + 事件链顺序；`review.md` 要求
  单一终局判定（修 `terminalVerdictLine` 对文末附录/历史轮的误判）；状态头镜像；门②/门A 交叉核验；
  门禁/审计默认只读，`--write` 或 `run-accept` 才落 `node-gate.md`/`audit.md`（避免观察污染 bundle）；
  门②/门③ **精确 slug + 事件链**（前缀匹配、单行文本判 PASS = 红）；空语料/丢失 → **UNATTESTED**；
  `file://` 源判 UNATTESTED/非证据，不判伪造。
- **R4 分片/并发**：leads 分片登记、journal 方向与块级完整、drafts 归属；一写作用域一写者。
- **R5 共享可变库**：method-library/question-patterns 分类、append-only、run 快照摘要。
- **R6 历史偏差（grandfather）**：`drt_eu-us-cn-ai-stack` 断链、geometry/swebench 红门归档、
  semver 门文物矛盾、archive 终局 FAIL、computer-use 跨 bundle 引用、api-pricing 无 review /
  chat-context 无 gate——**不修、不建卡、不追改**，只作新契约的反例证据；新 run 由 R2/R3/R8
  的门禁覆盖，旧场按 epoch 豁免。
- **R7 见证链**：门②/③ 改为 ask/answer 事件 + lead 会话 + final 哈希；present 指不可变快照；
  无日志 UNATTESTED；前缀 slug/单行文本判 PASS = 红；`dev/hitl-answer.mjs` 的 provenance 修正
  （用户本人 vs 代理模拟不得混记）。
- **R8 溯源与删除**：provenance 类型（web/local-file/command）与离线可复算（或明确 log slice）；
  删除边界（bundle/日志/共享库）；指令扫描；顶层白名单；manifest/delivered.json。

### 11. 目录布局（C-lite / 单位 A）

新 run 用这棵树；旧 bundle 不迁移，按 epoch/frozen 规则解释：

```
drt_<slug>/
├── run.md                     # 状态头：contract / phase / next / delivered / parked
├── question.md                # 方向契约 + §Decisions
├── topics.md                  # 拆解
├── plan.md                    # 执行图（可选加速器；在场即当前）
├── plan/v<N>.md               # 旧图快照（可选）
├── leads.md                   # 侦察索引（条件件；分片时是登记表）
├── leads/<axis>.md            # 并行侦察分片（可选；必须在 leads.md 登记）
├── evidence/<id>.md           # 证据卡（一条一档）
├── provenance/<id>.json       # 来源证明：类型/URL/路径 + sha256 + 时间 + 通道 + 切片
├── findings.md                # 结论账本
├── review.md                  # 对抗核查（条件件；单一当前终局判定）
├── final.md                   # 当前版报告（[来源:] 相对 run 根）
├── final/v<N>.md              # 版本账
├── journal.md                 # 日志（最新在上；块级完整）
├── drafts/                    # 草稿（可选、非 canonical）
├── audit.md                   # 证据审计快照（ops）
├── node-gate.md               # 门禁快照（ops）
├── acceptance.md              # 操作验收回执（ops）
├── delivered.json             # 交付聚合（ops）：门结果/audit 哈希/present 指针/final 哈希
└── manifest.json              # 目录说明书（ops）：文件角色/读序/契约版本/哈希
```

规则：

- 目录按**产物类型 + 生命周期**，不按步骤；步骤在 `plan.md`/`journal.md` 里，不进文件系统；
- `run.md` 是状态唯一家；`manifest.json` 是生成物、不是指令、不承担权威；`delivered.json` 是回执聚合；
- `provenance/<id>.json` 与 `evidence/<id>.md` 同名，保证一条证据可离线复核；
- `final/v<N>.md` 是**交付时从当前版忠实复制**的不可变副本（不是活索引；跨版本事实住
  §Decisions，门④ 对新 run 不再要求 v1 登记 vN）；
- `leads/` 分片必须在 `leads.md` 登记；未登记顶层文件 = RED（机械面 = hygieneOf 顶层白名单）；
- `audit.md` / `node-gate.md` / `acceptance.md` 是 ops 快照/回执，默认只读，`--write` 才落盘；
- 旧 bundle 无 `run.md`/`provenance`/`manifest`/`delivered`：走 §8 状态推导表与 epoch 豁免，不补文件、
  不追溯改写；显式重开时可加 `run.md` 记录当前态，不改历史。

### 11.1 逐件职责

| 路径 | 类型 | owner | 何时写 | 关键约束 |
|---|---|---|---|---|
| `run.md` | 状态（canonical） | lead（ops 可写回执） | 建 run / 阶段转换 / 交付 / 停放 | 3–5 行 + 机器可读键；`contract` / `phase` / `next` / `delivered` / `parked`；不自证批准 |
| `question.md` | 研究状态 | lead | HITL1 / 方向修订 / rerun | §Decisions append-only 最新在上；不写进度 |
| `topics.md` | 研究状态 | lead | HITL1 / topic 变更 | must_answer 2–5；scope_role |
| `plan.md` | 过程加速器（可选） | lead | HITL1 后 / 重写 | 在场即当前；重写前 `plan/v<N>.md`；不是交付门；恢复用的「未完成节点 + owner + next」小节按 Q3 决定 |
| `plan/v<N>.md` | 快照（可选） | lead | 重写前 | 只读；编号 < 当前版本 |
| `leads.md` | 侦察（条件件） | scout | wave0 | 方向 + 状态 + 分级；分片时是登记表 |
| `leads/<axis>.md` | 分片（可选） | scout | 并行侦察 | 必须在 `leads.md` 登记；未登记 = 未登记产物 |
| `evidence/<id>.md` | 证据 | analyst | 挖掘 | 一卡一源；frontmatter 七字段；`[来源:]` 目标 |
| `provenance/<id>.json` | 来源证明（C-lite） | analyst / ops | 取证时 | 与证据卡同名；类型/URL/路径 + sha256 + 时间 + 通道 + 切片 |
| `findings.md` | 综合 | lead | wave2 | F# + 支撑 + gap 四态 |
| `review.md` | 审查（条件件） | critic | 审查 | 单一当前终局块；历史轮保留但不算当前；lead 升级必须引用 critic 授权 |
| `final.md` | 当前报告 | lead | 综合 / 修订 | `[来源:]` 相对 run 根；不放 `final/` |
| `final/v<N>.md` | 版本账 | lead | 交付 / rerun | 交付时忠实副本；polish 不落新版本；present 指它 |
| `journal.md` | 日志 | 所有角色 | 持续 | 最新在上（文件头声明方向）；块级完整；不写恢复必需状态 |
| `drafts/` | 草稿（可选） | 各角色 | 按需 | 非 canonical；不得承载恢复必需状态 |
| `audit.md` | 派生快照（ops） | ops | 验收前 / `--write` | 只读观察产物；默认不写；记录语料规模与语料根（可复算） |
| `node-gate.md` | 派生快照（ops） | ops | 门禁 / `--write` | 只读观察产物；默认不写 |
| `acceptance.md` | 回执（ops） | ops | 验收绿 | 三件通过才写；缺席 = 未验收 |
| `delivered.json` | 交付聚合（C-lite） | ops | 交付 / 验收 | 门结果 / audit 哈希 / present 指针 / final 哈希 |
| `manifest.json` | 目录说明书（C-lite） | ops | 交付 / 交接 | 文件角色 / 读序 / 契约版本 / 哈希；**不是指令** |

### 11.2 Agent 读序（新 run / 有 `run.md`）

1. `run.md`（没有就用 §8 状态推导表从内容推）；
2. `question.md`（含 §Decisions）；
3. `topics.md`；
4. `plan.md`（若在场）；
5. `journal.md` 顶部 3–5 条（方向按文件头声明；无声明默认最新在上，旧场按日期判前后）；
6. `findings.md` / `final.md`；
7. `review.md`（若在审/已交付；只认终局块）；
8. `evidence/<id>.md` + `provenance/<id>.json`（按需）；
9. `delivered.json` / `manifest.json`（若在场）。

### 11.3 新 run 写入序

1. mkdir → `run.md`（contract / phase=briefing / next=HITL1）+ `question.md` + `topics.md`；
2. HITL1 后：`plan.md`、`leads.md`；
3. 挖掘：`evidence/<id>.md` + `provenance/<id>.json`；草稿进 `drafts/`；
4. 综合：`findings.md`、`final.md`、`final/v1.md`；
5. 审查：`review.md`；
6. 交付：`run.md` 写 `delivered` + 回执；ops 跑 `run-accept` → `delivered.json` / `manifest.json` /
   `audit.md` / `node-gate.md` / `acceptance.md`；
7. rerun：`question.md` 加 `> rerun:`；`plan/v<N>.md`；`final/v<N+1>.md`；`run.md` 版本/相位更新。

### 11.4 不放进来的东西

- `AGENTS.md` / `CLAUDE.md` / local 变体（含 symlink 目标）——机械禁止，RED；
- 按步骤的目录（`steps/W2.1/…`）——步骤会变，产物稳定；
- 可执行脚本、symlink、绝对路径、`file://` 源作证据（`file://` 只作 local-file 类型，不按网页验）；
- 完整 session log / goal / 任务板 / 队友状态——外部类；
- 全局注册表 / 跨 run 索引 / 手写 README——独立与可删会被破坏；
- 当前 `final.md` 的副本进 `final/`——版本账只放 `vN`。

**待定的实现选择**（leads 分片形态、provenance JSON vs frontmatter、journal 分片、receipts 分组、
manifest 时机）= 锚点卡 [§7.2](../../_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)；
这些由实现方定，不占用户裁定。


## 边界与不承诺

- **自包含 = 数据，不是程序。** bundle 单独拿走能回答"研究到哪、下一步是什么"，但"怎么续"仍由
  harness（手册/技能/固定程序）提供；换 harness 需同时带程序。
- **状态头是声明，不是真理。** 它与文件事实冲突时以事实为准；门禁能查一致性，不能查"下一步是否
  正确"——后者靠盲续跑。
- **不承诺删除会话日志/遥测。** 删除 bundle 是研究状态的终态；日志保留策略在宪章外。
- **不追溯改写旧 bundle。** 旧 epoch 按旧规则解释；宪章只约束新 run 与显式重开的 run。
- **不承诺 bundle 自证批准/交付。** 回执 + 指针是 bundle 能给的全部；批准是外部事件，审计是
  外部语料上的派生检查。
- **不承诺审计脱离语料复算。** `audit.md` 是可携带的快照，不是可移植的证明；语料缺席即 UNATTESTED。
- **不承诺擦除外部证据。** 删除 bundle 只删研究状态；session log / attestation / 临时备份的保留
  策略在宪章外。
- **不承诺执行现场接上。** goal/任务板/队友/在飞 HITL 丢了就重问/重建；只承诺研究状态的语义续跑。
- **不承诺"删目录"等于擦除。** 日志、attestation、/tmp 备份、共享库派生条目可能保留；需显式 purge。
- **不承诺脱离 harness 可读。** 要么带 manifest，要么明文依赖配套 harness。
- **不承诺零成本。** 状态头/契约戳/回执是每次 run 的少量写入；换掉的是位置猜测、mtime 断代、
  日志丢失后的无法判定。

## 输掉的方案

- **每步一个子目录**：轴错（产物身份 × topic × owner，不是 step）；plan 会重写（eu-us 在飞
  v1→v6、+ W3.2–W3.6 五个节点）；跨节点读靠扁平 `evidence/`（3,610 次读 vs plan 35 次）；
  41 文件/115 处 `drt_` 字面量，门禁在漂移时静默跳过；披露收益≈0（嵌套 AGENTS.md 晚一拍）。
- **每 run 一个 AGENTS.md/README**：指令进数据区=第二条指令通道；静态图与手册重复；动态状态
  必腐；2026-09-24 化石 `AGENTS.md` 事故已证"旧指令赢"；D17 已判 per-bundle `BUNDLE_MAP` 冗余。
- **保留位置=状态**：5 例位置与内容矛盾；archive 可 rerun 且含红门；`_abandoned` 影子登记已腐；
  根里滞留已交付场。位置无法表达"已交付待验收"这一格。
- **mtime + 契约日期表**：复制/搬动改语义；每加一门加一个日期；契约日挡不住追溯改判。
- **只留 bundle 自证交付**：自己给自己发毕业证；present/日志是反自证的外部见证，必须保留。
- **全局注册表/索引**：违反独立与可删；删一个 run 要么清表、要么留悬空行。
- **plan 全图强制进契约**：6/53 在场、quick_factual 常无 plan、旧场迁移成本高；改为"可选加速器 +
  若在场必须一致"；是否再加一个机器可读的「剩余工作」小节 = 用户 Q3（锚点卡 §12）。
- **一次性重写 53 个 bundle**：run bundle 是交付记录，不改历史；按 epoch 分代，新 run 新规则。

## 实际跑过的验证

2026-10-23 落地时逐期记录（命令 + 结果；未跑项分列）：

- **P0 基线**：53 个旧 bundle 只读冻结表、旧场 grandfather 清单、4 样本 ground truth 预登记。
  `pnpm verify` 全绿、`pnpm test` 661→677 递增；旧 bundle 零改写。
- **P1 D28**：`docs/decisions.md` 新增 D28、D17 位置子句改操作桶；design/40、design/50、guides/61
  同步；`grep 位置=状态` = 0；`pnpm test` 661 pass（含 docs-consistency 的 archive 路径断言）。
- **P2 run.md/epoch**：模板 + 创建 skill + `contractEpochOf` + `schema-scan` 形状检查 + `workspace-contract`
  全表；`tests/run/node-gate-contracts.test` 3 例、`schema-scan.test` 11 例；`gates-smoke` 77 案例全绿。
- **P3 交付见证**：门② 读 `deliverables/presented`、门③ 读 `user-question-reply`、UNATTESTED/exit 2；
  `run-accept` 预检 `--no-write` 红不写、绿写 `delivered.json`/`acceptance.md`；witness 6 例；
  红/绿双跑实录。`pnpm test` 671→677。
- **P4 观察面/只读**：`run-dashboard` 三桶、`run-state` 跨桶 final、`watch-run` 提示；门禁默认只读、
  `--write` 落盘；默认只读与 `run-accept` 绿跑实录；`pnpm test` 673。
- **P5 provenance/manifest**：`provenance` 校验、local-file 哈希、离线 audit、`manifest.json`、
  新 run 卫生扫描；`provenance.test` 3 例、卫生例；`pnpm test` 677。
- **P7 手册/快照**：手册 15,274B/190 行（行预算 127→200 登记理由）、NODES 同步；snapshot B 层先红
  → 四角色真模型重录 → A/B/C 全绿；lead C5 仅一条活动行措辞变化，`--update-expected` 人审后接受；
  `preset-smoke` 预检绿。`pnpm verify` 全绿、`pnpm test` 677 pass。
- **P8 收口**：手册后 4 样本 post **4/4**（subagent；正式 lead 会话两次因通道 max-tokens 在 5 个
  工具调用后结束、无 assistant 文本 → 记 UNATTESTED，不冒充 lead PASS）；`client-load-smoke` ALL PASS；
  `snapshot-replay-smoke` 4 场景 ALL PASS；RFC 毕业、锚点卡归档。
- **2026-10-23 复核轮（D28 落地缺口收口）**：门③ 曾接受**别的 run 的** HITL2 答复（真实语料复现：
  全新 bundle 借 2026-10 旧答复 PASS）；`delivered.json` 无消费者；run-accept 回执写绝对语料根
  与 hygiene 门互斥；手册 `final/` 行与 `final/vN` 交付语义互斥。修复 + 反证测试：
  `tests/run/node-gate-witness.test.mjs` 13 例（跨 run/未绑定/epoch/顺序）、
  `tests/run/run-receipt.test.mjs` 7 例（回执无绝对路径/哈希/最新 present）、
  `tests/run/schema-scan.test.mjs` 18 例（绝对路径族/指令文件/脚本/symlink/顶层白名单/分片登记/
  delivery 相位）；`tests/run/node-gate.test.mjs` 增门④ D28 例。`pnpm verify` 全绿、`pnpm test`
  697 pass、`gates-smoke` 77 例全绿。
- **未跑**：L2 安装验收（本轮不是发布轮）。正式 lead 盲测的仪器缺口保留在锚点卡 §16。


## 未决（实施后仍需收口；用户裁定项见锚点卡 §12）

> 1/2/10 已定；3/4/6/7/9 属实现方定（默认本地单用户信任模型，记录在 RFC/Note，不上呈）；
> 5/8 属用户/运维裁定，见锚点卡 [§12](../../_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)。

1. **单位（已定 A）**：一任务一 bundle；rerun 是同一任务内的版本；独立是 bundle 之间。
   2026-10-23 用户拍板。
2. **状态头载体（已定 `run.md`）**：单一职责；`question.md` frontmatter 作为备选不再采用。
3. **契约纪元格式**：日期（`contract: 2026-10-23`）还是 `pack@x + date`；后者更精确，前者更便宜。
   现状 = 日期（`contractEpochOf` 只解析 `YYYY-MM-DD`）。
4. **readiness 终局形态**：单一终局行/块；旧 review 的 5 种形态如何 grandfather。
5. **archive 是否仍需要**：若位置只是桶，归档可以退化为可选操作；保留与否是运维选择，不是状态。
6. **UNATTESTED 的门禁语义**：三态如何呈现（CLI/驾驶舱/交付门），哪些场景必须人工裁决。
7. **attestation chain 深度**：最小绑定 = slug + session id + turn + tool call id + 时间 +
   final 哈希；是否需要签名/哈希链，还是本地单用户信任模型足够。
8. **删除边界（C-lite 已定方向）**：删除 = 研究状态；日志/共享库派生条目默认保留；彻底 purge 的
   范围与保留期/访问边界，实施时定。
9. **manifest 生成时机**：交付时 vs 每次阶段转换；C-lite 默认交付时生成，in-flight 靠 `run.md`。
10. **provenance 范围（C-lite 已定）**：`provenance/<id>.json` + 切片 + sha256；不存整页/整库，
    `file://` 作为 local-file 类型，不再按网页验。

## 历史证据

- [历史决定时间线与七类判断](../../_backlog/research/run-bundle-charter/2026-10-23-history-decisions.md)
- [53 个 bundle 的实物偏差与交付链断点](../../_backlog/research/run-bundle-charter/2026-10-23-practice-vs-contract.md)
- [32 个恢复/状态探针的行为证据](../../_backlog/research/run-bundle-charter/2026-10-23-resume-behavior.md)
- [红队：批准/present 可伪造、审计依赖语料、next 无字段](../../_backlog/research/run-bundle-charter/2026-10-23-red-team.md)
- 锚点卡：[run bundle 宪章卡](../../_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
