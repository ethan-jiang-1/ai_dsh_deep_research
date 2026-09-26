# 跑 run 时暴露并修掉的环路缺陷（两场真实 run 的副产品）

> 状态：implemented

来源：用户 2026-09-26 指令"你跑一下看看是否整个环路有问题……你就是好好打磨就行"。为验证整条环路，
实跑两场真实深度研究（`drt_cn-llm-deep-research` / `drt_cn-llm-infra`）。**环路本身暴露了六处缺陷**
（其中两处会让工具给出误导性结论），逐条诊断并修；两场 run 均交付完成。

## 决定

1. **HITL 必须有 headless 代答路径**——`ask_user_question` 走 `ctx.userQuestions` 的 answerer
   waterfall，而全仓唯一的 answerer 是连着 web 的浏览器客户端（vendor 实测：CLI/host 侧没有
   answerer，也没有提交答案的 RPC；既有 `client-hitl-smoke` 明确"触发但不代答"）。**后果：任何
   代理驱动的 run 都会卡死在 HITL1**。新增 `dev/hitl-answer.mjs`（真浏览器驱动，逐题选推荐项、
   打印选择结果），并规定**代答必须记进 bundle 的 `question.md` §Decisions 与 `journal.md`，标注
   "代理模拟"**（它替的是人，不是人）。
2. **`evidence-audit` 锚定本仓 dev home，不信继承来的 `DSH_HOME`**——日用 GUI 的 shell 里
   `DSH_HOME` 常已是 `~/.dsh`，原脚本会静默去审**另一个 home 的会话**（实测 1807 vs 330 个日志
   文件），同一 bundle 跑出 `URL 溯源 7/88` 与 `85/88` 两个结论，**足以把好报告判成满篇伪造**。
   现改为：默认本仓 dev home；`DSH_HOME` 指向别处且未显式 `--sessions` 时**自拒 exit 2** 并给补救
   （同 L1/L2 的 `source dev/env.sh` 纪律）。
3. **`evidence-audit` 的 URL 判据分三档**——逐字命中 / 仅域名可溯源（MAJOR）/ 域名与 URL 都未出现
   （CRITICAL）。原版只有两档，把"域名抓过、路径是派生态（ar5iv/PDF 变体、站点根）"也判 CRITICAL。
   比较用 **host** 而非 origin（卡片常写 `http://`、日志是 `https://`，用 origin 比会把同一站点
   判成没抓过）。
4. **`evidence-audit` 不再把语料拼成一个大字符串**——`join('\n')` 在会话日志长到十几 MB 压缩量时
   超出 V8 单字符串上限，`RangeError: Invalid string length` **整条崩掉**。改为逐事件规范化分片。
5. **`boot-run.sh --drift-check` 加 `--ignore-scripts`**——pack 的 `prepack` 钩子会跑构建，tsdown
   横幅混进 `npm pack --dry-run --json` 的 stdout，下游 `JSON.parse` 抛错、**漂移检测整条不可用**
   （而它是"镜像是否等于 pack 源"的唯一机械证明）。本处只要发布清单、不要构建。
6. **`hitl-answer` 自身的三处坑**（都是真跑才暴露）：`flag()/has()` 把 `--` 加了两遍（导致
   `--dry-run` 判假、**"dry-run" 实际执行了代答**）；关模态用全局 `button:has-text("Continue")`
   会在卡片已渲染时**替人提交默认选项**（现限定在 `[class*="_mask_"]` 内点）；点开会话后卡片不是
   立刻就有（现轮询等渲染，最长 40s）。

## 输掉的方案

- **给 `evidence-audit` 加"忽略 ~/.dsh"的软跳过**：否决——静默跳过与静默用错 home 同类；要
  fail-loud，让调用者显式选（`--sessions`）。
- **让 `hitl-answer` 直接调 RPC 提交答案**：否决——vendor 里根本没有这条 RPC（answerer 只在浏览器
  客户端），绕不过去；真浏览器是唯一真入口。
- **把摘录回溯放宽到"关键词命中即可"**：否决——那会让"凭空写摘录"也能过；改为**表格行逐格判定**
  + 头部可溯源降 INFO、头部都对不上才 MAJOR。
- **改写两场 run 里 lead 写的 `2026-10-02` 日期**：否决——那是模型的日期漂移（系统日期是
  2026-09-26），改它等于篡改交付物记录；如实记档、留用户裁量。
- **把两场 run 的 bundle 提交入库**：否决——`research-workspace/drt_*` 是运行区（gitignored），
  契约位就是盘上；要长期留证应另议。
- **在 notes 里建"run 台账"（登记式留证）**：**先推荐后撤回**。它看似补上"bundle 可能被清"的缺口，
  但与两条既有纪律正面冲突——`notes/implemented/README`「目录树就是清单，**不建索引**，避免第二份
  会漂移的清单」、guides/60 §7「主动否决过控制文件那套（第二份状态的家必然漂移）」。且 D17 已把
  run bundle 定为**运行区的变量容器**、非仓内容，验收证据的正当居所就是本 Note（数字 + 反引号路径，
  不做 Markdown 链接——链到运行区会让新 clone 的 md-links 红）。**结论：不建台账；要留档 = 把报告
  拷出仓，那是用户的动作、不是仓的机制。**

## 实际跑过的验证

- 两场 run 端到端交付：HITL1 → 组队 → 取证 → 综合 → critic 复核（均 FAIL→闭合）→ HITL2 → `present`
  → `final.md` + `final/<版本>`。两场 HITL 均由 `dev/hitl-answer.mjs` 代理模拟，已在两个 bundle 的
  `question.md` §Decisions 与 `journal.md` 显式声明。
- 证据契约生效：run 1 26/26、run 2 45/46 张证据卡带完整 frontmatter（**首场 run 是 0/31**——
  根因是当时会话 cwd 不在研究工作区、手册未注入；`workspaceId` 形态修好后本次两场均正常）。
- `evidence-audit`（修好后）：run 1 **URL 溯源 93/93** · final 链 118/118 · CRITICAL 0；
  run 2 **URL 溯源 85/88** · final 链 128/128 · CRITICAL 0（3 条未溯源已在 audit.md 点名）。
- `node scripts/verify.mjs` 全绿；`pnpm test` 55/55（新增"同域派生路径 → MAJOR 而非伪造"一测）。
- 仪表盘投影：`dev/smoke-workspace/dashboard-drt_cn-llm-{deep-research,infra}.html`。

## 环境状态

- 两场 run 的交付物在 `research-workspace/drt_cn-llm-deep-research/` 与 `drt_cn-llm-infra/`
  （运行区，gitignored）；各含 `final.md` + `final/v1.md`、`review.md`、`audit.md`、26/46 张证据卡。
- run 通道在 3081（research profile，本次由托管后台任务持有，stdin 保持打开）；`boot-run.sh`
  漂移检测修复后为**绿**。
- 未做：`running-a-research-run` §4 的**判据④**（新开 lead 会话、只凭 bundle 文件续跑并说出状态与
  下一步）尚未实测——它是"文件即真相"的正面证据，留给下一轮或用户复核时补。
- 两场 run 的 lead 把日期写成 `2026-10-02`（系统日期 2026-09-26），模型日期漂移，未改写。
