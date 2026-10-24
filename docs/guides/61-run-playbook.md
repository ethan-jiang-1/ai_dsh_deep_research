# 61 · Run 操作指南（研究发起人入口）

> 层：指南（怎么操作）。通道 = run 通道（安装域 research profile：本包 + vendor
> agent-team-profile 层，P1 定案——[毕业 Note](../../notes/implemented/2026-09-24-m2-p1-run-channel.md)）；
> 四角色流程全图 = [m2-run-mechanics RFC](../../notes/implemented/2026-09-24-m2-run-mechanics.md)；
> 跨角色纪律与文件契约 = [研究手册](../../research-workspace/AGENTS.md)。本页只答"你现在做什么"。

## 0. 开跑（一次性准备 + 每次启动）

- 凭据：真 run 需要模型——`runtime/harness-home/.credentials.yaml` 配一次
  `DEEPSEEK_API_KEY`（见 [AGENTS.md §密钥](../../AGENTS.md)；boot 本身 keyless）。
  启动横幅出来后自查一步：`grep -q DEEPSEEK runtime/harness-home/.credentials.yaml`——
  boot 不查凭据，缺了要到 lead 首次调模型才炸（启动成功 ≠ 能跑研究）；
- 启动：`node dev/run-driver.mjs up`（起/复用通道 → 验浏览器面 → 打印呈交块；内部调
  `bash dev/boot-run.sh` 做自检/组合/漂移门）→ 用浏览器打开呈交块里的
  `http://127.0.0.1:<port>/?token=…`。**端口 = `DSH_RUN_PORT`，缺省 3083**
  （3080 = 本仓开发 GUI、3081 = 已让渡外部项目，均勿占；换端口：
  `DSH_RUN_PORT=<空闲端口> node dev/run-driver.mjs up`）。端口已被占时 boot-run 会 fail-loud 并给
  补救，**先看占用者是谁**：若是本仓在飞的 run 通道 → **别另起**，用它（URL/token 见启动横幅或
  `runtime/smoke-workspace/web.log`）；不是 → 换端口，或确认后停掉它（**别盲杀**：在飞会话的
  日志尾部可能丢失——BUG-007 卡）。想守在前台看日志 = `bash dev/boot-run.sh`（底层启动面）；
- **已有通道时**：取当前 URL = `node dev/run-driver.mjs url`；只验浏览器面（不启动、不换 token）=
  `node dev/run-driver.mjs probe`。URL/token 的唯一来源仍是最后一条启动横幅；旧横幅 = 旧 token；
- **启动请求的呈交纪律（2026-09-30 用户定调）**：用户让"启动/起 web" = 代理**先自己跑通再交 URL**——
  run-driver 就是这条纪律的可复跑入口（exit 0 = 可呈交 / 1 = 红不得呈交 / 2 = 未跑）。三步序如下，
  红了按序修后重跑同一条：
  ① boot-run 全序（自检 → 组合检查/必要补装 → 漂移检测）红了当场修——漂移 = 按脚本处方重建
  profile；vendor 产物缺失 = `bash dev/vendor-build.sh`；
  ② boot 出横幅后验浏览器面：探针断言无 "Failed to load plugins" / 零 console 错误
  （boot 横幅只证宿主侧，观察面可能坏着——0.2.0 轮教训）；
  ③ 全绿才把 URL 交出去（人话判据：GUI 里 preset 选单含四个 Deep Research 角色、会话右栏有
  「研究状态」页签——任一缺席 = 插件没挂上）。不呈交"可能能用的东西"；红了不自修就上报 = 失职；
- **启动前先判"接续还是新开"**：`find research-workspace -maxdepth 2 -type d -name 'drt_*'`
  ——根 / `archive/` / `_abandoned/` 三类操作桶都扫（位置只用于发现，D28）；**每个候选都要
  报出来**，按内容分两类：(a) 无 `final/` 或 `review.md` 不是 `readiness: PASS` = **在飞**
  （含停在 HITL2 等拍板的形态——`final/` 记账随交付动作〔拍板行 → run 根 final.md + 记账 →
  present → goal complete〕落地，交付前不在场；扩张版 vN 随 rerun）→ 问"接续它还是新开"
  （接续做法 = §5）；(b) 有 `final/` 且 PASS = **交付线已在盘**——按 [NODES](../../research-workspace/NODES.md)
  交付行，交付判别 = §6（`final/vN` + `deliverables/presented` + 回执）→ 问"先归档再新开，
  还是补研究（rerun）"。两类都带上 slug + 操作桶 + 最新 journal 日期，**都不自己挑**；
  present 原始事件不在 bundle 文件里（`deliverables/presented`），(b) 类归档前请用户确认。

### 0.1 特殊形态与排障（按需读，首跑不需要）

- **SPA 抓取通道（mcp-playwright，默认挂载）**：`bash dev/boot-run.sh` 自带本地 Playwright MCP
  （npx 拉起 `@0.0.83`、headless——SPA 定价页/JS 榜单的渲染抓取；不设任何代理参数，浏览器网络
  继承环境）；`MCP_PLAYWRIGHT=0` = 显式拆。决定与环境踩坑正本 =
  [mcp-playwright 采纳 Note](../../notes/implemented/2026-10-02-mcp-playwright-adoption.md)；
- **网络 = 原生 DSH 行为（零干预）**：boot-run 不探测网络形态、不设任何代理 env、不起任何代理
  进程——代理路由（vendor `util/http-proxy` 原生读 `http_proxy`/`https_proxy`/`no_proxy`）与 SSRF
  守卫都是 vendor 缺省行为，设不设代理完全由用户环境决定。环境处于 TUN/fake-IP 态时 `web_fetch`
  可能被原生守卫拒（`web_search` 不受影响）——那是环境形态问题，换网络环境即可，本仓不干预；
  用户自设代理 env 时 LLM SSE 流可能被撕裂（BUG-023 教训——遇「event precedes message_start」
  先查代理路径，不要先怀疑上游）。零干预的理由与拆掉的方案 =
  [网络零干预 Note](../../notes/rejected/2026-10-13-network-vanilla-restore.md)；
  - **出问题第一步 = 诊断**：`node scripts/run-ops/stream-diagnostics.mjs --session <标题|id>`（或 `--recent N`）——输出模型尝试时间线、失败密度、provider/重试策略实名、该会话的工具调用与检索查询；`--recent N` 选择最近 N 个有模型活动的会话。判定行直接给"链路/上游态 vs 间歇性"。
- **web 进程生命周期（实测约束）**：`boot-run.sh` 把 web 跑在**前台**并用 trap 管子进程——
  **脚本退出即 web 停**（这是特性：不留孤儿）。因此：

  - 交互式使用 = 让 `boot-run.sh` 待在终端里（Ctrl-C 才停）；
  - 需要它在你离开后继续服务（agent 驱动 / 无人值守）= 无人值守形态两条路按场景选：
    - **托管后台 job 直接跑 `bash dev/boot-run.sh`（首选）**——自检/补装/漂移门全走，
      实测一场 run 全程存活（2026-10-11：web 未因 stdin 退出）；
    - **裸命令 + 睡眠管道（备用）**：宿主会关后台 job 的 stdin 时用（症状 = web 自行退出）：
      `sleep <秒> | node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile research
      -- --port <端口，缺省 3083> --no-open`。**这条绕过 boot-run 的漂移门**（
      [00-index §先分流](../00-index.md) 首行"别直接 `dsh --profile research`"正为此——
      同理：绕过漂移检测、静默用旧镜像）：先 `bash dev/boot-run.sh --drift-check` 过门再用它；
  `--drift-check` 模式会检查端口且可初始化环境/补装 profile/写 MCP patch，不是只读探针。报漂移就按
      [guides/62 §改动影响面](./62-plugin-authoring.md) 重建镜像；
- **刷新白屏的判别序**：① `lsof -nP -iTCP:<端口> -sTCP:LISTEN` 有没有监听 → 无 = 进程已停
  （重跑上面任一形态）；② 有监听但仍白屏/401 = token 过期（**每次启动都是新 token**，
  用当次横幅里的 URL；旧 URL 作废）；③ 有监听且 token 新但页面空 = 前端壳产物陈旧
  （`pnpm --filter @deepseek-ai/dsh-web-frontend run build` 重建；vendor 构建产物整体重建 =
  `bash dev/vendor-build.sh`，见 [guides/60 §2](./60-dev-loop.md)）。

## 1. 开哪个会话

**前置（一次）：把研究工作区注册进 DSH**——侧栏只列已注册的工作区，未注册的目录在
"新建会话"里选不到、其会话也不进侧栏（[实测根因](../../notes/archived/2026-09-26-bundle-face-wiring.md)）。

```sh
# 经 GUI：Workspaces 面板的 + 添加 research-workspace/ 目录；或经 RPC：
#   workspace/create { request: { path: "<repo>/research-workspace" } }（幂等）
```

**自检 / 补登记**：`dev/run-kickoff.mjs` 建会话前就调 `workspace/create`（幂等，RPC 同上）——
"这台机器登记过没有"不用记；`runtime/harness-home` 被重建后本步重新需要。

**为什么关键**：研究手册是**会话 cwd 的 `AGENTS.md`**，DSH 从 cwd 向上发现并注入每个角色
——cwd 不是研究工作区，手册就不进上下文，跨角色证据契约随之丢失。`dev/run-kickoff.mjs` 已默认用 workspaceId 形态把会话建在 research-workspace。

- web GUI 新建会话：preset 选 Deep Research Lead（默认项），工作区选 research-workspace；
- 无 GUI 手（代理操作）：`node dev/run-kickoff.mjs --port 3083 --token <横幅 token>
  [--prompt-file <file>]` 建 Lead 会话（workspace/create 幂等自检已内建；全档参数 =
  [guides/60 §2](./60-dev-loop.md)）；
- 只跟 lead 对话——它是唯一入口与出口：立项、组队、派活、综合、交付全归它；
  scout / analyst / critic 是它的队员，不直接听你指挥。

## 2. 说什么

- 直接说出研究问题（一句话到一段话皆可）。lead 加载 research-brief skill 走 **HITL1 两段卡**：
  第一段**三问**——研究类型（quick_factual / exploratory_map / claim_verification）/ 深度篇幅 /
  时间口径语言，**一张结构化选项卡**（一次 ask_user_question 携带三问，每问 options
  化、推荐项置首带(Recommended)），你点选项即拍板（需要改的选项可自由输入）；
- 三问答毕 lead 实例化 run bundle `research-workspace/drt_<slug>/`（question.md 定稿 +
  topics.md 拆解；立项时 sibling 预检——同名/前缀相关 bundle 已在则先问你），随后发
  **第二段·计划确认卡**（quick_factual 豁免）：≤200 字计划要点瘦卡 +「全文 =
  question.md / topics.md」指针，三选项——按计划开跑(Recommended)/ 修订计划（自由文本
  意见，**附加**进计划不替换）/ 放弃（不开跑，bundle 处置照 sibling 预检规矩）；修订意见
  逐字落 §Decisions 后直接开工（一轮制，不再二次呈卡）；
- 计划拍板后 lead 组队（scout 先行，critic 后置进场），进入静默自主区。

## 3. 静默自主区（两点之间你会看到什么）

- 角色不问你、不汇报进度、不等确认（两点交互纪律）；你主动发消息会被直接回答，
  但不改变既定方向与分派；
- 进度看四处（**被动观察**——不构成第三个交互点，不从观察面向角色发指令）。两层关系：
  **在场看 Web**（下 1–4，驾驶舱为主面）；**离机看投影** = boot-run 自动起的
  `runtime/smoke-workspace/dashboard.html`（fail-soft 只读，不是交付判据）：
  1. 研究驾驶舱「研究状态」页签（**主观察面**——流程轨道 / 活动流 / 活标题 / HITL 挂起横幅，
     构成正本 = [design/40](../design/40-research-cockpit.md)）；
  2. 各角色会话的实时消息流（scout 的搜索调用、analyst 的抓取逐条可见）；
  3. `ui-agent-team` 任务板（谁领了什么活、起止状态）；
  4. deliverables 面板（final.md 交付后出现）。

**用户不在场时代答（代理模拟）**：HITL 的 answerer 只有连着 web 的浏览器客户端（vendor 实测：
CLI/host 侧没有 answerer，也没有提交答案的 RPC）——所以代答要用真浏览器：

```sh
source dev/env.sh && node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <横幅 token>   # 默认逐题选带(Recommended)的那一项
```

**HITL1 是两段卡**（三问卡 → 计划确认卡）：同一条命令**跑两次**，每次只答当前挂起的一张卡
（计划确认卡在 quick_factual 编制下豁免）。**HITL2** 先按 §4 跑 `node-gate` / `evidence-audit`，
再跑同一条 `hitl-answer`——交付审阅卡在 review readiness 非 PASS 时自拒（exit 4）。

> **交付代答闸**（2026-10-18）：交付审阅卡在场而 review readiness 非 PASS 时，`hitl-answer` 的**默认推荐档会自拒**（exit 4）——请人工裁决，或显式 `--pick <非定稿项>`/`--custom` 表明有意为之（依据 = [hitl-proxy-delivery-guard](../../notes/implemented/2026-10-18-hitl-proxy-delivery-guard.md)）。

它逐题打印选择结果；**必须**把这次代答如实记进 bundle 的 `question.md` §Decisions 与
`journal.md`，标注"代理模拟"（它替的是人，不是人）。HITL1 与 HITL2 都走同一条命令。
代答是否成功以工具尾部的**盘侧裁决**退出码为准（0 = answer 落地 / 1 = 未落地），UI 自报不算数。

选会话语义（多 run 并存时必读）：默认在 research-workspace 组最新 15 个日志中选择最新的 lead 挂起会话；
`--session <标题子串>` 在同一窗口内唯一匹配仍挂起的会话。盘侧判决、UI 行定位与 provenance 共用该会话的
canonical 日志 ID；未匹配、歧义、非挂起或侧栏找不到目标行时均拒绝作答。
落账归属 = 被答会话**写命中**的 bundle（仅写才落盘；仅读/无绑定响亮延迟，操作侧按打印内容补记——
BUG-020）。

**应答通道按 ask 形态二分**（形态 = 盘侧 ask 参数，hitl-answer 的驱动计划会打印）：timed 形态
（缺省 600s）超时转 pending 后，真浏览器与文本消息两条路都通；活等待（`wait: -1`）只有真浏览器
一条路——对活等待发文本消息只会 splice 进 next-turn，而挂起的回合永不收尾，消息永不被消费。

## 4. HITL2（交付审阅）

- **拍板前操作侧先跑机械门**：`source dev/env.sh && node scripts/run-gates/node-gate.mjs
  research-workspace/drt_<slug>`——门①/③/L/R 红在场 = 先让 lead 原位修再拍板（红门会
  穿过 HITL2 落地，lead 自己跑不了门：无 bash）。**门②/④/A/C 属拍板后判据**：门②查 present
  声明、门④查版本副本、门A 查交付完整性（v1 副本 + audit.md + 副本×readiness 交叉）、
  门C 查读者版合同（`final/readable-vN.md` 与 `final/vN` 同版），在拍板前必然缺席——拍板前
  跑门看到 ②/④/A/C 红或 N/A（静默缺席形态）= 预期态而非缺陷，拍板交付后复跑转绿
  （门清单正本 = NODES.md 头部图例）；
- **拍板前操作侧跑证据审计**（须先 `source dev/env.sh`）：`node scripts/run-gates/evidence-audit.mjs
  research-workspace/drt_<slug> --write`——默认只读，`--write` 才落 bundle 的 audit.md，**CRITICAL=0 才带审阅建议
  进 HITL2**（审计判据正本 = 研究手册「机械强度诚实记账」节）；CRITICAL>0 = 证据链有
  伪造/断链，先让 lead 修证据再回来；review 的 readiness 若为**附条件 PASS**，node-gate
  门A 会带 ⚠ 注记显性化——拍板时先核条件（裁决归你，机械门不替你拦）；
- **拍板后操作侧跑一次验收（原子动作）**：`source dev/env.sh && node scripts/run-ops/run-accept.mjs
  research-workspace/drt_<slug>`——node-gate + evidence-audit + 未来日期 sanity 三件同次跑；预检红不写，绿写
  `delivered.json` + `manifest.json` + `acceptance.md`（新 run 非 quick_factual 的 reader 角色/哈希一并绑定）；复核后加 `--archive` 才移入 `archive/drt_<slug>/`。门 A/C、审计或日期红时不要手工归档。
- **拍板前先读读者版**：review 终局 PASS 后、HITL2 前，Lead 已按 `reader-final` skill 写
  `final/readable.md`；「终稿」页签默认显示读者版，`看审计版` 可切回 `final/vN`（未交付时
  `final.md`）。读者版是决策面，canonical 是审计源；两份不一致以 canonical 为准。
- lead 带审阅建议来找你：证据充分性判断 + 交付/补研究推荐 + composition 确认
  （读者是谁 / 用来做什么 / 前景化重点）——拍板后落 `final/vN` 交付副本，再把
  `final/readable.md` 复制为 `final/readable-vN.md`（同版），present 两份
  （reader 第一、canonical 第二；门A/门C 交付件齐的最后一环）；`final.md` 是工作稿，不冒充交付；
- 每条关键结论带 `[来源: evidence/xx.md]`，critic 的 review.md readiness: PASS
  是交付前置（无 CRITICAL 未修复才许交付）；
- **HITL 超时语义（0.2.0 timed ask-user，600s）**：两点挂起 600s 未答 → 工具返回
  pending，**问题保持可答**（挂起横幅仍在——hitl-fold v5 把 timed 超时仍判挂起），lead
  可继续有用工作但 pending 通知明示"这不是许可"；你之后随时可答，答复作为新消息唤醒
  会话。**不是**按推荐项自动落定。timed 放行是无人值守 run 的生命线：lead persona 的
  ask 硬约束（禁 `wait: -1`，模型单参即可拆掉它）由回归测试钉住——形态判别与救活路径
  的机制正本 = [BUG-005 卡](../../_backlog/_archived/fixed_bugs/BUG-005-hitl1-indefinite-wait-no-floor.md)。

## 5. 中断与恢复

四类运行状态（run bundle / session log / goal·任务板 / 观察面）的 canonical 合同与恢复优先级正本 = [design/50](../design/50-agent-loop-and-state.md)——本节只载人的操作步骤。

- 任何时候可关页面/停机。恢复 = 重跑 `node dev/run-driver.mjs up` → 新开 lead 会话说
  "继续 <slug> 这个 run"——lead 只凭 `drt_<slug>/` 的文件事实重建上下文，
  不依赖聊天记忆；
- **通道还活着、只是回合停摆**（模型空响应 / 厂商流错误打断，会话未终局化）→ **不必新开**：
  `node dev/run-kickoff.mjs --port 3083 --token <t> --session <会话 id> --prompt <恢复指令>`
  即向该会话注入指令唤醒（等价于你在 GUI 手打一句）。该模式**自带送达对账**：exit 0 =
  会话日志里已出现这条 `user/message`，1 = 未对账（多半是该会话已终局化或日志尾部未落盘
  → 走上面"重跑 + 新会话"那条路），2 = 用法/前置错（续跑模式需先 `source dev/env.sh`）；
- **通道跑久后 UI 可能"零会话行"**（实测约 5 小时后：侧栏组能展开成 `aria-expanded=true`，却渲染不出任何
  `session:` 行；代答于是报"侧栏没有目标会话行"）——**不是**归档、也不是回合终局化。处置 = 重跑
  `node dev/run-driver.mjs up` + **新会话**；`hitl-answer` 自 2026-10-16 起在报错里给「错因判据 = aging」这一行
  （判据正本 = [BUG-031](../../_backlog/_archived/fixed_bugs/BUG-031-hitl-answer-sidebar-session-rows-unrendered.md)）；
- **被通道重启终局化的 ask 会永久留在盘上算 pending**（UI 卡在场但点不动、答复永不落地，盘侧谓词会继续
  把它当"最新挂起"报出）→ 别去答它：重开新会话说"继续 <slug> 这个 run"，让 lead 原样重发问询；
- **会话日志尾部在通道死亡时不保证**（SIGTERM 后未落盘缓冲蒸发实测）——"文件即真相"只对
  bundle 文件断言；盘侧谓词消费日志前先过回退检测（watch-run 内建，回退即 fail-loud），
  跨会话取证的结论要意识到日志可能被截断（[BUG-007 卡](../../_backlog/_archived/fixed_bugs/BUG-007-channel-death-loses-log-tail.md)）；
- **run 目标态（0.2.0 tool-goal）**：HITL1 拍板后 lead 用 create_goal 钉住本次 run
  （objective = 定稿问题 + 交付判据）——goal-round-driver 随 base 在位，会话存活期中断的
  回合由 goal 驱动续轮（韧性增益；goal 语义随 run 生效有实测）；**通道死亡场景以文件恢复
  为准，不假设自动续轮**（通道死亡下续轮未单独实测——机制描述须有盘面支撑，
  [BUG-009 卡](../../_backlog/_archived/fixed_bugs/BUG-009-no-finalization-on-restart.md) 同款教训）；
  lead 在任何 ask 挂起前 pause goal、答后 resume（防空转），
  goal 与 drt_ bundle 互为镜像、冲突以 bundle 文件事实为准；
- **位置 = 操作桶（D28）**：根 / `archive/` / `_abandoned/` 只用于发现与展示，不证明交付；
  交付由 `final/vN` + `deliverables/presented` + `delivered.json`/`acceptance.md` 判定。归档 =
  操作侧 `run-accept --archive` 的桶移动（归档不消失——仪表盘多 run 总表与 evidence-audit
  `--latest` 均并扫 archive/）。`runtime/harness-home/runs/` 下的 bundle 是契约前的 ad-hoc 历史
  （仪表盘标 "ad-hoc·无契约"）——不是这次要恢复的 run，也不要删（gitignored 运行数据，是那次
  研究留下的证据）；
- **交付后想改**：三种改法 + 各自代价（补研究出新版本 / 改说法版本不变 / 方向变了另起 bundle）——
  状态页 ⑤ 与终稿页脚有只读折叠块「还不满意？三种改法」，照抄一句发给 Lead 即可；Lead 按
  `rerun-triage` skill 分诊（先复述再分类、至多两个手段、不擅自 rerun）。观察面只给话术，不按钮化。
- **续跑已交付（已归档）run**：同在飞形态——新开 lead 会话说「继续 `archive/drt_<slug>` 这个 run」；
  lead 依赖的是 bundle 文件事实而非位置（归档位在其 cwd 之下可读；仪表盘与 evidence-audit
  `--latest` 均并扫 archive/）。续跑语义 = rerun 三分：表述修订原位改、证据扩张落 `final/`
  v(n+1)（交付后操作侧重新归档）、结构性另起新 bundle（正本 =
  [NODES 回边版本语义](../../research-workspace/NODES.md)）；候选不止一个时全部报出问用户，
  不自己挑（同 §0 纪律）；
- **rerun 版本面**：同 bundle rerun 开工时 lead 在 `question.md` 标题下写
  `> rerun: v2 · evidence-expansion · 日期 · 触发：…`；plan 每次重写前把旧版落 `plan/vN.md`
  （头部 `图版本：vN` 与重写记录同号；快照编号必须小于当前版本）。观察面按这些盘上声明显示
  「v1 已交付 · v2 证据扩张 rerun · HITL2 待审」；`final.md` 是工作稿、`final/vN` 才是交付副本，
  `present` 才是交付见证（终稿页签因此默认看版本账、只标「版本账/当前工作稿」）。
- 方向修订：直接告诉 lead——**载体 = steer**（GUI 里打字即 steer；RPC 用 `session/prompt`
  的 `mode: 'steer'`，running 中的 agent 在下一步边界消费）；lead 记账（§Decisions 追加）
  后原地补搜（不算 rerun）。**queue 模式的消息（代驱脚本缺省形态）在 run 的单超长 turn
  下滞留到收尾才被消费——中途修订不可走 queue**；同一条修订也别 queue + steer 双发
  （重复投递）。
  证据扩张 rerun = 同 bundle final/ 下一版；结构性另起 = 新 drt_<slug>/（sibling
  预检后建）。

## 6. 判定"研究完成"

判定正本 = [研究手册 §完成判据](../../research-workspace/AGENTS.md)（+ [NODES 交付行](../../research-workspace/NODES.md)；设计层视图 = [design/50 §交付判定](../design/50-agent-loop-and-state.md)）——文件事实链六件缺一不可，逐件细节住正本；口头宣告与观察面显示都不算。

## 7. 归档时收割判型模式（增长协议的收割步）

归档一个 run 前，扫它的 journal 的判型标记（命中/未命中两类，协议正本 =
[question-patterns.md 库尾](../../research-workspace/question-patterns.md)）：

```sh
grep -rn "判型" research-workspace/ --include=journal.md
```

输出分两类：`判型未命中` 行 → 新条目候选；`判型命中=P#` 行 → 各条目效用账。
候选过晋升门槛（跨 run 复现 ≥2 次，或单次造成真实成本〔HITL1 返工 / §Decisions 方向
修正 / 前提级发现〕）才按六段骨架写新条目、标（留察）；连续 3 次收割零命中的条目移
休眠节。库的任何变更同 diff 跑 l4-lite + `node dev/sync-pack-workspace.mjs`。
