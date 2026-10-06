# RFC：下一场 run 活体验证 A2 + 收活纪律（搭车挂账条目）

> 状态：proposed

## 问题

oss-dr 借鉴的行为面三件已落地（A2 回边超界契约 / 收活 UNVERIFIED 纪律 / B1 差集出题），但
**只有挂载证据（l4-lite），没有行为证据**——l4-lite 证明 skill 真挂载、模型真响应，不证明
critic 真会在轮次记账、lead 收活真会逐条核验。真验收时点 = 下一场 run 的交付收尾。不挂账的
风险：纪律成死字无人知（floor 教训的散文版——数值未遇疼痛是假牙齿，纪律未被执行是死字）。

## 方案

queue 立搭车条目（**等人**型——等下一场 run 取题后随其收尾核验，不单独开工、不找题凑数），
核验两问：

- **A2 活体**：该 run 若发生 critic FAIL→修复→复审——①轮次记账真的进 review.md/journal
  （第几轮、上轮未决项去向）；②轮数 ≤3（存量标定上限）；③若撞上限——升级动作与
  §Decisions/journal 记账在场。若该 run readiness 一次 PASS（零复审）→ 记"**未触发，不判
  失败**"（纪律可以休眠，活体验证的对象是"触发时是否被执行"，不是"必须触发"）；
- **收活活体**：该 run 若有委派——journal/任务板关单记收活结论（判据逐条 PASS / UNVERIFIED
  及原因）。**关键负判据** = "队友自报完成即关单无核验"或"核不了却静默放行" → 纪律违例，
  记回炉（进该 run audit 或 bugs 卡）。

证据落点 = 该 run 的 journal 收尾段；本条目毕业 = 证据行指向该 journal + 删队列行。

**工具面**（2026-10-06 同日落地，收尾核验可直接调用对账）：`scripts/lib/unconsumed-evidence.mjs`
（B1 差集投影——evidence/ 未进 findings.md 的卡清单）与 `scripts/lib/acceptance-check.mjs`
（收活判据 PASS/FAIL/UNVERIFIED 三态机械求值，DeerFlow acceptance_criteria 的 keyless 移植）；
操作侧用它们把"收活结论/差集出题"对账成机械事实，**不代替** lead 运行时的 skill 纪律
（角色无 bash）。单元反证 = tests/unconsumed-evidence + tests/acceptance-check（233 条回归内）。

## 输掉的方案

- **等实证疼痛才验**：风险 = 纪律死字化不可见——疼痛形态恰是"没人发现纪律没被执行"；
- **机械门禁化**：journal 轮次/收活记账是散文事实，机械判 = 假门禁（A2 Note 已判，维持）；
- **专门合成 run 验证**：造证据非活体，且违"队列空待取题、不找活凑数"纪律。

## 验收

下一场 run 交付收尾时上述两问各有明确答案（触发 → 证据在场核验；未触发 → 如实记录休眠），
本条目毕业删行；两问全未触发也构成有效验证（休眠态如实记账）。
