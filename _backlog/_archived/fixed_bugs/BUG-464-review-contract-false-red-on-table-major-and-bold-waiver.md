---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-464：`review-contract` 对覆盖表行首、CRITICAL 节作用域与 `resolved-critical` 格式过脆导致合法 PASS 被门 A 误判 RED

> 严重级别：P1｜发现：2026-11-28｜状态：已修 — `review-contract.mjs` 补终局块作用域、首列 `T#` 前缀匹配、CRITICAL 节内限定与加粗/括注 `resolved-critical` 剥离，去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)，审查：agent（2026-11-28）

## 症状

`drt_huawei-ascend-dd/review.md`（Round 2，`readiness: PASS`，`review/readiness.json` `conditional: false`）在 `checks/run-gates/node-gate.mjs` 门 A 被误判为 `RED`：
1. `覆盖表缺 topic T1 的行；覆盖表缺 topic T2 的行；覆盖表缺 topic T3 的行；覆盖表缺 topic T4 的行；覆盖表缺 topic T5 的行`；
2. `review 有未解释的 CRITICAL（C4, C8, C9, C1, C2）但 readiness=PASS——补 resolved-critical 或改 FAIL`（其中 `C4, C8, C9` 是 `## MAJOR` 下 `N1` 描述 `claims.json` 差异的列表项，且文内已写 `resolved-critical: all`）。

## 分诊与授权

- 严重级：P1 — 导致合规产出的 `review.md` 无法通过机械交付门 A。
- 表面 / 边界：`checks/lib/gates/review-contract.mjs` / L0 门禁核
- DSH 不变量：fail-loud（假红掩盖真判据）
- 触及面：门禁与验收合同 — 修改 `review-contract.mjs` 判据口径
- 授权：等人拍板（用户 2026-11-28 直派放行）
- 批：2026-11-28-run-fidelity-batch — 同批卡：[BUG-463](./BUG-463-claims-verdicts-drops-earlier-batch-files.md)、[BUG-465](./BUG-465-plan-template-suggests-check-kind-and-lead-skips-backfill.md)、[BUG-466](./BUG-466-evidence-audit-misses-web-fetch-spills-and-inline-noise.md)、[BUG-467](./BUG-467-leads-gate-single-line-only-and-findings-contract-bypass.md)、[BUG-468](./BUG-468-reader-final-reintroduces-critic-rejected-claim.md)、[BUG-469](./BUG-469-long-run-compliance-drift-math-sections-and-batch-fetch.md)；批 Note：[2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)

## 复现

复现状态：稳定 — `source tools/env.sh && node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd`
边界：门禁核 (`review-contract.mjs`) — 实跑 `node-gate.mjs` 复现

```sh
source tools/env.sh && node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd
# 门A 输出：覆盖表缺 topic T1..T5 的行；review 有未解释的 CRITICAL（C4, C8, C9, C1, C2）但 readiness=PASS
```

## 根因（假设 → 已证）

[review-contract.mjs](../../../checks/lib/gates/review-contract.mjs)（`L73-L121`）存在三处解析脆弱性：
1. **覆盖表 topic 匹配过严**：`L73` 用 `cells[0] === id` 精确相等匹配，但 Critic 常在首列写 `| T1 产品与变化 |`（`findings-core.mjs` 的 `parseTopicsReport` 用 `/^(T\d+)\b/`），导致 T1–T5 全部未命中。
2. **CRITICAL 清单未限节作用域**：`L111` 全文匹配 `/^\s*[-*]\s*(?:\*\*)?(C\d+)\b/gm`，把 `## MAJOR` 下 `N1` 里的 `- C4 text…`、`- C8 text…`、`- C9 text…`（claim 编号）当成未决 CRITICAL。
3. **`resolved-critical` 未剥排版修饰与括注**：`L114` 要求 `/^\s*resolved-critical\s*[:：]\s*(.+)$/gm` 顶格无加粗/反引号，且 `split(/[,，、\s]+/)` 会把 `all（第 1 轮…）` 切为 `all（第`，漏掉 `**resolved-critical: all（...）**` 与行内 `` `resolved-critical: all` ``。
- 根因证据：实跑 `node-gate.mjs` 输出 + 对照 `drt_huawei-ascend-dd/review.md` 第 31、76–80、99 行及 `review-contract.mjs` 源码。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 1 次（类似前例 `leadsGate` 在 BUG-038 中曾修复强调符剥离，但 `review-contract.mjs` 未同步做同类处理）｜处置：类修

## 修法

1. `coverageIssues` 首列按 `/^(T\d+)\b/` 提取 topic id，并明确当 `review.md` 含多轮历史覆盖表时只认当前终局块覆盖表；
2. `severityIssues` 只在当前终局块的 `## CRITICAL` 节内提取 `- C#` 项（不跨 `## MAJOR`/`## 复核点`/历史轮）；
3. `resolved-critical` 解析前先剥 Markdown `**`/`__`/`` ` `` 及括注说明，支持行内加粗形式如 `**resolved-critical: all（...）**`。

## 修复判据

1. `| T1 产品与变化 |`、`## MAJOR` 下的 `- C4 text`、`## CRITICAL` 节外的 `C#` 引用以及 `**resolved-critical: all（说明）**` 均不再触发假红；
2. 负控：`## CRITICAL` 节内存在未在 `resolved-critical` 声明的 `- C1: ...` 且 `readiness: PASS` 时仍稳定判 `RED`。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/review-contract.mjs",
    "tests/run/gates/review-contract.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/review-contract.spec.mjs",
    "exit": 1,
    "output": "BUG-464: actual ['覆盖表缺 topic T1 的行'] !== expected []"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/review-contract.spec.mjs",
    "exit": 0
  },
  "guard": { "path": "tests/run/gates/review-contract.spec.mjs" }
}
```
