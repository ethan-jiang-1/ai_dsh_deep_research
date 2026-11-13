---
topic: 全量 BUG 失败类普查（第一版失败类账本）
intent: 为测试策略制度化提供全量 159 张 BUG 的主类、发现层、守卫与复发链证据，服务类级守卫、复盘与季度复核。
---

# BUG 全量失败类普查（第一版失败类账本）

> 性质：长期失败类账本第一版；**不是验收证据**。只读仓库；只写本文件。
> 时间：2026-11-13。HEAD `62c5cfca`。
> 范围：`_backlog/_archived/fixed_bugs/BUG-001..159` 全部 **159 张**；无读不到。逐卡打开并读取标题、严重度、`## 症状`、`## 根因`/`## 牵出的失败类`、`## 修复关联`/`## 已落地` 与 README 索引；其中 **60 张此前已全文精读**（001、003、007、008、011、014、018、019、021、040、042、046、047、050、055、064、066、071、072、073、074、080、081、082、083、084、086、088、090、095、097、099、101、104、106、113、120、127、130、132、134、136、139、140、142、144、145、146、147、148、149、150、151、152、153、154、156、157、158、159）。其余 99 张为**逐卡关键节读取**（B 级证据），不是全文逐行；原因 = 上下文预算，关键节足以归类，但可能漏卡内脚注/追加段。
> 未跑：没有重跑 `pnpm test` / `pnpm verify` / 任何 smoke / 任何真模型探针。未跑 ≠ 通过。
> 事实与解释分界：**§A–§C 是事实账本；§D 是沉淀缺口 + 建议；§E–§F 是解释**。

## 读法

- **主类 = 造成漏检的机制**；一张卡只计一个主类，辅类写在其后（如 `C4/C3`）。
- **C12 是残余桶**（进程身份、纯代码缺 import 等），不是稳定失败类；本版 3 张。
- **发现层代码**：F0 纯函数/适配器/变异矩阵；F1 契约测试/源码静态对账；F2 真浏览器；F3 回放；F4 真模型/录制；F5 安装/发布；F6 真 run/真 bundle 现场；F7 门禁/文档对账；F8 并发/子进程/杀进程实验。
- **红录状态**：`有（门禁）` = 测试标题带 BUG 号，`guard-red-record` 强制同文件有负例/夹具留证；`有（无标题）` = 测试在但标题不带 BUG 号；`有（合并标题）` = 只在 `BUG-091/106` 这类合并标题里；`仅 smoke/探针/文档/gate` = 无永久 keyless 测试；`无` = 本版未找到永久守卫。**门禁只证明留证文本存在，不证明红录真的跑过。**

## 类定义

| 类 | 名称 | 定义 | 典型 |
|---|---|---|---|
| C1 | 静默接受 / fail-open | 契约要求红/至少 warn，代码在某个输入上仍绿；缺席/空/读失败/warning 被当合法空态 | 签约缺席、review 缺席、warning 放行 |
| C2 | 消费者遗忘 | 新实体出现后，N 个消费者有一个没学会（门禁 glob/roster/files/bundle/回放/文档注册表/locale） | 新工件不入 manifest、profile 只修一份 |
| C3 | 双份事实漂移 | 同一事实两处副本，一处改了另一处没改（模板↔解析器、读↔写、pack↔gate、present↔final） | fold/write heading、门侧另一份绑定 |
| C4 | 边界 / 解析 | 空、畸形、全角/半角、空白、注释、大小写、编码（BOM）、目录当文件、路径字段边界 | tab heading、BOM、`{}` 快照 |
| C5 | 状态 / 竞态 / 生命周期 | 跨会话残留、lost update、锁、stale、pending、pid 复用、端口/宿主残留、timer 未清、日志丢尾 | lock 创建窗口、CAS 并发、feed 残留 |
| C6 | 路径 / 符号链接 / 权限 / 安全 | symlink escape、hardlink 越界、绝对路径/`..`、跨工作区别名、路径外泄 | hardlink 读、symlink run bundle |
| C7 | 假绿（skip/关键词/点击计数/自报） | 验证资产报告通过，但对象未被证明；0 也算、在场即算、点击计数、有限词表 | 0 题通过、空快照 PASS |
| C8 | 假红（选择器/环境/主机健康/时序） | 产品未必坏，验证资产因选择器/环境/主机/时序判红 | method-editor 会话、load 下断言红 |
| C9 | 夹具漂移 | 夹具形状落后于判据：迁就旧谓词、基线陈旧、录制竞态、缺新工件、与判据不同源 | research-face 基线、MCP fixture |
| C10 | 安装 / 发布 / 浏览器 / 真模型（贵层） | 只在 L2/L4/浏览器/真模型边界可见，keyless 快环结构上看不到 | L2 keyless 冲突、vendor 畸形流 |
| C11 | 文档 / 命名 / 规则漂移 | 门禁子串误伤、术语漂移、规则文本与实现不一致、手册未更新 | `产品内` 误伤、`建议深挖` |
| C12 | 其他（残余桶） | 进程身份误杀、纯代码缺 import 等暂不成族的机制 | port 身份、`PROTOCOL_CONTRACT_DATE` |

---

# 第一部分 事实

## §A 全量逐卡表（159 行）

**列说明**：`触发` = 卡内 `## 症状` 首句（或标题，若卡无症状节）；`漏检缺口` = 卡内 `## 牵出的失败类` 首句，缺则 `## 根因` 首句（这是机制，不是事后断言）；`守卫` = README 修复摘要（001–080）或卡内 `## 已落地` 首句（081–159）；`复发` = 见 §C 的 G 链编号，`—` = 本版未归链。

### §A.1 BUG-001..040

| BUG｜标题 | 严重 | 层 | 主/辅 | 触发（卡内症状） | 漏检缺口（卡内失败类/根因） | 修复后守卫 | 红录 | 复发 |
|---|---|---|---|---|---|---|---|---|
| 001｜新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面 | P1 | F6/F2 | C5/C3 | 新开一个 lead 对话、本轮 Deep Research 还没开始（HITL1 未发或已答但新 bundle 未建）时， 右栏「研究状态」页签呈现的是上一次 run 的渐进面（研究问题行、证据计数、 | `bundle-bind.ts` 的读弱绑定 + `ResearchStatusTab.tsx` 的抑制条件过窄，两层叠加： 1. lead persona 的开工动作（"先看现有 drt_* bundle 里最近交付的 | kickoffSeen 立项轨道信号 + 抑制条件扩展 + 🌱 状态行 | 有（无标题） | G13 |
| 002｜立项后未答的 ask 被锚点折算误标为「交付审阅 ⏳」 | P2 | F6 | C3/C7 | 真会话实测（BUG001-验证会话-muo9pqtv，timed ask 超时后 lead 自主立项的场景）：journal 里 唯一的开放 ask 是 HITL1 三问（research_type | `hitl-fold.ts` `deriveAnchors` 的锚点归属启发式：`f(交付文件在场) ? passed : q(立项文件在场) && tailUnanswered ? anchor-2 pending : | deriveAnchors 按 ask 内容判型：HITL1/HITL2 签名 + 契约外第三锚扩窗 | 有（门禁） | — |
| 003｜盘侧 tailAskPending=true 的绑定会话，观察面不渲染 ↻ rerun 回边 | P2 | F2 | C3/C7 | `client-load.entry` 对绑定会话（「HITL1 四问答案立项开挖」→ `drt_2026-ai-video-generation-landscape`） 的两条断言红： 1. `重入 | "盘侧真值 vs UI 渲染态"双源错位类：观察面诚实线断言（client-load.entry 的磁盘真值对账 清单）依赖 UI 渲染与盘侧谓词同源； | smoke 删手抄镜像直调 deriveAnchors + 绑定富度修正——近窗取事件最多会话 | 仅 smoke | G13 |
| 004｜hitl-answer 点击提交不落地——"卡头消"与盘侧 answer 事件脱钩 | P1 | F2/F4 | C7/C5 | `dev/hitl-answer.mjs` 对挂起 ask 卡执行选项点击 + 提交后，自报"卡头消——提交完成"，但 盘侧会话日志无任何 answer 落地（ask 的 tool/call 之后无 | "UI 观察判据 vs 盘侧事实"脱钩类（与 BUG-003 同族的反向实例）：工具用 DOM 状态 （卡头消失）当提交证据，盘侧才是真相——watch-run 已立"事件形状非字符串 grep"的先例， hitl-an | （ask-drive 策略库：UI 形状永不判完成 + 盘侧裁决升格 exit 1 + 进程组收割； | 有（门禁） | — |
| 005｜HITL1 ask 带 wait:-1 无限期等待——timed 护栏被模型参数绕过 + 活等待无断连地板，无人值守 run 悬挂 28 分钟 | P1 | F4 | C1/C10 | run 通道内（dr_open-weights-swebench-parity）lead 抛出 HITL1 ask 后： 1. 600s timed 兜底未生效：lead 的 `ask_user_qu | - 本仓 preset/persona 层：`wait` 参数（vendor `TIMED_WAIT_PARAMETER`）对模型可见， schema 描述写"Use -1 only when an answer is | （persona ask 硬约束行 + run-state askIndefiniteOf + 61 §3/§4 应答通道二分； | 有（门禁） | — |
| 006｜quick_factual 题型下 lead 自我豁免 HITL1、HITL2 未拍板即 present——快路径无合同且无门禁可检 | P1 | F6 | C1/C7 | SPA 榜单快答题（P1 单点事实）全程 askCalls = 0： 1. HITL1 未发起：lead 自行判定"三问已在请求中"——question.md 显式记录「未发起 HITL1 选项卡」+ | "自述合规即可穿过门禁"——门禁检查"记录在场"而非"行为发生"（记录可以无授权地写）。 | （persona HITL1 零例外 + node-gate 门① HITL 锚点门——写 question.md 会话的 HITL1 签名 ask 判据； | 有（门禁） | — |
| 007｜通道死亡丢会话日志尾部——SIGTERM 后未落盘缓冲蒸发，settled run 回变成"挂起未答"假态 | P1 | F8 | C5/C1 | 探针 C 把在飞 run 的通道 `job_kill`（SIGTERM → boot-run trap → web 子进程）： - `session-21d5df52`（probe B lead，cl | "盘侧 = 真相"的前提是盘侧完整——本仓全套盘侧谓词（watch-run / hitl-answer / node-gate 门② / evidence-audit）都建立在会话日志之上，日志丢尾 = 所有谓词的地基晃 | （watch-run 回退检测 fail-loud + hitl-answer 读窗重试 + 61 §5 限定句 + 仪表盘显式非目标判定； | 有（门禁） | — |
| 008｜leads.md 状态词漂移（建议深挖 ≠ 建议挖深）穿透交付——critic 未狩猎、门L 只能事后 | P2 | F6 | C11/C2 | dr_open-tts-2026-landscape（exploratory_map + run 内方向修订）交付后 node-gate 门L RED： leads.md 里 7 个方向单元的状态行写 | "词形漂移穿透语义审查"—— critic 抓内容矛盾、机械门抓白名单外词形，但机械门在 交付后才有机会跑。 | （critic 狩猎第 4 线 + 61 §4 拍板前机械门； | 有（门禁） | — |
| 009｜挂起回合在通道重启后没有被"终局化"——文档承诺的 turn/end + end-seed 补写不存在，旧 pending 卡残留 | P2 | F8 | C11/C5 | 1. lead 抛 HITL1 → 故意不答，等 600s → timed pending 落盘（75 事件，正常）； | "文档合同 vs 盘侧事实"第三例（前有 BUG-006 卡的交付门缺口、BUG-007 卡的日志丢尾）：这次是 机制描述本身没有盘面支撑。 | （文档改写实测行为 + 读窗重试 + 横切盘点"自动X"句式三处逐条验证 + 自动续轮句加通道死亡限定； | 仅文档 | — |
| 010｜回归经导入模块启动子进程，layering 静态守卫未检出 | P2 | F1 | C2/C7 | [测试指令](../../../../tests/AGENTS.md) 规定默认回归无模型、浏览器、网络与子进程。 | 测试入口合规而导入实现越界。 | （原生日志解码； | 无（契约扫描未追 import） | — |
| 011｜L2 无模型调用，但部署检查使无凭据全绿承诺不成立 | P2 | F5 | C10/C1 | 根 [AGENTS.md](../../../../AGENTS.md) 与 [开发环](../../../../docs/guides/60-dev-loop.md) 把 L2 标为 keyless， 定义为无 | 一个验证命令同时承担安装证据与生产就绪检查，导致 keyless 合同和实际前置不一致。 | （显式安装模式； | 仅 smoke/契约 | — |
| 012｜HTML 仪表盘与驾驶舱状态判据分叉，可能漏报 HITL | P2 | F7/F2 | C3/C7 | [仪表盘](../../../../scripts/run-ops/run-dashboard.mjs) 的 `detectHitlWait` 固定读 `session.v3.jsonl.zstd`， 只认 | 观察投影复制业务判据后产生静默分叉。 | （canonical 日志与共享折算； | 无 | — |
| 013｜Lead 回放 persona 金标准未包含既有 HITL1 零例外规则 | P2 | F3 | C9/C3 | `source dev/env.sh && node scripts/snapshot-replay.entry.mjs` 的 Lead B1 persona 全文比对失败。 | 模型可见文本更新后录制输入与金标准未同步。 | 录制器补 lead 支持[探针原文复用] + 真模型重录 + C 金标准 --update-expected 人审[窄带保持、比较器未动] + snapshot-replay 4 场景 ALL PASS——B1 站立红转绿 | 仅回放基线 | — |
| 014｜hitl-answer 的"代理模拟记录"只打印不写盘，HITL 代答 provenance 静默丢失 | P2 | F6 | C1/C5 | 代理代答 HITL 后，bundle 的 `question.md` §Decisions 拍板行把作答者记为用户（lead 无从得知答案来自代理——它只看到 ask 通道的正常答复）； | 声明性记账无机械把守：驱动声称的副作用无实现，也无门禁/测试对账（契约测试只查会话日志 answer 事件，不查 bundle 记账落位）。 | （scripts/lib/hitl-provenance 纯函数+写盘器 + 驱动裁决通过后接线 + 契约测试红先立； | 有（门禁） | — |
| 015｜hitl-answer 的 --pick 非默认选项未实现——驱动静默提交 UI 预选项，意图与落地脱节无检测 | P1 | F4/F2 | C7/C1 | `hitl-answer --pick 2`（意图 = 选第二项「补研究：破单源」）执行后：盘侧 answer 批实际落地 「按现稿定稿交付（Recommended）」——UI 预选项原样提交，驱动 | [scripts/lib/ask-drive.mjs](../../../../scripts/lib/ask-drive.mjs) `nextDriveAction` 的动作空间只有两种：`点推荐项`（radioCount> | selectionMatchesIntent + intentReconcile + pickTargetLabel/parseAskQuestions（TDD 八断言） | 有（门禁） | — |
| 016｜fresh clone 上 `pnpm verify` 红——_done/_reference 摘要链接运行区归档件 | P2 | F7 | C7/C2 | `_backlog/_done/_reference/oss-dr-mining/2026-10-06-oss-dr-bundle-digest.md` 的正文链接指向 `research-works | 「tracked 文档链接 untracked 运行区文件」可能不止这一篇——值得横切 grep `_backlog/` 与 `docs/` 中指向 `research-workspace/`、`runtime/` 的相 | （md-links 加宽"目标未被 git 跟踪 → 红"+ quotepath=false 修非 ASCII 假红/漏扫 + 存量 18+1 条链接转反引号路径 + gates.e2e 案例与拆补拷对冲——对照组 tracked-on | 仅 gate 案例 | — |
| 017｜代答 provenance 行日期用 UTC——与本地拍板行日期错位，破坏 append-only 次序 | P2 | F0/F6 | C4/C3 | mcp-hosts 归档 bundle 的 question.md §Decisions 实物：顶部「2026-10-06 HITL2 定稿」「2026-10-06 HITL1 定稿」，其下（更旧位） | 「日期最小契约」（手册：先跑 date 核对）只约束了模型侧文本，工具侧写日期的路径没有同口径—— 值得横切 grep 所有工具脚本里 `toISOString().slice(0, 10)` 形态的日期源（run-da | （scripts/lib/local-date.mjs 本地口径接管两处 UTC slice + batchToAnswered questions 富集〔header>id>prompt>（题面缺席）诚实标记〕+ parseAskQues | 有（门禁） | — |
| 018｜snapshot-replay B 层广告覆盖 skill 与工具行，实际对三处 `user/message` 注入全不覆盖 | P1 | F3 | C7/C9 | `scripts/smoke/snapshot-replay.entry.mjs` 头注（第 13-15 行）声明 B 层的职责： > B 组装请求 diff：回放会话持久化日志的 `system/m | "声明的覆盖 > 实际的覆盖"——本仓已多次实证的同型失败的第四个实例： 1. `docs/discipline-map.md` 的 `na` 行可静默腐烂（10 条理由被证伪而无人知）； | （B 层改逐条判据：persona + 全部 request/header + 三处注入； | 仅 smoke | — |
| 019｜录制器 MCP 竞态——不等 MCP server 就绪即发探针，fixture 工具表随机缺 MCP 组 | P2 | F4 | C9/C5 | 同一录制器、同一 boot 形态（`--profile research`，mirror 带 mcp-playwright 行），录出的 fixture 工具表在「含 MCP 组」与「不含」之间随机： | 「仪器对准目标，不对准跑者」同族：录制仪器对异步就绪子依赖（MCP server）没有显式等待 ——单次录制通过的 fixture 可能是竞态输家，直到回放对账才现形； | （写盘前 MCP 组谓词 + MAX_ATTEMPTS=3 有界重试 + 连续落败 fail-loud； | 有（门禁） | G10 |
| 020｜hitl-answer 代答 provenance 误归给无关在飞 bundle | P2 | F6 | C7/C3 | 代理模拟作答新 run 的 HITL1 卡时，代答 provenance（"HITL 交互 = 操作侧代理模拟"行）写进了无关的停滞 bundle 的 `question.md` §Decisions | operator 工具的落账目标启发式类缺陷：`activeBundle` 字典序挑选被多处消费（watch-run / dashboard 是否同源待查——横切排查点）。 | （归属谓词化：attributionBundleOf 仅写命中归属、仅读一律延迟——误归代价 ≫ 延迟代价； | 有（门禁） | — |
| 021｜cdp-probe `--ask` 发送系统性失败——asked:false 三连，消息不落盘 | P2 | F2/F4 | C8/C7 | `scripts/probe/cdp-probe.mjs --ask` 向会话发送消息的链路失效：2026-10-11 验证 run 期间三种会话状态下连续三次 `asked: false`——①通道 | 操作侧对 run 的非挂起干预面只有一条腿：hitl-answer 覆盖挂起卡、cdp-probe 覆盖自由消息——后者失效即整条干预面失效，lead 停滞时只剩「重启通道 + 新开续跑会话」这条重手段。 | `inject-reconcile` 落盘对账 + send/stop 家族匹配 + fail-loud 四态 + 七例 | 有（门禁） | — |
| 022｜上游流畸形事件当场终结回合——run 停摆的主因（本仓修不了，可数可恢复） | P1 | F4/F6 | C10/C5 | 模型回合在第一步即被终结，日志形态 = `assistant/attempt` 只有 finish chunk（`kind: "error"`）→ `step/end` → `turn/end.rea | 外部边界的单点失败放大成整场停摆：一个 wave 的产出可能因一次畸形事件全废（本轮实测：队员集体 失败、evidence 5 卡在盘而 findings 未写，靠"文件即真相"续跑救回）。 | BUG-024 + `dev/llm-socket-isolation.cjs` | 仅探针/trigger | — |
| 023｜上游流畸形持续窗口击穿有界重试——回合死亡回归（BUG-022 残留形态） | P1 | F4/F6 | C10/C5 | [BUG-022](../../fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md) 的同签名畸形 （`event precedes message_start` / ` | 上游（DeepSeek Messages 流）在该时间窗内持续违约事件顺序——非本仓代码回归（机制层同 BUG-022， vendor 只读层，本仓修不了流解析）。 | socket 隔离 + research profile 重试窗口 + stream-failure 归因（卡内判据②） | 有（无标题） | — |
| 024｜直连路径再现「event precedes message_start」畸形风暴——大会话重试全灭（BUG-023 判据②触发条件成立） | P1 | F4/F6 | C10/C5 | 同签名畸形（`turn/end.reason.error = "DeepSeek Messages stream: event precedes message_start"`，MALFORMED_R | "畸形风暴窗口 × 请求形状"的暴露差——重试策略对持续窗口的设计性不足（BUG-023 判据②的原始关切）在直连路径成立时的量化与升级决策； | （修复 = socket 隔离每请求一次性连接〔`dev/llm-socket-isolation.cjs`〕+ research profile 重试窗口拉长 + 处置序入 triggers； | 仅探针/trigger | — |
| 025｜旧格式偏好条目——详情 Modal 不渲染「自定义要求」单块、编辑流丢 legacyText 发空载荷 | P2 | F2 | C3/C4 | 旧格式偏好条目——详情 Modal 不渲染「自定义要求」单块、编辑流丢 legacyText 发空载荷 | legacyText 只在旧组件路径存在；DetailState 投影漏「自定义要求」块 | （修复 = legacyText 贯穿 DetailState：单块/混居双块/旧正文预填/摘要分区优先； | 有（无标题） | — |
| 026｜偏好库面板读取写死 40 行——超长库静默截断（尾条目消失 + 截断编辑指令风险） | P2 | F2 | C1/C4 | 偏好库面板读取写死 40 行——超长库静默截断（尾条目消失 + 截断编辑指令风险） | 面板读 limit 写死 40 行；无截断信号/尾条目断言 | （修复 = readFile limit 参数化、库读 1000 行； | 仅浏览器 smoke | — |
| 027｜snapshot-replay C5 渲染金标准间歇性红——捕获时就绪判据缺失，会话历史仍在流式加载 | P2 | F3 | C9/C8 | `snapshot-replay.entry` 的 lead 场景 C5「渲染金标准逐字一致（卡片 + 活动行）」间歇性红：实得比金标准少一条活动行——金标准 2 行（`🔍 检索：DSH harnes | 失败场与通过场的现场签名对照（原始摘录 = `runtime/smoke-workspace/bug-027-evidence/failing-signatures.md`，gitignored 运行证据）： ／ 信号 | （修复 = C0b 客户端历史就绪谓词：期望值取录制夹具 `tool/call` callId 集合，30s 死线； | 仅回放 smoke | G10 |
| 028｜隔离守卫自身异常时静默透传原始 fetch——"隔离下"判读可能名不副实 | P2 | F8 | C1/C7 | `dev/llm-socket-isolation.cjs`（NODE_OPTIONS 预载，LLM 流/web_search 每请求一次性连接）在自身异常时走 `catch → 透传原始 fetch | 缓解措施的失效模式不可见：对外声明"隔离下"是判据前提，静默回退让声明与事实脱钩； | （修复两部分：失败回落由并行工作流 `a778d17` 修〔必关 Agent + 原样抛出、绝不回落共享池〕； | 仅一次性 harness | — |
| 029｜evidence-audit 的溯源语料漏两类真实取证路径（编码/协议相对形态 · 非 web 工具的抓取）——CRITICAL「伪造链接」档假红率 3/5 | P2 | F6 | C4/C8 | `evidence-audit` 对证据声称的 `source_url` 报 CRITICAL「伪造链接/未溯源——域名与 URL 都未出现在任何 web 工具事件里」，但该 URL 实际出现在本 r | URL 抽取只认字面 `http(s)://` 形态，未处理三类真实存在的引用形态：%XX 百分号编码（搜索引擎重定向参数 `uddg=`）、协议相对 `//host/…`、无 scheme 的裸域名/链接文本。 | （`urlsOf` 逐 `%XX` 容错解码副本 + 协议相对 `//host` 归一 + `hostsOf` 裸域名只喂域名档； | 有（门禁） | — |
| 030｜snapshot-replay C5 渲染金标准间歇性红——活动行只渲染 1/2（BUG-027 修复后的复发） | P2 | F3 | C9/C3 | `source dev/env.sh && node scripts/smoke/snapshot-replay.entry.mjs` 反复跑，`[lead] C5 渲染金标准逐字一致（卡片 + 活动 | 就绪谓词的覆盖面必须等于断言面——"等某个显式状态"若只覆盖断言的一部分，剩下的部分就是时序骰子 （scripts/AGENTS「等待显式状态」的边界情形）。 | 判据收进 `replay-request`（哨兵只认 assistant + turn/end completed），冒烟/录制器共用 | 有（无标题） | G10 |
| 031｜hitl-answer 在长跑通道实例上"侧栏零 session 行"——组能展开但行不渲染，且无搜索兜底 | P2 | F2 | C8/C2 | 长跑（数小时、数千会话目录）的 run 通道实例上，`dev/hitl-answer.mjs` 报 「侧栏没有目标会话行」→ 如实停止； | 侧栏懒渲染；aging/absent/cap 判据未区分，无搜索兜底 | `scripts/lib/ask-drive.mjs` sidebarMissVerdict + keyless 五例 + 接线红注入 | 有（无标题） | — |
| 032｜`hitl-answer --custom` 的文本未进答复批——修法指示静默丢失、回合空转 | P1 | F2/F4 | C7/C2 | 用 `dev/hitl-answer.mjs --pick 3 --custom "<详细修法>"` 答「修订表述（说明哪段）」这类选项+自由文本 的卡时，命令自报成功（盘侧裁决通过、意图对账通过、p | UI 契约：卡片的自定义输入框是替换选择语义——同一个问题上「选中某项」与「自定义文本」 只能留一个。 | custom 文本按意图胜出 + 强进批复核（`ask-drive`） | 有（无标题） | — |
| 033｜驾驶舱「业务摘要层」间歇缺"已交付态"三行——同一读取里状态面已 ✅ 而已交付文案缺席 | P2 | F2 | C8/C3 | `client-load.entry` 的「业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）」偶发 FAIL，缺的三行全是 `delivered === true` 分支才产生的文案（ | 芯片与摘要块不同帧可用；断言读点部分水化 | 断言侧有界等摘要块就绪 + 刷新同一快照（client-load.entry） | 仅浏览器 smoke | — |
| 034｜client-load.entry「自测例库」块偶发打不开「研究配置」胶囊——8 跑 2 红，无根因证据 | P2 | F2 | C8/C9 | `client-load.entry` 尾段「自测例库」块偶发在这一步红： FAIL 自测例库：lib-selftest 新会话上「研究配置」胶囊不可见 该步是 `openGuideCapsule(6 | 依赖「默认视图 = 最新会话」；无按 id 显式打开 | `openSessionById` 按 id 显式打开 + 注入红证 | 仅浏览器 smoke | — |
| 035｜hitl-answer 在 research-workspace 找不到挂起会话——「aging」判据被重启证伪，代答链路断 | P2 | F2 | C8/C2 | `dev/hitl-answer.mjs`（全仓唯一的 HITL 代答实现——`ask_user_question` 的 answerer 只存在于浏览器 客户端）对盘侧确有挂起问询的 researc | 侧栏懒渲染；aging/absent/cap 判据不知道搜索已试过，文案是旧世界假设 | 搜索兜底 + `sidebarMissVerdict` 策略纯函数 + 强制注入 | 有（门禁） | — |
| 036｜驾驶舱摘要层缺「审查未决项已按上限升级到本次审阅」一行（BUG-033 同族，自然复现 1 次） | P2 | F2 | C3/C8 | `client-load.entry` 的「业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）」红： FAIL 业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）（缺行：审 | brief 层缺 pending-review 行；终局判据缺轮次路径 + 仲裁；UI 读 review 默认 40 行 | `review-readiness` 轮次路径 + 仲裁；UI 读 review 足额 limit | 仅浏览器 smoke | — |
| 037｜hitl-answer 兜底触发后仍打「疑实例老化（处置 = 重启）」——误诊文案 + 已被证伪的处置 | P2 | F2 | C8/C3 | `dev/hitl-answer.mjs` 在已经试过搜索兜底之后，若仍未取到行，仍打： 侧栏没有目标会话行（session id=…，--session=…）——错因判据 = aging：UI 侧栏 | 判据函数 `scripts/lib/ask-drive.mjs:sidebarMissVerdict` 的 `aging` 分支不知道"搜索已试过/结果如何"， 文案与处置都是 BUG-035 修复前的旧世界假设。 | `sidebarMissVerdict` 加兜底尝试史；not-in-scope 文案 | 有（无标题） | — |
| 038｜node-gate 门L 的分级判据不容忍 markdown 强调——对已正确分级的 leads 条目假红 | P2 | F0/F6 | C4/C8 | 端到端真 run（`drt_anthropic-claude-release-line-timeline`）的 `node-gate.md` 里，门L 一次性列出 17 条「建议挖深但支持来源缺席或无 | 门L 的判据是 `!/[(（]\s*[ABCD]\b/.test(srcM[0])`——要求分级紧跟括号； | 门L 剥强调后认括号/逗号 + 独立 A–D；真问题仍红 | 有（门禁） | — |
| 039｜门③ 不认代理代答 provenance 行；门A 的「未决项升级到用户裁决」只写在提示里、代码不认 | P2 | F0 | C3/C1 | 1. 门③ RED：§Decisions 里明明有 HITL2 的裁决记录（`hitl-answer` 按代驱记账纪律落的 `HITL 交互 = 操作侧代理模拟（hitl-answer 驱动…）：Q1 | 门③ 只认结构化 provenance；门A 只查提示文本、不认升级路径 | 门③ 认代理 provenance；门A 认升级路径（两件同时在场） | 有（门禁） | — |
| 040｜终局 readiness 判据两版实现漂移——pack 已加轮次仲裁，门的 `readinessOf` 未跟随 | P2 | F0/F1 | C3/C1 | 同一 review.md：pack 终局 PASS，门 readinessOf FAIL（第2轮 PASS + 附录第1轮 FAIL） | pack 与门两份 readiness 实现；门侧未跟随轮次仲裁 | `terminalVerdictLine` 单一正本 + 门 `readinessOf` 委托 + 跨实现契约测试 | 有（门禁） | G2 |

### §A.2 BUG-041..080

| BUG｜标题 | 严重 | 层 | 主/辅 | 触发（卡内症状） | 漏检缺口（卡内失败类/根因） | 修复后守卫 | 红录 | 复发 |
|---|---|---|---|---|---|---|---|---|
| 041｜官方恢复路径（`run-kickoff --session` 自由文本关挂起）不落任何 HITL 记账 | P2 | F0 | C1/C3 | 那场 bundle 的 §Decisions 有 HITL1 拍板行，没有任何 HITL2 行 → 门③（交付拍板行）与门②（present 声明）判红。 | 官方恢复路径不写 HITL 记账；门③无行可认 | `closingProvenanceRow` + 双写 + 交付卡文本兜底 | 有（门禁） | — |
| 042｜偏好库 `method-library.md` 从不播种、手册不指路——面板宣称"我的偏好库"而盘上无此文件 | P2 | F6/F4 | C2/C3 | 用户在一次真 run 里说「本次研究请按我保存的研究偏好「领域地图」来做」。 | "正常空态"被实现成"文件缺席"而非"空架子"：任何"用户资产型"文件（偏好库、笔记库、模板库） 若不在种子里，新用户永远见不到它，功能名存实亡。 | 种子 `method-library.md` + 手册三态 + `sync-pack-workspace` 独立种子守卫 + probe | 仅 gate/文档 | — |
| 043｜图谱把“未映射 task_id”误报成“未执行” | P1 | F2 | C3/C7 | - run 已实际跑完（证据、final、present 都在），一打开「研究图谱」：`W1.1…` 全部显示“未执行 / ○”。 | 1. 产品层：`ResearchGraphTab.tsx:434` 把“没有 Team task 映射”的 plan 节点硬编码为 `未执行`； | `graph-model` 五态 + 覆盖率行 + 投影未就绪门 | 有（门禁） | — |
| 044｜交付回执写入本机绝对路径（path-hygiene 在写回执之前跑） | P1 | F0/F1 | C6/C1 | 新契约 run bundle 的 `delivered.json` / `acceptance.md` / `node-gate.md` 可以写入本机绝对路径 （`/Users/<name>/...` | - 写后不复检：凡是「预检 + 写回执」的两段式流程，都应把预检对象扩展到待写文件（先写临时文件、 校验、再原子 rename），否则门禁只看历史，不看产物。 | （`portableBundlePath` 归一 present + 写前文本校验 + 落盘后复检 + `--repair`； | 有（门禁） | — |
| 045｜client-load.entry 的图谱断言在流断连时红（首跑红、重跑即绿） | P2 | F2 | C8/C3 | 同一天、同一构建、同一条命令连跑两次 `node --import tsx/esm scripts/smoke/client-load.entry.mjs`： - 第 1 次：`client-load | - 同类"红在环境瞬态、重跑即绿"的冒烟（client-load 的流相关断言）此前没有统一处置口径： `scripts/AGENTS §冒烟脚本可靠性纪律` 允许"外部边界 + 带理由"的重试，但没说断连算不算 外部边 | （`followError` 独立文案 + 有界重试 3×2s； | 仅浏览器 smoke | — |
| 046｜手册的 `## readiness（终局）` 形态门禁读不出，终局 PASS 被读成未判定 | P1 | F0 | C3/C4 | [研究手册](../../../../packages/deep-research-pack/content/manual.md) 对 critic 的固定指令是 `review.md` 末尾写 `## r | 模型可见契约 ↔ 机械解析器的漂移：手册写了一种真实模型会照抄的形态，解析器只认另一种； | （`VERDICT_LINE`/`EMPTY_TEMPLATE` 增判定词后短括号段 ≤8 字； | 有（门禁） | G2 |
| 047｜方法库选中条目没有任何视觉标记——选区样式被浏览器整条丢弃 | P1 | F2 | C1/C7 | 方法库左侧条目列表（「我的库」/「内置参考」两段）点另一条后，右侧详情会跟着换，但列表上看不出哪一条被选中：所有条目外观完全一致。 | CSS 变量 + 手拼 alpha 的静默失效：类型系统只认 `CSSProperties` 字符串，浏览器只丢声明不报错，typecheck 与既有测试都不咬。 | （`LibraryRow` + `libraryRowStyle` color-mix 选中态〔tint/边线/accent bar/名字加重〕+ 焦点环分离 + 源码扫描契约测试； | 有（无标题） | — |
| 048｜协议审计的深度投影只解析首对深度——deep 档官方投影假红，单深度漏检 | P2 | F0 | C4/C7 | `protocol-audit`（L4 交付审计之一，`run-accept` 的第四道）在 deep 档（`allowed_depths` = `L1,L2,L3`，[BAND_TABLE](../ | 同一事实的三种表示（生成器 / 检查器 / 模板）没有单一正本； | （`depthsTextOf` / `depthsOfText` 单一编解码； | 有（门禁） | — |
| 049｜§Protocol 的「来源/投入/输出」行缺席或读不出时审计零 finding——只对在场行对账 | P2 | F0 | C1/C3 | `protocol-audit` 的 §Protocol 对账是「如果这一行在，就对账； | 缺席容忍（absence-tolerant）校验：`?? ''` + `if (x !== '')` 的组合把「没有」与「为空」压成同一个状态， 审计失去了「必填行缺失」这一整类信号。 | （`projectionLineOf` + 三条缺席 warning； | 有（门禁） | — |
| 050｜策略行审计的两处静默——通道缺席零 finding、workflow 无 Wave 时 worker 对账被跳过 | P2 | F0 | C1/C3 | `protocol-audit` 的 `checkStrategy` 负责把 plan 头的 `- 策略:` 行与派生投影对账（[D48](../../../../docs/decisions.md#d48 | - 哨兵值当授权：`null` 同时表示「没有 Wave 拓扑」和「不需要检查」，两种语义混用； | （通道缺席 warning + `strategy-workflow-without-wave` red； | 有（门禁） | — |
| 051｜回放冒烟的 C3/C5 引用被删掉的 `paneRows`——渲染金标准断言永远抛 ReferenceError | P2 | F3 | C9/C7 | `snapshot-replay.entry`（dev-only 回放档）在 lead 场景走到 C3 时抛 `paneRows is not defined`， 导致： - `C3 页签活动行提取非 | 被删的守卫不报「守卫没了」：删声明 + 留引用 = 运行时才炸，静态检查与 CI（本 smoke 是 dev-only） 都不拦； | （恢复采集块 + 稳定窗； | 仅回放 smoke | G10 |
| 052｜交付早于 D46 落地 9 小时的 bundle 被追溯判红——epoch 只到日粒度 | P2 | F0/F6 | C4/C3 | 一个已经交付的 bundle 今天被 `protocol-audit` 判红： $ node scripts/run-gates/protocol-audit.mjs research-workspa | 契约纪元只到日粒度：以日期串做 `>=` 断代的 run 门在契约落地当天都有一个「同日早场」窗口。 | （`PROTOCOL_CONTRACT_AT` + `delivered.json.acceptedAt` 优先； | 有（门禁） | — |
| 053｜「plan 头」类判据用全文首匹配——正文提及可冒充头（protocol / 策略行两处） | P2 | F0 | C4/C3 | `protocol-audit` 有两条以「plan 头」为对象的判据，实际都按全文首个匹配解析： 1. plan-ref：`checkPlanRef` 用 `protocolVersionIn(pl | 「头」的语义没有载体：判据用全文搜索近似「头在场」，于是任何正文提及都能满足它； | （`headerBlockOf`； | 有（门禁） | — |
| 054｜cells 上限的计数只认 `- lenses:` 一种写法——`*`/缩进静默计 0，预算闸门失效 | P1 | F0 | C4/C7 | `protocol-audit` 的 effort 合同用 `countCellsOf(topicsText)` 数 cells，再与 `min(protocol.cells_max, band.ce | 「预算/上限类」判据的输入解析必须 fail-loud：上限是安全轨，输入读不到时不能当成 0（0 永远安全）， 必须像同一审计的 `strategy-budget-unparseable` 那样红。 | （`lensScanOf` 单一解析； | 有（门禁） | — |
| 055｜插件 UI 只做了半套中英文——标签/按钮大量硬编码中文，英文界面里中英混排 | P1 | F2/F7 | C2/C7 | 宿主语言切到英文时，插件的界面中英混排：tab 名和少数按钮跟着 locale 走（`Method library`、`Start from this method`）， 但同一屏里的「刷新 / 新建 | "做了 i18n 机制但没做覆盖"：字典存在、`t()` 在位、门禁不咬——任何组件都可以绕过字典写死中文， 英文用户看到的是混排。 | （字典 521 键 zh/en 对齐； | 有（无标题） | G11 |
| 056｜§Protocol 行在场但数值/分节读不出仍静默——BUG-049 修复未覆盖的解析半 | P2 | F0 | C4/C1 | 在已含 BUG-049 修复的当前树上（2026-11-11 23:0x，`checkProjectionDetails` 已改成 `projectionLineOf` 缺席 warn），下面两种输入 | 同一修复内的三处解析没有统一纪律：深度已改为「解析失败 → 红」，数值/分节仍是「解析失败 → 跳过」。 | （宽容单位解析 + `projection-number-unparseable` / `projection-output-unparseable`； | 有（门禁） | — |
| 057｜acceptance-check 的退出码与全仓 verdict 契约相反——FAIL/UNVERIFIED/noCriteria 都是 exit 0 | P2 | F1 | C7/C11 | `acceptance-check` 把判据求值结果只放在文本里，退出码恒为 0： sh node scripts/run-ops/acceptance-check.mjs <bundle> <cri | - 全仓契约（[scripts/AGENTS](../../../../scripts/AGENTS.md)）：「exit 0=全绿 / 1=断言红 / 2=未跑（前置缺席）； | （`acceptanceExitCode`：仅全 PASS 且至少一条 exit 0； | 有（无标题） | — |
| 058｜plan 图成环无任何机械判据——`waveCountOf` 的 null 被静默跳过，`planIssuesOf` 也不认环 | P2 | F0 | C1/C3 | plan 模板的成文合同是「图必须无环； | - [`waveCountOf`](../../../../scripts/lib/protocol-core.mjs) 在成环时返回 `null`（注释原文「有环 → null」）； | （有环 → red `plan-cycle`； | 有（门禁） | — |
| 059｜回放冒烟的页签定位器写死中文单语——UI 文案随 locale 后 en-US 环境必红（C2→C3/C5 连带） | P2 | F2 | C8/C11 | `snapshot-replay.entry` 的 lead 场景固定 4 红： FAIL [research-face/lead] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点） | 验收/金标准脚本里的文案断言没有 locale 归属：同一批"真浏览器"脚本对 locale-owned 文案的处理 不一致——`client-load.entry` 只对部分控件用双语正则，其它仍是中文单语； | （`SMOKE_LOCALE='zh-CN'` 显式钉住 + 双语定位； | 仅浏览器/回放 smoke | G11 |
| 060｜host-health 的 free 判据在 macOS 系统性误报——`os.freemem()` 只算 free pages，client-load 常态 NOT-RUN | P2 | F2 | C8/C1 | `client-load.entry`（L0 的浏览器观察面）在本机常态 NOT-RUN： client-load.entry: NOT-RUN — 主机不健康（load 7.77 / free 86 | - `os.freemem()` 在 macOS 的语义是「free pages」，不含 inactive / speculative / purgeable； | （`availableMemoryMBFromVmStat` / `FromMeminfo`； | 有（门禁） | G12 |
| 061｜回放 C2 在 locale 钉住后仍失败——研究状态 guide 胶囊不可见（四个 extension 页签都不在可见清单） | P2 | F2 | C8/C11 | [BUG-059](../../fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 的修复已落地（浏览器上下文钉 `zh-CN`、定位器双语）， | 「渲染金标准守卫」的唯一入口依赖一条多步 UI 交互配方（展开右栏 → 找胶囊 → 点击 → 等稳定）， vendor 右栏行为一变，整条回放渲染面就不可达； | （展开/收起/新标签 chrome 双语； | 仅浏览器/回放 smoke | G11 |
| 062｜acceptance.md 既是生成物又是 L4 人工走查的唯一载体——重跑验收/`--repair` 会删掉人工证据 | P2 | F0 | C1/C9 | 验收合同把 L4 的人工走查（③ 两点交互纪律 / ④ 中断恢复）记录位钉在 bundle 的 `acceptance.md`「人工走查」节，并明确「没有记录 = 未跑」（[evaluation.md | 同一文件承担两种寿命：机械投影（可随时重算）与人工证据（一次性、不可重建）。 | （`manualEvidenceOf` / `withManualEvidence`； | 有（门禁） | G7 |
| 063｜web-ui-nav 的 chrome 文案常量仍是英文单语——zh UI 下「展开更多」与「预览版说明」都静默失效 | P2 | F2 | C8/C2 | `scripts/lib/web-ui-nav.mjs` 自称「观察面侧栏 UI 导航共享件——唯一正本」，其中 `TAB_TEXT` 已按 2026-11-03 的结论做成中英双语，但同文件另两条 | i18n 收口只做了页签标题（`TAB_TEXT`），没有把「展开更多 / 预览弹窗」这类 chrome 文案一起进表； | （三条常量改双语； | 仅浏览器/回放 smoke | G11 |
| 064｜回放的 A 层不是自包含的——真实工具调用会卡住整层（无超时归因、无并发锁） | P2 | F3 | C9/C5 | `snapshot-replay.entry` 的 lead 场景在静默窗口（无锁、无并发 client-load）依旧复现： FAIL [research-face/lead] A 回放通路（…）（ | 1. A 层依赖真实工具：`@deepseek-ai/dsh-llm-replay` 只回放 LLM chunk（text / reasoning / tool-call），工具照真执行。 | （`replay-network-offline.cjs` preload 离线闸 + run lock + 超时归因； | 有（门禁） | — |
| 065｜run-driver 的 GREEN 缓存键只有 pack+runtime——dev 通道自身的改动（overlay / boot-run）不失效 | P2 | F0 | C7/C3 | `dev/run-driver.mjs up` 的「浏览器面 GREEN」缓存（TTL 30 分钟）声称「键 = pack 指纹 + runtime 构建」， 但决定被探测页面内容的 dev 通道产物 | 缓存身份只收了「pack 源 + vendor 构建」两项； | （`probeCacheKey` 增 `extra`； | 有（门禁） | — |
| 066｜`research` profile 无创建者、无版本校验——团队层停在 rc.2，回放/团队冒烟只报「等待启动横幅超时」 | P2 | F5 | C2/C3 | `snapshot-replay.entry`（以及 `team-preflight.e2e`、`dev/record-role-fixture.mjs`）依赖开发 home 里的 `resear | 三处缺口叠在一起： 1. 版本面缺失：`team-preflight.e2e` 的 profile 组合校验只查 bundles + 盘上 preset （[team-preflight.e2e.mjs](../ | （消费方统一 deep-research profile； | 有（门禁） | — |
| 067｜回放离线闸的 DNS 面不完整——`dns.resolve*` 实测绕过，子进程工具也不受控 | P2 | F8 | C4/C1 | 离线闸（preload）的成文承诺是「把非 loopback 的出站连接与 DNS 立即判失败」。 | `install()`（`scripts/smoke/replay-network-offline.cjs`）只补了： - `dns.lookup` / `dns.promises.lookup`； | （补齐 resolve*/promises/Resolver.prototype； | 有（门禁） | — |
| 068｜产品名 Orca 未做双语——中文应叫「Orca 深度搜索」，英文应叫「Orca Deep Research」 | P2 | F2 | C2/C7 | 侧栏左上角品牌名无论界面语言都是 `Orca`： - 英文界面（2026-11-12 02:14 用户截图）：品牌区显示 `Orca`，而产品要求是 `Orca Deep Research`； | “产品名被当成代码常量”：品牌名不经过字典，且同类显示位没有单一正本——任何新显示位都可以再造一个名字，语言切换时不会跟。 | （`brandName` zh/en； | 有（门禁） | G11 |
| 069｜英文界面仍混中文——内置打法内容单语（名称/摘要/四字段/推荐规则）+ 方法编辑历史标题不随 locale | P1 | F2 | C2/C7 | 界面切到英文后，chrome 已是英文，但产品自带的方法内容仍是中文，同一屏左右语言不一致（2026-11-12 02:14 用户截图，方法库 tab）： - 左栏内置参考列表：`事实核查 / 领域地 | ① 产品内容表只有中文，且同时充当“显示名”与“canonical 标识”。 | （`builtin-display` 显示投影 40 键； | 有（门禁） | G11 |
| 070｜BUG-066 的机制主张被对照实验证伪 + 修复残留（team-preflight 仍钉 `research`；profile-health 指令对该档是死路） | P2 | F5/F3 | C3/C2 | BUG-066 的机制主张被对照实验证伪 + 修复残留（team-preflight 仍钉 `research`； | BUG-066 机制被证伪；team-preflight/profile-health 残留接线 | （team-preflight 切 deep-research + profile-health 预检； | 有（门禁） | — |
| 071｜根 scout 被注入「You are the Team Lead」并获得 8 个 Team 工具——与 persona 的 subagent 通道冲突 | P2 | F3 | C3/C2 | 回放 scout 场景的 B 层红给出了直接证据：根 scout 会话的 model-visible 文本里出现： - runtime-context：`You are the Team Lead n | 1. vendor `tool-agent-team` 插件在 profile 级启用（本包 `cordis.patch.yml` 明确不声明团队行， 组合归 vendor `agent-team-profile` 层— | 方案 C：三份非 lead persona 显式纠偏 + design/10 §4/design/20 记录根会话身份事实 | 有（门禁） | — |
| 072｜release-vocab 的「产品内」子串误伤「产品内容」——合法文案被自家门禁判红 | P2 | F7 | C11/C7 | 新文案指南里一句自然表述被 `release-vocab` 判红： [release-vocab] docs/design/40-research-cockpit.md:300 复活退役词：`prop | `release-vocab` 的 banned 词表对中文做裸子串匹配，没有词边界/复合词豁免； | （词表 `产品内` → `产品内(?!容)`； | 仅 gate 正反例 | — |
| 073｜run-lock 的建锁不是原子的——目录先于 owner.json 可见，并发者会接管并把属主覆盖成失效 pid | P2 | F8 | C5/C3 | [`scripts/lib/run-lock.mjs`](../../../../scripts/lib/run-lock.mjs) 的 `acquireRunLock` 是「先 `mkdirSync` 再 | 1. 非原子建锁：`mkdir` 与 `writeFileSync(owner.json)` 是两个操作，中间状态 = 「目录在、属主不可读」； | （候选目录先写 owner.json 再 rename； | 有（门禁） | G5 |
| 074｜readiness 终局判定被「行内引用的旧判定」劫持——同行的真实 FAIL 读不出来（反向误杀 PASS） | P1 | F0 | C7/C3 | 同一行里先引用一个旧判定（反引号/加粗包裹），再写真实终局时，解析器会取引用的那个值： ／ 输入（review.md 里的一行） ／ 期望 ／ 实测 ／ ／---／---／---／ ／ `旧轮记录：\ | 「先剥装饰、再匹配」与「引用/引用块不可夺权」的边界没有载体：剥离规则不知道剥掉的是「行首模板壳」 还是「行内引用的包围符」。 | （同行多判定取本轮/真实终局的未包裹判定； | 有（门禁） | G2 |
| 075｜门③ 把「HITL2 未拍板」当拍板行——同 run 的旧答复即可放行（G8 形态 fail-open） | P1 | F0 | C7/C1 | `isHitl2Row` 只做词面存在判断： js export function isHitl2Row(line) { if (/HITL2/.test(line)) return true ret | 1. 行判据 = 关键词存在：`/HITL2/` 不区分「已拍板 / 未拍板 / 待确认 / 等待 / 尚未」； | 决策形判据 + 最新 HITL2 行未决即 RED + 最新 ask callId 答复见证 | 有（门禁） | G1 |
| 076｜schema-scan 的 D28 顶层白名单漏掉协议/复核/wave 新 canonical 件——新契约 run 必红 | P2 | F6 | C2/C7 | 契约期（有 `run.md`）的新 run 一旦使用今天的协议层 / claim 复核 / wave 通道，`schema-scan` 就报： drt_llm-inference-cost-route | `TOP_LEVEL_ALLOWED`（`schema-scan-core.mjs:162`）自 D28 起未随新契约扩展： js const TOP_LEVEL_ALLOWED = new Set([ 'run.md' | （补 protocol.json/protocol-audit.md/protocol/review/waves； | 有（门禁） | — |
| 077｜protocol-audit `--write` 崩溃（ReferenceError: PROTOCOL_CONTRACT_DATE）——run-accept 写报告阶段必败 | P1 | F5/F6 | C12/C3 | 带有效 `protocol.json` 的 bundle 走 `run-accept` 时，预检全绿，但写报告阶段崩溃： $ node scripts/run-gates/protocol-audit | `PROTOCOL_CONTRACT_DATE` 在 `6a463a20`（presence-aware protocol/strategy projections）从 CLI 的 import 里被删掉（判定迁到 `p | （补 PROTOCOL_CONTRACT_DATE import； | 有（门禁） | — |
| 078｜portableBundlePath 把相对 `..` 路径当可移植——门② 接受 bundle 外 present（PASS），repair 保留外部指针 | P2 | F0 | C6/C1 | `portableBundlePath` 对相对路径直接原样返回（只把 `\\` 换成 `/`），不做 bundle 内包含性检查： js if (!isAbsolute(raw)) return r | 1. `portableBundlePath` 的「相对 = 已是可移植标签」假设（为 repair 的旧标签写的）没有排除 `..` 段； | （相对路径 resolve + 包含性检查，含 `..` 一律 null； | 有（门禁） | G8 |
| 079｜user-env.entry 引用 D40 S3 已删除的 seed-core.mjs——启动即 ERR_MODULE_NOT_FOUND，README 仍宣称该关键面无覆盖 | P2 | F5 | C2/C10 | $ node scripts/smoke/user-env.entry.mjs node:internal/modules/esm/resolve:275 throw new ERR_MODULE_N | - `seed-core.mjs` 在 D40 S3（commit `33eea10b`，2026-11-01「delete launcher/scaffold … and their tests/smokes」）被删除 | （sha256 改 node:crypto； | 仅 smoke | — |
| 080｜snapshot-replay research-face B 层基线缺 Team Lead/Team 工具 schema——12 项红（既有漂移，非 D50） | P2 | F3 | C9/C3 | `snapshot-replay.entry` 在 research-face 上报 12 项红（lead / scout / analyst / critic 各 B·persona、 B·head | - 当前 dev `deep-research` profile 组合含 `agent-team` / `tool-agent-team` 行（D16； | （4 角色真模型重录 + source 身份 + C 金标准 --update-expected 人审； | 仅回放基线 | G10 |

### §A.3 BUG-081..120

| BUG｜标题 | 严重 | 层 | 主/辅 | 触发（卡内症状） | 漏检缺口（卡内失败类/根因） | 修复后守卫 | 红录 | 复发 |
|---|---|---|---|---|---|---|---|---|
| 081｜方法库条目名含全角「（」时被 fold 当作 provenance——保存 claim 永不成立，用户按占位符示例起名即失败 | P2 | F0 | C3/C4 | 方法库新建/编辑时，名称里带全角括号（例如 UI 自己建议的 `投研尽调（我的口径）`）： 1. `renderLibraryEntry` 生成 `## 投研尽调（我的口径）（2026-11-12，源 | - `foldLibrary` 的标题语法：`name = title.slice(0, indexOf('（'))`，括号后缀一律 provenance； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-081 + `upsertMethodEntry` 拒绝用例。 | 有（门禁） | G4 |
| 082｜方法库默认判定用裸子串「默认偏好」——provenance 含该词即误判默认；写后回读与写前 expected 自相矛盾 | P2 | F0 | C3/C4 | 一个没有 `〔默认偏好〕` 标记的条目，只要标题附近的 provenance 文本含 「默认偏好」四个字，就被 `foldLibrary` 判为默认： json {"input":"## 方法甲（20 | - `foldLibrary` 的 `isDefault` 用 `title.includes('默认偏好')`，没有要求 `〔〕` 标记； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-082。 | 有（门禁） | — |
| 083｜方法库 heading 空白口径不一致——fold 认 `##\t`，clear/set/defaultCount 只认 `## `，默认操作静默不动或误报 | P2 | F0 | C3/C4 | 库文件里一个合法的 ATX heading 用 tab 分隔（`##\t方法甲\t〔默认偏好〕`）： - `foldLibrary` 能读出 `name: 方法甲 / isDefault: true` | - 读侧 `foldLibrary`：`/^##\s+(.+)$/`（`\s` 含 tab）； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-083。 | 有（门禁） | G4 |
| 084｜方法库来源完成判据要求行首 `phase:`，run 模板写 `- phase:`——按模板交付的 run 永远不可选 | P2 | F0 | C9/C3 | `isCompletedMethodSourceRun` 只接受行首 `phase: accepted`： js /acceptedHeader = \/^phase:\\s*accepted\\s* | - 模板用列表项 `- phase:`； | - 证据 = `tests/cockpit/method-library-read.spec.mjs` BUG-084。 | 有（门禁） | — |
| 085｜方法库 heading 的〔默认偏好〕与（provenance）顺序——fold 认反序，upsert 只认正序，同名条目被复制 | P2 | F0 | C3/C4 | 一个库条目的标题把默认标记写在 provenance 之前： md | - `foldLibrary` 先找 `（` 切 name/provenance，再从 name 剥 `〔…〕`，因此接受任意顺序； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-085。 | 有（门禁） | — |
| 086｜useConfigFeed 切换会话时旧 reload 不取消/不校验 sessionId——慢读覆盖新会话的方法库 | P2 | F0 | C5/C3 | 研究配置页签在两个会话之间切换时： 1. 旧会话的 `reload(sessionId)` 已经发出 `readFile`/`listDir`； | - `useEffect` 对 `sessionId` 变化只 `void reload(sessionId)`，没有 cleanup； | - 证据 = `tests/cockpit/config-feed-session.spec.mjs` BUG-086 + `workspace-files` 分页。 | 有（门禁） | G17 |
| 087｜useStatusFeed 切换会话不重置 journalEvents/rows/journalSeen——旧会话活动在新会话页签里残留 | P2 | F0 | C5/C3 | 研究状态页签从 s1 切到 s2： - effect 重置了 `trustRef` / `prevPending`，但没有重置 `journalEvents` / `rows` / `journalS | - sessionId 变化时，`useEffect` 只重置 `trustRef.current` / `prevPending.current` 并 abort 旧流； | - 证据 = `tests/cockpit/status-feed.spec.mjs` BUG-087。 | 有（门禁） | G17 |
| 088｜配置页签读库固定 1000 行——>1000 行库被静默截断却仍标 `ok`（readText 丢掉 eof） | P2 | F0 | C1/C4 | 研究配置页签的库读走： ts const text = await props.readFile(sid, LIBRARY_PATH, signal, 1000) `createWorkspaceFi | - `useConfigFeed.reload` 用固定 `limit=1000` 调 `readFile`； | - 证据 = `tests/cockpit/workspace-files.spec.mjs` BUG-088（1001 行两页）。 | 有（门禁） | — |
| 089｜listRuns 部分桶 unreadable 仍返回 ok——归档/停放桶的 run 被静默漏枚举 | P2 | F0 | C1/C2 | `listRuns` 扫三个桶（root / archive / _abandoned）。 | - 循环里 `firstError` 只在 `refs.length === 0` 时返回； | - 证据 = `tests/run/run-context.spec.mjs` BUG-089； | 有（门禁） | — |
| 090｜sessionBindingOf 把工具参数正文里的 `drt_<slug>/` 当路径——写 notes.md 提到别的 bundle 即强绑定到别的 run | P2 | F0 | C4/C3 | `slugInArgs(args)` 把 整个 tool/call arguments 对象 `JSON.stringify` 后，用 `/drt_([a-z0-9][a-z0-9-]*)\//` 取 | - `slugInArgs` 对 args 全量 stringify + 子串 regex，不检查字段语义/路径边界； | - 证据 = `tests/run/bundle-bind.spec.mjs` BUG-090。 | 有（门禁） | G9 |
| 091｜turnCompleted 对整份日志任一 `turn/end completed` 返回 true——后续 failed/open turn 仍被判回放完成 | P2 | F0 | C7/C5 | `turnCompleted(logText)` 用 `.some()` 扫整份日志，只要历史上任一 `turn/end` 的 `reason.kind === 'completed'` 就返回 tr | - `turnCompleted` 没有按 turn 序号/时序跟踪，只做全局 `some`； | - 证据 = `tests/run/replay-request.spec.mjs` BUG-091/106。 | 有（门禁） | — |
| 092｜defaultsStore 双读失败被当成 auto——listDir + readText 都 null 时按钮显示「自动」且无 problem | P2 | F0 | C1/C3 | `refresh` 同时读 `research-defaults.json`、方法库与工作区目录； | - `exists` 在 `entries === null` 时用 `text !== null` 推断； | - 证据 = `tests/cockpit/defaults-store.spec.mjs` BUG-092。 | 有（门禁） | — |
| 093｜方法库四字段只认行首 `- 找来源:`——`*`/`+`/缩进/全角冒号写法被读成空段 | P2 | F0 | C4/C3 | 方法库条目的四字段（找来源/怎么核实/报告怎么写/不承诺）用 Markdown 等价写法时被读成空： json {"label":"canonical","sections":{"source":"a | - `SECTION_PREFIXES` 是字面量 `'- 找来源:'` 等，`line.startsWith(prefix)`； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-093。 | 有（门禁） | — |
| 094｜HITL2 锚点把 final.md 当交付拍板——综合步落盘即显示「交付审阅 passed」，present 仍空 | P2 | F0 | C3/C7 | 同一时刻： - `final.md` 在场（综合步就落盘的工作稿）； | - `AnchorFileFacts.delivered` 的语义被写成 final.md 在场； | - 证据 = `tests/cockpit/status-feed.spec.mjs` BUG-094。 | 有（门禁） | — |
| 095｜web-harness.bootWeb 成功路径不清理 banner timeout——库式消费者被长 timer 多留 | P2 | F0 | C5/C9 | `bootWeb` 在 `banner` Promise 里 `setTimeout(reject, timeoutMs)`，成功拿到横幅后 没有 clearTimeout。 | - `bootWeb` 没有保存 timeout handle，也没有在 banner resolve/reject、child exit 时清除； | - 证据 = 一次性 active-resource 探针：成功路径 timers=[]（fake CLI banner）。 | 仅一次性探针 | — |
| 096｜isKickoffCall 把任何 ask_user_question（含 HITL2）当新 run 开工——恢复会话交付审阅后 read 绑定被 kickoff 抑制 | P2 | F0 | C3/C7 | 恢复一个已存在的 run（本会话只有 read，无 write），走到 HITL2 交付审阅并答完： json { "binding": { "slug": "resumed", "boundBy": | - `isKickoffCall(name,args)` 对 `name === 'ask_user_question'` 直接 true，不解析 args 的 HITL1/HITL2 签名； | - 证据 = `tests/run/bundle-bind.spec.mjs` BUG-096 + `tests/run/binding-trust.spec.mjs`。 | 有（门禁） | — |
| 097｜method-library 写工具读-改-写无锁——两个 method-editor 会话并发保存会 lost update | P2 | F0 | C5/C1 | 三个方法库写工具都是「读全文 → 改 → 覆盖写」，没有文件锁、没有 revision/compare-and-swap。 | - 没有锁文件/租约； | - 证据 = `tests/pack/method-library-io.spec.mjs` 锁/串行 mutate。 | 有（门禁） | G5 |
| 098｜方法库三写工具直接 writeFileSync 覆盖，无 temp+rename——中途失败/崩溃会截断 method-library.md | P2 | F0 | C5/C1 | 三个方法库写工具都是对用户唯一的 `method-library.md` 原地覆盖： ts import { mkdirSync, readFileSync, writeFileSync } from | - 直接 `writeFileSync` 覆盖，没有同目录临时文件 + 原子 rename； | - 证据 = `tests/pack/method-library-io.spec.mjs` 原子写/无 temp 残留。 | 有（门禁） | G5 |
| 099｜run source picker 把 listDir null 当空列表——final 目录读失败显示「无 final」，不是读取失败 | P2 | F0 | C1/C4 | 选择一个已完成的 run 作为方法库来源； | - `finalFiles ?? []` 把 null 降级为空； | - 证据 = `tests/cockpit/run-source-picker.spec.mjs` BUG-099 接线。 | 有（门禁） | — |
| 100｜final.md 只按名字在场判定，不校验 entry.type=file——同名目录会被当交付 | P2 | F0 | C4/C3 | 一个 run 目录里 `final.md` 是目录（或目录 symlink）而不是文件： json { "opened": true, "names": ["final.md", "question. | - `RunView.names` 是 `Set<string>`，把 entry.type 丢了； | - 证据 = `tests/run/run-context.spec.mjs` BUG-100 + `tests/cockpit/run-source-picker.spec.mjs`。 | 有（门禁） | G8 |
| 101｜latestPresentedFinalVersion 不校验终稿族——`notes/final/v9.md` 被当交付版本，版本面 label 说「已交付」但 state 是 none | P2 | F0 | C3/C4 | 一条 `deliverables/presented` 只点名非 run bundle 的 `notes/final/v9.md`： json { "delivery": null, "deliver | - `latestPresentedFinalVersion` 的正则只匹配 `final/vN.md` 后缀，没有复用 `finalPathOf` 的 `drt_` 终稿族判定； | - 证据 = `tests/run/final-target.spec.mjs` BUG-101 + `tests/cockpit/run-version.spec.mjs`。 | 有（门禁） | G3 |
| 102｜planVersionsOf 取全文最后一条「图版本：vN」——正文/历史引用覆盖头部声明 | P2 | F0 | C4/C3 | plan 头部声明 `图版本：v2`，正文有一句「旧版图版本：v1 已废弃」： json { "currentPlanVersion": 1, "versionConflicted": false, | - `planVersionsOf` 先剥 HTML 注释，然后全文匹配所有 `图版本：vN`，用最后一个； | - 证据 = `tests/cockpit/plan-index.spec.mjs` BUG-102 + `run-version` 用例。 | 有（门禁） | — |
| 103｜latestPresentedFinalVersion 取所有 present 的 max，不是最后一条——re-present 旧版后交付版本错位 | P2 | F0 | C3/C4 | 两次 present：先 v2，后 v1（re-present/回滚/重复交付）： json { "latestDelivery": { "path": "drt_x/final/v1.md", "t | - `latestPresentedFinalVersion` 遍历所有事件，`latest` 只增不减； | - 证据 = `tests/run/final-target.spec.mjs` BUG-103。 | 有（无标题） | G3 |
| 104｜port-reclaim 对端口上的任意 listener SIGKILL，无进程身份校验——无关服务被冒烟脚本杀掉 | P2 | F8 | C12/C6 | `reclaimPort(port)` 只按端口查 LISTEN pid，然后直接 SIGKILL，不校验该 pid 是否是 DSH web / 冒烟自己的进程。 | - `listenersOn` 只返回 pid； | - 证据 = `tests/run/port-reclaim.spec.mjs` 身份判定 + `port-reclaim-policy`。 | 有（门禁） | G6 |
| 105｜rerun kind 正则用 `\b`——`polish-extra` / `structural-extra` 被截成合法 kind | P2 | F0 | C4/C7 | question.md 的 rerun 声明写了非法 kind： json {"line":"> rerun: v2 · polish 2026-11-12","rerun":{"version":2 | - `(evidence-expansion／polish／structural)\b` 的 `\b` 只要求单词边界，`-` 是边界； | - 证据 = `tests/cockpit/run-version.spec.mjs` BUG-105。 | 有（门禁） | — |
| 106｜sentinelInAssistantText 扫全部 assistant 消息——早期回合的哨兵会让当前 open/failed 回放被当完成 | P2 | F0 | C7/C5 | `sentinelInAssistantText(logText, '探针完成')` 对整份日志的所有 assistant 消息做 `some(text.includes(sentinel))`： j | - `assistantTextsOf` 取全部 assistant/message； | - 证据 = `tests/run/replay-request.spec.mjs` BUG-106。 | 有（合并标题） | — |
| 107｜defaultsStore pending 期间第二次写静默丢弃——不排队、无回执；快速跨轴编辑丢改动 | P2 | F0 | C5/C1 | 第一次写还在 pending（execute 未返回）时，第二次 `setPatch` 立即返回，不发命令、不排队、 不回执： json { "commandsBeforeRelease": 1, " | - `runWrite` 只做 `if (current.pending) return`，不等待、不排队、不设置错误回执； | - 证据 = `tests/cockpit/defaults-store.spec.mjs` BUG-107 排队。 | 有（门禁） | — |
| 108｜useConfigFeed 切换会话不重置交互态——旧会话回执/删除确认/发送中留在新会话 | P2 | F0 | C5/C3 | 在 s1 的研究配置页签发送一条管理指令，得到一个 receipt（`sent`），然后切到 s2： json { "afterSend": "{\"receipt\":{\"state\":\"se | - sessionId effect 只 `setEntries`/`reload`/`setEvents`，没有清 `receiptBase` / `receiptDiff` / `replied` / `sendin | - 证据 = `tests/cockpit/config-feed-session.spec.mjs` BUG-108 接线。 | 有（合并标题） | G17 |
| 109｜run source picker 的 delivered.json/acceptance.md 只查名字——同名目录让 run 被当已交付、eligible | P2 | F0 | C4/C3 | `drt_x/` 里 `delivered.json` 是目录（不是文件），run.md `phase: accepted`、final 正常： json {"status":"eligibleRun | - `runFiles` 来自 `listDir`，包含 `type`； | - 证据 = `tests/cockpit/run-source-picker.spec.mjs` BUG-109。 | 有（无标题） | G8 |
| 110｜nodeRunSource 跟随 symlink run bundle——drt_x 可指向工作区外，run-context/status 读取外部文件 | P2 | F8 | C6/C5 | 工作区里 `drt_evil` 是指向工作区外目录的 symlink： json { "listed": [{ "name": "question.md", "type": "file" }], "o | - `nodeRunSource` 直接 `join(base, path)` 后 `readdirSync`/`readFileSync`/`statSync`， 默认跟随 symlink； | - 证据 = `tests/run/run-context-node.spec.mjs` BUG-110 symlink。 | 有（门禁） | G8 |
| 111｜method-library 写工具跟随 method-library.md symlink——可把库写到工作区外 | P2 | F8 | C6/C3 | 工作区 `method-library.md` 是指向外部文件的 symlink： json { "symlink": true, "linkTarget": ".../outside-target. | - `readLibrary(path)` 直接 `readFileSync`，跟随 symlink； | - 证据 = `tests/pack/method-library-io.spec.mjs` BUG-111 symlink。 | 有（门禁） | G8 |
| 112｜planVersionsOf 的 recorded 斜杠字段无上下文——正文 bullet `- 参考 / v1 /` 被当重写记录，制造 versionConflicted | P2 | F0 | C4/C3 | plan 头部声明 v3，正文备注有一个普通 bullet 含 `/ v1 /`： json { "currentPlanVersion": 3, "recordedPlanVersion": 1, | - recorded 的斜杠分支只要求 `[-*]` 开头 + 任意文本 + `/ vN /`，没有「重写记录」上下文/表头； | - 证据 = `tests/cockpit/run-version.spec.mjs` BUG-112。 | 有（合并标题） | — |
| 113｜port-reclaim 身份判定按仓库路径子串——仓库里启动的无关进程仍会被 SIGKILL | P2 | F0 | C12/C6 | `isOwnListener` 只要求命令行匹配 `vendor/dsh／...bin.ts／dsh-deep-research-pack／ai_dsh_deep_research`： json {" | - 正则 `/(?:vendor[\\/]dsh／apps[\\/]cli[\\/]src[\\/]bin\.ts／dsh-deep-research-pack／ai_dsh_deep_research)/` 对整条 ` | - 证据 = `tests/run/port-reclaim.spec.mjs` 仓库脚本/tail/dsh web。 | 有（同文件） | G6 |
| 114｜withMethodLibraryLock 释放无 owner token——陈旧锁被接管后，旧 owner 会删掉新 owner 的锁 | P2 | F8 | C5/C1 | A 持锁； | - acquire 写 `{pid, at}`，但 release 不读回/不比对； | - 证据 = `tests/pack/method-library-io.spec.mjs` token 释放。 | 有（门禁） | G5 |
| 115｜BUG-081 修复后 zh `namePlaceholder` 仍建议全角括号名称——照示例输入立刻被拒 | P2 | F0 | C2/C4 | BUG-081 的修复新增了名称校验：含全角括号的名称拒绝保存。 | - 修 BUG-081 时改了 `methodNameIssue`/保存校验，没有同步 `zh.namePlaceholder`； | - 证据 = `tests/cockpit/locales.spec.mjs` BUG-115。 | 有（门禁） | G4 |
| 116｜latestPresentedFinalVersion 最后一条 present 不含版本时保留旧版本——与 latestFinalDelivery 错位 | P2 | F0 | C3/C4 | 两次 present：先 `drt_x/final/v2.md`，后 `drt_x/final.md`（不带版本）： json { "latestDelivery": { "path": "drt_x | - `latestPresentedFinalVersion` 遍历事件，`latest` 只在 `versions.length > 0` 时更新； | - 证据 = `tests/run/final-target.spec.mjs` BUG-116。 | 有（门禁） | G3 |
| 117｜useStatusFeed 切会话只清 journal/rows，trust/face/unbound 仍保留旧值——旧绑定继续驱动新会话扫描 | P2 | F0 | C5/C3 | s1 有一条 write 绑定 `drt_old/run.md`； | - sessionId effect 只重置 journal 派生 state； | - 证据 = `tests/cockpit/status-feed.spec.mjs` BUG-117。 | 有（门禁） | G17 |
| 118｜useStatusFeed 的 leads.md/findings.md 仍用 names.has——同名目录被当步骤文件 | P2 | F0 | C4/C3 | run bundle 里 `leads.md` / `findings.md` 是目录： json { "namesHasLeads": true, "hasFileLeads": false, "n | - `useStatusFeed` 的 `deriveSteps` 输入仍 `leads: names.has('leads.md')` / `findings: names.has('findings.md')`； | - 证据 = `tests/cockpit/status-feed.spec.mjs` BUG-118。 | 有（无标题） | G8 |
| 119｜useConfigFeed 切会话清 receipt 但不清 events/adoption——旧绑定继续驱动新会话的「本次研究」 | P2 | F0 | C5/C3 | s1 有一条 write 绑定 `drt_old/run.md`，切到 s2（journal 无新帧）： json {"afterS1":"{\"adoption\":\"unrecorded\"}" | - sessionId effect 没有 `setEvents([])` / `setAdoption(no-run)`； | - 证据 = `tests/cockpit/config-feed-session.spec.mjs` BUG-119。 | 有（门禁） | G17 |
| 120｜method-library 安全路径只拒 symlink——hardlink 是普通文件，读可越界读工作区外内容 | P2 | F8 | C6/C4 | 工作区 `method-library.md` 是到外部文件的 hardlink： json { "safePath": ".../ws/method-library.md", "readOutsid | - `safeMethodLibraryPath` 只拒 symlink/非普通文件； | - 证据 = `tests/pack/method-library-io.spec.mjs` hardlink。 | 有（门禁） | G8 |

### §A.4 BUG-121..159

| BUG｜标题 | 严重 | 层 | 主/辅 | 触发（卡内症状） | 漏检缺口（卡内失败类/根因） | 修复后守卫 | 红录 | 复发 |
|---|---|---|---|---|---|---|---|---|
| 121｜isCompletedMethodSourceRun 的 phase 行不接受尾部注释——模板带 `#` 注释，accepted 被读成未完成 | P2 | F0 | C4/C3 | run 模板的状态头本身就是带注释的形态（`- phase: briefing # ...`）。 | - `acceptedHeader` 正则以 `\s*$` 结束； | - 证据 = `tests/cockpit/method-library-read.spec.mjs` BUG-121。 | 有（门禁） | — |
| 122｜finalPathOf 后缀匹配接受 `notes/drt_x/final.md`——非 bundle 路径被当终稿族 | P2 | F0 | C4/C6 | json {"path":"drt_x/final.md","finalPath":"drt_x/final.md"} {"path":"archive/drt_x/final.md","finalP | - `FINAL_FAMILY_SUFFIX` 没有 `^`/前缀约束，`finalPathOf` 对任意字符串找后缀； | - 证据 = `tests/run/final-target.spec.mjs` BUG-122。 | 有（无标题） | G8 |
| 123｜isDefault 精确标记仍看整条 title——provenance 里含〔默认偏好〕被误判默认（render 可生成） | P2 | F0 | C3/C4 | 标记出现在 provenance 括号内，不是独立的默认标记： json {"label":"no marker","name":"方法","provenance":"来源","isDefault": | - `isDefault: title.includes('〔默认偏好〕')` 对整条标题做子串； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-123。 | 有（门禁） | G4 |
| 124｜heading 段间空白——fold 接受 `## 方法 （来源）` / `（来源） 〔默认偏好〕`，upsert 只认无空白段，同名被复制 | P2 | F0 | C4/C3 | 标题在 name/provenance/标记之间带空格： json {"heading":"## 方法（来源）〔默认偏好〕","beforeName":"方法","beforeDefault":tru | - `methodHeadingPattern`：`name` 后直接 `(?:(?:（…）)／(?:〔…〕))*\s*$`； | - 证据 = `tests/cockpit/library-fold.spec.mjs` BUG-124。 | 有（门禁） | G4 |
| 125｜无 `##` 的 plan：headerBlock=全文，版本取 last——注释说退化首个，正文旧版本仍覆盖 | P2 | F0 | C4/C3 | plan 没有 `##` 分节，头部 v2、正文有旧版引用： json { "runVersionCurrent": 1, "planIndexVersion": "v1", "expected": | - `headerBlock = withoutComments.split(/^##\s/m)[0] ?? withoutComments`； | - 证据 = `tests/cockpit/plan-index.spec.mjs` + `tests/cockpit/run-version.spec.mjs` BUG-125。 | 有（门禁） | — |
| 126｜withMethodLibraryLock 陈旧判定只看 mtime——活 pid 持锁 >30s 被另一个写者接管 | P2 | F8 | C5/C3 | 锁文件写的是当前活 pid，只把 mtime 做旧 60s： json {"pid":5575,"pidAlive":true,"oldLockTakenOver":true,"bug":true} | - 陈旧判据 = `mtime > 30s`，没有 `process.kill(pid,0)`/心跳； | - 证据 = `tests/pack/method-library-io.spec.mjs` 活 pid 锁。 | 有（门禁） | G5 |
| 127｜library-fold 只识全角括号——半角 `(来源〔默认偏好〕)` 的标记被当默认，且名称含 provenance | P2 | F0 | C4/C3 | 条目标题模板是全角 `## 名（日期，来源）〔默认偏好〕`； | 同一处两行都只认全角： js const openParen = title.indexOf('（') name: … title.slice(0, openParen) … isDefault: title.repla | 与 [BUG-123](../../fixed_bugs/BUG-123-default-marker-in-provenance.md)/ [BUG-124](../../fixed_bugs/BUG-124-heading-whitespace-between-segments.md) 同族： 那两条只 | 有（门禁） | G4 |
| 128｜method 写路径的标题正则不认全角空格（U+3000）——编辑一次就多出一条同名方法 | P2 | F0 | C4/C3 | 方法库标题里只要出现全角空格（中文输入法下极常见），`foldLibrary` 能正确读出 name，但 `upsertMethodEntry` 认不出同一标题 → 编辑/保存时新建一条同名条目： ／ | js return new RegExp(`^##\\s+${escapeRegExp(name)}(?:[ \\t]*(?:（[^）\\n]*）／〔[^〕\\n]*〕))*[ \\t]*$`, 'm') 名称与括号段之 | 与 [BUG-124](../../fixed_bugs/BUG-124-heading-whitespace-between-segments.md) 同族 （那条修了半角空白）； | 有（门禁） | G4 |
| 129｜finalPathOf 丢弃绝对路径的根——跨 workspace 的同 slug 交付被别名成当前 cwd 的 bundle | P2 | F0 | C6/C4 | `deliverables/presented` 的路径通常是绝对路径。 | js // 绝对路径：拒绝明显非 bundle 容器下的嵌套； | [BUG-122](../../fixed_bugs/BUG-122-final-path-nested-non-bundle.md) 的未跑面包屑 （绝对路径工作区根校验）； | 有（门禁） | G8 |
| 130｜方法库锁遇「活 pid」永久卡死（pid 复用/挂起属主），且错误文案不给恢复入口 | P2 | F8 | C5/C1 | 锁判据是「属主 pid 存活 → 绝不接管（无论 mtime 多旧）」： js if (pid !== null && pidAlive(pid)) throw new Error('另一个方法库写入 | - 无「锁龄上限 + 显式接管」的宽限：活 pid 是唯一真理，mtime/`at` 完全不参与； | [BUG-126](../../fixed_bugs/BUG-126-method-lock-stale-live-pid.md) 的下一层「pid 复用/ 心跳/flock 语义」； | 有（门禁） | G5 |
| 131｜research-defaults 的 unknown-key warning 无人消费——打错关键字静默失效，下一次写入静默删除 | P2 | F0 | C1/C4 | 手写 `research-defaults.json` 时打错关键字（极常见：`efort`、`audiance`），系统完全静默： json { "schema": 1, "revision": 3 | 1. `parseDefaults` 把未知键归为 warnings（而不是 problems），值里只保留已知字段； | D50（项目研究默认）实现内； | 有（门禁） | G16 |
| 132｜/research-defaults 的 expectedRevision 不是原子 CAS——并发写入双双成功，丢一次更新 | P2 | F8 | C5/C1 | 两个写者用同一个 `expectedRevision` 并发写，两边都返回成功： $ # 8 个进程同时：set {"expectedRevision":3,"patch":{"effort":"<b | `runSet` 的序列是「读当前（readCurrent）→ 比 expectedRevision → merge → 写临时文件 → rename → 回读」， 没有跨进程锁，也没有在 rename 前再次比对磁盘 | D50 实现内； | 有（门禁） | G5 |
| 133｜sanitizePatch 对 output/source 的未知子键「静默忽略」——与头注「未知子键拒绝」相反，拼错即丢 | P2 | F0 | C1/C3 | `set` 的 patch 里，顶层未知键会被拒绝，但 output/source 的未知子键被静默丢弃、写入照常成功： js sanitizePatch({ efort: 'deep' }) // | `normalizeOutput`/`normalizeSource` 把未知子键写进 warnings 数组； | 头注与实现的自相矛盾（合同写了「拒绝」，实现只丢弃）是本条的核心； | 有（门禁） | G16 |
| 134｜门③见证绑定扫描整段 args 文本——content 里提到 `drt_<别的>/` 就把会话绑到别的 bundle，拍板见证可被借用 | P1 | F0 | C3/C2 | 门②/③的会话绑定（`boundSlugsOf`）对 `tool/call` 的 arguments 原文做 `drt_<slug>/` 子串扫描， 不区分「路径字段」与「文件正文」。 | 1. pack 侧 `slugInArgs` 已经修过 BUG-090（只认真实路径字段，content/pattern 正文不参与），但门侧是 另一份实现：`boundSlugsOf` 直接 `String(argum | [BUG-090](../../fixed_bugs/BUG-090-bundle-bind-content-false-positive.md)（pack 侧 content 误绑）的门侧漏网； | 有（门禁） | G9 |
| 135｜slug 字符集未成文，绑定只认 `[a-z0-9-]`——`drt_my_topic/` 静默不绑定（状态页签/归因/见证全失效） | P2 | F0 | C4/C3 | 所有「会话 ↔ run bundle」的绑定都按 kebab-only 提取 slug： js const m = /(?:^／[\\/])drt_([a-z0-9][a-z0-9-]*)[\\/]/ | 1. 绑定/见证/归因三处共用一个未成文的 slug 字符集（kebab）； | [BUG-090](../../fixed_bugs/BUG-090-bundle-bind-content-false-positive.md)（content 误绑） 与 [BUG-134](BUG-134-gate-witness-bound-slugs-scans- | 有（门禁） | G9 |
| 136｜defaults-probe 自锁——泄漏的 3124 宿主 + 身份检查 → 拒绝收割、探针永远「未跑」 | P2 | F4 | C5/C6 | $ node probes/behavior/defaults-probe.mjs defaults-probe: 端口 3124 预收割失败：端口 3124 的 listener pid 73948 | 1. 固定默认端口：3124 是 probe 的默认值； | [BUG-113](../../fixed_bugs/BUG-113-port-own-listener-overmatch.md)（端口身份精确化） 的反面后果：收紧身份后缺少「自家宿主标记 + 退避」。 | 仅探针 | G6 |
| 137｜D50 真模型探针 C5 红——语言被写进「沿用项目默认」选项名（语言冒充项目默认） | P2 | F4 | C7/C9 | 真模型探针 `defaults-probe` 在 seeded 场景（`research-defaults.json` 设了 depth/output/source）跑出： PASS seeded：项 | 1. 已被证明：模型在 seeded 场景把语言写进含「项目默认」的选项 label，违反 research-brief 的 「语言不是项目默认」； | D50（`research:defaults`）与 `defaults-probe` 的 C5； | 有（门禁） | — |
| 138｜标题带未识别后缀的方法条目——编辑会新建同名条目，旧条目成为「删不掉、改不动」的幽灵 | P2 | F0 | C4/C3 | 方法标题在标准段之后带了任意未识别文本（用户/模型自然写法）时： md | 1. 写路径的标题识别是白名单正则（只认（…）/〔…〕段），而 fold 的 name 提取是宽松的 （按「最后一个括号前」截断）——两者对「同一标题」的定义不同； | [BUG-124](../../fixed_bugs/BUG-124-heading-whitespace-between-segments.md) / [BUG-127](BUG-127-library-halfwidth-parens-provenance-defaul | 有（门禁） | G4 |
| 139｜research-defaults.json 带 UTF-8 BOM 即被判「parse 错」——整份设置失效，Windows 编辑器常规产出 | P2 | F0 | C4/C1 | 用户手工编辑（Windows 记事本、PowerShell `Out-File`、部分 IDE 的「UTF-8 with BOM」）后的 `research-defaults.json` 内容完全合法 | `parseDefaults` 直接 `JSON.parse(text)`； | D50 设置面； | 有（门禁） | G16 |
| 140｜isHitl2Row 的词表双向误判——「待用户确认」仍算拍板（门③ fail-open 复发），「无异议/OK/approved/采纳」不算（误杀） | P1 | F0 | C7/C1 | ### A. fail-open 复发：「待用户确认」被当拍板 075 的修复把否定词表设为 `未拍板／未定／待确认／待定／等待／尚未／未决／待补／待审／未答复／pending`， 但 `待用户确认` | 1. 否定判据是词表枚举（`待确认`），挡不住「待用户确认」「等待你拍板」「未最终裁决」等同义扩展； | [BUG-075](../../fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md)（已修） 的复发：那条只枚举了 `待确认`，本卡证明词表路线挡不住同义扩展。 | 有（门禁） | G1 |
| 141｜readiness 行内引用的修复只认上下文关键词——旧引用带关键词、真实判定不带 → 仍被旧值劫持（双向） | P1 | F0 | C7/C3 | 074 的修复新增 `lastInlineVerdict`：只认引号/加粗范围之外、且前 20 字符含 「本轮／终局／真实／最终／当前／最后」的 `readiness:`。 | 1. 「旧引用」与「真实判定」的区分被压在上下文关键词上，而不是「谁未被引用包裹」； | [BUG-074](../../fixed_bugs/BUG-074-readiness-inline-quote-hijack.md)（已修）的 复发：那条的修法把「引用」与「真实」的分界押在关键词上，本卡证明关键词不是可靠分界。 | 有（门禁） | G2 |
| 142｜client-load 的绑定会话选择未限定 lead——富的 method-editor 会话被选中，状态页断言假红（X8 68 PASS / 4 FAIL） | P2 | F2 | C8/C7 | 在 `275b8c03` 上跑 `client-load.entry`： FAIL 重入点描边（回边落点 = 挖掘； | `client-load-reference.support.mjs` 的 `boundSession` 只按「近窗绑定 + 事件数 ≥ RICH_FLOOR + 标题唯一」选最新， 不校验会话是不是 lead 根： js const | 与 [BUG-143](../../fixed_bugs/BUG-143-method-editor-root-has-team-lead-tools.md)（method-editor 越权） 同场景； | 有（门禁） | G13 |
| 143｜method-editor 根会话仍拿到 Team Lead 工具与身份——实测在 method-editor 会话里 spawn_teammate / team_task / 写 run.md | P2 | F6 | C2/C3 | `runtime/harness-home/sessions/…/method-coach-0d7456dd-…` 的 header： agentPreset = method-editor, del | 1. vendor `tool-agent-team` 在 profile 级启用、不按 preset 门控（BUG-071 已确认）； | [BUG-071](../../fixed_bugs/BUG-071-root-scout-injected-team-lead-identity.md) 的 残留面（当时只覆盖 scout/analyst/critic，method-editor 明确列为未覆盖）； | 有（门禁） | — |
| 144｜run-kickoff 的代理记账行被 075 的词表修复打哑——「OK/继续/就按这个吧」的合法代理拍板不再算 HITL2 行 | P1 | F0 | C3/C1 | `run-kickoff --session … --prompt "<文本>"` 是官方记录的「自由文本关闭挂起」恢复手段； | 1. 写侧/读侧不成对：`closingProvenanceRow` 的行文固定为 `…代理模拟…：交付审阅 → 「<用户原话>」……`，它保证的是「这是代理拍板」的出处，不保证原话含决策词； | [BUG-075](../../fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md)（已修） 的副作用：[BUG-140](BUG-140-hitl2-vocabulary-two-way-misclass | 有（门禁） | G1 |
| 145｜manualEvidenceOf 以任意 `##` 为节尾——人工走查里出现二级标题，整节/尾部在重跑验收时静默丢弃（062 复发） | P2 | F0 | C3/C4 | 人工走查节由人书写，可能含二级标题（组织笔记的自然写法）。 | js const start = lines.findIndex((line) => /^##\s*人工走查\s*$/.test(line)) const rest = lines.slice(start + 1) co | [BUG-062](../../fixed_bugs/BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md)（已修） 的边界复发：那条修了「保留人工走查」的主路径，本卡指出「节内二级标题」仍会让保 | 有（门禁） | G7 |
| 146｜HITL 判型/答复识别只认中文文案——英语卡让门③必红、UI 停靠点误判（id 本已语言无关） | P2 | F0 | C7/C2 | HITL 卡片的判型与答复识别都依赖中文文案签名： js // client: askKindOf if (text.includes('定稿（按现稿交付）')) return 'hitl2' if | 1. 判型签名被写成文案子串（`研究类型` / `定稿（按现稿交付）` / `按现稿定稿`）； | [BUG-140](../../fixed_bugs/BUG-140-hitl2-vocabulary-two-way-misclassification.md)（词表双向误判）/ [BUG-141](BUG-141-readiness-inline-context-key | 有（门禁） | G14 |
| 147｜client-hitl.entry ⑤b 把「共作答 0 题」当通过——代理一题未答，却断言「挂起卡已答」 | P2 | F2/F4 | C7/C8 | `client-hitl.entry` 全绿（12 PASS），但 ⑤b 的日志明细是： PASS ⑤b 挂起卡已答（hitl-answer 子进程——代理模拟，如实标注） （hitl-answer: | js const answeredOk = answeredRun.status === 0 && /共作答 \d+ 题/.test(answeredRun.stdout ?? '') 1. `\d+` 匹配 0——计数 | `hitl-answer` 驱动与 `client-hitl` 的同一证据链； | 有（门禁） | — |
| 148｜evidence-audit 只回溯 ≥16 字的引文——短伪造摘录完全不进审计（无 finding） | P2 | F6 | C7/C4 | js const m = /^>\s*(.+)$/.exec(line) if (m && m[1].trim().length >= 16) rec.quotes.push(m[1].trim()) | 1. 长度门槛（16 字）本意是排除 `>` 注记/标签这类非引文行，但它同时排除了所有短引文； | 与 [BUG-147](../../fixed_bugs/BUG-147-client-hitl-zero-answers-false-green.md)（「0 题」也算通过）同族：门槛/计数的 静默放行。 | 有（门禁） | — |
| 149｜isHitl2Row 的 pending 词表仍有洞——「等回复/未最终裁决/挂起/推迟/未决/on hold」都被当拍板（140 修复的默认放行放大） | P1 | F0 | C7/C1 | 140 的修法把判据反成「pending 优先、否则默认拍板」： js const HITL2_PENDING = /(?:待(?:用户)?确认／待定／等待／尚未／暂缓／未拍板／未定／未答复／pend | 1. 「默认拍板」与「pending 词表」不匹配：默认放行的安全前提是 pending 判定完备，而词表永远不完备； | [BUG-140](../../fixed_bugs/BUG-140-hitl2-vocabulary-two-way-misclassification.md) （已修）的复发； | 有（门禁） | G1 |
| 150｜readiness 行内仲裁仍以「关键词窗口」区分真实判定——`随后/复核后/结论/本 run` 的裸写 FAIL 仍被旧 PASS 劫持 | P1 | F0 | C7/C3 | 141 的修法给裸写判定加了更多「上下文关键词」，但裸写的真实判定仍需命中关键词才会被采纳； | 1. 「旧引用 vs 真实判定」的分界仍是关键词白名单，而不是「是否被引号/加粗包裹」+「位置」； | [BUG-141](../../fixed_bugs/BUG-141-readiness-inline-context-keyword-gap.md) / [BUG-074](../../fixed_bugs/BUG-074-readiness-inline-quote-hijack.md)（均已修）的 复 | 有（门禁） | G2 |
| 151｜147 的修法用「点击计数」判已答，与 hitl-answer 自己的判据矛盾——Recommended 预选卡答案已落地却判红（client-hitl ⑤b 假红） | P2 | F2/F4 | C8/C7 | 147 的修法： js const answeredCount = answeredCountOf(answeredRun.stdout ?? '') const answeredOk = answe | 1. `answeredCountOf` 读的是 hitl-answer 的点击计数，不是落地答案； | [BUG-147](../../fixed_bugs/BUG-147-client-hitl-zero-answers-false-green.md)（已修）的 过度修正； | 有（门禁） | — |
| 152｜client-load 的 host-health 收口只认「连接死亡」——负载升高时的状态页断言失败仍判 FAILURE（疑似负载假红） | P2 | F2 | C8/C1 | `client-load.entry` 在主机已不健康（load/cpu 1.54 > 1.5）时仍以断言红收场： FAIL 重入点描边（outline=none（loopOn=true）） FAIL | 1. `isHostUnhealthyVerdict` 的环境判据只覆盖「连接死亡」（页面 URL 变 chrome-error / 请求 refused）， 不覆盖「无断连但渲染慢」的形态； | [BUG-142](../../fixed_bugs/BUG-142-client-load-selects-method-editor-session.md) （选择器修复已验； | 有（无标题） | G12 |
| 153｜protocol-audit 的版本快照只查「文件在场」——`protocol/v1.json = {}` 也 PASS，历史链内容未校验 | P2 | F6 | C7/C1 | 协议 v2 要求保留 v1 的历史快照 `protocol/v1.json`； | 1. `checkAudit` 只接一个 `hasSnapshot` 布尔（文件存在与否），不解析快照内容； | D46（协议版本历史）； | 有（门禁） | G15 |
| 154｜manifest 的 FILE_ROLES 未登记新契约件——protocol.json/protocol-audit.md 角色 unknown，review//waves/ 证据完全不入清单 | P2 | F6 | C2/C1 | 在真实新契约 bundle 上调用 `buildManifest`： js [['audit.md','audit-snapshot'], ['protocol-audit.md','unknown' | 1. `FILE_ROLES` 是 D28 时期的顶层文件表（run/question/topics/plan/leads/findings/review/final/journal/ audit/node-gate/a | [BUG-076](../../fixed_bugs/BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md) （schema 白名单已修）的同族； | 有（门禁） | G15 |
| 155｜manualEvidenceOf 的「已知回执节」来自表格行标签，而生成的 acceptance 没有 `##` 节——人工写 `## 检查/## 清单` 仍整节丢失 | P2 | F0 | C3/C4 | 145 的修法把「任意 `##` 截断」收窄为「只在已知回执节标题截断」，但那张表是： js const ACCEPTANCE_SECTION_TITLES = new Set(['人工走查', '检 | 1. 「已知回执节」集合取自表格行标签（`检查/回执/清单/读者版`），不是真正的 Markdown 节标题； | [BUG-145](../../fixed_bugs/BUG-145-manual-evidence-subheading-truncation.md) / [BUG-062](BUG-062-acceptance-manual-evidence-overwritten-b | 有（门禁） | G7 |
| 156｜门③过滤掉 pending 行后，旧拍板行 + 旧答复仍放行新版本——没有「最新版本必须已拍板」的仲裁 | P1 | F0 | C1/C7 | §Decisions 同时有旧拍板行与最新 pending 行，会话只有旧版本的一次交付审阅答复： md | 1. `hitl2RowGate` 的判定是「存在至少一条 `isHitl2Row` 行」+「本 run 有最新 ask 的答复」——两者都不绑定 版本； | [BUG-075](../../fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md)（行分类）/ [BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassifi | 有（门禁） | G1 |
| 157｜verdicts 的 batch.session 缺失只 warning——伪造裁决可引用不存在的 child 会话通过（身份/原文未核） | P1 | F0 | C1/C7 | 构造一份 claim 表 + 裁决文件，`batch.session = 'fake-session-id'`（不存在的会话），其余字段自洽： problems = [] ← 没有任何红 warnin | 1. `session-missing` 被设计为 warning（「只核到文件自洽」）——对存档后日志被清理的旧 bundle 合理， 但交付时（run-accept 运行的时刻）child 会话必然存在； | D44（claim 级复核）； | 有（门禁） | G15 |
| 158｜verdict-audit 在 review.md 整缺时只 warning——「critical unverifiable + 无 readiness」不产生红（最终靠 node-gate 兜底） | P2 | F0 | C1/C7 | claims 里有一条 critical 且裁决为 `unverifiable`，review.md 整个缺席： reviewText = '' → problems=[] warnings=['un | 1. `pass-with-unverified` 的触发条件挂在「review 的 readiness 解析结果」上； | [BUG-157](../../fixed_bugs/BUG-157-verdicts-missing-session-only-warning.md)（session 缺失）同一类「缺席即放行」； | 有（门禁） | G15 |
| 159｜claims 的 evidence/topics 从未与盘上对账——可引用不存在的证据文件或绝对路径，audit 无红；schema-scan 又只扫 .md | P2 | F6 | C2/C1 | claims 的 `evidence` / `topics` 字段完全没有语义/在场校验： claims[0].evidence = ["evidence/nope.md"] → problems=[ | 1. `parseClaims` 只检查 `evidence`/`topics` 是字符串数组，不检查路径形态（相对/`..`/绝对）与在场； | [BUG-154](../../fixed_bugs/BUG-154-manifest-roles-missing-new-artifacts.md)（review/ 不入清单）/ [BUG-157](BUG-157-verdicts-missing-session-onl | 有（门禁） | G8 |


---

## §B 按主类计数与占比（全量 159）

| 主类 | 计数 | 占比 | 典型卡（每类前 6） | 读法 |
|---|---:|---:|---|---|
| C4 边界 / 解析 | 26 | 16.4% | 038、048、053、054、067、084 | 全量第一；大量“同一判据的输入写法”没有被矩阵覆盖 |
| C3 双份事实漂移 | 25 | 15.7% | 002、012、039、040、046、071 | 最常出现的辅类（48 次）；生产/消费两套实现 |
| C7 假绿 | 21 | 13.2% | 004、015、018、028、032、057 | 含有限词表、在场、计数、点击、自报 |
| C1 静默接受 / fail-open | 20 | 12.6% | 005、006、026、028、041、049 | 缺席/空/读失败/warning 被当合法 |
| C5 状态 / 竞态 / 生命周期 | 17 | 10.7% | 001、007、009、073、086、097 | 锁/端口/feed/日志/资源 |
| C8 假红 | 14 | 8.8% | 021、033、034、045、059、060 | 选择器/环境/主机/时序 |
| C2 消费者遗忘 | 12 | 7.5% | 008、010、042、055、066、076 | 新件/新角色/新文案/新 profile |
| C9 夹具漂移 | 8 | 5.0% | 013、019、027、030、051、080 | 基线/录制/夹具迁就 |
| C6 路径 / 安全 | 6 | 3.8% | 044、078、110、111、120、129 | 逐形态补，未成矩阵 |
| C10 安装 / 发布 / 贵层 | 4 | 2.5% | 011、022、023、024 | 只在 L2/L4/真模型可见 |
| C11 文档 / 规则漂移 | 3 | 1.9% | 008、059、072 | 术语/子串/规则文本 |
| C12 其他（残余桶） | 3 | 1.9% | 077、104、113 | 纯代码缺 import、进程身份 |
| **合计** | **159** | **100%** | | **0 张未归类** |

**辅类计数（同一张卡可多次计为辅类，不等于 159）**：C3 48、C7 25、C1 25、C4 20、C5 11、C2 11、C9 5、C8 5、C6 4、C11 3、C10 2。结论（事实）：**C3 是最常见的“第二失败机制”**——绝大多数卡不是单一错误，而是“主判据错 + 另一份事实没同步”。

**不可归类 / 证据不足清单（不要硬塞）**

- **不可归类：0 张**。159 张都至少能归入一个主类；但下列 8 张的主类有争议，标为**低置信**，引用时请回读卡：
  - `010`（layering 只扫顶层测试文本，未追 import 后的子进程；归 C2/C7 均可）；
  - `022`、`023`、`024`（上游流畸形/重试/直连复发；本仓不可正修，归 C10）；
  - `025`、`026`（卡内无 `## 症状`/`## 根因` 节，按 README 摘要与修复段归 C3/C1）；
  - `070`（卡内无 `## 症状`，是“机制被证伪 + 残留接线”，归 C3）；
  - `077`（纯缺 import 的 ReferenceError，归 C12 残余桶）。
- `C12` 的 3 张（077、104、113）不是稳定失败类；若下一版要合并，建议 077 → C3（模板/实现不同步）、104/113 → 新设 C13“进程/资源所有权”。

**复算命令（只读）**

```sh
# 行数（应 159）
grep -cE '^\| [0-9]{3}｜' runtime/dsh-test-strategy-research/failure-class-census.md
# 主类计数（第 5 个 | 分隔字段）
awk -F'|' '/^\| [0-9]{3}｜/{gsub(/ /,"",$5); split($5,a,"/"); print a[1]}' \
  runtime/dsh-test-strategy-research/failure-class-census.md | sort | uniq -c
# 红录状态分布（第 8 个字段）
awk -F'|' '/^\| [0-9]{3}｜/{gsub(/^ +| +$/,"",$8); print $8}' \
  runtime/dsh-test-strategy-research/failure-class-census.md | sort | uniq -c
```

---

## §C 复发链全量（17 条）

> 判定口径：同一机制在两个以上 BUG 卡里再次出现（卡内自述“复发/邻接/同族/下一层”或编号链可复核）。`当前关闭断言` 只写测试/门禁里**真的存在**的断言；`剩余空白` 写仍未机械化的面。

| 链 | BUG | 共同机制 | 当前关闭断言 | 剩余空白 |
|---|---|---|---|---|
| G1 HITL2 行语义 | 075、140、144、149、156 | 自然语言 §Decisions 行；否定/决策有限词表；写侧与读侧不成对；无版本配对 | `tests/run/node-gate-witness.spec.mjs` 五代用例；D51 门③事件链；149 后 fail-closed | 自由散文行仍靠词表；版本配对只在门③；历史中文行兼容 |
| G2 readiness 行内仲裁 | 040、046、074、141、150 | 终局判定从自由文本解析；引用/关键词/位置 | `tests/run/review-readiness.spec.mjs`；`tests/contracts/verdict-conformance.spec.mjs` 五不变量；门委托单一正本 | 真实 review 的自由散文/模板变体仍开放；跨行规则靠成文 |
| G3 present/交付版本 | 101、103、116 | 版本从路径后缀/max/最后事件推 | `tests/run/final-target.spec.mjs`；`tests/contracts/present-version-conformance.spec.mjs` 四不变量 | 同事件多文件、readable-vN、跨 workspace 组合未成矩阵 |
| G4 方法库 heading/名称 | 081、083、115、123、124、127、128、138 | 读/写/渲染三处 heading 语法；全角/半角/空白/顺序/后缀 | `tests/cockpit/library-fold.spec.mjs` 41 例；`library-heading-codec` 单一 codec | 自由后缀/多标记/旧格式组合仍可能造重名；`method-library-write` 与 fold 仍两份 |
| G5 锁与读改写 | 073、097、098、114、126、130、132 | 建锁窗口、lost update、非原子写、owner token、活 pid、CAS | `tests/run/run-lock.spec.mjs`；`tests/pack/method-library-io.spec.mjs`；`tests/pack/defaults-command.spec.mjs` | 无统一 lease/heartbeat；run lock 与 method lock 两套；NFS/pid 复用未测 |
| G6 端口/宿主身份 | 104、113、136 | 用命令行子串判进程身份；固定端口；失败路径留宿主 | `tests/run/port-reclaim.spec.mjs`（104/113）；136 只有探针实跑 | 自家宿主标记/退避/清理无 keyless 回归；136 是活缺口 |
| G7 人工走查 | 062、145、155 | 人工节边界按 Markdown 标题；已知节集合来自表格标签 | `tests/run/run-receipt.spec.mjs`（062/145/155） | “已知回执节”与生成器仍可能不同源；`--repair` 字节级保留未测 |
| G8 路径/类型/在场 | 078、100、109、110、111、118、120、122、129、159 | 名字/后缀/字符串代替路径段、entry.type、根、符号/硬链接 | `tests/run/final-target.spec.mjs`／`run-context.spec.mjs`／`pack/method-library-io.spec.mjs`／`run-receipt.spec.mjs` 逐形态 | 无 symlink/hardlink/绝对/`..`/目录/JSON 内容形态矩阵；159 的 JSON 绝对路径仍无扫描 |
| G9 bundle 绑定 | 090、134、135 | args 全文 vs 路径字段；slug 字符集成文 | `tests/run/bundle-bind.spec.mjs`；`tests/run/node-gate-witness.spec.mjs`；`RUN_SLUG` | 其他消费者（presentGate/bundle-sessions）仍可能另写；非 kebab slug 兼容 |
| G10 回放资产 | 019、027、030、051、080 | 录制就绪、C5 捕获、活动行、基线陈旧 | `tests/run/replay-fixtures.spec.mjs`；`snapshot-replay.entry` C0–C5 | `source` 只校验形状（hex/date），无 HEAD 差距/新鲜度；C5 仍浏览器层 |
| G11 i18n/locale | 055、059、061、063、068、069 | locale-owned 文案/定位器/品牌/内置内容 | `tests/cockpit/locales.spec.mjs`、`i18n.spec.mjs`、`cjk-source.spec.mjs`；回放/client-load 真机 | en 运行面无浏览器档；新 chrome 文案可再单语 |
| G12 主机健康 | 060、152 | free/load 判据；NOT-RUN 收口 | `tests/run/host-health.spec.mjs` | 标题仍写旧语义“只在连接死亡”；负载/环境与产品混判仍是单点 |
| G13 client-load 选会话 | 001、003、142 | 绑定选择/盘侧 vs UI 双源 | `tests/run/bundle-bind.spec.mjs`；`tests/run/client-load-select.spec.mjs` | 选择器仍可按近窗/事件数漂移；富非 lead 会话 |
| G14 HITL 双语 | 146 | HITL 判型/答复只认中文子串 | `tests/run/node-gate-witness.spec.mjs` 的 id-first + 多语 label | 历史中文卡/自由 label 兼容；英文 UI 运行档 |
| G15 证据出处/在场 | 153、154、157、158 | 文件在场/警告代替内容/出处；清单/审计各一份 | `tests/run/protocol-core.spec.mjs`、`run-receipt.spec.mjs`、`verdict-audit.spec.mjs` | 工件注册分散（schema-scan/manifest/verdict-audit/文档）；必要输入缺席的统一口径 |
| G16 设置输入 | 131、133、139 | 用户手写小偏差：未知键、嵌套未知键、BOM | `tests/pack/research-defaults.spec.mjs`、`defaults-command.spec.mjs` | 未知键 × 嵌套 × BOM × 空/畸形组合矩阵未建 |
| G17 feed 跨会话 | 086、087、108、117、119 | 切会话不 reset 异步/交互态 | `tests/cockpit/config-feed-session.spec.mjs`、`status-feed.spec.mjs` | 无通用 feed reset harness；新 feed 仍可能忘 reset |

**链的读法（事实）**：17 条链覆盖 **76 张卡**（47.8%）；其余 83 张是单发或只被 §A 的主/辅类关联，不强行编链。G1/G2/G4/G5/G8/G10 是“多代同链”，也是 §D 里最该优先补的守卫面。

---

# 第二部分 沉淀缺口与建议

## §D “修了但没沉淀”全量清单

> 口径：**没有永久 keyless 测试/门禁断言**，或只有 smoke/浏览器/探针/一次性 harness，或测试存在但标题/账本没登记。D-1 = 完全缺永久 keyless 守卫；D-2 = 有守卫但未入 BUG 账/只在贵层。每行给“最小永久守卫”建议（node:test + `tests/`，不引入新框架）。

### D-1 无永久 keyless 守卫（24 张）

| BUG | 修了什么 | 现有守卫（事实） | 最小永久守卫建议 |
|---|---|---|---|
| 003 | client-load 手抄盘侧谓词 | 仅 client-load smoke | `tests/run/client-load-reference.support.spec.mjs`（新）源扫描：必须直调 `deriveAnchors`，禁止手抄 `delivered ∨ tailAskPending` |
| 009 | 文档承诺“终局化”不存在 | 只改 61/手册/技能 | `tests/contracts/docs-consistency`：扫“自动 X”句 + 机制 allowlist；每条链到盘侧实现 |
| 010 | layering 未追 import 执行路径 | 只改测试样本/候选 | `tests/contracts/layering` 加 import 闭包 + `execSync` spy 负例 |
| 012 | dashboard 复制状态判据 | 无 tests | `tests/run/run-dashboard-core.spec.mjs`（新）：dashboard 必须调用 `hitl-fold`/共享折算，禁止第二份状态机 |
| 013 | replay persona 金标准过期 | 只重录基线 | `tests/run/replay-fixtures`：校验 `source.codeAnchor/recordedAt` 与 HEAD 差距 + B 层 keyless |
| 018 | B 层覆盖声明 > 实际 | 只改 smoke（永久 smoke 自守） | `tests/run/replay-request`：`JUDGED_KINDS` 与 fixture 注入种类双向对账 |
| 022 | 上游畸形终止回合 | vendor seam + 探针/trigger | `tests/run/stream-failure`：`event precedes message_start` 分类/恢复断言（与 023 共用） |
| 024 | 直连畸形复发 | socket 隔离 + trigger | 同上 + direct-egress 签名回归 |
| 026 | 面板 40 行截断 | 只改 UI | `tests/cockpit/workspace-files`：panel 读面 limit/eof 断言（与 088 同源） |
| 027 | C5 捕获就绪 | 只改 smoke | `tests/run/replay-request`：`captureReadyOf` 纯函数（历史就绪 + tool/call 集合） |
| 028 | 隔离失败静默透传 | 一次性 harness | `tests/run/llm-socket-isolation.spec.mjs`（新）：强制初始化失败 → 断言不回落 + 可数 |
| 030 | C5 复发（哨兵/活动行） | 只改 smoke | `tests/run/replay-request`：当前回合哨兵 + 活动行稳定窗纯函数 |
| 033 | brief 水合间歇缺行 | 只改 browser smoke | `tests/cockpit/brief-fold.spec.mjs`（新）：已交付三行 + 有界等待谓词 |
| 034 | capsule 默认视图 | 只改 browser smoke | `tests/run/client-load-select`：按 id 显式打开，不依赖默认视图 |
| 036 | brief 缺 pending 行 | 只改 browser smoke | `tests/cockpit/brief-fold.spec.mjs`（新）：pending-review 行 + 旧轮不夺权 |
| 045 | graph 流断连假红 | 只改 browser smoke | `tests/cockpit/graph-model.spec.mjs`：读失败态 vs 未绑定态可分 |
| 051 | `paneRows` 未声明 | 只改 smoke | `tests/contracts/script-identifiers.spec.mjs`（新）：扫 smoke 引用的顶层标识符 |
| 059 | zh 页签定位器 | 只改回放 smoke | `tests/run/web-ui-nav.spec.mjs`（新）：locale-owned 文案 regex 正反例 |
| 061 | 右栏 chrome 英文 | 只改回放 smoke | `tests/run/web-ui-nav.spec.mjs`（新）：expand/collapse/new-tab 双语常量 |
| 063 | 预览/展开更多英文单语 | 只改 smoke/probe | `tests/run/web-ui-nav.spec.mjs`（新）：preview heading/continue 双语 + 负例 |
| 079 | smoke 死 import | 只跑 smoke | `tests/contracts/smoke-contract`：逐 smoke 入口 import/启动检查 |
| 080 | research-face 基线陈旧 | 只重录 | `tests/run/replay-fixtures`：source 身份 + 新鲜度 + mcp 形态 |
| 095 | bootWeb timer 泄漏 | 一次性 active-resource 探针 | `tests/run/web-harness.spec.mjs`（新）：成功/失败/早退 timer=0 |
| 136 | probe 端口自锁 | 只 probe 实跑 | `tests/run/port-reclaim`：自家宿主标记 + 端口退避/清理 |

### D-2 有守卫但未入 BUG 账 / 只在贵层（17 张）

| BUG | 已有守卫 | 为什么不在账上 | 最小动作 |
|---|---|---|---|
| 001 | `tests/run/bundle-bind.spec.mjs` 矩阵 | 测试标题不带 BUG-001 | 加标题 + 负例留证块；或登记到 `guard-red-record` 的等价账 |
| 011 | release.entry / 部署契约 | 无 BUG 号；只有 smoke | `tests/contracts/release-modes`：install-only vs 默认凭据检查 |
| 016 | `md-links-untracked` gates.e2e 案例 | 只有 gate 案例 | 在卡/索引里登记该案例；或加 BUG-016 命名的 gate case |
| 023 | `tests/run/stream-failure.spec.mjs` | 测试标题不带 BUG-023 | 加标题 + 负例留证 |
| 025 | `tests/cockpit/library-fold.spec.mjs` legacy 用例 | 测试标题不带 BUG-025 | 加标题 + `legacyText` 断言 |
| 031 | `tests/run/ask-drive.spec.mjs` | 测试标题不带 BUG-031 | 加标题 + sidebar 判据负例 |
| 032 | `tests/run/ask-drive.spec.mjs` | 测试标题不带 BUG-032 | 加标题 + custom 文本进批断言 |
| 037 | `tests/run/ask-drive.spec.mjs` | 测试标题不带 BUG-037 | 加标题 + 兜底史文案断言 |
| 042 | `sync-pack-workspace` 种子守卫 + probe | 无 keyless tests | 把种子三态断言放进 `tests/contracts/` + 加 BUG 标题 |
| 047 | `tests/cockpit/method-library-selection.spec.mjs` | 测试标题不带 BUG-047 | 加标题 + 源码扫描负例 |
| 055 | `tests/cockpit/locales/i18n/cjk-source` | 测试标题不带 BUG-055 | 加标题；另加 en 运行 smoke |
| 072 | `release-vocab` gate 正则 | 只有 gate 正反例 | 加 `gates.e2e` case；或 `tests/contracts/release-vocab` 正反例 |
| 106 | `tests/run/replay-request.spec.mjs` | 合并标题 `BUG-091/106` 只登记 091 | 拆成独立 `BUG-106` 标题 + 负例 |
| 108 | `tests/cockpit/config-feed-session.spec.mjs` | 合并标题 `BUG-086/108` 只登记 086 | 拆标题 |
| 112 | `tests/cockpit/run-version.spec.mjs` | 合并标题 `BUG-102/112` 只登记 102 | 拆标题 |
| 113 | `tests/run/port-reclaim.spec.mjs` | 行为在 BUG-104 测试里，标题未写 113 | 拆标题/子测试 |
| 152 | `tests/run/host-health.spec.mjs` | 标题仍写旧语义“只在连接死亡/页面丢失” | 改标题 + 加 BUG-152 负例 |

**统计（事实）**：D-1 24 张 + D-2 17 张 = **41 张**有“沉淀缺口”（25.8% of 159）。其中 D-1 的 24 张没有任何永久 keyless 断言；D-2 的 17 张有测试/gate/smoke，但账本或贵层依赖。

---

## §E Top 5 类级守卫形态（全量口径）

> 全量口径 Top 5 与 60 张样本口径**不同**：全量是 **C4 26 / C3 25 / C7 21 / C1 20 / C5 17**；60 张样本曾是 C3/C7/C5/C1/C2。差异来自样本偏差（探索期偏 C3/C7），**账本以全量为准**。C2/C9 虽然不在 Top5，但它们（消费者清单/夹具同源）是跨类基础设施，单独在 E.2 给形态。

| 排名 | 类 | 计数 | 类级守卫形态 | 落点（node:test） | 不变量 |
|---|---|---:|---|---|---|
| 1 | C4 边界/解析 | 26 | **输入维度矩阵** | `tests/contracts/parse-boundary.spec.mjs`（新） | 空/全角/半角/空白/注释/BOM/目录/路径字段的每个组合，要么被明确解析，要么红；不许静默取一个 |
| 2 | C3 双份事实 | 25 | **同源 codec + 双入口同判** | `tests/contracts/same-source.spec.mjs`（新） | 同一输入喂两个入口，`deepEqual`；注释称同源而无共享函数 = 红 |
| 3 | C7 假绿 | 21 | **fail-closed + 对抗矩阵 + 盘侧 oracle** | 扩 `tests/contracts/verdict-conformance.spec.mjs`；新 `tests/run/hitl-conformance.spec.mjs` | 有限词表/在场/计数/点击不得单独作通过；互斥 → null/红；0/空/缺 = 不通过 |
| 4 | C1 静默接受 | 20 | **缺席矩阵** | `tests/contracts/absence-conformance.spec.mjs`（新） | `null`/`undefined`/空数组/读失败/文件缺席/warning 必须分家；缺必要输入 = 红 |
| 5 | C5 状态/竞态 | 17 | **确定性交错 + 生命周期** | `tests/run/state-conformance.spec.mjs`（新）或扩 `run-lock`/`method-library-io` | 创建窗口/接管/释放/失败路径/pid 复用/跨会话晚到 都可重放；teardown 后零残留 |

### E.2 五种可复用形态（本仓现有形态，不引框架）

1. **变异矩阵（C4/C7/C1）**：`node:test` 的 `for` 表驱动；维度写在测试文件头注；每个维度至少一个负对照。参考 `verdict-conformance` 的 `positions × values × leads` 写法。
2. **同源 codec（C3）**：生产代码导出 `parseX`/`encodeX` 各一份；测试 import 两侧，喂同一组样本，`assert.deepEqual`；禁止第二份正则（可用源扫描作辅助，不作主判据）。
3. **消费者清单（C2）**：`docs/artifact-registry.json`（或 `scripts/lib/artifact-registry.mjs` 常量）+ `tests/contracts/artifact-registry.spec.mjs`；每个消费者一条 `readFileSync` 断言；新增工件时先红。门禁落 `scripts/verify/gates/` + `gates-cases.mjs` 案例。
4. **状态交错（C5）**：把锁/端口/feed 的“步骤序列”写成数据（A 建锁→B 接管→A 释放…），测试逐步骤重放；失败路径单独一条；进程/端口用临时目录/临时端口，`afterEach` 清理。
5. **夹具同源（C9）**：`scripts/lib/<area>-fixture.mjs` 生成夹具，测试 import 生成器与当前判据；夹具形状断言先于行为断言；基线带 `source`（codeAnchor/recordedAt）+ 新鲜度 warning。参考 `run-accept-fixture`。

### E.3 最该先做的 3 个类级守卫

1. **C4 输入维度矩阵** → `tests/contracts/parse-boundary.spec.mjs`。先覆盖 readiness/HITL2/heading/finalPath 四族；每族 1 个维度表 + 1 个负对照。**理由**：全量第一（26 张），且是多数 C3/C1 的上游。
2. **C3 同源 codec** → `tests/contracts/same-source.spec.mjs`。先接 `review-readiness`↔`node-gate-contracts`、`library-fold`↔`method-library-write`、`bundle-bind`↔`node-gate-session-gates` 三对。**理由**：C3 主类 25、辅类 48，是最高杠杆的“第二机制”。
3. **C7 fail-closed 判据** → 扩 `tests/contracts/verdict-conformance.spec.mjs` + 新 `tests/run/hitl-conformance.spec.mjs`。**理由**：G1/G2/G15 三条链都在这里；147→151 证明“修假绿会修成假红”，必须有统一不变量。

---

## §F 与 DSH 七档防漏面的对照

> **编号说明**：DSH `docs/testing.md` 没有“M1–M7”这套编号；它列的是七档测试（unit / coverage / real-API e2e / owner-local expected / bench / snapshot / web snapshot）。为避免伪造一套 DSH 不存在的编号，下文把七档依次简称 **M1–M7**；本仓的 L0–L4 评估面是另一套前缀，不混用。若你指的是另一套 M1–M7（例如某个成熟度/防漏面模型），给出处即可按那套重映射。

| 类 | 主要靠的 DSH 防漏面 | 次要 | DSH 对应档 | DSH 没有/较弱的面（本仓需自建） |
|---|---|---|---|---|
| C4 边界/解析 | 单元 + 变异用例 | coverage 只证行跑到 | M1、M2 | **没有输入维度矩阵**；coverage 100% 不代表边界组合 |
| C3 双份事实 | 单元 + 组装期望 | snapshot 只比最终文本 | M1、M4、M6 | **没有跨实现同源断言**；snapshot 不告诉你两份实现是否同源 |
| C7 假绿 | 单元负例 + snapshot/web | real-API e2e | M1、M6、M7 | **没有 guard-red-record 等价门**；只有“regression fails it”的散文政策 |
| C1 静默接受 | 单元负例 + expected | real-API e2e | M1、M3、M4 | **没有本仓式 L0 verify/acceptance 的缺席矩阵**；warning 可能被当通过 |
| C5 状态/竞态 | 单元并发 + e2e | snapshot | M1、M3、M6 | **没有 lock/port/feed 所有权套件**；并发用例靠作者自觉 |
| C8 假红 | 浏览器 snapshot + e2e | 单元选择器 | M3、M7、M1 | **没有 host-health NOT-RUN 隔离**；环境红可能冒充产品红 |
| C2 消费者遗忘 | 单元契约 + snapshot | coverage | M1、M6 | **没有 artifact/roster 消费者清单门**；新件靠人记 |
| C9 夹具漂移 | expected + snapshot 录制 | web snapshot | M4、M6、M7 | **没有 fixture↔judge 同源测试**；refresh 靠人审 |
| C6 路径/安全 | 单元 + expected | e2e | M1、M4 | **没有路径/符号链接/权限矩阵** |
| C10 安装/发布/贵层 | real-API e2e + web snapshot | expected | M3、M7 | 对应面基本有；缺口是“真入口路径”要持续跑 |
| C11 文档/规则 | 无专门档 | 代码 review | — | **DSH 没有文档/词表门禁**；本仓 `release-vocab` 反而是补位 |
| C12 其他 | 单元 | e2e | M1、M3 | 无专门档；按具体机制补 |

**读法（解释）**：DSH 的七档强在“真实入口 + 真模型 + 组装快照”，弱在“判据自身的变异矩阵/同源/消费者清单/夹具同源”。本仓的 L0 门禁与 `tests/` 正好补后四类；不要把“DSH 有 snapshot”当成“判据形状已被证明”。

---

## §G 复算、局限与维护

**复算命令（只读）**

```sh
# 159 行
grep -cE '^\| [0-9]{3}｜' runtime/dsh-test-strategy-research/failure-class-census.md
# 主类计数
awk -F'|' '/^\| [0-9]{3}｜/{gsub(/ /,"",$5); split($5,a,"/"); print a[1]}' \
  runtime/dsh-test-strategy-research/failure-class-census.md | sort | uniq -c
# 红录状态
awk -F'|' '/^\| [0-9]{3}｜/{gsub(/^ +| +$/,"",$8); print $8}' \
  runtime/dsh-test-strategy-research/failure-class-census.md | sort | uniq -c
# 复发链成员（G 编号）
grep -oE 'G[0-9]+' runtime/dsh-test-strategy-research/failure-class-census.md | sort | uniq -c
```

**维护规则（建议）**

- 新 BUG 卡进 `fixed_bugs` 时，同步在 §A 加一行；主类必须引用 C1–C12 之一；无永久 keyless 守卫的进 §D-1。
- 新复发链进 §C；链的“当前关闭断言”必须写测试文件与不变量，不写“已修”。
- 每季度重跑一次 §G 的计数命令；若 C4/C3 仍居前二，说明判据形状/同源守卫没有生效，而不是“又倒霉”。
- 本账本不替代 `guard-red-record`：后者管“留证存在”，本账本管“失败类是否在账上、是否有永久守卫”。

**本表不证明 / 局限**

- 60 张全文精读、99 张关键节读取；**不是 159 张逐行全文**。关键节足以归类，但可能漏掉卡内脚注/后续追加段。
- 主类/辅类/发现层是**判断**；同一张卡可有两三种合理归类，§B 已给低置信清单。不要用本表反驳卡内细节；回读卡。
- 未重跑测试/smoke/真模型；红录状态是“测试标题/文件引用”的静态事实，不证明测试当前全绿或红录跑过。
- 未逐条复核 159 个修复 commit 的 diff；守卫描述来自卡内 `已落地` 与 README 摘要。
- 百分比是 159 张账本内的构成，不是“缺陷概率”；某类多不代表该类更容易发生，只代表历史记录里更多。
