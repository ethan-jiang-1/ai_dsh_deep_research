---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-402：run-dashboard-core.mjs 只匹配半角冒号，真实 run 的全角「：」findings/topics/leads 被漏算为 0

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：topics/leads/findings 与 profile 字段统一 `[:：]`，deriveStep 不再误判 synthesis；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

观察/分析脚本 `checks/lib/analyze/run-dashboard-core.mjs` 在解析真实 research run 的 `findings.md` / `topics.md` / `leads.md` 时：
- 当产出遵循中文提示词模板使用全角冒号 `：`（例如 `## F1：<结论>`、`- 支撑证据：...`、`- gap：supported`，这正是 `synthesis/SKILL.md` 与 `findings-core.mjs` 所要求的格式）时，`parseFindings`、`parseTopics`、`parseLeads` 均返回空列表（`0` 条）；
- 受 `findings.length === 0` 连锁影响，`deriveStep` 将已产出的 `synthesis` 阶段误判为 `pending`。

## 分诊与授权

- 严重级：P2 — 运行观察仪表盘与真实归档 bundle 出现系统性解析失真（与 `BUG-393` 同类的全半角符号正则漂移）。
- 表面 / 边界：分析观察工具（[run-dashboard-core.mjs](../../../checks/lib/analyze/run-dashboard-core.mjs) × [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs)）/ ③ 分析解析层。
- DSH 不变量：Single source of truth — 观察/仪表盘解析器与运行门禁 / SKILL 模板的格式契约不得分叉。
- 触及面：none — 分析 helper + 单测。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 既可在仓内真实归档 `research-workspace/archive/drt_cn-open-vs-us-closed-agentic` 上直接观察到 `findings.length = 0`，也可用符合 `synthesis/SKILL.md` 规范的最小 bundle 稳定复现 `TOPICS= 0 FINDINGS= 0`（`synthesis: pending`）。

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildModel, deriveStep } from "./checks/lib/analyze/run-dashboard-core.mjs";
const tmp = mkdtempSync(join(tmpdir(), "bug402-"));
try {
  writeFileSync(join(tmp, "question.md"), "## 研究问题（定稿）\n问题\n", "utf8");
  writeFileSync(join(tmp, "topics.md"), "## T1：主题\n- must_answer: a\n", "utf8");
  writeFileSync(join(tmp, "findings.md"), "## F1：核心结论\n- 支撑证据：evidence/e1.md\n- gap：supported\n", "utf8");
  const model = buildModel(tmp);
  console.log("TOPICS=", model.topics.length, "FINDINGS=", model.findings.length, "STEPS=", JSON.stringify(deriveStep(model)));
  assert.equal(model.findings.length, 1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

[run-dashboard-core.mjs](../../../checks/lib/analyze/run-dashboard-core.mjs) 多处正则硬编码了 ASCII 半角冒号 `:` 而未兼容中文全角冒号 `：`（也未复用 [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的 `[:：]` 正则规范）：
1. `parseTopics`（第 89、97 行）：`/^##\s+T(\d+):\s*(.+?)\s*$/` 与 `/^-\s+must_answer:\s*$/`；
2. `parseLeads`（第 156、163 行）：`/^##\s+方向:\s*(.+?)\s*$/` 与 `/^-\s+状态:\s*(.+)$/`（第 174 行 `last_searched:` 亦同）；
3. `parseFindings`（第 188、195、200 行）：`/^##\s+F(\d+):\s*(.+?)\s*$/`、`/^-+\s+gap:\s*(\w+)\s*$/`（实际为 `/^-\s+gap:\s*(\w+)\s*$/`）与 `/^-\s+支撑证据:/`；而 `synthesis/SKILL.md` 明确使用 `## F<n>：...`、`## T<n>：...`、`- 支撑证据：...`、`- gap：...`。

## 牵出的失败类

- 同机制第 2 次（继 `BUG-393` 之后又一处半角/全角冒号不兼容导致静默漏读）｜处置：改用共同解析/统一 `[:：]` 并在有归档 bundle（如 `research-workspace/archive/drt_cn-open-vs-us-closed-agentic`）或典型中文输入上跑契约回归。

## 修法方向

- 在 [run-dashboard-core.mjs](../../../checks/lib/analyze/run-dashboard-core.mjs) 将 `parseTopics`、`parseLeads`、`parseFindings`（及 `deriveStep` 相关字段）统一为兼容 `[:：]`（并与 [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的解析语义保持一致，避免各自维护正则）；
- 补齐 `parseTopics` / `parseLeads` / `parseFindings` 对全角冒号 `：` 与半角冒号 `:` 的单元测试，校验 `deriveStep` 正确输出 `synthesis: 'done'`。

## 修复判据

- 复现脚本与 `research-workspace/archive/drt_cn-open-vs-us-closed-agentic` 均能非零准确解析 `topics` / `findings` 且 `deriveStep` 不再错判 `synthesis` 为 `pending`；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把解析正则里的 `[:：]` 全改回 `:` → 中文模板产出被漏算为 0，deriveStep 误判 synthesis pending。

```json fix-evidence
{
  "changes": [
    "checks/lib/analyze/run-dashboard-core.mjs",
    "tests/run/analyze/run-dashboard.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-402' tests/run/analyze/run-dashboard.spec.mjs",
    "exit": 1,
    "output": "expected 2 / actual 1"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/analyze/run-dashboard.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/analyze/run-dashboard.spec.mjs"
  }
}
```
