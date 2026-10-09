# 审查回边超界处置显式化（oss-dr 候选 A2 落地）

> 状态：implemented

出处 = [_done/_closed_plans/2026-10-06-oss-dr-lessons.md](../../_backlog/_archive/settled_issues/2026-10-06-oss-dr-lessons.md)
候选 A2（用户 ongoing goal 2026-10-06 点名提前激活）；反面参照原文 =
[_done/_reference/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md](../../_backlog/_archive/research/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md) §1c
（gpt-researcher 两条回边有界但超界 fail-open 强 accept）。

## 决定

审查回边（critic FAIL → 修复 → 复审）的"上限 + 超界处置 + 降级记录"三要素显式化，三处同 diff：

1. **NODES.md 回边版本语义节**新增「回边超界处置」小节（2026-10-06 起）：复审上限 **3 轮**
   （首次 + ≤3 复审；同日存量标定后由初版 2 轮修正——见验证节）；超界处置 = 停止循环，未决
   CRITICAL/MAJOR 清单**原样升级 HITL2 人工裁决**——三选项（打回/放行/报错升级）中选报错
   升级，fail-loud 同向、宪章"阶段边界请人"一致；每轮修复与复审记 journal（超界/降级
   显性化）；两点交互边界节补"超界升级走 HITL2 既有交互点，不新增交互面"；
2. **critic skill**（adversarial-review）同款纪律进模型可见面：复审 ≤2 轮、超界如实 FAIL +
   清单升级、**不得为凑 PASS 放宽判据**（readiness 判据不降同款）、review.md 留轮次记账；
3. **另两条回边的上限语义一并钉死**：补研究重入不设机械上限（每次由用户拍板触发〔门③〕，
   上限住用户不在机制；无拍板行重入 = 门④红既有把守）；gap 定向补搜只一轮（既有不变）。

参数依据：**存量标定**（2026-10-06，33 场归档 journal 全量 grep 轮次标记 + 高轮次场次逐场
读）——真实 FAIL→修复循环最坏 = cn-agentic-parity 四轮收敛（FAIL×3→PASS，同一根因账本↔
draft 双向失同步反复再现，critic 自述"本可省掉第三、四轮"但确实需要第 3 轮复审抓同根因
反向再现）；上限 3 复审 = 覆盖历史最坏修复循环。dsh-release-watch 的五轮为**争议裁决形态**
（critic 自己的锚点错误直到第五轮才认领）——该争议终裁需要人跑一条 `node -e` bash
（journal 自述"供任何第三方 5 秒内自判"），超界升级对这种形态恰是解法，佐证超界处置设计。

**机械把守边界**：复审轮数不立机械门——journal 轮次记账是散文事实，机械判会产生会漂移的
假牙齿（writing-a-gate 第 1 步判据：非固定条件可判，不造门）；上限靠 skill 纪律 + 超界
升级的人工可见性把守。

## 输掉的方案

- **机械门禁判复审轮数**：散文事实机械化 = 假门禁（判据会随 journal 写法漂移）；
- **超界放行带注**（gpt-researcher fail-open 同款）：与 fail-loud 纪律反向——静默放行正是
  本契约要防的病；
- **上限 1 轮**：过紧——首轮修复常涉格式性返工，会把正常修复流推到人工裁决，稀释阶段边界
  纪律；
- **上限 2 轮（初版，类推 retry 纪律拍板）**：存量标定否决——cn-agentic-parity 实测需要第
  3 轮复审抓同根因反向再现，2 轮会把历史真实收敛流误推人工裁决、制造第三交互点（违反两点
  静默纪律）；类推拍板先于标定 = 本 Note 应记的流程教训（floor 教训"先标定后立门"的参数版）；
- **补研究重入也设机械上限**：重入由用户拍板触发，机制上限 = 代替用户做次序决定。

## 验证

- `pnpm verify` 全绿（含 pack-workspace-fresh 种子重同步后对账）；
- **真模型档**：`l4-lite-smoke` ALL PASS（四角色 assistant 响应 + scout web_search 工具
  调用——critic 携带新纪律的 skill 真挂载、真响应；参数修正后复跑一次同判）；
- **存量标定**（参数 2→3 的依据，方法 = 33 场归档 journal 全量 grep 轮次标记 + 高轮次场次
  逐场读）：修复循环分布 ≈ 多数 ≤2 轮、cn-llm-deep-research 三轮、cn-agentic-parity 四轮
  （最坏修复循环）、dsh-release-watch 五轮（争议形态，非 FAIL 循环——readiness 自第三轮
  即 PASS，续轮为争议裁决）；
- 毕业形态：本 RFC 由 proposed/ 改写迁 implemented/ + 队列行删除（queue 回 parked）。
