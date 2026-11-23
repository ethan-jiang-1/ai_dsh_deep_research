---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-403：protocol-audit.mjs 自写方法库影子解析使用 startsWith('## ' + name) 前缀撞库，且缺库时误将 undefined 吞成 null

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：条目解析复用 foldLibrary 精确匹配；未提供/undefined/null 三态按 hasOwnProperty 区分；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在 `checks/run-gates/protocol-audit.mjs` 审计引用工作区方法库 `protocol.method.library_name` 的研究 run 时：
1. 若工作区 `method-library.md` 中先出现一条名称以 `library_name` 为前缀的条目（例如先有 `## 方案比较（2026-11-20，用户）`，后有真正选用的 `## 方案（2026-11-21，用户）`），`protocol-audit.mjs` 会错误命名前者并用「方案比较」的四字段哈希与 `protocol.json` 对账，导致完全合规的 run 被误判为 `RED（1 项） [method-library] library_fields_sha256 与工作区方法库「方案」不一致`；
2. 若工作区根本找不到 `method-library.md`（`candidates.find(...)` 返回 `undefined`），因为判定写了 `if (foundLibrary !== null)` 而不是 `if (foundLibrary)`，`undefined` 落入 `readIf(undefined) -> ''`，使 `methodLibraryEntry` 变为 `null`，从而让 [protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs) 针对 `BUG-307` 设计的「方法库文件缺失 (`methodLibraryEntry === undefined`)」报错分支成为死代码。

## 分诊与授权

- 严重级：P2 — 门禁入口自带与 pack 正本不一致的影子解析器，既误杀合法短前缀方法名，又把缺文件降级为缺条目从而掩盖错误诊断信息。
- 表面 / 边界：run-gate CLI 入口（[protocol-audit.mjs](../../../checks/run-gates/protocol-audit.mjs) × [protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs) × [method-library-write.ts](../../../packages/deep-research-pack/src/lib/method-library/method-library-write.ts)）/ ③ 门禁边界。
- DSH 不变量：不留影子契约与第二事实源 — 方法库标题与字段解析应复用 `foldLibrary` 同一正本。
- 触及面：none — gate 入口脚本 + 门禁单测。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 构造 `method-library.md`（`## 方案比较（...）` 排在 `## 方案（...）` 之前）并令 `protocol.json` 正确记录「方案」的四字段与 sha256，运行 `protocol-audit.mjs <bundle> --no-write` 稳定误报 RED（exit 1）。

```sh
node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { designSha256 } from "./checks/lib/gates/protocol-core.mjs";
import { libraryFieldsSha } from "./checks/lib/gates/protocol-audit-core.mjs";
const tmp = mkdtempSync(join(tmpdir(), "bug403-"));
try {
  const bundle = join(tmp, "drt_demo");
  mkdirSync(bundle, { recursive: true });
  writeFileSync(join(tmp, "method-library.md"), [
    "## 方案比较（2026-11-20，用户）",
    "- 找来源: source-long", "- 怎么核实: verify-long", "- 报告怎么写: report-long", "- 不承诺: limit-long", "",
    "## 方案（2026-11-21，用户）",
    "- 找来源: source-short", "- 怎么核实: verify-short", "- 报告怎么写: report-short", "- 不承诺: limit-short", "",
  ].join("\n"), "utf8");
  const fields = { source: "source-short", verify: "verify-short", report: "report-short", limit: "limit-short" };
  const protocol = {
    schema: 1, version: 1, status: "approved",
    created: "2026-11-23T00:00:00Z", approved_at: "2026-11-23T00:01:00Z", approval_basis: "card",
    method: { id: "方案", kind: "library", library_name: "方案", library_fields_sha256: libraryFieldsSha(fields), fields, adjustments: [] },
    source_scope: { families: ["official"], domains: [], exclude_domains: [], recency: "12m", language: ["zh"], authority: "primary" },
    effort: { band: "quick", band_v: 1, nodes_max: 4, cells_max: 2, waves_max: 3, allowed_depths: ["L0", "L1"] },
    output: { shape: "quick_answer", sections: ["decision"], length: { min: 100, max: 1000, unit: "words" }, format: "md", audience: "工程" },
    gates: { hitl1: "protocol_projection", hitl2: "review", evidence_threshold: "B", critic: "none", claim_verification: "off" },
    deviations: [],
  };
  writeFileSync(join(bundle, "run.md"), "- schema: 2\n- created: 2026-11-23\n- phase: review\n- next: deliver\n- delivered: none\n- parked: none\n", "utf8");
  writeFileSync(join(bundle, "protocol.json"), JSON.stringify(protocol, null, 2), "utf8");
  writeFileSync(join(bundle, "protocol-audit.md"), `v1 design_sha256=${designSha256(protocol)}\n`, "utf8");
  writeFileSync(join(bundle, "question.md"), "## 研究方法\n- 采用：方案\n## Decisions（append-only，最新在上）\n- 2026-11-23 HITL1 批准 protocol: v1\n## Protocol（本次研究设计，v1）\n- 方法：方案；四字段见 §研究方法\n- 来源：official；12m；zh；primary\n- 投入：快答（≤4 节点 / ≤2 cells / L0–L1）\n- 输出：quick_answer；sections = decision；audience = 工程；md\n- 版本：protocol: v1（approved 2026-11-23T00:01:00Z）；全文 = protocol.json / plan.md\n", "utf8");
  writeFileSync(join(bundle, "plan.md"), "- protocol: v1\n\n| id | parent | deps | task_id | owner_role | kind | question | output | acceptance | budget | depth | lifecycle |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n| W1.1 | — | — | T1 | scout | broad-scan | q | o | a | 1 | L0 | active |\n", "utf8");
  writeFileSync(join(bundle, "topics.md"), "## T1: t\n- lenses: [official]\n", "utf8");
  writeFileSync(join(bundle, "final.md"), "## 决策摘要\nok\n", "utf8");
  const r = spawnSync("node", ["--import", "tsx/esm", "checks/run-gates/protocol-audit.mjs", bundle, "--no-write"], { encoding: "utf8" });
  console.log("EXIT=", r.status, r.stdout.trim());
  assert.equal(r.status, 0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

[protocol-audit.mjs](../../../checks/run-gates/protocol-audit.mjs) 第 174–200 行没有复用 [method-library-write.ts](../../../packages/deep-research-pack/src/lib/method-library/method-library-write.ts) 的 `foldLibrary`，而是内联了一份简陋的影子解析：
1. 第 185 行用 `lines.findIndex((line) => line.startsWith('## ' + name))` 查找条目，把「`## 方案比较（...）`」误匹配为「`## 方案`」，且同样无法兼容全角冒号/CRLF/精确边界（`（`、`〔` 或行尾）；
2. 第 181 行 `if (foundLibrary !== null)` 未排除 `candidates.find(...)` 找不到文件时返回的 `undefined`：第 182 行 `readIf(undefined)` 返回 `''`，第 200 行令 `methodLibraryEntry` 变成 `null` 而不是保留 `undefined`，致使 [protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs) 第 487 行 `methodLibraryEntry === undefined` 的缺失文件报错无法触发。

## 牵出的失败类

- 同机制第 1 次（gate CLI 入口自带影子 parser 与 core 判据失联）｜处置：删去手写影子解析，直接复用 `foldLibrary` 精确匹配 `entry.name === name` 并严格区分 `foundLibrary == null`（保留 `undefined`）与条目不存在（`null`）。

## 修法方向

- 在 [protocol-audit.mjs](../../../checks/run-gates/protocol-audit.mjs) 改为检查 `if (typeof foundLibrary === 'string')`，并复用 `foldLibrary(libText)` 按 `entry.name === name` 精确查找条目的 `fields`（或缺失返回 `null`）；找不到文件时保持 `methodLibraryEntry = undefined`；
- 在 `tests/checks/` 增加覆盖「前缀同名方法在先（`方案比较` vs `方案`）」及「`method-library.md` 缺失时触发 `undefined` 报错而非 `null`」的真实 `protocol-audit.mjs` 测试。

## 修复判据

- 复现脚本中 `protocol-audit.mjs` 精确命中「方案」并退出 0（PASS）；`method-library.md` 缺失时正确报告文件缺失而非条目不存在；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 `methodLibraryEntryOf` 退回前缀 `startsWith` 匹配（或让 evaluateBundle 吞掉显式 undefined）→ 前缀同名方法抢字段 / BUG-307 分支死代码。

```json fix-evidence
{
  "changes": [
    "checks/run-gates/protocol-audit.mjs",
    "checks/lib/gates/protocol-audit-core.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-403 方法库条目解析' tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "方法库条目 deepStrictEqual 失败：expected source-short…（精确条目）；actual source-long…（前缀同名「方案比较」被抢）"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
