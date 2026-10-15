---
status: 等人拍板
opened: 2026-10-15
---

# 推敲：终局 readiness 的行形态容忍度——装饰形态读不出使 13 场已交付 bundle 降为"未判定"

> 立卡：2026-10-15 ｜ 状态：等人拍板（方向已判：建议窄放宽；实施触及 pack 公共行为 + 已记录决定，需用户拍板）｜ 类型：Task ｜ 结论倾向：现在做（窄放宽）｜ 可关闭：否

**问题与期望结果：** 「review.md 终局 readiness」的读取规则（正本 = `packages/deep-research-pack/src/lib/review-readiness.ts`，node-gate 在纯 `.mjs` 侧镜像）只认**行首判定行**的契约形态与既有兼容集（`## readiness: PASS|FAIL`、`**readiness: …**`、中文冒号、列表项前缀）。真实交付里存在**同义但带装饰**的行首判定，规则读不出 → 返回 `null`（未判定）。期望：真终局判定无论装饰如何都能读出，同时**行内提及与表格单元仍不得夺权**（历史血统记录不得覆盖终局）。

**当前情况（2026-10-15 实测；逐场原文见下表，命令可复跑）：**

**13 场受影响 bundle 的逐场证据**（`terminalReadiness(review.md)` 现行读数 vs 文件尾部真实终局）：

| bundle | 判定行 | 现行读数 | 末条判定行（原文摘要） | 真相 | 分类 |
|---|---|---|---|---|---|
| drt_agent-memory-landscape | 6 | **FAIL** | `## 终验 readiness: **PASS**`（其后仅残留风险/边界节） | **PASS** | **假 FAIL** |
| drt_cn-agentic-parity | 7 | **FAIL** | ``**`readiness: PASS` 维持不变**…``（V5 结论） | **PASS** | **假 FAIL** |
| drt_cn-us-open-source | 4 | **FAIL** | ``**⇒ 复核结论：`readiness: PASS`**（零 CRITICAL；五条判据全勾…）`` | **PASS** | **假 FAIL** |
| drt_deepseek-chat-price-check | 2 | null | ``→ **`readiness: PASS`**（放行至 HITL2…）`` | **PASS** | 假 unknown |
| drt_kimi-api-pricing | 6 | null | `> **## readiness: PASS（最终）**`（§13 收尾轮） | **PASS** | 假 unknown |
| drt_zhipu-api-pricing | 2 | null | ``**`readiness: PASS`** —— 无 CRITICAL 未修复…`` | **PASS** | 假 unknown |
| drt_open-llm-inference-engine-landscape | 5 | null | ``…够得上交付；`readiness: PASS` 是我基于文件事实的判定…`` | **PASS** | 假 unknown |
| drt_cn-llm-pricing-2026-10 | 2 | PASS | `readiness: PASS（对当前 393 行 final.md…）` | PASS | 读对 ✓ |
| drt_2026-ai-coding-agent-landscape | 2 | FAIL | ``| —— **结论** —— | **readiness: FAIL** |`` | FAIL | 读对 ✓ |
| drt_2026-ai-video-generation-landscape | 3 | FAIL | 末条为"为什么给 FAIL 而不是条件 PASS"的正文 | FAIL | 读对 ✓ |
| drt_mcp-server-ecosystem | 8 | FAIL | 末条是"我将…给出 `readiness: PASS`"的**承诺**（真判定 = 更早的 FAIL + veto） | FAIL | 读对 ✓ |
| drt_geometry-coaching | 3 | null | 末条为第四轮结论正文（含行内 `readiness`） | 已知缺陷场 | 读对 ✓ |
| drt_cn-llm-infra | 0 | null | （无判定行） | 无判定 | 读对 ✓ |

**三类后果，危害递增**：

1. **假 FAIL（3 场，最严重）**：终局判定带限定词/装饰（`## 终验 readiness:`、``**`readiness: PASS` 维持不变**``、`` **⇒ 复核结论：`readiness: PASS`** ``）→ 规则不匹配该行 → **更早那条历史 FAIL 夺权**，规则读出与真值相反的结论。后果：观察面把**已交付且终审 PASS** 的 run 显示为"审查修复中/未通过"（正是本模块 2026-10-11 要消灭的误报类，方向相反）；交付门把它们当未达成前置（N/A / PRE-CONTRACT，非红但失去核验）。
2. **假 unknown（4 场）**：终局 PASS 读成未判定 —— 观察面显示"未判定"，门禁 fail-closed 不核验。
3. **读对（6 场）**：含 3 场真 FAIL、2 场真无判定/已知缺陷、1 场 PASS（plain 形态）。

**旁证（排除项已完成）**：pack 纯函数与 node-gate `.mjs` 镜像在 9 种形态上**同判**（无镜像分叉）；`--update-expected` 与金标准无关；"取最后一条"语义正确，问题只在**形态容忍度**。

**未决问题：** 窄放宽的边界取到哪一档？建议：只接受**行首判定行**的装饰变体（加粗/反引号包裹、块引用与标题标记、值后 `（最终）` 类后缀），**明确排除**行内提及（承诺句）与表格单元（需行内匹配，会放历史引用夺权——与 Note 的"行内引用不得夺权"直接冲突）。表格单元那条的代价 = 该场继续"未判定"（该场本身是 FAIL，方向安全）。

**下一步：** 用户拍板二选一——**(A) 窄放宽**（推荐：pack 纯函数 + node-gate 镜像同步 + Note 更新，同 diff）；**(B)** 不改规则，把 13 场清单记为存量交对账步处置（承认观察面继续误报真 PASS 场）。拍板后按 (A) 落实施即本卡验收面。

## 验收标准（按 (A) 预备；先立红）

1. **真实形态语料**（取自 13 场判定行原文，见上表）：**假 FAIL 归零**——3 场"终局 PASS 被历史 FAIL 盖过"必须读回 `PASS`；4 场"假 unknown"同；`null` 形态（真无判定/已知缺陷）逐条钉住不误读。
2. **不夺权负例**：行内提及（mcp 承诺句）、历史轮次 FAIL 引用、表格单元、空模板 `## readiness: PASS | FAIL` → 一律不夺权（逐条测试）。
3. **真实数据对账**：37 场归档 bundle 的旧码/新码差分重跑，状态迁移数从 13 场收敛到"真未闭合"子集（且该子集仍不 PASS）。
4. **两处同判**：pack 纯函数与 node-gate `.mjs` 镜像对新增形态同判（两侧用例同 diff）。
5. **Note 同步**：`notes/implemented/2026-10-11-review-readiness-terminal-rule.md` 的兼容集与边界按新事实改写；L0 全绿。

## 参考

- [终局 readiness 规则 Note](../../notes/implemented/2026-10-11-review-readiness-terminal-rule.md)（本卡要动的已记录决定）；
- 差分对账方法（可复跑）：HEAD 隔离 worktree + `cp -Rp` 保留 mtime（断代走 mtime 族，`cp -R` 会假红 12 场——已实测）；
- 受影响的观察面消费方 = `src/client/ResearchStatusTab.tsx`、`scripts/lib/run-dashboard-core.mjs`、`scripts/smoke/client-load-smoke.mjs`。
