# 真实长 Run 门禁准确度、模板单一真相与读者版回查收口

> 状态：implemented

相关前序决定：[handoff-readiness-all-green](2026-11-28-handoff-readiness-all-green.md) · [cockpit-ux-v2-and-dsh-showcase](2026-11-28-cockpit-ux-v2-and-dsh-showcase.md)。

## 决定

针对真实长研究 run（`drt_huawei-ascend-dd` 验收暴露的 `BUG-463`–`BUG-469` 与 `BUG-483`–`BUG-487`），按共因族收口以下机制决定：

1. **多批 `verdicts*.json` 升序合并与真模板对齐（BUG-463 / BUG-485）**：
   - [`packages/deep-research-pack/src/lib/run/claims-verdicts.ts`](../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts) 改为按轮次升序合并全部 `verdicts*.json` 文件（后轮覆盖同 `claim_id`，任意坏/空/不可读文件 fail-loud 拒绝静默跳过），消除分批写入时仅读最后一份导致大量 `UNVERIFIED` 的失真。
   - [`packages/deep-research-pack/content/templates/run/verdicts.json`](../../packages/deep-research-pack/content/templates/run/verdicts.json) 改为标准单轮分批 `round: 1` 范例，避免误导 Critic 跨批递增 `round`。
   - [`checks/lib/gates/verdict-audit-core.mjs`](../../checks/lib/gates/verdict-audit-core.mjs) 在 disjoint `r1`/`r2` `coverage-gap` 时给出分批 vs 分轮诊断提示；`verbatimMatches` 剥除子代理外层围栏与零宽空格并接受等价 JSON 缩进差异，但仍严格拦截字段值篡改与 `raw` 虚构围栏。
2. **审查门禁与跨 topic 对账合同对齐（BUG-464 / BUG-487）**：
   - [`checks/lib/gates/review-contract.mjs`](../../checks/lib/gates/review-contract.mjs) 限定 `activeReviewScope`（只裁最高轮终局块）、按 `/^(T\d+)\b/` 宽松匹配覆盖表首列、把 CRITICAL 项严格限定在当轮 `CRITICAL` 节内、剥除 `resolved-critical` 的加粗与括注；对多 topic 共享的 `xcheck` 对账卡，若覆盖表下注脚已显式声明跨行卡，接受独占计数口径。
   - 同步在 `adversarial-review` 与 `synthesis` skill 正文写明跨 topic 注脚记法与交付前盘面 `evidence/*.md` / `verdicts` 逐条点数护栏。
3. **证据回溯与路径卫生解除 Catch-22（BUG-466 / BUG-483）**：
   - [`checks/lib/gates/evidence-audit-core.mjs`](../../checks/lib/gates/evidence-audit-core.mjs) 追踪 `web_fetch` 已登记的 spill 文件路径（与上游 `spill-policy` 提示格式同源）上的 `read`/`grep` 读取（未登记本地路径仍严格拒认），并剥离 HTML 标签、行内/括号 Markdown 链接，支持省略号分段回溯。
   - [`checks/lib/shared/path-hygiene.mjs`](../../checks/lib/shared/path-hygiene.mjs) 导出 `stripEvidenceVerbatimQuotes`，在 `path-hygiene` 与 [`checks/lib/gates/schema-scan-core.mjs`](../../checks/lib/gates/schema-scan-core.mjs) 中仅豁免 `evidence/*.md` 的 `## 原文摘录` 引用块（保留行号），并收窄 `/media/` 正则只拦两段 `/media/<user>/<dev>` 避免误杀网站相对链接。
4. **`plan.md` / `leads.md` / `protocol` / `reader-final` 契约统一（BUG-465 / BUG-467 / BUG-468 / BUG-469 / BUG-484 / BUG-486）**：
   - [`packages/deep-research-pack/content/templates/run/plan.md`](../../packages/deep-research-pack/content/templates/run/plan.md) 与 `research-planning` skill 移除非法 `kind`（`search`/`check`），明确 `PLAN_KINDS` 闭集与 `task_id` 回填规则；`question-patterns` skill 明确区分 `source_scope.families`（`web`/`local`）与内置 `content/lenses/*.md` 集合。
   - [`checks/lib/gates/node-gate-run-gates.mjs`](../../checks/lib/gates/node-gate-run-gates.mjs) 的 `leadsGate` 支持采集 `- 支持来源:` 下缩进多行子列表。
   - [`checks/lib/gates/protocol-audit-core.mjs`](../../checks/lib/gates/protocol-audit-core.mjs) 为 `checkFinalSections` 增加编号/括注剥离与语义别名映射，已登记进 `protocol.deviations` 的证据门槛例外降级为 `warning`。
   - [`checks/lib/gates/node-gate-reader-gate.mjs`](../../checks/lib/gates/node-gate-reader-gate.mjs) 新增 `criticalRelapseIssues` 回查 `review.md` 已闭合 CRITICAL 驳回表述与全称限定突破词是否在读者版 `## 结论` 复发；在 `reader-final`、`evidence-extraction`、`synthesis`、`adversarial-review` 技能正文补齐长 run 纪律护栏（列表 API 禁替单页 `web_fetch`、`final.md` 末两节、时间戳）。

## 输掉的方案

- **在 `evidence-audit` 中放行所有本地 `read`/`grep` 文件**：会破坏「证据必须来自外部源或已抓取记录」的核心反幻觉红线；改为只追踪真实 `web_fetch` spill 提示里登记过的路径。
- **直接放宽 `path-hygiene` / `schema-scan` 跳过整个 `evidence/*.md`**：会放过 frontmatter/正文里真实泄漏的本机绝对路径；改为只豁免 `## 原文摘录` 的 `^>` 逐字摘录行并保留精确行号。
- **修改 `lead.patch.yml` 试图靠系统提示堵住 `BUG-469` 行为漂移**：会破坏已录制 B 层 `snapshot-replay` 装配契约且不如局部 skill 正文精准；保持 `lead.patch.yml` 与 skill `description:` 不变，全部护栏落在模板、门禁与 skill 正文并刷新 `skill-golden`。

## 实际跑过的验证

- **Red→Green 回归与契约测试**：在 `claims-verdicts.spec.mjs`、`review-contract.spec.mjs`、`template-contract.spec.mjs`、`evidence-audit.spec.mjs`、`node-gate-leads.spec.mjs`、`node-gate-reader.spec.mjs`、`presets.spec.mjs`、`path-hygiene.spec.mjs`、`schema-scan.spec.mjs`、`protocol-core.spec.mjs`、`verdict-audit.spec.mjs` 均先证红后转绿，全部入账 `tests/fixtures/guard-ledger/ledger.json` 并刷新 `tests/fixtures/skill-golden/manifest.json`。
- **真实长 run 档案实跑对照（`research-workspace/drt_huawei-ascend-dd`）**：
  - `readLatestVerdicts`：由误报大量 `UNVERIFIED` 恢复为全量已核查（0 `UNVERIFIED`）；
  - `review-contract`：`coverageIssues` 与 `severityIssues` 清零；
  - `evidence-audit`：11 处误报 `转写不符` 清零（保留真实未抓取 GitHub issue 的 `MAJOR`）；
  - `leadsGate`、`path-hygiene`、`schema-scan` 均转为 PASS；
  - `readerGate` 跨历史归档全部 bundle 零误报，且在临时复发样本上精确拦截被 CRITICAL 驳回的「唯一」全称断言。
- **全仓门禁**：`pnpm verify`、`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build` 与 `DSH_SMOKE_REAL=1 node checks/smoke/preset.e2e.mjs` 全绿（注：长 run 模型行为合规 `BUG-469` 未新跑实网 L4-lite 长 run，仅由技能护栏测试与既有真档案门禁覆盖）。
