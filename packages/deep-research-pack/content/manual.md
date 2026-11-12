# 研究工作区 — 研究手册

这里是 Deep Research 团队的工作区（产品启动时选定/询问）。本手册由产品以 runtime context 注入
每个角色会话，**不落在工作区**；角色人格见各自 preset，这里只放**跨角色共享的工作纪律与文件
契约**。项目自己的 `AGENTS.md` 由 DSH 注入；冲突时**项目指令优先**。

## 分层铁律（D17：harness / run bundle）

harness 只读：presets、skills、本手册、模板对任何一次研究都是同一份，run 期间零
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
  plan.md              执行图（owner: lead；可选加速器，不是交付凭证）：节点列/图版本/`W<wave>.<index>`
                       编号纪律的正本 = 模板 `templates/run/plan.md` 与 lead 的 research-planning skill；
                       **在场时必须有 `## 剩余工作` 小节**；重写前落 `plan/v<旧版本>.md`；Team 板只是执行镜像；
                       schema-scan/node-gate 不检查全图
  leads.md             候选方向清单（owner: scout）
  evidence/            证据文件，一条一档（owner: analyst；含工作底稿/失败登记，非承重）
  findings.md          发现账本：结论 + 支撑 + gap 状态（owner: lead）
  review.md            对抗核查报告（owner: critic）：当前终局块（文件头声明最新在上；
                       `readiness: PASS|FAIL` + CRITICAL/MAJOR 清单；历史轮不夺权）
  review/claims.json   claim 表（lead）：text 必须是 final 原句；critical 标 must-answer 句
  review/verdicts-r<N>.json
                       裁决原文 + 批次（lead 写；child 只回文本；形状见同名模板）
  drafts/              过程稿（owner: 各角色，按需）
  final/               **交付副本**：交付时把 run 根 final.md 忠实复制为 v1.md；扩张 rerun 落 v2.md——
                       vN = 交付物全文；索引/回溯放 findings 或 vN 首节。读者版：review PASS 后写
                       final/readable.md，定稿后复制为 final/readable-vN.md（同版）
  final.md             当前工作稿（run 根）；交付先落 `final/vN` 副本再 present；[来源:] 相对 run 根解析；
                       **不放 final/ 里**（位置漂移会让审计静默跳过——正本钉死在 run 根）
  provenance/<id>.json 来源证明（C-lite；可选；owner: ops/Lead）：kind web|local-file|command +
                       URL/路径 + sha256 + 时间 + 通道 + 切片；与 evidence/<id>.md 同名；hash 由 ops/Lead 后补
  delivered.json       交付回执（ops）：门结果/audit 哈希/present 指针/final+reader 哈希
  manifest.json        目录说明书（ops）：文件角色/读序/契约版本/哈希；不是指令
  audit.md / node-gate.md / acceptance.md
                       操作侧快照与回执（ops/派生；不是研究内容；旧场交付只有 acceptance.md）
  plan/                旧图快照 plan/v<N>.md（owner: lead；重写前落；只读）
  journal.md           运行纪要（追加式；文件头声明方向，默认最新在上；所有角色可写；跨 rerun 累积血统）
archive/drt_<slug>/    操作桶（交付后操作侧移入；位置不证明交付；仍可被审计投影）
_abandoned/drt_<slug>/ 停放桶（未投入但保留；原因/复活条件写 run.md `parked`；不是状态证明）
{{research_pack_root}}/content/templates/run/
                      新 run bundle 的起点模板（只读，不直接写；从包内读，复制进 bundle）
drafts/（工作区根）    开发侧跨 run 草稿（可选；产品安装态没有预置，角色不写不读——run 内过程稿见上）
nodes-contract skill  节点 I/O 契约全表（八节点 I/O + 下游可开工判据 + 回边版本语义）；Lead 编制
                       plan.md 时加载。机械把守 = schema-scan + node-gate（开发仓工具、不随包；
                       安装态按回执三态降级）
question-patterns skill 判型模式库（HITL1 第一对照面；命中走条目、未命中兜底 + journal 标记行；
                       增长协议 = 库尾节）；Lead 立项时加载
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

新 run 在根落 `run.md`（`schema` / `created` / `phase` / `next` / `delivered` / `parked`；键义 = `{{research_pack_root}}/content/templates/run/run.md`）。**声明不是事实**；冲突以文件为准；`run.md` 不自证批准/交付。`schema` 是整数契约版本（门禁按整数分档，与日期无关）；旧 bundle 只有 `contract:` 日期 = 旧形态，读兼容、不再新写。

恢复前先答五问（阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态）。**按意图读、读完即停**；读序/交付口径/终局块/旧 run/冲突与恢复 = `{{research_pack_root}}/content/generic/state-and-recovery.md`（按需 read，不预载）。

## 交付与审查终局（D28）

- `review.md` 末尾固定 `## readiness（终局）: PASS|FAIL`；**只有 critic 能写**。同轮写
  `review/readiness.json`——门禁以声明为准，review.md 判定行只做副本（细则 = `content/generic/state-and-recovery.md`）。
- 交付 = `final/vN`（不可变副本）+ `final/readable-vN`（新 run 非 quick_factual；同版读者版）+
  `presented`（lead 顶层；`files[].path` 含两者，reader 第一）+ `delivered.json`/`acceptance.md`
  回执；`final.md` 是工作稿，present 指它不算。
- 见证只认**本 run 的 lead 顶层会话**（写过 `drt_<slug>/`）：跨 run/子 agent 不作证，present 须晚于 HITL2 答复。
- `audit.md`/`node-gate.md`/`acceptance.md` 是 ops 派生/回执：默认只读，`--write`/`run-accept` 才落。
- **回执三态**：有审计工具 → `audit.md` 绿 + `delivered.json`；无工具（只有安装包）→ `run.md` 的
  `delivered:` 与 journal 显式写 `no machine audit (install-only)`，**绝不声称 `CRITICAL=0`**，`phase`
  停在 `delivery`；`accepted` 只在验收工具跑绿后由操作侧写。

## 来源证明（C-lite）

- provenance 可选；**hash 的 owner 是 ops/Lead，不是 analyst**：派发不得要求它用
  `python3 hashlib`；hash 由 ops/Lead 后补。缺 hash 是 UNATTESTED，不是伪造。
- `file://` 无 provenance = MAJOR；`path` 相对、`sha256` 匹配。细节 =
  `{{research_pack_root}}/content/generic/state-and-recovery.md`。

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

## 研究视角（lens）

lens = 本次研究从哪个**证据面**挖（不是角色/persona、不是报告骨架）。出厂目录 =
`{{research_pack_root}}/content/lenses/<id>.md`（按需 read，不预载全文）；题型默认集与索引 =
lead 的 `question-patterns` skill。

- **选择**：HITL1 按题型给默认集（默认 2、上限 4；P1 可单 `official`）；完整集合写
  `question.md` §研究方法 `- 本次视角:` 与 `topics.md` 每个 topic 的 `lenses:`；计划确认卡默认不写，
  偏离才写一个短标记。per-topic 子集、cells = Σ(topic × lens) ≤12。
- **执行**：同一 topic 有 ≥2 lens 时，至少一个 lens 在独立 activation 跑（subagent/workflow）；
  同 activation 顺序跑须在 plan/journal 记理由。
- **证据**：evidence 卡 `lens: <id>` 单值（一卡一面；多面拆卡）。
- **覆盖**：review.md 终局块填 `topic × lens` 表；每格 = 卡数+质量，或 `gap：原因/渠道`，或
  `n/a：理由`。静默空格（无卡也无记录）= MAJOR + readiness FAIL；每个 lens 的盲区要有
  「配对 / 本题不 material / 显式接受单镜风险」之一。
- **报告**：报告骨架归研究方法预设；lens 只影响所属章节的证据呈现。final §目前不能判断写
  一行「视角覆盖：… / 空视角：…」。

## 证据文件契约（evidence/ 下的硬格式）

frontmatter 必须有（八字段）：`source_url`（真实抓取过的 URL）/ `retrieved_at` / `quality`
（A–D）/ `found_by` / `supports` / `source_tier`（信源分级，见下表）/ `publisher`（注册域）/
`lens`（本卡所属证据面 id，单个；一卡一面，多面拆卡）。
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

**HITL1 = 两段卡**：第一段固定三问（研究类型/深度篇幅/时间口径与语言），第二段**计划确认卡**——question/topics 定稿后、开工前呈计划要点瘦卡（按计划开跑(Recommended)/ 修订计划（意见附加不替换、一轮制不再二次呈卡）/ 放弃；**quick_factual 豁免**；方法行含视角：默认不写、偏离才写），拍板落 question.md §Decisions 第 1 条，形态细则 = lead 的 research-brief skill；**HITL2 选项** = 定稿（按现稿交付）(Recommended)/补研究（补哪块看报告末节；会出新版本）/改说法（只改措辞，版本不变）；题干给「太浅/方向不对/太长」；分诊 = lead 的 rerun-triage skill。

两点之间所有角色静默自主推进——不问"要不要继续"、不汇报进度、不等确认。
用户主动发消息时直接回答，但回答不改变既定研究方向与分派。

## 完成判据（verify the world）

- `final/vN` 的关键结论有真实存在且内容支撑的 `[来源: evidence/xx.md]`；`review.md` 的**终局块**为 PASS 后才进入 HITL2；新契约 run 另需 `review/claims.json` 的 critical 全有结论性裁决（`verdict-audit` 绿）。
- 新 run 非 quick_factual：review PASS 后、HITL2 前写 `final/readable.md`；交付时 `final/readable-vN.md` 与 `final/vN` 同版在场（门C）。
- 有 lens 的 run：`review.md` 终局块的 `topic × lens` 覆盖表无静默空格（无卡也无 gap/n-a = FAIL）；`final.md` §目前不能判断写出视角覆盖/空视角；缺 `lens` 字段的新证据卡 = critic MAJOR。
- 交付回执：`final/vN` + `final/readable-vN` + `question.md` §Decisions 的 HITL2 拍板行 + Lead 的 `deliverables/presented`（含 `final/vN` 与 reader）+ 操作侧 `audit.md`（标题匹配、`CRITICAL=0`）+ `delivered.json`/`acceptance.md`；**无审计工具时按上节三态降级**（写 `no machine audit (install-only)`，不假装绿）。
- "研究完成"的唯一依据是以上文件事实链，不是任何人的口头宣告。
