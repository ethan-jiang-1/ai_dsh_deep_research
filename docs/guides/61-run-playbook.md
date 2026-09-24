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

## 1. 开哪个会话

- web GUI 新建会话：preset 选 **Deep Research Lead**（默认项），cwd 选 **research-workspace/**；
- 只跟 lead 对话——它是唯一入口与出口：立项、组队、派活、综合、交付全归它；
  scout / analyst / critic 是它的队员，不直接听你指挥。

## 2. 说什么

- 直接说出研究问题（一句话到一段话皆可）。lead 加载 research-brief skill 走 **HITL1**
  三问：研究类型（quick_factual / exploratory_map / claim_verification）/ 深度篇幅 /
  时间口径语言——每问带推荐，你拍板即定稿；
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

## 4. HITL2（交付审阅）

- lead 带审阅建议来找你：证据充分性判断 + 交付/补研究推荐 + composition 确认
  （读者是谁 / 用来做什么 / 前景化重点）——拍板后 final/ 当前版落盘 + present 声明交付；
- 每条关键结论带 `[来源: evidence/xx.md]`，critic 的 review.md readiness: PASS
  是交付前置（无 CRITICAL 未修复才许交付）。

## 5. 中断与恢复

- 任何时候可关页面/停机。恢复 = 重跑 `boot-run.sh` → 新开 lead 会话说
  "继续 <slug> 这个 run"——lead 只凭 `drt_<slug>/` 的文件事实重建上下文，
  不依赖聊天记忆；
- 方向修订：直接告诉 lead——Decisions 追加一条记录后原地补搜（不算 rerun）；
  证据扩张 rerun = 同 bundle final/ 下一版；结构性另起 = 新 drt_<slug>/（sibling
  预检后建）。

## 6. 判定"研究完成"

唯一依据 = **文件事实**：final.md 存在 + lead 会话的 present 声明（手册 §完成判据），
不是任何人的口头宣告。
