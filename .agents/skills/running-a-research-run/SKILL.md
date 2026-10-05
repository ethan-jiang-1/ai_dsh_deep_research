---
name: running-a-research-run
description: Use when starting, babysitting, or resuming a deep-research run — boot the run channel, drive HITL1, hold silence until delivery, read the observation dashboard, and land the finished bundle as a drt_ directory.
---

# 跑一次研究 run

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/graduating-a-queue-item`](../graduating-a-queue-item/SKILL.md) · [`.agents/skills/adding-a-research-role`](../adding-a-research-role/SKILL.md)。

run 的操作面是**文件 + 会话通道**，不是代码。启动器、观察面、交付落位的细则在
[guides/61](../../../docs/guides/61-run-playbook.md)；本技能给顺序与判断点。

## 1. 开跑前

- 题面：一次调研 = 一个 run bundle（`research-workspace/drt_<slug>/`）。同名/前缀相关
  bundle 已在 → 先问用户，不擅自另起（bundle 身份 = 方向契约）；
- **开跑前先扫未归档 run**：`research-workspace/drt_*/`（`archive/` 除外）——根目录下**每个** bundle
  都要报出来，分两类：(a) 无 `final/` 或 `review.md` 不是 `readiness: PASS` = 在飞 → 问**接续它还是
  新开**（接续做法 = §3）；(b) 有 `final/` 且 PASS = 交付线已在盘但未归档 → 问**先归档再新开，还是
  补研究**。两类都带 slug + mtime，**都不自己挑**；
- 起通道：`bash dev/boot-run.sh`（幂等：组合校验 → 漂移检测 → boot web（`DSH_RUN_PORT`，缺省 3083）
  → 仪表盘）。**呈交纪律 = 先自跑自修（红了当场修）+ 验浏览器面全绿，才把 URL 交给用户**
  （正本 = guides/61 §0 启动请求的呈交纪律）。
  改了 pack 文本（persona/skill/手册）必须重启通道——**web 进程缓存 boot 时的文本**；
- 观察面两处、同一折算：`node scripts/run-dashboard.mjs --latest --out <html>`（或 `--watch`，
  多场扫描的 HTML 投影）与 GUI 右栏「研究状态」页签（会话内实时：步骤条 + HITL 挂起横幅 +
  活标题「研究状态 · ⏳ 等你拍板」）——"这次 run 是否在等我"两处答案一致。

## 2. 只有两个人机交互点

**HITL1（立项对齐）**：lead 问清研究类型/深度/口径；用户回答后 start 开工。
**HITL2（交付审阅）**：lead 呈 review 结论 + 交付稿，用户拍板（定稿 / 补研究 / 改形态）。

**超时语义（0.2.0 timed ask-user，600s）**：ask 挂起 600s 未答 → 工具返回 pending，**问题保持
可答**（横幅仍在——hitl-fold v5 把 timed 超时仍判挂起），lead 可继续有用工作但不把沉默当拍板；
你之后随时可答，答复作为新消息唤醒会话。**不是**按推荐项自动落定。

两点之间**静默自主**：不问"要不要继续"、不汇报中间进度、不等确认。中途用户主动发消息
→ 直接回答，但不改变既定方向与分派。

用户不在场时，交互点由代理**模拟**并显式标注"代理模拟"——记进 bundle 的
`question.md` §Decisions 与 `journal.md`，不隐去。

## 3. 中断与恢复

- 挂起回合（等 HITL）在通道重启后**原样保留**（无终局化补写——2026-10-05 实测：杀通道
  + 重启，日志事件数与内容不变，无 turn/end / end-seed；BUG-009 卡正本）；恢复 = 向该
  会话发恢复 prompt 即唤醒，lead 原样重发问询（实测秒级）——重发后旧 pending 卡由
  末位 ask 语义自然取代（v5 折算），无需手动清理；
- 通道死亡不影响 bundle：**文件即真相**（实测：web 死 2 小时，bundle 零损失）——但
  **会话日志尾部不保证**：在飞写入丢尾实测 303→158 事件（BUG-007 卡正本），盘侧谓词
  消费前先过 `eventsRegressed` 回退检测；
- 会话日志是 zstd **多帧**拼接（逐次 append 一帧），单帧 API 只解出首帧——按魔数
  `28 B5 2F FD` 切段逐帧解压（`scripts/run-dashboard.mjs` 有实现）。

## 4. 交付落位（完成判据）

run 交付后，bundle 必须落到正式契约位并在原位补齐：

1. 搬到 `research-workspace/drt_<slug>/`（撤掉任何桥接 symlink）；
2. 补齐契约：`question.md` 追加 §Decisions（人工/代理交互各一条，含时间与选择）、
   critic 的对抗核查报告落 `review.md`、当前版正文与 `final/` 版本记账对齐（
   [研究手册](../../../research-workspace/AGENTS.md) 的目录约定）；
3. 判据④ 实测：**新开一个 lead 会话，只凭 bundle 文件续跑**（不给聊天记忆），
   验证它能说出研究状态与下一步——这是"文件即真相"的正面证据；
4. 结论：bundle 内 `final` 当前版 + `present` 声明齐 → run 完成。
