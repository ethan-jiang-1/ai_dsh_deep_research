---
status: 已修
severity: P2
opened: 2026-10-16
---

# BUG-030：snapshot-replay C5 渲染金标准间歇性红——活动行只渲染 1/2（BUG-027 修复后的复发）

> 状态：已修 — 根因 = **A 层"回合完成"判据用全文 `includes` 找哨兵，而哨兵写在 prompt 里**（提前放行 → 后续层在回合在飞时执行 → C5 缺末行）；修法 = 判据收进 `lib/replay-request`（哨兵只认 assistant 文本 + `turn/end` completed），冒烟与录制器共用。证据 = 单元三例先红后绿 · 现场确定性反证（旧判据在「回合已完成=false」时放行，同跑 C0b 3/4 红）· **连续 5 次 ALL PASS** · L0 471/471；去向 = [回合落定判据 Note](../../../notes/implemented/2026-10-16-replay-turn-settled-predicate.md)｜发现：2026-10-16（B1 站点迁移的对照实验顺带实测）

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

## 根因（**已由日志证据确认**，2026-10-16）

**结论：不在 C 层，也不在 BUG-027 的 C0b 谓词——在 A 层的"回合完成"判据。**

A 层（`snapshot-replay-smoke.mjs:214`）判回合完成 = `text.includes(SENTINEL)`，即**在整份日志里全文找哨兵**；
而哨兵 `探针完成` **本身就写在录制 prompt 里**（`dev/record-role-fixture.mjs` 的四条角色探针原文含"以「探针完成」收尾"）。
于是：**user/message 一落盘，A 层立刻放行**，此时 canned 回放回合才走到第 3–4 步 → B/C 层在回合在飞时执行 →
C5 捕获到的活动行缺少末尾那条 assistant 行（且场景收尾 kill 掉 web，该行永远不会再出现）。

### 三证

1. **FAIL 场日志（`session-97e06292…`，与 PASS 场逐事件对照）**：末尾停在 `seq 37 tool/call web_fetch`（第 4 步中途，
   无 `tool/result`、无 `step/end`、无 `turn/end`）＝ 39 事件 / **assistant/message 4 条**；
   同批 PASS 场（`session-12b8ea16…`）走完 5 步，末四事件 = `assistant/message`（收尾文本）→ `step/end` →
   `turn/end {reason: completed}` ＝ 46 事件 / 5 条。
2. **哨兵在 FAIL 日志里的落点**：`seq 3 agent/inbox/spliced`、`seq 8 user/message`——**都在 prompt/回执里**，
   唯独不在 assistant 文本里。即 A 层的 `includes` 命中的是 prompt 回显。
3. **现场采样时间线**（临时诊断，3 跑）：FAIL 场活动行 = 1 行，**5 秒后复采仍 1 行**（不是"晚到"，是回合没走完）；
   PASS 场 2 行稳定。

### 撤回记录（根因纪律）

- 本卡建档时的假设「**BUG-027 的 C0b 就绪谓词覆盖面 < 断言面（只等 tool/call、不等 assistant 行）**」——
  **证伪**：C0b 在 FAIL 场照常工作（tool/call 全挂）；缺的行不是"没等到"，是**回合根本没产生那条消息**。
  该假设的错误在于：把"客户端没渲染"当成"服务端没数据"，而实际是**上游判据提前放行**。
- 记录保留（撤回本身是证据）：它解释了为什么修 C0b 面不会有效。

## 修法（选定）

1. **A 层判据改"哨兵只认 assistant 文本"**——与录制器 `dev/record-role-fixture.mjs` 的既有判据同源
   （`assistantTextsOf(log).some((t) => t.includes(SENTINEL))`；录制器 2026-10-13 已因同一坑改过，消费侧没跟上）。
2. **判据收成一处**：把 `assistantTextsOf`（+ 哨兵落点判定）提进 `scripts/lib/replay-request.mjs`，
   冒烟与录制器共同消费（消灭第二份抄写——本仓"一处事实一个家"）。
3. **加"回合结束"显式态**：A 层同时要求日志出现 `turn/end`，且 `reason.kind === 'completed'`——
   判据从"推断回合走完"变成"等显式状态"（scripts/AGENTS「等待显式状态」），非 completed 即 A 层红（fail-loud）。

## 牵出的失败类

**就绪谓词的覆盖面必须等于断言面**——"等某个显式状态"若只覆盖断言的一部分，剩下的部分就是时序骰子
（scripts/AGENTS「等待显式状态」的边界情形）。同族探针：`client-load-smoke` 的 C0b 类等待是否也只覆盖了
tool/call 面。

## 修复判据

1. **单元级（keyless，确定性）**：新谓词在 `tests/run/replay-request.test.mjs` 留三例——哨兵只出现在
   `user/message`/`agent/inbox/spliced`（prompt 回显）→ **不算落定**；出现在 `assistant/message` 文本 → 落定；
   `turn/end` 缺失或 `reason.kind !== 'completed'` → 回合未结束。**先红后绿**留档。
2. **现场级反证（确定性对比）**：把 A 层判据临时改回全文 grep → 记录 A 层放行时刻（应为第一个轮询节拍 ≈4s，
   远早于回合真实时长）；改回修复版 → A 层放行时刻 ≈ 回合时长且日志已含 `turn/end`。两次留档。
3. **连续 ≥5 次 `snapshot-replay-smoke` ALL PASS**（与 BUG-027 同判据）——修复前当日实测 4 红 / 6 跑。
4. **不静默收窄**：修复只改"何时放行"，B/C 层断言与金标准逐字比对**零改动**（比对器与 `ui.expected.md` 不动）。
5. L0 全绿（`pnpm verify` + `pnpm test`）。

## 修复关联

待。相邻卡：[BUG-027](BUG-027-snapshot-replay-c5-activity-row-flicker.md)（同面已修一次，本卡是复发——按"已修永不重开、复发 = 引用旧卡的新卡"建档）。

## 修复关联

2026-10-16 落地：

- **lib** = `scripts/lib/replay-request.mjs` 新增 `assistantTextsOf` / `sentinelInAssistantText` / `turnCompleted`（判据唯一正本）；
- **消费方** = `scripts/smoke/snapshot-replay-smoke.mjs` A 层（哨兵 + `turn/end` completed 双条件，fail-loud 文案同步）·
  `dev/record-role-fixture.mjs`（删本地 `assistantTextsOf` 副本，改消费共享件——消灭单边漂移的来源）；
- **测试** = `tests/run/replay-request.test.mjs` 三例（先红后绿）；
- **决定记录** = [回合落定判据 Note](../../../notes/implemented/2026-10-16-replay-turn-settled-predicate.md)（含被证伪的假设与撤回记录）；
- **后续观察面**：本卡是"消费侧没跟上录制侧判据"的一例——B2 五站点若也有自家哨兵/落定判据，迁移时按同一正本核对
  （已写入 [round3 卡](../settled_issues/2026-10-16-structure-round3-convergence.md) 的 B2 待办语境）。
