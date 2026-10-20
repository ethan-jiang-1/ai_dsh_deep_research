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

### 兼容集按真实语料扩宽（2026-10-16，窄放宽 (A)）

动因：13 场已交付 bundle 的终局判定带**装饰**，旧兼容集读不出 → 3 场被更早的历史 FAIL 夺权（假 FAIL）、
4 场读成"未判定"（假 unknown）——观察面把已交付 run 显示成「审查修复中/未判定」。
现规则在**行首判定行**这一语义不变的前提下，容忍以下装饰（判据核 = `stripVerdictDecor` + `VERDICT_LINE`）：

| 装饰 | 真实形态（场次） |
|---|---|
| 块引用 / 列表符 / 箭头 | `> **## readiness: PASS（最终）**`（kimi）· `→ **\`readiness: PASS\`**（放行至 HITL2）`（price-check） |
| 标题标记 + **短标题文字** | `## 终验 readiness: **PASS**`（agent-memory）· `## 结论先行：**readiness: PASS**`（geometry） |
| 加粗 / 反引号包裹 | ``**`readiness: PASS` 维持不变…**``（cn-agentic-parity）· ``**`readiness: PASS`** —— …``（zhipu） |
| 短标签（≤10 字 + 冒号） | `**⇒ 复核结论：\`readiness: PASS\`**`（cn-us-open-source）· `**第 2 轮结论**：**\`readiness: PASS\`**`（open-llm） |
| 值后缀 | `（最终）` / `（可带风险交付）` / `（维持）` / `—— …` |

**边界同时收紧为可陈述的负例**（装饰前缀有**形状上限**：短标签至多 1 枚、标题文字至多 1 段）：

- **行内提及不构成判定行**：`` …我将重新抓取受影响 URL 复核并给出 `readiness: PASS` ``（mcp-server-ecosystem 的
  承诺句）与 `` 够得上交付；`readiness: PASS` 是我基于文件事实的判定 `` 都不夺权——真判定仍是更早的 FAIL/veto；
- **表格单元不夺权**：`| —— **结论** —— | **readiness: FAIL** |` 要行内匹配才读得到，会放历史引用越权；
- **长前缀历史标题不夺权**：`# 复核轮（Round 2，2026-09-27）——**readiness: PASS**` 的散文前缀过不了
  标题文字原子（≤9 字 + 空白）；
- **标题散文堆叠 / 标签链不夺权**：`## 第二轮 复审 结论 说明 readiness: PASS` 与 `## 一审：二审：readiness: PASS`
  都被形状上限挡住——否则"标题里提过 readiness"会整体夺权。

放宽的是"读得出"，不是"放得过"：判定值仍只有 PASS/FAIL 两态、仍取最后一条；`fetchedOk`/门A 等下游
档位不受影响。实施 = 本 Note 同 diff 两侧（pack 纯函数 + node-gate `.mjs` 镜像）。

消费方：驾驶舱 `ResearchStatusTab.tsx`、真浏览器冒烟 `scripts/smoke/client-load-smoke.mjs`、`scripts/lib/run-dashboard-core.mjs` 直接调用本函数；node-gate 在独立纯 `.mjs` 判据边界镜像同一行规则，并由 `gateBundle` 测试覆盖。

交付门也使用终局 readiness：HITL2 的前置必须是 review.md 最后一条有效行首判定为 PASS，历史轮次中的 PASS 不能越过后续 FAIL。node-gate 仍单独提取终局行的附条件标记作为 WARN，不把条件裁决权交给机械门禁。

## 输掉的方案

- **继续各处自写一版 regex**：漂移已经发生（三版：首个 PASS 行 / 未锚行首末位 / 抄来的末位），且
  `node-gate-core` 的注释还自称「唯一语义源」——注释不拦人，函数才拦。
- **保留未锚行首的末位匹配**：真实形态实证——`drt_deepseek-default-upgrade` 已交付、终局 `readiness: PASS`，
  但 review.md 按 critic skill 契约在文末附录保留首轮 `readiness: FAIL` 的血统记录 → 该规则把附录
  当终局，仪表盘/镜像把已交付 run 报成「审查修复中」，与 UI 渲染对不上。
- **改成取首个匹配**：反向夺权——两相 review 里首审 FAIL 会盖掉复核 PASS。
- **历史上的分离顾虑（已被后续裁定取代）**：早期曾把 node-gate 的「存在 PASS」视为与终局判定不同意图；交付门实际必须看最后有效判定，否则旧 PASS 会掩盖后续 FAIL，故现统一终局语义。
- **改契约让 review.md 不写历史**：critic skill 明确要求「每轮复审留轮次记账」，改契约迁就实现是
  本末倒置；正确做法是让**读取方**分辨判定与引用。
- **行内匹配（放行 mid-line 的 readiness）**（2026-10-16 窄放宽时再议）：承诺句与历史轮次引用都在行内，
  一旦允许行内匹配，文末附录里的血统记录会整体夺权——正是本 Note 2026-10-11 要消灭的误报类，方向相反。
- **把表格单元纳入判定**：同样需要行内匹配；代价 = 该场（本身是 FAIL）继续"未判定"，方向安全。
- **无形状上限的装饰前缀**（判定词之前随便堆多少标签/标题词都算装饰）：长前缀历史标题与
  "标题里提过 readiness"的散文行都会变成判定行——实测形态 `# 复核轮（Round 2，2026-09-27）——**readiness: PASS**`
  正是历史轮次标题。
- **把 `null` 一律当 FAIL 处理**（省掉放宽）：把"没读到判定"与"判定失败"混为一谈，交付门会误红
  尚未审查的场次（观察面同样失真）——量具的诚实读数必须是三态。

## 实际跑过的验证

- `tests/run/review-readiness.test.mjs` 9 用例：先红（模块缺席）→ 实现 → 9/9 绿。关键用例 = **真实形态**
  （终局 PASS + 文末附录保留首轮 FAIL 的行内引用 → 仍 PASS）。
- **两路反证注入**（红→还原→绿）：①改回未锚行首的末位匹配 → 2 红；②改成取首个匹配 → 2 红。
- **真浏览器负例证明**（`validation-design` §3 要求新守卫先证负例）：把驾驶舱摘要层的
  `knownLine` 渲染行抽掉 → `client-load-smoke` 的「业务摘要层 = 盘侧 brief-fold 真值」断言
  **红并点名缺行**（缺行：当前版已交付；历史拍板见 que…）→ 还原 → **ALL PASS**。
- **新增断言本身**：`client-load-smoke` 补「业务摘要层五问逐行对账」（盘侧直调 `deriveBusinessBrief`
  算期望）+「未绑定会话摘要层如实『尚未确认』」两条；此前该层浏览器断言命中数为 **0**。
- L0：`pnpm verify` 全绿、`pnpm test` **369/369**（含本模块 9 用例与既有 `run-dashboard.test.mjs`
  的两相用例保持绿）。

事故与验收记录：[③驾驶舱卡](../../_backlog/_archived/settled_issues/2026-10-11-executive-research-ux-delivery.md)（③-a 行）。

## 窄放宽轮的验证（2026-10-16）

- **契约测试先红后绿**：`tests/run/review-readiness.test.mjs` 新增"装饰形态真实语料逐条读得出"与
  "不夺权负例逐条钉住"两条；`tests/run/node-gate.test.mjs` 新增镜像侧装饰 PASS / 承诺句与表格单元 RED 两条
  ——实现前 2 红 → 实现后 80/80 绿（两文件）。
- **两处同判**：52 场扫描（41 场有 review.md）中 pack 纯函数与 node-gate `.mjs` 镜像**不同判 0**；
  旧码/新码差分 = 8 场迁移，全部落在预期集（3 场假 FAIL 归零 + 4 场假 unknown 归零 + geometry 场
  由 `## 结论先行：**readiness: PASS**` 读出）；新分布 = PASS 36 / FAIL 4 / null 1，
  "非 PASS"子集 = 4 场真 FAIL + 1 场真无判定行（`drt_cn-llm-infra`）——**该子集仍不 PASS**。
- **渲染级后果**：`run-dashboard` 对 `drt_cn-agentic-parity`（原渲染 `readiness: FAIL`）与
  `drt_deepseek-chat-price-check`（原整行缺席）复跑 → 都渲染 `readiness: PASS`。
- **反证注入**（红→还原→绿）：①实现前先写测试 → 装饰语料用例与 node-gate 装饰 PASS 用例各红；
  ②把装饰前缀的**形状上限**放开（`MAX_LABELS`/`MAX_HEADING_CHUNKS` → 99）→ "标题散文堆叠/标签链不夺权"
  断言红（这两条负例是形状上限的可执行证明，不是装饰性断言）。
- L0：`pnpm verify` 全绿；pack 客户端产物重建（`pnpm --filter … build`，`lib/client.js` 非 tracked）。
