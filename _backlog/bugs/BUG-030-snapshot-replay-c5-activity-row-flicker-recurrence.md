---
status: 排查中
severity: P2
opened: 2026-10-16
---

# BUG-030：snapshot-replay C5 渲染金标准间歇性红——活动行只渲染 1/2（BUG-027 修复后的复发）

> 状态：排查中（根因是假设，待证据确认）｜发现：2026-10-16（B1 站点迁移的对照实验顺带实测）

## 症状

`source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs` 反复跑，`[lead] C5 渲染金标准逐字一致（卡片 + 活动行）`
间歇性 FAIL：

```
FAIL [lead] C5 渲染金标准逐字一致（卡片 + 活动行）（首个差异 @319：
期望：…🔍 检索：DSH harness / 💬 探针完成，搜了「DSH harness」（8 条结果清单，含 npm 包 dsh-continual…
实得：…🔍 检索：DSH harness（到此为止）
```

即**卡片部分一致**（1 卡），**活动行少一行**（2 行 → 1 行）。其余 39 条（A 层回放通路 + B 层四角色组装面）
恒绿。

## 复现

2026-10-16 实测计数（同一台机、同一客户端产物）：

| 被测脚本 | 跑次 | 绿 | 红 |
|---|---|---|---|
| 迁移版（web-harness，B1 站点③） | 4 | 1 | 3 |
| **对照：未迁移的原始脚本**（`git stash` 后同机同客户端） | 2 | 1 | 1 |

→ **与站点迁移无关**（对照两跑即复现一次红）；当日整体约 4 红 / 6 跑。

## 根因（假设）

[BUG-027](../_archived/fixed_bugs/BUG-027-snapshot-replay-c5-activity-row-flicker.md) 的修复 = C0b「客户端历史就绪谓词」：
等**期望的 `tool/call` callId 集合**到齐（30s 死线）再捕获渲染。而金标准里的活动行不止 tool/call——
`💬 探针完成，搜了「DSH harness」（8 条结果清单…）` 是**assistant 文本**折出的行。假设：谓词覆盖面 < 断言面，
assistant 行仍在流式加载时捕获即少行；与 BUG-027 同族（"修完只钉住当时观测到的那几行"）。

**待证**：①把 C0b 谓词扩到 assistant 文本 / 等活动行数稳定 → 连跑 ≥5 次全绿；
②反证：人为延迟该 assistant 行的到达 → 旧谓词红、新谓词绿。

## 牵出的失败类

**就绪谓词的覆盖面必须等于断言面**——"等某个显式状态"若只覆盖断言的一部分，剩下的部分就是时序骰子
（scripts/AGENTS「等待显式状态」的边界情形）。同族探针：`client-load-smoke` 的 C0b 类等待是否也只覆盖了
tool/call 面。

## 修复判据

1. 捕获前的就绪谓词覆盖金标准里**全部**渲染面（tool/call + assistant 文本行），仍带死线与 fail-loud；
2. **连续 ≥5 次 `snapshot-replay-smoke` ALL PASS**（与 BUG-027 同判据），且注入反证留档（人为延迟 →
   旧实现红）/ 还原绿；
3. 若证明是"捕获时机"而非"谓词覆盖面"，则改判为等待形态问题并改写本卡根因（撤回记录留卡）。

## 修复关联

待。相邻卡：[BUG-027](../_archived/fixed_bugs/BUG-027-snapshot-replay-c5-activity-row-flicker.md)（同面已修一次，本卡是复发——按"已修永不重开、复发 = 引用旧卡的新卡"建档）。
