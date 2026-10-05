# _fixed_bugs/ · 已修复缺陷卡

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入；文件名不变、内容不重写。
> **Next BUG ID = 已分配最大号 + 1（本目录 ∪ 活跃 bugs/ 一起算）**——权威值看
> [`../README.md`](../README.md)，本表逐行登记。

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001](BUG-001-new-session-stale-run-face.md) | 新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面 | （kickoffSeen 立项轨道信号 + 抑制条件扩展 + 🌱 状态行） | 2026-09-30 |
| [BUG-002](BUG-002-pending-ask-anchor-misattribution.md) | 立项后未答的 ask 被锚点折算误标为「交付审阅 ⏳」 | （deriveAnchors 按 ask 内容判型：HITL1/HITL2 签名 + 契约外第三锚扩窗） | 2026-09-30 |
| [BUG-003](BUG-003-client-load-smoke-loop-edge-mismatch.md) | 盘侧 tailAskPending=true 的绑定会话，观察面不渲染 ↻ rerun 回边 | （smoke 删手抄镜像直调 deriveAnchors + 绑定富度修正——近窗取事件最多会话） | 2026-10-04 |
| [BUG-004](BUG-004-hitl-answer-submit-not-landing.md) | hitl-answer 点击提交不落地——"卡头消"与盘侧 answer 事件脱钩 | （ask-drive 策略库：UI 形状永不判完成 + 盘侧裁决升格 exit 1 + 进程组收割；活体确认 = 确认 run 四问卡 4/4 落盘） | 2026-10-05 |
| [BUG-005](BUG-005-hitl1-indefinite-wait-no-floor.md) | HITL1 ask 带 wait:-1 无限期等待——timed 护栏被绕过 + 活等待无断连地板 | （persona ask 硬约束行 + run-state askIndefiniteOf + 61 §3/§4 应答通道二分；活体确认 = 两次 ask 零 wait 字段） | 2026-10-05 |
| [BUG-006](BUG-006-quick-path-skips-hitl-anchors.md) | quick_factual 题型下 lead 自我豁免 HITL1、HITL2 未拍板即 present | （persona HITL1 零例外 + node-gate 门① HITL 锚点门——写 question.md 会话的 HITL1 签名 ask 判据；活体确认 = 同族快题复测照发卡 + 门①③②全 PASS） | 2026-10-05 |
