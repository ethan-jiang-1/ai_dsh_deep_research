# research-workspace — 研究手册（角色会话的 cwd）

这里是 Deep Research 团队的共享工作区。所有研究角色会话在此目录工作；本手册通过
`agent-instructions` 注入每个角色会话。角色人格见各自 preset；这里只放**跨角色共享的
工作纪律与文件契约**。

## 分层铁律（D17：harness / run bundle）

harness 只读：presets、skills、本手册、templates/ 对任何一次研究都是同一份，run 期间零
写入，不持任何 per-run 状态。**一切变量只写进本 run 的 bundle（本目录下 `drt_<slug>/`）**
——不写回手册/模板，不把 run 状态记到任何框架文档。`研究报告 = harness(bundle)`。
**位置 = 操作桶（D28）**：根 / `archive/` / `_abandoned/` 只用于发现与展示，不证明在飞/已交付；
状态从内容读（`run.md` + 文件事实 + 会话事件）。

## 目录约定

```
drt_<slug>/            一次调研 = 一个 run bundle（drt = Deep Research Topic，目录名即方向；
                       slug 由主编立项时定，kebab-case；立项 sibling 预检：同名/前缀相关
                       bundle 已在（**含 archive/ 归档**）→ 问用户，不擅自另起）
  run.md               状态头（owner: lead；ops 可写交付/停放回执）：contract / phase / next /
                       delivered / parked；3–5 行 + 机器可读键；状态是声明，事实是正本；
                       旧 bundle 无本文件按 epoch 解释（不补文件）
  question.md          方向契约：问题定稿 + Purpose/RQ/Scope/Constraints + HITL1 对齐快照 +
                       Decisions（append-only，最新在上）+ 同 bundle rerun 的 `> rerun: v2 ·
                       evidence-expansion · 日期` 行——跨 rerun 持久，bundle 身份核心（lead）
  topics.md            topic 图：must_answer（问题列表 2–5 问）+ scope_role（owner: lead）
  plan.md              执行图（owner: lead；可选加速器）：节点表 id/parent/lifecycle/kind/question/
                       owner_role/deps/output/acceptance/budget/depth/task_id + 图版本 vN/重写记录；
                       **在场时必须有 `## 剩余工作` 小节**（未完成节点 + owner + next；全图可选）；
                       重写前落 `plan/v<旧版本>.md` 快照；不是交付凭证；Team 任务板是当前会话的
                       执行镜像；schema-scan/node-gate 不检查全图。**W<wave>.<index>**：W2 是 Wave 2 分组（不是任务），
                       W2.1/W2.2 是层内并行节点，W2.1.1 是内部拆解；Wave 由 deps 计算，ID
                       前缀必须一致；跨 Wave 重编号 + 旧号别名；lifecycle 墓碑留在表里但不画图；
                       stage 由节点 kind 派生；Team 平铺、不建 nested Team
  leads.md             候选方向清单（owner: scout）
  evidence/            证据文件，一条一档（owner: analyst）
  findings.md          发现账本：结论 + 支撑 + gap 状态（owner: lead）
  review.md            对抗核查报告（owner: critic）：末尾固定 `## readiness（终局）: PASS|FAIL`；
                       历史轮/附录保留但不算当前（旧场按 epoch 豁免）
  drafts/              过程稿（owner: 各角色，按需）
  final/               版本记账：v1.md = 索引与关键事实回溯；证据扩张 rerun 才落 v2.md（lead）——
                       **只放版本记账，不放当前版全文**
  final.md             当前工作稿（run 根）；交付时以 `final/vN` 为不可变版本账；[来源:] 相对 run 根解析；
                       **不放 final/ 里**（位置漂移会让审计静默跳过——正本钉死在 run 根）
  provenance/<id>.json 来源证明（C-lite；owner: analyst/ops）：kind web|local-file|command +
                       URL/路径 + sha256 + 时间 + 通道 + 切片；与 evidence/<id>.md 同名
  delivered.json       交付回执（ops）：门结果/audit 哈希/present 指针/final 哈希
  manifest.json        目录说明书（ops）：文件角色/读序/契约版本/哈希；不是指令
  journal.md           运行纪要（追加式；文件头声明方向，默认最新在上；所有角色可写；跨 rerun 累积血统）
archive/drt_<slug>/    操作桶（交付后操作侧移入；位置不证明交付；仍可被审计投影）
_abandoned/drt_<slug>/ 停放桶（未投入但保留；原因/复活条件写 run.md `parked`；不是状态证明）
templates/run/         新 run bundle 的起点模板（只读，不直接写）
drafts/（工作区根）    开发侧跨 run 草稿（仅开发仓在场，角色不写不读——run 内过程稿见上）
NODES.md               节点 I/O 契约全表（八节点 I/O + 下游可开工判据 + 回边版本语义）；机械把守 =
                       schema-scan（在场级）+ node-gate（判据级门①②③④+L+R+A，图例 = NODES.md 头部）
question-patterns.md   判型模式库（HITL1 第一对照面；命中走条目、未命中兜底 + journal 标记行；增长协议 = 库尾节）
method-library.md      用户研究偏好库（工作区根；lead 维护；四字段 = 找来源/怎么核实/报告怎么写/不承诺）。
                       立项先读：题面点名的偏好名 → 按该条目执行并在 §Decisions 记"采用库条目 X"；未点名
                       但库有条目 → HITL1 方法行给推荐参考。**三态**：在场→用；缺席→说"还没存过偏好、本次
                       用内置打法"（别静默）；读不回→如实说"文件在但读不到"及原因，**绝不降级成"没有
                       偏好"**。点名条目不在库里 → 明说，不声称"已按该偏好执行"。管理动词仅显式触发
```

模板八件 ↔ run（状态头）/question/topics/plan/leads/evidence-entry（= evidence/ 单条模板）/findings/final
（= run 根**当前版报告**模板；final/ 的 vN 记账体**无模板**，按 NODES.md 回边版本语义自构）；
review.md、drafts/、journal.md 无模板——review 格式住 critic 的 adversarial-review skill，
drafts/journal 运行时自建。plan.md 是过程件：不替代任何交付门，交付只认 final/review/decisions/
present；Team 板是执行镜像，恢复时按 plan 的 W 节点（N/旧 flat W 只读）重建任务。

## 状态头、读序与恢复（D28）

每个新 run 在根落 `run.md`（模板 `templates/run/run.md`），3–5 行 + 机器可读键：

| 键 | 值 |
|---|---|
| `contract` | 契约纪元（创建日 `YYYY-MM-DD`；旧 run 无本文件按 epoch 解释） |
| `phase` | `briefing` / `research` / `synthesis` / `review` / `delivery` / `accepted` / `parked` 之一 |
| `next` | 一个可执行动作（文件/owner/范围）；终态写 `none` |
| `delivered` | 交付回执指针 `vN @ 时间 · present callId`（非交付期 `none`） |
| `parked` | 停放原因 + 复活条件（非停放期 `none`） |

**状态是声明，事实是正本**：与文件事实冲突时以事实为准，门禁判红；`run.md` 不自证批准/交付。

**读序**（新 run；旧 run 无 `run.md` 时按状态推导表）：`run.md` → `question.md`（含 §Decisions）→
`topics.md` → `plan.md`（若在场）→ `journal.md` 顶部 3–5 条（方向按文件头声明；无声明默认最新在上，
旧场按日期判前后）→ `findings.md` / `final.md` → `review.md`（只认终局块）→
`evidence/<id>.md` + `provenance/<id>.json`（按需）→ `delivered.json` / `manifest.json`（若在场）。

**旧 run 状态推导表**（无 `run.md`；不要求补文件）：

| 事实 | phase | 下一步 |
|---|---|---|
| 无 `question.md` | 立项前 | 问用户是否立项 |
| `review.md` 无 PASS 或 `final/` 不在场 | research/review | 继续研究/审查 |
| review 终局 PASS、无 HITL2 行 | delivery | 呈 HITL2 |
| HITL2 行 + `final/vN` + present 指针 | accepted | 可 `run-accept` |
| `_abandoned/` + 停放原因 | parked | 按复活条件 |

**恢复程序**：读最小集 → 答五问（阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态）→ **先定范围**
（`run.md` 的 `next`/`phase`；范围不明只问一个带范围的澄清问，不重跑全流程）→ 重问 pending HITL
（只重发一次，不把沉默当拍板）→ 从 `plan.md` 的 `## 剩余工作` 重建 Team 任务板 → 继续，不重做已完成。

## 交付与审查终局（D28）

- `review.md` 末尾固定 `## readiness（终局）: PASS|FAIL`；**只有 critic 能写**。历史轮/附录保留但
  不夺权；lead 升级必须引用 critic 的授权行并落**新的**终局块；旧场按 epoch 豁免。
- 交付 = `final/vN`（不可变副本）+ `deliverables/presented`（lead 顶层；`files[].path` 精确
  `final/vN`）+ `delivered.json`/`acceptance.md` 回执。`final.md` 是工作稿，不冒充交付；新 run 的
  present 指 `final.md` 不算。
- `audit.md` / `node-gate.md` / `acceptance.md` 是 ops 派生/回执：默认只读，`--write`/`run-accept`
  才落；观察动作不写 bundle。

## 来源证明（C-lite）

- 每条证据卡可在 `provenance/<id>.json` 带来源证明：`kind` = `web|local-file|command`；
  `url`/`path`；`sha256`；`retrieved_at`；`channel`；`slice`。
- `file://` 只作 local-file（不再按网页验）；`path` 必须相对、`sha256` 必须匹配；新 run 的
  `file://` 无 provenance = MAJOR。
- 语料缺席时 audit 以 provenance 离线复算；无 provenance 才 UNATTESTED/MAJOR，不判“伪造”。

## 事实的 owner（一处事实一个家）

| 文件 | 唯一 owner | 其他人 |
|---|---|---|
| question.md / topics.md | lead | 只读 |
| plan.md（执行图） | lead | 只读；执行时看 Team 板/研究图谱页签 |
| leads.md | scout | 只读 |
| evidence/*.md | analyst（创建者） | 只读 |
| findings.md | lead | 只读 |
| review.md | critic | 只读 |
| final.md（当前版）+ final/（版本记账） | lead | 只读 |

要改别人 owner 的文件：通过团队通道向 owner 提请求，不直接动手。

## 证据文件契约（evidence/ 下的硬格式）

frontmatter 必须有（七字段）：`source_url`（真实抓取过的 URL）/ `retrieved_at` / `quality`
（A–D）/ `found_by` / `supports` / `source_tier`（信源分级，见下表）/ `publisher`（注册域）。
正文"原文摘录"与"解读"两节分开。以上即最小契约，**所有角色按此判**；analyst 会话内另有
全文模板（`evidence-extraction` skill——skills 按角色硬隔离，其他角色加载不到，判据以
本手册为准）。**没有 frontmatter 的文件不算证据**（critic 按此判）。
**口径最小契约**（与 frontmatter 同级）：数字/规格类摘录须带测量条件口径（版本/配置/
时间/原文限定语至少两项；口径不明写"口径不明"）——所有角色按此判。
**日期最小契约**（与 frontmatter 同级）：任何"当前 / 截至 / 查询时间"类日期（含 `retrieved_at`、
review 审查时间、口径截至）**不得凭时间感直写**（角色会话无命令执行能力）——校准信号按序取：
①web 工具响应与所抓页面自带日期；②用户消息与本 run 既有文件已落笔日期；都缺或冲突 → 写
「日期不确定（依据：…）」，不静默编造。所有角色按此判。
**摘录最小契约**（与 frontmatter 同级）：引文行**只放原文**——卡片自己的标注（标签/URL/
`（同上…）`/`旁证｜…`）不进 `>` 行，写在引文块外或解读节；**多段摘录逐段逐字**，段间省略标
`[…]`，不拼接不连续句；**表格按单元格摘录**，不整行/跨行合并；`source_url` 必须由 `web_fetch` 成功取回，搜索结果里出现过不算。所有角色按此判。

机械边界：evidence-audit 检查 `source_url` 是否成功抓取，并对原文摘录节中的 `>` 文本与 web-only 语料作覆盖率核验；它不判注释是否混入引文，也不验证段落或表格单元格的拆分结构。`retrieved_at` 只检查字段在场，不校准日期。以上内容与结构要求仍须由 critic 按契约审阅；机械命中不是完整合规证明。

**信源分级表（source_tier 唯一正本；scout 的质量分级与 quality 字段共用 A–D，tier 描述
信源身份、quality 描述内容质量，两者独立）**：

| tier | 判据 | 例 |
|---|---|---|
| `primary` | 一手：官方文档/论文/财报/标准文档/原始数据 | 官网 spec、arXiv 论文 |
| `secondary` | 权威二手：主流媒体/权威机构/知名智库 | 路透、IEEE Spectrum |
| `tertiary` | 行业博客/技术社区/厂商技术文章 | 个人技术博客、Stack Overflow |
| `weak` | 论坛/自媒体/内容农场/聚合转载站 | Reddit、营销号 |

**交叉验证纪律**：进 `final/` 的关键结论（支撑 must-answer 的）须 **≥2 个独立信源**——
独立性 = **不同注册域，且非同一通稿/转载链**（判定归 critic：同源两票不算两票）。单源
结论不硬禁（快速事实核查型 run 可能天然单源），但必须显式标注`单源——待破`并在 review.md
说明风险——**显性化而不是静默**。

## 交付物三态

- **过程稿**：drafts/ 与各 owner 文件——团队内部工作面，不是成品；
- **成品**：lead 会话中 `present` 声明的 `final/vN`（不可变副本）+ 回执——唯一对外交付物；
  `final.md` 是交付前的工作稿，不是交付凭证；
- **非成品声明**：非 lead 角色的 present 声明一律视为过程稿展示。

## 交互纪律（两点交互）

整个 run 只有两个人机交互点，都由 lead 执行：**立项对齐（HITL1）**与**交付审阅（HITL2）**——都以 `ask_user_question` 的**结构化选项卡**呈现（一次多问 + options + 推荐项置首带(Recommended)）。

**HITL1 = 两段卡**：第一段固定三问（研究类型/深度篇幅/时间口径与语言），第二段**计划确认卡**——question/topics 定稿后、开工前呈计划要点瘦卡（按计划开跑(Recommended)/ 修订计划（意见附加不替换、一轮制不再二次呈卡）/ 放弃；**quick_factual 豁免**），拍板落 question.md §Decisions 第 1 条，形态细则 = lead 的 research-brief skill；**HITL2 选项** = 定稿(Recommended)/补研究/修订表述。

两点之间所有角色静默自主推进——不问"要不要继续"、不汇报中间进度、不等确认。
用户主动发消息时直接回答，但回答不改变既定研究方向与分派。

## 完成判据（verify the world）

- `final/vN` 的关键结论有真实存在且内容支撑的 `[来源: evidence/xx.md]`；`review.md` 的**终局块**为 PASS 后才进入 HITL2。
- 交付回执：`final/vN` + `question.md` §Decisions 的 HITL2 拍板行 + Lead 的 `deliverables/presented`（指 `final/vN`）+ 操作侧 `audit.md`（标题匹配、`CRITICAL=0`）+ `delivered.json`/`acceptance.md`。
- "研究完成"的唯一依据是以上文件事实链，不是任何人的口头宣告。
