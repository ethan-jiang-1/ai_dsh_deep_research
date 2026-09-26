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
- 起通道：`bash dev/boot-run.sh`（幂等：组合校验 → 漂移检测 → boot web 3081 → 仪表盘）。
  改了 pack 文本（persona/skill/手册）必须重启通道——**web 进程缓存 boot 时的文本**；
- 观察面两处、同一折算：`node scripts/run-dashboard.mjs --latest --out <html>`（或 `--watch`，
  多场扫描的 HTML 投影）与 GUI 右栏「研究状态」页签（会话内实时：步骤条 + HITL 挂起横幅 +
  活标题「研究状态 · ⏳ 等你拍板」）——"这次 run 是否在等我"两处答案一致。

## 2. 只有两个人机交互点

**HITL1（立项对齐）**：lead 问清研究类型/深度/口径；用户回答后 start 开工。
**HITL2（交付审阅）**：lead 呈 review 结论 + 交付稿，用户拍板（定稿 / 补研究 / 改形态）。

两点之间**静默自主**：不问"要不要继续"、不汇报中间进度、不等确认。中途用户主动发消息
→ 直接回答，但不改变既定方向与分派。

用户不在场时，交互点由代理**模拟**并显式标注"代理模拟"——记进 bundle 的
`question.md` §Decisions 与 `journal.md`，不隐去。

## 3. 中断与恢复

- 挂起回合（等 HITL）在 web 重启时会被系统**终局化**（补写 turn/end + end-seed）——
  问询消失、用户无法作答；恢复手法 = 向该会话发恢复 prompt 让 lead 原样重发问询；
- 通道死亡不影响 bundle：**文件即真相**（实测：web 死 2 小时，bundle 零损失）；
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
