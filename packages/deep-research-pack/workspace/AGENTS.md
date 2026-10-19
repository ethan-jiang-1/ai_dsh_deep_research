# research-workspace — 研究手册（角色会话的 cwd）

这里是 Deep Research 团队的共享工作区。所有研究角色会话在此目录工作；本手册通过
`agent-instructions` 注入每个角色会话。角色人格见各自 preset；这里只放**跨角色共享的
工作纪律与文件契约**。

## 分层铁律（D17：harness / run bundle）

harness 只读：presets、skills、本手册、templates/ 对任何一次研究都是同一份，run 期间零
写入，不持任何 per-run 状态。**一切变量只写进本 run 的 bundle（本目录下 `drt_<slug>/`）**
——不写回手册/模板，不把 run 状态记到任何框架文档。`研究报告 = harness(bundle)`。

## 目录约定

```
drt_<slug>/            一次调研 = 一个 run bundle（drt = Deep Research Topic，目录名即方向；
                       slug 由主编立项时定，kebab-case；立项 sibling 预检：同名/前缀相关
                       bundle 已在（**含 archive/ 归档**）→ 问用户，不擅自另起）
  question.md          方向契约：问题定稿 + Purpose/RQ/Scope/Constraints + HITL1 对齐快照 +
                       Decisions（append-only，最新在上）——跨 rerun 持久，bundle 身份核心（lead）
  topics.md            topic 图：must_answer（问题列表 2–5 问）+ scope_role（owner: lead）
  leads.md             候选方向清单（owner: scout）
  evidence/            证据文件，一条一档（owner: analyst）
  findings.md          发现账本：结论 + 支撑 + gap 状态（owner: lead）
  review.md            对抗核查报告（owner: critic）
  drafts/              过程稿（owner: 各角色，按需）
  final/               版本记账：v1.md = 索引与关键事实回溯；证据扩张 rerun 才落 v2.md（lead）——
                       **只放版本记账，不放当前版全文**
  final.md             当前版权威副本 = **run 根（bundle 顶层）的 final.md**，[来源:] 相对 run 根解析；
                       **不放 final/ 里**（曾被误用作全文位：位置漂移且审计静默跳过——正本钉死在 run 根）
  journal.md           运行纪要（追加式，最新在上；所有角色可写；跨 rerun 累积血统）
archive/drt_<slug>/    已交付 run 归档位（交付后操作侧移入，工作区根只留活跃 run；仍可被审计投影）
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

模板六件 ↔ question/topics/leads/evidence-entry（= evidence/ 单条模板）/findings/final
（= run 根**当前版报告**模板；final/ 的 vN 记账体**无模板**，按 NODES.md 回边版本语义自构）；
review.md、drafts/、journal.md 无模板——review 格式住 critic 的 adversarial-review skill，
drafts/journal 运行时自建。

## 事实的 owner（一处事实一个家）

| 文件 | 唯一 owner | 其他人 |
|---|---|---|
| question.md / topics.md | lead | 只读 |
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

**有效证据谓词（观察面对账，分层；开发仓操作侧）**：run 仪表盘（run-dashboard）按同一契约
渲染——**硬五字段**（source_url / retrieved_at / quality / found_by / supports）全齐才算
有效证据，缺任一标无效（不计入 topic × evidence 矩阵）；**软二字段**（source_tier /
publisher）缺失不否决有效性，标"未分级"（旧 run 的存量证据按此显示，不回填——run bundle
是交付记录，不改历史）；谓词正本 = 本节，tests/evaluation-contract.test.mjs 对账。

**机械强度诚实记账**（开发仓操作侧工具链，部署侧由人审承担）：契约测试核七字段在场与执行者副本对账；
仪表盘按上文谓词投影。**evidence-audit 溯源审计**核 `source_url` 的成功抓取、摘录文本对 web-only
语料的覆盖率与 final 引用链，结果落 bundle 的 audit.md。它不校验日期校准或摘录版式、分段、逐格结构；
这些语义与结构约束由 critic 狩猎，不在仓级结构门中。

## 交付物三态

- **过程稿**：drafts/ 与各 owner 文件——团队内部工作面，不是成品；
- **成品**：lead 会话中 `present` 声明的 `final.md` 当前版（run 根）——唯一对外交付物；
- **非成品声明**：非 lead 角色的 present 声明一律视为过程稿展示。

## 交互纪律（两点交互）

整个 run 只有两个人机交互点，都由 lead 执行：**立项对齐（HITL1）**与**交付审阅（HITL2）**——都以 `ask_user_question` 的**结构化选项卡**呈现（一次多问 + options + 推荐项置首带(Recommended)）。

**HITL1 = 两段卡**：第一段固定三问（研究类型/深度篇幅/时间口径与语言），第二段**计划确认卡**——question/topics 定稿后、开工前呈计划要点瘦卡（按计划开跑(Recommended)/ 修订计划（意见附加不替换、一轮制不再二次呈卡）/ 放弃；**quick_factual 豁免**），拍板落 question.md §Decisions 第 1 条，形态细则 = lead 的 research-brief skill；**HITL2 选项** = 定稿(Recommended)/补研究/修订表述。

两点之间所有角色静默自主推进——不问"要不要继续"、不汇报中间进度、不等确认。
用户主动发消息时直接回答，但回答不改变既定研究方向与分派。

## 完成判据（verify the world）

- run 根 `final.md` 当前版的关键结论有真实存在且内容支撑的 `[来源: evidence/xx.md]`；`review.md` 的终局 readiness 为 PASS 后才进入 HITL2。
- 交付记账含 `final/v1.md`，`question.md` §Decisions 有 HITL2 拍板行，Lead 有 `present` 声明，操作侧 `audit.md` 的标题匹配当前 bundle，且报告可解析、摘要与 CRITICAL 节计数一致并显式 `CRITICAL=0`。
- "研究完成"的唯一依据是以上文件事实链，不是任何人的口头宣告。
