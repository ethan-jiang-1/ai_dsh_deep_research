# node-gate 三处判据放宽（门L 分级解析 / 门③ 代理代答拍板行 / 门A 升级路径）

> 状态：implemented

出处 = 端到端真 run 实测（`research-workspace/drt_anthropic-claude-release-line-timeline`，
2026-10-18；现场 = 该 bundle 的 `node-gate.md` 与重跑日志 `runtime/.gate-recheck.log`）。
卡 = BUG-038 / BUG-039（同日已修归档）。

## 决定

1. **门L 分级判据剥 markdown 强调**：模型天然会把分级加粗（`（本轮 200，**A**，`primary`）`），
   旧判据要求分级**紧跟括号** → 对已正确分级的 17 条条目假红。改为：剥 `**`/`__`/反引号后，
   行内任一**括号/逗号/顿号**后出现独立 A–D 令牌即算（`A` 后不得接字母数字——防撞 URL 片段）。
   真问题（缺 `- 建议 owner:` 行）**照样判红**（实测同场仍红 1 条）。
2. **门③ 认代理代答 provenance 行**：`hitl-answer` 的显式记账行（`交付审阅` + `代理模拟|hitl-answer`）
   即 HITL2 拍板行——判据抽 `isHitl2Row` 单一正本，门③ 与门A 共用；detail 如实标注"其中 N 条为代理代答"。
   （原判据只认字面 `HITL2`，而该行按记账纪律写的是「HITL 交互 = 操作侧代理模拟…Q1「交付审阅」…」。）
3. **门A 认「未决项升级到用户裁决」这条既定路径**：readiness 非 PASS 时，**同时**满足
   ① review.md 有升级/未决项记账 ② §Decisions 有 HITL2 拍板行 → 不判"越过审查前置"。
   **收窄条件有意**：只认 HITL2 行会 blanket 豁免 A1（实测会打掉 4 条既有反证），故必须两件同时在场。

## 输掉的方案

- **门③ 直接放宽 `/HITL2|交付审阅/`**：`交付审阅` 三字在普通记录里也会出现（计划卡、修订表述），
  会造出"没拍板也算拍板"的静默绿——故要求**代理标记**同行。
- **门A 只认 HITL2 行**：见上（打掉既有红灯形态）。
- **门L 直接认任意 `A–D` 字母**：会撞 URL/哈希里的字母 → 保留"括号/逗号后 + 不接字母数字"的边界。
- **改夹具迁就实现**：本轮**未动任何既有夹具**（521 → 524 全绿靠判据收窄 + 新夹具承载新语义）。

## 实际跑过的验证

- **真现场（先红后绿）**：同场 bundle 重跑 node-gate —— 门③ RED→**PASS**；门L 假红 17→0
  （仅剩 1 条真问题）；门A 仍 RED **且这道红是对的**（该场 review.md 无升级记账、R1 结论是
  "小改后复审放行"，属**运行纪律问题**：代理代答在 FAIL 态选了「定稿」→ 交付越过前置）。
- **契约测试**：新增三例（`isHitl2Row` 纯函数形态、门L 加粗分级夹具、门A 升级路径夹具），
  夹具加在 `tests/fixtures/node-gate/bundles/`；**负例留证块**写明两条红配方（还原旧正则 / 删分支）。
  `pnpm test` **524/524** 绿；既有 4 条 A1 反证未改仍绿。
- **L0**：`pnpm verify` 全绿。

## 追加（BUG-040，同日）：终局 readiness 收归单一正本

- **病**：`readinessOf`（门侧）与 `terminalReadiness`（pack/UI 侧）各持一份"最后一条胜"的循环。
  BUG-036 把轮次仲裁只修在 pack 那份 → 同一 bundle「UI 判 PASS、门判 FAIL」（实测：
  `drt_cambricon-commercial-sustainability` 与用户的在飞 run 都中）。
- **治**：pack 导出 `terminalVerdictLine`（"哪一行是终局"的唯一正本，含轮次路径 + 仲裁），
  `terminalReadiness` 变薄壳；门侧 `readinessOf` 委托它，**只保留门独有的附条件语义**；
  门侧三份装饰副本删除。导入方向沿用既有先例（`scripts/lib/hitl-provenance.mjs` → pack TS lib）。
- **钉**：`tests/run/review-readiness.test.mjs` 增"跨实现一致"两例（六种文本 + 附条件语义），
  **先红后绿**；`pnpm test` 528/528、`pnpm verify` 全绿、三场真 bundle 同判。
- **预期后果（写下来免得被当回归）**：readiness 由 FAIL 变 PASS 的旧 bundle 会**唤醒**此前 N/A 的门②/③。
  cambricon 那场因此露出真实缺口（代答后未落 present 声明）——判据更真，不是新引入的红。
