# 61 · Run 操作指南（研究发起人入口）

> 层：指南（怎么操作）。通道 = run 通道（安装域 research profile：本包 + vendor
> agent-team-profile 层，P1 定案——[毕业 Note](../../notes/implemented/2026-09-24-m2-p1-run-channel.md)）；
> 四角色流程全图 = [m2-run-mechanics RFC](../../notes/implemented/2026-09-24-m2-run-mechanics.md)；
> 跨角色纪律与文件契约 = [研究手册](../../research-workspace/AGENTS.md)。本页只答"你现在做什么"。

## 0. 开跑（一次性准备 + 每次启动）

- 凭据：真 run 需要模型——`dev/harness-home/.credentials.yaml` 配一次
  `DEEPSEEK_API_KEY`（见 [AGENTS.md §密钥](../../AGENTS.md)；boot 本身 keyless）；
- 启动：`bash dev/boot-run.sh`（幂等：组合在位即直接 boot）→ 等横幅
  `http://127.0.0.1:3081/?token=…` 用浏览器打开（3080 被开发 GUI 占用，固定 3081）。

**web 进程生命周期（实测约束）**：`boot-run.sh` 把 web 跑在**前台**并用 trap 管子进程——
**脚本退出即 web 停**（这是特性：不留孤儿）。因此：

- 交互式使用 = 让 `boot-run.sh` 待在终端里（Ctrl-C 才停）；
- 需要它在你离开后继续服务 = 用**托管后台任务**跑 web，并**保持 stdin 打开**
  （`sleep <秒> | node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile research
  -- --port 3081 --no-open`；web 在 stdin 关闭时会自行退出）；
- **刷新白屏的判别序**：① `lsof -nP -iTCP:3081 -sTCP:LISTEN` 有没有监听 → 无 = 进程已停
  （重跑上面任一形态）；② 有监听但仍白屏/401 = token 过期（**每次启动都是新 token**，
  用当次横幅里的 URL；旧 URL 作废）；③ 有监听且 token 新但页面空 = 前端壳产物陈旧
  （`pnpm --filter @deepseek-ai/dsh-web-frontend run build` 重建；vendor 构建产物整体重建 =
  `bash dev/vendor-build.sh`，见 [guides/60 §2](./60-dev-loop.md)）。

## 1. 开哪个会话

**前置（一次）：把研究工作区注册进 DSH**——侧栏只列已注册的工作区，未注册的目录在
"新建会话"里选不到、其会话也不进侧栏（[实测根因](../../notes/implemented/2026-09-26-bundle-face-wiring.md)）。

```sh
# 经 GUI：Workspaces 面板的 + 添加 research-workspace/ 目录；或经 RPC：
#   workspace/create { request: { path: "<repo>/research-workspace" } }（幂等）
```

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
- 进度看三处（**被动观察**——不构成第三个交互点，不从观察面向角色发指令）：
  1. 各角色会话的实时消息流（scout 的搜索调用、analyst 的抓取逐条可见）；
  2. `ui-agent-team` 任务板（谁领了什么活、起止状态）；
  3. deliverables 面板（final.md 交付后出现）。

**用户不在场时代答（代理模拟）**：HITL 的 answerer 只有连着 web 的浏览器客户端（vendor 实测：
CLI/host 侧没有 answerer，也没有提交答案的 RPC）——所以代答要用真浏览器：

```sh
node dev/hitl-answer.mjs --port 3081 --token <横幅 token>   # 默认逐题选带（Recommended）的那一项
```

它逐题打印选择结果；**必须**把这次代答如实记进 bundle 的 `question.md` §Decisions 与
`journal.md`，标注"代理模拟"（它替的是人，不是人）。HITL1 与 HITL2 都走同一条命令。

## 4. HITL2（交付审阅）

- lead 带审阅建议来找你：证据充分性判断 + 交付/补研究推荐 + composition 确认
  （读者是谁 / 用来做什么 / 前景化重点）——拍板后 final/ 当前版落盘 + present 声明交付；
- 每条关键结论带 `[来源: evidence/xx.md]`，critic 的 review.md readiness: PASS
  是交付前置（无 CRITICAL 未修复才许交付）。

## 5. 中断与恢复

- 任何时候可关页面/停机。恢复 = 重跑 `boot-run.sh` → 新开 lead 会话说
  "继续 <slug> 这个 run"——lead 只凭 `drt_<slug>/` 的文件事实重建上下文，
  不依赖聊天记忆；
- **run 根只有一个正本**：`research-workspace/drt_<slug>/`（D17 契约位）。**位置=状态**：在飞
  run 住工作区根，交付后由操作侧移入 `research-workspace/archive/<slug>/`（归档不消失——
  仪表盘多 run 总表与 evidence-audit `--latest` 均并扫 archive/）。`dev/harness-home/runs/`
  下的 bundle 是契约前的 ad-hoc 历史（仪表盘标 "ad-hoc·无契约"）——不是这次要恢复的 run，
  也不要删（gitignored 运行数据，是那次研究留下的证据）；
- 方向修订：直接告诉 lead——Decisions 追加一条记录后原地补搜（不算 rerun）；
  证据扩张 rerun = 同 bundle final/ 下一版；结构性另起 = 新 drt_<slug>/（sibling
  预检后建）。

## 6. 判定"研究完成"

唯一依据 = **文件事实**：final.md 存在 + lead 会话的 present 声明（手册 §完成判据），
不是任何人的口头宣告。
