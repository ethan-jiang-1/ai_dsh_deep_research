# research-workspace — 研究手册（角色会话的 cwd）

这里是 Deep Research 团队的共享工作区。所有研究角色会话在此目录工作；本手册通过
`agent-instructions` 注入每个角色会话。角色人格见各自 preset；这里只放**跨角色共享的
工作纪律与文件契约**。

## 分层铁律（D17：harness / run bundle）

harness 只读：presets、skills、本手册、templates/ 对任何一次研究都是同一份，run 期间零
写入，不持任何 per-run 状态。**一切变量只写进本 run 的 bundle（本目录下 `drt_<slug>/`）**
——不写回手册/模板，不把 run 状态记到任何框架文档。`研究报告 = harness(bundle)`。
**位置 = 操作桶（D28）**：根 / `archive/` / `_abandoned/` 只用于发现，不证明在飞/已交付；
状态从内容读（`run.md` + 文件事实 + 事件）。

## 目录约定

```
drt_<slug>/            一次调研 = 一个 run bundle（drt = Deep Research Topic，目录名即方向；
                       slug 由主编立项时定，kebab-case；立项 sibling 预检：同名/前缀相关
                       bundle 已在（**含 archive/ 归档**）→ 问用户）
  run.md               状态头（owner: lead）：schema / created / phase / next / delivered / parked；
                       3–6 行 + 机器可读键；状态是声明，事实是正本；旧 bundle 无本文件按 epoch 解释
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
  evidence/            证据文件，一条一档（owner: analyst；含工作底稿/失败登记，非承重）
  findings.md          发现账本：结论 + 支撑 + gap 状态（owner: lead）
  review.md            对抗核查报告（owner: critic）：当前终局块（文件头声明最新在上；
                       `readiness: PASS|FAIL` + CRITICAL/MAJOR 清单；历史轮不夺权）
  drafts/              过程稿（owner: 各角色，按需）
  final/               **交付副本**：交付时把 run 根 final.md 忠实复制为 v1.md；扩张 rerun 落 v2.md——
                       vN = 交付物全文；索引/回溯放 findings 或 vN 首节。读者版：review PASS 后写
                       final/readable.md，定稿后复制为 final/readable-vN.md（同版）
  final.md             当前工作稿（run 根）；交付先落 `final/vN` 副本再 present；[来源:] 相对 run 根解析；
                       **不放 final/ 里**（位置漂移会让审计静默跳过——正本钉死在 run 根）
  provenance/<id>.json 来源证明（C-lite；owner: analyst/ops）：kind web|local-file|command +
                       URL/路径 + sha256 + 时间 + 通道 + 切片；与 evidence/<id>.md 同名
  delivered.json       交付回执（ops）：门结果/audit 哈希/present 指针/final+reader 哈希
  manifest.json        目录说明书（ops）：文件角色/读序/契约版本/哈希；不是指令
  audit.md             证据审计快照（ops/派生；不是研究内容）
  node-gate.md         门禁快照（ops/派生）
  acceptance.md        验收回执（ops；旧场交付只有它，不是 delivered.json）
  plan/                旧图快照 plan/v<N>.md（owner: lead；重写前落；只读）
  journal.md           运行纪要（追加式；文件头声明方向，默认最新在上；所有角色可写；跨 rerun 累积血统）
archive/drt_<slug>/    操作桶（交付后操作侧移入；位置不证明交付；仍可被审计投影）
_abandoned/drt_<slug>/ 停放桶（未投入但保留；原因/复活条件写 run.md `parked`；不是状态证明）
templates/run/         新 run bundle 的起点模板（只读，不直接写）
drafts/（工作区根）    开发侧跨 run 草稿（仅开发仓在场，角色不写不读——run 内过程稿见上）
NODES.md               节点 I/O 契约全表（八节点 I/O + 下游可开工判据 + 回边版本语义）；机械把守 =
                       schema-scan（在场级）+ node-gate（判据级门①②③④+L+R+A+C，图例 = NODES.md 头部）
question-patterns.md   判型模式库（HITL1 第一对照面；命中走条目、未命中兜底 + journal 标记行；增长协议 = 库尾节）
method-library.md      本工作区方法库（用户所有；工作区根；lead 维护；四字段 = 找来源/怎么核实/报告怎么写/不承诺）。
                       立项先读：题面点名的偏好名 → 按该条目执行并在 §Decisions 记"采用库条目 X"；未点名
                       但库有条目 → HITL1 方法行给推荐参考。**三态**：在场→用；缺席→说"还没存过偏好、本次
                       用内置打法"（别静默）；读不回→如实说"文件在但读不到"及原因，**绝不降级成"没有
                       偏好"**。点名条目不在库里 → 明说，不声称"已按该偏好执行"。管理动词仅显式触发
```

模板八件 ↔ run（状态头）/question/topics/plan/leads/evidence-entry（= evidence/ 单条模板）/findings/final
（= 当前版报告模板；final/ 的 vN 交付副本**无模板**，交付时忠实复制）；
review.md、drafts/、journal.md 无模板——review 格式住 critic 的 adversarial-review skill，
drafts/journal 运行时自建。plan.md 是过程件：不替代任何交付门，交付只认 final/review/decisions/
present；Team 板是执行镜像，恢复时按 plan 的 W 节点（N/旧 flat W 只读）重建任务。

## 状态头、读序与恢复（D28）

新 run 在根落 `run.md`（`schema` / `created` / `phase` / `next` / `delivered` / `parked`；键义 = `templates/run/run.md`）。**声明不是事实**；冲突以文件为准；`run.md` 不自证批准/交付。`schema` 是整数契约版本（门禁按整数分档，与日期无关）；旧 bundle 只有 `contract:` 日期 = 旧形态，读兼容、不再新写。

**五问**：阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态。

**按意图读**（读完即停；五问答齐即停）：

| 意图 | 先读 | 停在哪 | 不读 |
|---|---|---|---|
| 继续 | `run.md`（无 → 旧场行；旧场行替代本行，不叠加）→ `question.md §Decisions` → `journal.md` 顶部 3–5 条 → `plan.md §剩余工作` | 五问答齐 | 全部 evidence、历史 review |
| 交付 | `run.md`（旧场跳过）→ `final/` 最高 `vN` + `final.md §0` → `question.md §Decisions` → `review.md` 当前终局块 → `delivered.json`（新）/`acceptance.md`（旧） | 版本副本 + 拍板 + readiness + 回执齐 | 研究过程、evidence |
| 查证 | `final.md` 的 claim 句（多卡逐卡）→ `findings.md` 的 F# → 该 `evidence/<id>.md` + `provenance/<id>.json`（若在场；旧场常缺） | 来源与口径（数字/等级/as-of/单源；丢限定语 = 不符） | question/plan/journal、其他 evidence |
| 旧场 | 旧表（下方）→ `question.md §Decisions` → `journal.md` 顶部 → `final.md` + 最高 `final/vN` → `review.md` 当前终局块 → `acceptance.md`（旧） | 五问答齐 + 回执 | 不补 `run.md`、不读 evidence（查证行除外） |

**交付口径**：`final/` 取最高 `vN`；`final/vN` = 不可变交付副本，`final.md` = 当前稿，不是副本；`final/v1-ledger.md` 不是副本。新契约看 `delivered.json`；旧场只有 `acceptance.md`（二选一，不是都要）。旧场 `final/v1.md` 兼作版本索引：修复回填可在文末加索引行、正文不改；新契约 `final/vN` 不可变。`acceptance.md` 只记硬门（CRITICAL 0）；MAJOR 数看 `audit.md`，不因它重判交付。旧场 receipt 无哈希；交付后改 review/plan 要重跑 `run-accept`；accepted 后只归档。旧场 `present` 可能指 `final.md`/v1，且不是文件（session log 事件）；有 `acceptance.md` + HITL2 行 + 最高 `final/vN` = accepted，present 不指 v2 时注明“操作侧验收”，不伪造模型 present。

**终局块**：`review.md` 只认当前终局块（文件头声明方向；当前实现最新在上）；`readiness: PASS|FAIL` 是判据，末尾/历史轮的 PASS 不算。

**旧 run 推导表**（无 `run.md`；不补）：

| 事实 | phase | 下一步 |
|---|---|---|
| 无 `question.md` | 立项前 | 问用户是否立项 |
| `review.md` 无 PASS 或 `final/` 不在场 | research/review | 继续研究 |
| review 终局 PASS、无 HITL2 行 | delivery | 呈 HITL2 |
| HITL2 行 + 最高 `final/vN` +（present 指同一 `vN` 或 `acceptance.md` 在场） | accepted | 可 `run-accept` |
| 最高 `final/vN` 无对应拍板，或 present 指旧 `vN` 且无 acceptance | delivery | 先补拍板/present |
| `_abandoned/` + 停放原因 | parked | 按复活条件 |

**冲突 / 过期**：`plan.md` 的剩余工作、`review.md` 历史轮、journal 旧条都可能过期；以**最新 journal + §Decisions + final 事实**为准，不按 stale plan 继续。`> rerun:` 标记不是必需；rerun 以 §Decisions 的 `vN` 行 + `final/vN` 为准。**查证优先于旧场恢复**：先 claim → findings/evidence，不先读 question/plan/journal。

**恢复**：读最小集 → 答五问 → 先定范围（`run.md.next`/`phase`；不明只问一个带范围的澄清问）→ 重问 pending HITL（一次）→ 按 `plan.md §剩余工作` 重建 Team（若已过期以 journal/§Decisions 为准）→ 继续，不重做已完成。

## 交付与审查终局（D28）

- `review.md` 末尾固定 `## readiness（终局）: PASS|FAIL`；**只有 critic 能写**。历史轮/附录不夺权；
  lead 升级须引用 critic 授权并落**新的**终局块；旧场按 epoch 豁免。
- 交付 = `final/vN`（不可变副本）+ `final/readable-vN`（新 run 非 quick_factual；同版读者版）+
  `presented`（lead 顶层；`files[].path` 含两者，reader 第一）+ `delivered.json`/`acceptance.md`
  回执；`final.md` 是工作稿，present 指它不算。
- 见证只认**本 run 的 lead 顶层会话**（写过 `drt_<slug>/`）：跨 run/子 agent 不作证，present 须晚于 HITL2 答复。
- `audit.md` / `node-gate.md` / `acceptance.md` 是 ops 派生/回执：默认只读，`--write`/`run-accept`
  才落；观察不写 bundle。
- **回执三态**：有审计工具 → `audit.md` 绿 + `delivered.json`；无工具（只有安装包）→ `run.md` 的
  `delivered:` 与 journal 显式写 `no machine audit (install-only)`，**绝不声称 `CRITICAL=0`**，`phase`
  停在 `delivery`；`accepted` 只在验收工具跑绿后由操作侧写。

## 来源证明（C-lite）

- 每条证据卡可在 `provenance/<id>.json` 带来源证明：kind（web|local-file|command）+ url/path +
  sha256 + retrieved_at + channel + slice。
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
| final.md（当前版）+ final/（版本记账 + 读者版） | lead | 只读 |

要改别人 owner 的文件：通过团队通道向 owner 提请求，不直接动手。

## 证据文件契约（evidence/ 下的硬格式）

frontmatter 必须有（七字段）：`source_url`（真实抓取过的 URL）/ `retrieved_at` / `quality`
（A–D）/ `found_by` / `supports` / `source_tier`（信源分级，见下表）/ `publisher`（注册域）。
正文"原文摘录"与"解读"两节分开。以上即最小契约，**所有角色按此判**；analyst 会话内另有
全文模板（`evidence-extraction` skill；按角色硬隔离，其他角色加载不到，判据以本手册为准）。**没有 frontmatter 的文件不算证据**（critic 按此判）。
**口径最小契约**（与 frontmatter 同级）：数字/规格类摘录须带测量条件口径（版本/配置/
时间/原文限定语至少两项；口径不明写"口径不明"）——所有角色按此判。
**日期最小契约**（与 frontmatter 同级）：任何"当前 / 截至 / 查询时间"类日期（含 `retrieved_at`、
review 审查时间、口径截至）以 **time-context 读数**为准（每步注入 ISO 时间 + 时区 + 耗时）；
无读数时按序取①web 响应与被抓页面日期②用户消息与本 run 已落笔日期；都缺或冲突 → 写
「日期不确定（依据：…）」，不静默编造。**计划日期不得写成已发生日期**。所有角色按此判。
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
- **成品**：lead 会话中 `present` 声明的 `final/vN`（不可变副本）+ `final/readable-vN`
  + 回执——唯一对外交付物；
  `final.md` 是交付前的工作稿，不是交付凭证；
- **非成品声明**：非 lead 角色的 present 声明一律视为过程稿展示。

## 交互纪律（两点交互）

整个 run 只有两个人机交互点，都由 lead 执行：**立项对齐（HITL1）**与**交付审阅（HITL2）**——都以 `ask_user_question` 的**结构化选项卡**呈现（一次多问 + options + 推荐项置首带(Recommended)）。

**HITL1 = 两段卡**：第一段固定三问（研究类型/深度篇幅/时间口径与语言），第二段**计划确认卡**——question/topics 定稿后、开工前呈计划要点瘦卡（按计划开跑(Recommended)/ 修订计划（意见附加不替换、一轮制不再二次呈卡）/ 放弃；**quick_factual 豁免**），拍板落 question.md §Decisions 第 1 条，形态细则 = lead 的 research-brief skill；**HITL2 选项** = 定稿（按现稿交付）(Recommended)/补研究（补哪块看报告末节；会出新版本）/改说法（只改措辞，版本不变）；题干给「太浅/方向不对/太长」；分诊 = lead 的 rerun-triage skill。

两点之间所有角色静默自主推进——不问"要不要继续"、不汇报进度、不等确认。
用户主动发消息时直接回答，但回答不改变既定研究方向与分派。

## 完成判据（verify the world）

- `final/vN` 的关键结论有真实存在且内容支撑的 `[来源: evidence/xx.md]`；`review.md` 的**终局块**为 PASS 后才进入 HITL2。
- 新 run 非 quick_factual：review PASS 后、HITL2 前写 `final/readable.md`；交付时 `final/readable-vN.md` 与 `final/vN` 同版在场（门C）。
- 交付回执：`final/vN` + `final/readable-vN` + `question.md` §Decisions 的 HITL2 拍板行 + Lead 的 `deliverables/presented`（含 `final/vN` 与 reader）+ 操作侧 `audit.md`（标题匹配、`CRITICAL=0`）+ `delivered.json`/`acceptance.md`；**无审计工具时按上节三态降级**（写 `no machine audit (install-only)`，不假装绿）。
- "研究完成"的唯一依据是以上文件事实链，不是任何人的口头宣告。
