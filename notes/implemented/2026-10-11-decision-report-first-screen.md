# 报告首屏决策摘要——final.md 结构与审查合同

> 状态：implemented

出处 = 推敲卡 [2026-10-11-executive-research-decision-report](../../_backlog/_archived/settled_issues/2026-10-11-executive-research-decision-report.md)
（用户 2026-10-11 直派落地；设计依据 = 研究稿
[2026-10-11-executive-research-ux](../../_backlog/_archived/research/2026-10-11-executive-research-ux/index.md)
P0 候选③「结论可信度可判断」）。

## 决定

`final.md`（run 根当前版）从「TL;DR + 主体论述 + 反例与争议 + 证据缺口 + 来源清单」重构为
**决策摘要首屏先行**：

1. 首屏六段：决策摘要（建议 + 成立条件；证据不足写「目前不能判断」及原因，不硬给唯一
   推荐）→ 备选与取舍 → 关键依据（2–4 条，每条附 `[来源: evidence/xx.md]`，标 A–D 等级与
   关键口径）→ 最强反证 → 目前不能判断 → 下一步（未获用户指定的负责人/期限标「待定」）；
2. **快速事实型缩略**：首屏允许并为 答案 + 口径 + 依据 + 限制，不强行填满业务选项表
   （互补态：不被格式逼成商业建议）；
3. 来源清单增 retrieved_at——抓取日期与来源发布日期分别表达；
4. 交付判定权不变：HITL2 用户裁决；证据扩张/表述修订的版本语义不变（NODES 回边）；
5. 审查面：adversarial-review 新增**审查线 5 首屏核查**（无依据建议 CRITICAL、未知写成
   确定 MAJOR、格式逼出的唯一推荐 MAJOR、编造负责人/期限 MINOR）+ readiness 判据清单
   两行；
6. 落面：[final.md 模板](../../research-workspace/templates/run/final.md) · synthesis skill
   第 3 步 + 判据 + 反模式 · adversarial-review skill 线 5 + 判据清单 · pack README
   「研究怎么跑」§3 · [样例集](../../research-workspace/drafts/2026-10-11-decision-report-samples.md)
   （四组虚构样例 + 刻意反例）；契约钉 = `tests/presets.test.mjs`「报告首屏决策摘要」。

## 输掉的方案

- **保留 TL;DR 旧五段、只加一段摘要**：首屏仍是方法视角，业务读者先读到论述而不是答案
  ——研究稿 P0 判据「先作决定，再按需审计」不满足；
- **首屏强制唯一推荐**：把决策疲劳的解法压在格式上，证据不足的题被逼着站队——
  「目前不能判断」必须是合法产出（研究稿：不应强迫报告给唯一推荐）；
- **独立决策摘要文件**（final-summary.md）：一处事实两个家——final.md 已是唯一权威副本
  （D17；[计划确认闸门 Note](2026-10-07-plan-review-gate.md) 输掉方案同款取舍）；
- **自由文本反馈协议**（`[ACCEPTED]` 标记）：[hitl-feedback-protocol 否决](../rejected/2026-10-06-hitl-feedback-protocol.md)
  同款——契约测试带禁词断言。

## 实际跑过的验证

- 立红：`tests/presets.test.mjs` 新断言先红（「final.md 模板缺首屏节：决策摘要」实录）→
  实现转绿（focused 12/12）；
- L0：verify 全绿 + tests 339/339（净 +1）；
- L1：preset-smoke 真挂载四 preset ALL PASS；
- L4-lite：四角色 assistant 响应 + scout web_search ALL PASS；
- 回放面：snapshot-replay 4 场景 ALL PASS——**零重录**：skill 正文不进组装请求、persona
  与 skill description 未动，B 层组装面无漂移（与 2026-10-11 业务简报变更的 persona 重录
  形成同阶梯对照：模型可见文本变化才触发重录）；
- 对账命令：evidence-audit / node-gate / schema-scan 合成夹具契约测试全绿（伪造链 →
  CRITICAL 红证为既有测试在案）；样例集自查记录落 drafts 文件；
- 未跑（如实分开）：样例集业务读者走查 = 卡上人工判据行，待授权 run 执行（human
  judgment pending）；L2 未跑（部署面未动，路由非必跑）；真实 run 的首屏行为观察挂账
  随下一场标准型 run 核验。

## 环境状态

skill 正文不进组装请求——本变更零 fixture 重录；运行中 web 进程缓存 boot 时文本，下次
boot run 通道时新 skill 自然生效；模板镜像与 overlay 为同步/重生成产物
（`pack-workspace-fresh` / `overlay-fresh` 绿）。
