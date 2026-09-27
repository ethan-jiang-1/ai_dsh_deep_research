# 真人档验收——以用户改令收束（机械面代理模拟闭环 + 真人变量豁免留口）

> 状态：implemented

2026-09-26 立项（等人条目——真人 HITL / 卡片可用性 / 观察面目验三项只有真人能闭）；2026-09-27
用户改令收束：**"你模拟着把它做掉……这是基本要求，别拽着人"**——机械面由第 12 场代理模拟 run
闭环，真人变量如实记"未采集（用户明示豁免）"，转任意时刻自愿复查口（约 2 分钟）。

## 决定

- **机械面（原判据 4）由第 12 场闭环**——`drt_dsh-release-watch`（会话 session-2e246686，现行
  profile 全自服务：kickoff / HITL 代答 / 谓词盯场 / 审计 / 归档）：
  - 交付物：run 根 `final.md`（168 行，题面 = DSH 在 rc.2 之后的版本演进 + agent-team 转正
    状态）+ `final/v1.md` 版本记账 + lead `present` 声明 + `review.md` readiness PASS
    （未修复 CRITICAL 0，critic 五轮对抗含 epoch 争议三方收敛七轮全程留痕）；
  - `evidence-audit`：24 份证据 · URL 溯源 76/77 · source_url 真抓 24/24（未抓 0）· 摘录回溯
    160/168（复合 7 / 不符 1）· final 链 76/76 · **CRITICAL 0**（MAJOR 2 / INFO 24 如实点名
    于 audit.md）；
  - 两点纪律：HITL 之间静默自主（全程零中途提问）；判据④ 实测——fresh lead 会话**只凭
    bundle 文件**正确判定"已交付并冻结，不需要重做研究、不需要组队，下一步只剩操作侧归档 +
    可选证据扩张 rerun"（文件事实表逐条带出处——"文件即真相"的正向证据）；
- **真人面（原判据 1/2/3）未采集，用户明示豁免**：HITL1 五问与 HITL2 一问均代理模拟
  （`dev/hitl-answer.mjs` 真浏览器 answerer，逐题选推荐项；bundle 的 question.md §Decisions
  与 journal.md 均有操作侧如实标注"代理模拟"——它替的是人，不是人）；卡片可用性与观察面
  目验无真人结论——代理侧替代数据在案但不冒充真人档（八场 77 卡全量审计、观察面走查三发现，
  均为代理评估）；**复查口常开**：用户任何时候想亲验（开 3081、点两张卡、给三句结论，约
  2 分钟），结论补记本 Note 或按需立新条目；
- 操作侧全程事件形状谓词（同日交付的 run-ops-self-diagnosis：run-state 模块 + watch-run
  盯场 + hitl-answer 前置自拒）——本场立项前的 grep 假阳性（误报"卡已挂起"）与判定过急
  （final 落盘误报"已交付"）两个事故均被该交付闭环。

## 输掉的方案

- **把"代理模拟 + 机械断言"当作真人档闭掉**（原输掉的方案第一条）：用户改令后此路成立——
  但记录必须**如实分层**：模拟记模拟、未采集记未采集，不冒充真人（本 Note 的写法即执行
  这条边界）；
- **维持等人判据等用户到场**：用户明示改令"别拽着人"，弃；
- **为门禁形状保留一条伪队列条目**：凑工作量反模式（unprocessed-inventory 已否决"复活
  搁置池条目凑工作量"），弃——队列清空以 parked 状态机制化承接（本次同 diff 落地：
  `（队列空——待用户取题）` 标记成为门禁认可的一等状态，红→绿实录见 evaluation.md 对应行）。

## 实际跑过的验证（2026-09-27/28）

- 第 12 场全流程实录：run-kickoff（workspaceId 形态）→ HITL1 代理代答（五问全推荐）→
  静默自主（组队 ×4、lead 会话 web_fetch ×19、edit ×62，`llm/retry` 上游抖动熬过 10 次）→
  HITL2 代理代答（「按现稿定稿」）→ `present` ×1 + turn/end（watch-run 判 RUN-SETTLED，
  presentCalls=1 无偏差）；
- `evidence-audit` CRITICAL 0（数字见上）；判据④ 答复全文留档于操作侧会话日志；
- L0：`pnpm verify` 全绿 · `pnpm test` 75/75；
- 队列清空 parked 态红→绿：三门禁（entry-chain / queue-pointer-live / proposed-pointer-live）
  在空队列上天然红（实录）→ parked 语义落地后绿；"标记 + 编号条目并存"负例注入红→还原绿。

## 环境状态

- 队列空（parked，`（队列空——待用户取题）`）——本仓全部条目毕业，待用户取题；
- run 通道 3081 活着（token 在 `dev/smoke-workspace/web.log`）；第 12 场 bundle 归档于
  `research-workspace/archive/drt_dsh-release-watch/`（位置=状态，工作区根零活跃 bundle）；
- 复查口常开（2 分钟亲验流程 = 61-run-playbook §1–6 的用户视角子集：真人答两张卡 +
  三句体验结论）。
