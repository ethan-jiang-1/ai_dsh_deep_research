# 活体验证挂账——A2 + 收活纪律 E2E 证据收口（drt_open-llm-inference-engine-landscape）

> 状态：implemented
>
> 归档：2026-10-20（单场 run 的活体验证挂账已随交付收口，无未来决策价值）

出处 = 本文件（由 proposed/ 改写迁入）；载体 run =
research-workspace/archive/drt_open-llm-inference-engine-landscape（2026-10-07 交付归档，
用户 2026-10-06 定调"跑 A"= 开源 LLM 推理引擎格局，标准研究型 × 深度报告）。挂账随该 run
交付收尾核验两问，**全部触发、全部有证据**——非休眠态验证。

## 决定（验证结果）

- **A2 活体 ✓**：critic 真实走了 FAIL→修复→复审循环两轮（上限 ≤3 未撞）；journal 逐轮记账
  （"本轮为第 1 轮审查（复审上限 ≤3 轮）"）；review.md 跨轮跟踪（差集"第 1 轮 7 张 → 第 2 轮
  已清零"）；lead 修复 11 条后 critic **逐条独立复核（非采信自述）11/11 关单**——不信自报的
  收活语义与 A2 轮次纪律同场兑现；
- **收活活体 ✓**：UNVERIFIED 第三态在 run 内大量逐字使用且带原因（"无 shell 无法 bash date，
  已如实登记（未静默放行）"/"GitHub API 限流"/"MLPerf 轮次版本号"）；关单走任务板 + journal
  记账；无"自报即关单"或"核不了静默放行"负判据形态；
- **顺带收齐（挂账外）**：B1 差集出题（critic 显式按 SKILL「evidence/findings 差集」从未引用卡
  出题并清零跟踪）与门R 首个真实 run PASS（final.md 标题 30 条、无 ≥4 重复）——oss-dr 借鉴
  五件（A1/A2/收活/B1 + 逐字令）至此全部有 E2E 证据，探针（集成层）与 run（E2E）两层一致；
- **工具面兑现**：操作侧收尾用 unconsumed-evidence.mjs 实算差集对账（total=54 cited=38）、
  node-gate 六门全绿（含新门R）、evidence-audit CRITICAL 0、判据④ 新会话只凭文件满分复述。

## 输掉的方案（过程实录）

- **拍板前跑门时序滑失**：HITL2 代答先于 node-gate 执行（playbook 要求拍板前跑门），门L 红
  穿过拍板落地——经修复请求原位修复（scout 55s 补支持来源分级行，含"C/D 双字母→单字母 D"
  的机检语义讲究）后六门全绿；过程瑕疵如实记，未静默；
- HITL2 由用户明示委托操作侧判断（原话："你其实已经很清楚我们是怎么回事儿了"）——委托事实
  记入该 run journal，与 HITL1（用户逐题拍板、操作侧转交）区分记账。

## 验证

- node-gate：门①②③L R 全 PASS、门④ N/A（v1 无扩张）；evidence-audit：CRITICAL 0 / MAJOR 16
  如实入 audit.md；watch-run：RUN-SETTLED（present=1，980 事件）；判据④：新开 lead 会话只凭
  文件准确说出交付态与下一步；
- 归档：bundle 移入 archive/（第 34 场），工作区根清零；journal 增记 per-topic 卡数
  （T1=18/T2=14/T3=29/T4=11/T5=10/T6=3——T6=3 低于源仓地板，低卡数据点入候选 A 标定池）。
