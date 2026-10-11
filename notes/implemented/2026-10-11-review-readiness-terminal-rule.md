# 终局 readiness 判定收成一处：只认行首判定行，取最后一条

> 状态：implemented

## 决定

「review.md 的**终局** readiness」在仓里有三版实现且语义分叉，2026-10-11 由 ③-a 的新浏览器断言当场
抓出真实后果，故把**终局**语义收成一个纯函数：`packages/deep-research-pack/src/lib/review-readiness.ts`
的 `terminalReadiness(reviewText) → 'PASS' | 'FAIL' | null`。

规则（三条，缺一即错）：

1. **只认行首判定行**——契约形态 `## readiness: PASS | FAIL`，兼容 `**readiness: …**`、中文冒号、
   列表项前缀；正文或附录里的**行内引用**（如「第 1 轮（首次审查）：\`readiness: FAIL\`」）是历史
   留痕，不得夺权。
2. **取最后一条**行首判定（两相 review：首审 FAIL → 复核 PASS，终局在文末）。
3. **不猜**：无判定行 / 空模板 `## readiness: PASS | FAIL`（两词并存）/ 输入缺席或畸形 → `null`。

消费方三处（同一函数，不再各写 regex）：驾驶舱 `ResearchStatusTab.tsx`（`reviewFail` 三态）、
真浏览器冒烟 `scripts/smoke/client-load-smoke.mjs`（盘侧真值镜像）、`scripts/run-ops/run-dashboard.mjs`
（`parseReview` 的终局口径）。

**不纳入**：`scripts/lib/node-gate-core.mjs` 的 `readinessOf` 是**另一种**语义（交付门上问「是否存在
PASS 判定」，用于门②/门A），与「终局判定」不同意图——强行合并会把两个问题塞进一个函数；它的行为在
`drt_deepseek-default-upgrade` 上实测正确（返回 PASS）。差异在此记录，不静默。

## 输掉的方案

- **继续各处自写一版 regex**：漂移已经发生（三版：首个 PASS 行 / 未锚行首末位 / 抄来的末位），且
  `node-gate-core` 的注释还自称「唯一语义源」——注释不拦人，函数才拦。
- **保留未锚行首的末位匹配**：真实形态实证——`drt_deepseek-default-upgrade` 已交付、终局 `readiness: PASS`，
  但 review.md 按 critic skill 契约在文末附录保留首轮 `readiness: FAIL` 的血统记录 → 该规则把附录
  当终局，仪表盘/镜像把已交付 run 报成「审查修复中」，与 UI 渲染对不上。
- **改成取首个匹配**：反向夺权——两相 review 里首审 FAIL 会盖掉复核 PASS。
- **把 `node-gate-core.readinessOf` 一并统一**：语义不同（见上），统一即混淆；差异显性记录更诚实。
- **改契约让 review.md 不写历史**：critic skill 明确要求「每轮复审留轮次记账」，改契约迁就实现是
  本末倒置；正确做法是让**读取方**分辨判定与引用。

## 实际跑过的验证

- `tests/review-readiness.test.mjs` 9 用例：先红（模块缺席）→ 实现 → 9/9 绿。关键用例 = **真实形态**
  （终局 PASS + 文末附录保留首轮 FAIL 的行内引用 → 仍 PASS）。
- **两路反证注入**（红→还原→绿）：①改回未锚行首的末位匹配 → 2 红；②改成取首个匹配 → 2 红。
- **真浏览器负例证明**（`validation-design` §3 要求新守卫先证负例）：把驾驶舱摘要层的
  `knownLine` 渲染行抽掉 → `client-load-smoke` 的「业务摘要层 = 盘侧 brief-fold 真值」断言
  **红并点名缺行**（缺行：当前版已交付；历史拍板见 que…）→ 还原 → **ALL PASS**。
- **新增断言本身**：`client-load-smoke` 补「业务摘要层五问逐行对账」（盘侧直调 `deriveBusinessBrief`
  算期望）+「未绑定会话摘要层如实『尚未确认』」两条；此前该层浏览器断言命中数为 **0**。
- L0：`pnpm verify` 全绿、`pnpm test` **369/369**（含本模块 9 用例与既有 `run-dashboard.test.mjs`
  的两相用例保持绿）。

事故与验收记录：[③驾驶舱卡](../../_backlog/issues/2026-10-11-executive-research-ux-delivery.md)（③-a 行）。
