# 61 · Run 操作指南（研究发起人入口）

> 层：指南（怎么操作）。通道 = run 通道（安装域 research profile：本包 + vendor
> agent-team-profile 层，P1 定案——[毕业 Note](../../notes/implemented/2026-09-24-m2-p1-run-channel.md)）；
> 四角色流程全图 = [m2-run-mechanics RFC](../../notes/implemented/2026-09-24-m2-run-mechanics.md)；
> 跨角色纪律与文件契约 = [研究手册](../../research-workspace/AGENTS.md)。本页只答"你现在做什么"。

## 0. 开跑（一次性准备 + 每次启动）

- 凭据：真 run 需要模型——`dev/harness-home/.credentials.yaml` 配一次
  `DEEPSEEK_API_KEY`（见 [AGENTS.md §密钥](../../AGENTS.md)；boot 本身 keyless）；
- 启动：`bash dev/boot-run.sh`（幂等：组合在位即直接 boot）→ 等横幅
  `http://127.0.0.1:<port>/?token=…` 用浏览器打开。**端口 = `DSH_RUN_PORT`，缺省 3083**
  （2026-09-28 起 3081 让给别的项目；3080 是本仓开发 GUI，勿占；换端口：
  `DSH_RUN_PORT=<空闲端口> bash dev/boot-run.sh`）。端口已被占时 boot-run 会 fail-loud 并给
  补救，**先看占用者是谁**：若是本仓在飞的 run 通道 → **别另起**，用它（URL/token 见启动横幅或
  `dev/smoke-workspace/web.log`）；不是 → 换端口，或确认后停掉它（**别盲杀**：在飞会话的
  日志尾部可能丢失——BUG-007 卡）；
- **SPA 抓取通道（mcp-playwright，默认挂载）**：`bash dev/boot-run.sh` 自带本地 Playwright MCP
  （npx 拉起 `@0.0.83`、headless、`direct://` 直连绕过系统代理——SPA 定价页/JS 榜单的渲染抓取）；
  `MCP_PLAYWRIGHT=0` = 显式拆。决定与环境踩坑正本 =
  [mcp-playwright 采纳 Note](../../notes/implemented/2026-10-02-mcp-playwright-adoption.md)；
- **通道默认由用户终端起**：代理会话内后台起的通道，`web_fetch` 会全域名撞"resolves to a
  non-public IP"解析墙——机理 = DSH 的 SSRF 守卫做本地 DNS 解析、见非公共 IP（会话 fake-IP
  段 198.18.x.x）即拒，**网络本身是通的**（node fetch 直连可达）。会话内确需自起通道时，
  启动环境注入标准代理变量即可：`http_proxy`/`https_proxy` 指向本机代理出口——代理跳跳过
  本地解析、DNS 归代理侧，守卫不再触发（实证与 vendor 依据 =
  [hitl-docking-polish Note](../../notes/implemented/2026-09-28-hitl-docking-polish.md)）；
  代理**驱动**已起的通道没问题（run-kickoff / hitl-answer 走 localhost API 全通）。boot 归
  用户终端仍是默认纪律（真实 DNS、零额外件）；
- **启动请求的呈交纪律（2026-09-30 用户定调）**：用户让"启动/起 web"= 代理**先自己跑通**——
  boot-run 全序（自检 → 组合检查/必要补装 → 漂移检测）红了就当场修（漂移 = 按脚本处方重建 profile；
  vendor 产物缺失 = `bash dev/vendor-build.sh`），boot 出横幅后**再验浏览器面**（探针断言
  无 "Failed to load plugins" / 零 console 错误——0.2.0 轮教训：boot 横幅只证宿主侧，
  观察面可能坏着），**全绿才把 URL 交出去**。不呈交"可能能用的东西"；红了不自修就上报 =
  失职。
- **启动前先判"接续还是新开"**：`ls -dt research-workspace/drt_*/`（`archive/` 除外）——**根目录下
  每个未归档 bundle 都要报出来**，分两类：(a) 无 `final/` 或 `review.md` 不是 `readiness: PASS`
  = **在飞** → 问"接续它还是新开"（接续做法 = §5）；(b) 有 `final/` 且 PASS = **已过审查线、未归档**
  ——按 [NODES](../../research-workspace/NODES.md)，`final/`（版本记账）自综合阶段就在场，此态
  **不等于已交付**（停在 HITL2 等拍板也长这样）；交付判别 = §6（run 根 `final.md` + `present`
  声明）→ 问"先归档再新开，还是补研究（rerun）"。两类都带上 slug + mtime，**都不自己挑**；
  present 声明不在 bundle 文件里（node-gate 门② 查 lead 会话日志），(b) 类归档前请用户确认。

**web 进程生命周期（实测约束）**：`boot-run.sh` 把 web 跑在**前台**并用 trap 管子进程——
**脚本退出即 web 停**（这是特性：不留孤儿）。因此：

- 交互式使用 = 让 `boot-run.sh` 待在终端里（Ctrl-C 才停）；
- 需要它在你离开后继续服务 = 用**托管后台任务**跑 web，并**保持 stdin 打开**
  （`sleep <秒> | node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile research
  -- --port <端口，缺省 3083> --no-open`；web 在 stdin 关闭时会自行退出）。**这条绕过 boot-run 的
  漂移门**（§0 上面"别直接跑 `dsh --profile research`"正为此）：先 `bash dev/boot-run.sh --drift-check`
  过门再用它；该模式先检查端口且可初始化环境/补装 profile/写 MCP patch，不是只读探针。
  报漂移就按 [guides/62 §改动影响面](./62-plugin-authoring.md) 重建镜像；
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
"这台机器登记过没有"不用记；`dev/harness-home` 被重建后本步重新需要。

**为什么关键**：研究手册是**会话 cwd 的 `AGENTS.md`**，DSH 从 cwd 向上发现并注入每个角色
——cwd 不是研究工作区，手册就不进上下文（首场 run 因此丢了跨角色证据契约，31 份证据无
frontmatter）。`dev/run-kickoff.mjs` 已默认用 workspaceId 形态把会话建在 research-workspace。

- web GUI 新建会话：preset 选 **Deep Research Lead**（默认项），工作区选 **research-workspace**；
- 只跟 lead 对话——它是唯一入口与出口：立项、组队、派活、综合、交付全归它；
  scout / analyst / critic 是它的队员，不直接听你指挥。

## 2. 说什么

- 直接说出研究问题（一句话到一段话皆可）。lead 加载 research-brief skill 走 **HITL1**
  三问：研究类型（quick_factual / exploratory_map / claim_verification）/ 深度篇幅 /
  时间口径语言——**一张结构化选项卡**（一次 ask_user_question 携带三问，每问 options
  化、推荐项置首带（Recommended）），你点选项即拍板（需要改的选项可自由输入）；
- 拍板后 lead 实例化 run bundle `research-workspace/drt_<slug>/`（question.md 定稿 +
  topics.md 拆解；立项时 sibling 预检——同名/前缀相关 bundle 已在则先问你）
  并组队（scout 先行，critic 后置进场），进入静默自主区。

## 3. 静默自主区（两点之间你会看到什么）

- 角色不问你、不汇报进度、不等确认（两点交互纪律）；你主动发消息会被直接回答，
  但不改变既定方向与分派；
- 进度看四处（**被动观察**——不构成第三个交互点，不从观察面向角色发指令）：
  1. 研究驾驶舱「研究状态」页签（**主观察面**——流程轨道 / 活动流 / 活标题 / HITL 挂起横幅，
     构成正本 = [design/40](../design/40-research-cockpit.md)）；
  2. 各角色会话的实时消息流（scout 的搜索调用、analyst 的抓取逐条可见）；
  3. `ui-agent-team` 任务板（谁领了什么活、起止状态）；
  4. deliverables 面板（final.md 交付后出现）。

**用户不在场时代答（代理模拟）**：HITL 的 answerer 只有连着 web 的浏览器客户端（vendor 实测：
CLI/host 侧没有 answerer，也没有提交答案的 RPC）——所以代答要用真浏览器：

```sh
source dev/env.sh && node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <横幅 token>   # 默认逐题选带（Recommended）的那一项
```

它逐题打印选择结果；**必须**把这次代答如实记进 bundle 的 `question.md` §Decisions 与
`journal.md`，标注"代理模拟"（它替的是人，不是人）。HITL1 与 HITL2 都走同一条命令。
代答是否成功以工具尾部的**盘侧裁决**退出码为准（0 = answer 落地 / 1 = 未落地），UI 自报不算数。

**应答通道按 ask 形态二分**（形态 = 盘侧 ask 参数，hitl-answer 的驱动计划会打印）：timed 形态
（缺省 600s）超时转 pending 后，真浏览器与文本消息两条路都通；活等待（`wait: -1`）只有真浏览器
一条路——对活等待发文本消息只会 splice 进 next-turn，而挂起的回合永不收尾，消息永不被消费。

## 4. HITL2（交付审阅）

- **拍板前操作侧先跑机械门**：`source dev/env.sh && node scripts/node-gate.mjs
  research-workspace/drt_<slug>`——门①/③/L 红在场 = 先让 lead 原位修再拍板（红门会
  穿过 HITL2 落地，lead 自己跑不了门：无 bash）；
- lead 带审阅建议来找你：证据充分性判断 + 交付/补研究推荐 + composition 确认
  （读者是谁 / 用来做什么 / 前景化重点）——拍板后 run 根 `final.md` 当前版落盘 + present 声明交付；
- 每条关键结论带 `[来源: evidence/xx.md]`，critic 的 review.md readiness: PASS
  是交付前置（无 CRITICAL 未修复才许交付）；
- **HITL 超时语义（0.2.0 timed ask-user，600s）**：两点挂起 600s 未答 → 工具返回
  pending，**问题保持可答**（挂起横幅仍在——hitl-fold v5 把 timed 超时仍判挂起），lead
  可继续有用工作但 pending 通知明示"这不是许可"；你之后随时可答，答复作为新消息唤醒
  会话。**不是**按推荐项自动落定。timed 放行是无人值守 run 的生命线：lead persona 的
  ask 硬约束（禁 `wait: -1`，模型单参即可拆掉它）由回归测试钉住——形态判别与救活路径
  的机制正本 = [BUG-005 卡](../../_backlog/_done/_fixed_bugs/BUG-005-hitl1-indefinite-wait-no-floor.md)。

## 5. 中断与恢复

- 任何时候可关页面/停机。恢复 = 重跑 `boot-run.sh` → 新开 lead 会话说
  "继续 <slug> 这个 run"——lead 只凭 `drt_<slug>/` 的文件事实重建上下文，
  不依赖聊天记忆；
- **run 目标态（0.2.0 tool-goal）**：HITL1 拍板后 lead 用 create_goal 钉住本次 run
  （objective = 定稿问题 + 交付判据）——goal-round-driver 随 base 在位，中断的回合会
  自动续轮（韧性增益）；lead 在任何 ask 挂起前 pause goal、答后 resume（防空转），
  goal 与 drt_ bundle 互为镜像、冲突以 bundle 文件事实为准；
- **run 根只有一个正本**：`research-workspace/drt_<slug>/`（D17 契约位）。**位置=状态**：在飞
  run 住工作区根，交付后由操作侧移入 `research-workspace/archive/<slug>/`（归档不消失——
  仪表盘多 run 总表与 evidence-audit `--latest` 均并扫 archive/）。`dev/harness-home/runs/`
  下的 bundle 是契约前的 ad-hoc 历史（仪表盘标 "ad-hoc·无契约"）——不是这次要恢复的 run，
  也不要删（gitignored 运行数据，是那次研究留下的证据）；
- 方向修订：直接告诉 lead——**载体 = steer**（GUI 里打字即 steer；RPC 用 `session/prompt`
  的 `mode: 'steer'`，running 中的 agent 在下一步边界消费）；lead 记账（§Decisions 追加）
  后原地补搜（不算 rerun）。**queue 模式的消息（代驱脚本缺省形态）在 run 的单超长 turn
  下滞留到收尾才被消费——中途修订不可走 queue**；同一条修订也别 queue + steer 双发
  （重复投递）。
  证据扩张 rerun = 同 bundle final/ 下一版；结构性另起 = 新 drt_<slug>/（sibling
  预检后建）。

## 6. 判定"研究完成"

唯一依据 = **文件事实**：final.md 存在 + lead 会话的 present 声明（手册 §完成判据），
不是任何人的口头宣告。

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
