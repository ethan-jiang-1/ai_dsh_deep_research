---
status: 等人拍板
opened: 2026-10-15
---

# 推敲：终局 readiness 的行形态容忍度——装饰形态读不出使 13 场已交付 bundle 降为"未判定"

> 立卡：2026-10-15 ｜ 状态：等人拍板（方向已判：建议窄放宽；实施触及 pack 公共行为 + 已记录决定，需用户拍板）｜ 类型：Task ｜ 结论倾向：现在做（窄放宽）｜ 可关闭：否

**问题与期望结果：** 「review.md 终局 readiness」的读取规则（正本 = `packages/deep-research-pack/src/lib/review-readiness.ts`，node-gate 在纯 `.mjs` 侧镜像）只认**行首判定行**的契约形态与既有兼容集（`## readiness: PASS|FAIL`、`**readiness: …**`、中文冒号、列表项前缀）。真实交付里存在**同义但带装饰**的行首判定，规则读不出 → 返回 `null`（未判定）。期望：真终局判定无论装饰如何都能读出，同时**行内提及与表格单元仍不得夺权**（历史血统记录不得覆盖终局）。

**当前情况（2026-10-15 实测，37 场归档 bundle 旧码/新码差分对账）：**

- 13 场已交付 bundle 的 `门② present` 由 PASS 降为 N/A、`门A 交付完整性` 由 PASS 降为 PRE-CONTRACT——**非红**（`PRE-CONTRACT 不计红`），但**不再被核验**。
- 这 13 场**并非同质**，两类必须分开处置：
  - **真未闭合、被新终局语义正确揭出**：`drt_mcp-server-ecosystem`（末条是"我将…给出 `readiness: PASS`"的**承诺**，真判定是更早的 `readiness: FAIL` + veto）、`drt_2026-ai-coding-agent-landscape`（表格行 `readiness: FAIL`）、`drt_cn-llm-infra`（**0 条**判定行）。→ 这类保持"不 PASS"是对的。
  - **真 PASS 但形态读不出（假阴性）**：`` **`readiness: PASS`** —— …``（zhipu 形态）、`## 终验 readiness: **PASS**`（agent-memory 形态）、`> **## readiness: PASS（最终）**`（kimi 形态）。→ 这类应读回 PASS。
- **排除项已完成**：pack 纯函数与 node-gate `.mjs` 镜像在 9 种真实形态上**同判**（无镜像分叉）；`--update-expected` 与金标准无关；`terminalReadiness` 的"取最后一条"语义正确，本卡只议**形态容忍度**。
- **影响面不对称**：门禁侧读不出 = fail-closed，无害；**观察面侧**（驾驶舱 `ResearchStatusTab`、仪表盘）读不出 = 对已交付 run 显示"未判定/审查中"——正是该纯函数当初要消灭的误报类（Note 记 `drt_deepseek-default-upgrade` 同族）。

**未决问题：** 窄放宽的边界取到哪一档？建议：只接受**行首判定行**的装饰变体（加粗/反引号包裹、块引用与标题标记、值后 `（最终）` 类后缀），**明确排除**行内提及（承诺句）与表格单元（需行内匹配，会放历史引用夺权——与 Note 的"行内引用不得夺权"直接冲突）。表格单元那条的代价 = 该场继续"未判定"（该场本身是 FAIL，方向安全）。

**下一步：** 用户拍板二选一——**(A) 窄放宽**（推荐：pack 纯函数 + node-gate 镜像同步 + Note 更新，同 diff）；**(B)** 不改规则，把 13 场清单记为存量交对账步处置（承认观察面继续误报真 PASS 场）。拍板后按 (A) 落实施即本卡验收面。

## 验收标准（按 (A) 预备；先立红）

1. **真实形态语料**（取自 13 场判定行原文）：真 PASS 场读回 `PASS`（≥3 种装饰形态，含反引号加粗、限定词标题、块引用+标题）；`null` 形态逐条钉住。
2. **不夺权负例**：行内提及（mcp 承诺句）、历史轮次 FAIL 引用、表格单元、空模板 `## readiness: PASS | FAIL` → 一律不夺权（逐条测试）。
3. **真实数据对账**：37 场归档 bundle 的旧码/新码差分重跑，状态迁移数从 13 场收敛到"真未闭合"子集（且该子集仍不 PASS）。
4. **两处同判**：pack 纯函数与 node-gate `.mjs` 镜像对新增形态同判（两侧用例同 diff）。
5. **Note 同步**：`notes/implemented/2026-10-11-review-readiness-terminal-rule.md` 的兼容集与边界按新事实改写；L0 全绿。

## 参考

- [终局 readiness 规则 Note](../../notes/implemented/2026-10-11-review-readiness-terminal-rule.md)（本卡要动的已记录决定）；
- 差分对账方法（可复跑）：HEAD 隔离 worktree + `cp -Rp` 保留 mtime（断代走 mtime 族，`cp -R` 会假红 12 场——已实测）；
- 受影响的观察面消费方 = `src/client/ResearchStatusTab.tsx`、`scripts/lib/run-dashboard-core.mjs`、`scripts/smoke/client-load-smoke.mjs`。
