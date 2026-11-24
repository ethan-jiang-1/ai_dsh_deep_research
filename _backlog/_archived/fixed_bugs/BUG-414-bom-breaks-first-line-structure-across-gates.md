---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-414：run 门与库折算不剥 UTF-8 BOM，首行结构丢失→合规 run 误判 RED 且覆盖缺口被藏

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：BOM 在解析入口统一剥离（linesOf/foldLibrary/splitFrontmatter）；首行结构不再因编码前缀丢失；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

带 UTF-8 BOM 的 run 工件（Windows 记事本/PowerShell 重定向/部分工具默认写 BOM）会让**首行结构**整条丢失，而 BOM 在本仓已是既定容忍项（`research-defaults` BUG-139、`method-of-question` BUG-393 均显式剥 BOM）：

| 文件（首行为结构行） | LF | BOM 后 |
|---|---|---|
| `topics.md` 首行 `## T1: …` | `T1` 在库，门禁 PASS | `T1` 整条消失 → `T2 的 depends_on「T1」不存在` → **RED（误杀）** |
| `leads.md` 首行 `## 方向: T1 …` | 两个方向都参与判据 | 首个方向**静默消失**（其「缺关键线索」与覆盖计数一并消失）→ **覆盖缺口被藏（fail-open）** |
| `findings.md` 首行 `## F1：…` | 1 块 | 0 块 → `findings.md 无 F# 块——防空语料` → **RED（误杀）** |
| `evidence/*.md` 首行 `---` | frontmatter 正常 | **不识别 frontmatter** → `无 frontmatter（硬五字段全缺）` MAJOR |
| `method-library.md` 首行 `## <名>` | 正常折叠 | 条目**整条不可见**（`foldLibrary` 返回空库）→ 面板报「库里没有方法」、写路径可再建同名条目 |

## 分诊与授权

- 严重级：P1 — 同一种「编辑器差异」既造成合规 run 误判 RED（阻断 HITL2/交付），又造成 leads 覆盖缺口静默消失（fail-open，比误杀更危险）。
- 表面 / 边界：run 门禁解析 + 库折算（[findings-core.mjs](../../../checks/lib/gates/findings-core.mjs)、[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs)、[evidence-audit-core.mjs](../../../checks/lib/gates/evidence-audit-core.mjs)、[library-fold.ts](../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts)）/ ① 代码（纯解析）。
- DSH 不变量：同一契约文本的等价书写（含 BOM）必须同判；「没看到」与「不存在」必须可区分。
- 触及面：pack 公共行为（`foldLibrary` 被 UI/写路径/门禁共用）→ 修法与授权待分诊庭议。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 四个 gate/折算函数在「首行前加 `\uFEFF`」后全部变判。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTopicsReport, parseFindingsOf } from "./checks/lib/gates/findings-core.mjs";
import { topicsGate, leadsGate, findingsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
import { foldLibrary } from "./packages/deep-research-pack/src/lib/method-library/library-fold.ts";
const bom = (t) => `\uFEFF${t}`;
const TOPICS = "## T1: 通道\n\n- must_answer:\n  - a\n  - b\n- scope_role: primary\n- depends_on: 无\n\n## T2: 口径\n\n- must_answer:\n  - c\n  - d\n- scope_role: comparison\n- depends_on: T1\n";
const LEADS = "## 方向: T1 — 通道\n\n- 状态: 建议挖深\n- 支持来源: [https://e.com/a](https://e.com/a)（A）\n- 建议 owner: s（对应 topic: T1）\n\n## 方向: T2 — 口径\n\n- 状态: 建议挖深\n- 关键线索: x\n";
const FINDINGS = "## F1：通道可达\n- 支撑证据：evidence/e1.md\n- lenses：official\n- lens_gaps：无\n- gap：supported\n";
const run = (files, fn) => { const d = mkdtempSync(join(tmpdir(), "bug414-")); try { for (const [n, t] of Object.entries(files)) writeFileSync(join(d, n), t, "utf8"); return fn(d); } finally { rmSync(d, { recursive: true, force: true }); } };
console.log("topics  LF:", run({ "topics.md": TOPICS }, topicsGate).status, " BOM:", JSON.stringify(run({ "topics.md": bom(TOPICS) }, topicsGate)));
console.log("leads   LF:", JSON.stringify(run({ "leads.md": LEADS }, leadsGate).detail));
console.log("leads  BOM:", JSON.stringify(run({ "leads.md": bom(LEADS) }, leadsGate).detail));
console.log("findings LF:", JSON.stringify(run({ "findings.md": FINDINGS }, findingsGate).detail), " BOM:", JSON.stringify(run({ "findings.md": bom(FINDINGS) }, findingsGate).detail));
console.log("foldLibrary BOM:", JSON.stringify(foldLibrary(bom("## 方案比较（2026-11-24，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n"))));
assert.equal(parseTopicsReport(bom(TOPICS)).topics.size, parseTopicsReport(TOPICS).topics.size);
assert.equal(parseFindingsOf(bom(FINDINGS)).length, 1);
'
```

实测：`topics LF: PASS / BOM: RED "T2 的 depends_on「T1」不存在"`；`leads BOM` 的 detail 里 T1 整条不见；`findings BOM: "findings.md 无 F# 块——防空语料"`；`foldLibrary BOM: []`。

## 根因（已证）

各解析器都直接以 `^` 锚定首行，但只在少数模块剥了 BOM：

1. [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs)：`parseTopicsReport` 的 `/^##\s+(T\d+)\b/`、`parseFindingsOf` 的 `/^##\s*F(\d+)\s*[:：]/` —— 首行带 `\uFEFF` 时 `^##` 不成立；
2. [node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs)：`leadsGate` 的 `/^##\s+方向\s*[:：]/` 同理；
3. [frontmatter.mjs](../../../checks/lib/shared/frontmatter.mjs)：`/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/` 首字符必须是 `-`，BOM 使 `fm` 变 `null`（调用方按契约走「无 frontmatter」分支）；
4. [library-fold.ts](../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts)：`parseMethodHeading` 的 `HEADING_LINE = /^##\s+(.+)$/` 不剥 BOM，首行标题失效 → 该条目整条不入库。

对照：`plan-index.tableOf` 已手写 `text.replace(/^\uFEFF/, '')`、`research-defaults.parseDefaults` 与 `method-of-question` 也已剥 BOM —— 同一合同只在部分入口落地。

## 牵出的失败类

- 同机制第 1 次（约定「BOM 容忍」只在部分解析器实现）｜处置：类修——在读文件边界统一剥 BOM（如 `readArtifact` / 各 gate 的 `readFileSync` 包装），而不是每个解析器各写一遍；并补 LF/CRLF/BOM 三形态同判的契约测试。

## 修法方向

- 在 run 工件读取的**单一入口**（`run-context.read` 与各 gate 的文本读取助手）剥一次 BOM；`foldLibrary`/`parseMethodHeading` 自身也按 `method-of-question` 的口径剥 BOM（它同时服务浏览器与 host 写路径）；
- 门禁侧加回归：`topics.md` / `leads.md` / `findings.md` / `evidence/*.md` / `method-library.md` 的三种编码形态裁决逐条相同。

## 修复判据

- 复现脚本断言全绿：topics 的 `topics.size` 与 findings 的块数在 BOM 下不变；`leadsGate` 的 detail 在 BOM 下仍列出两个方向；`foldLibrary` 在 BOM 下仍返回该条目；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 linesOf/foldLibrary/splitFrontmatter 的 BOM 处理（library-fold 改回 `text.split('\n')`）→ BOM 让首行结构整条丢失。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "packages/deep-research-pack/src/lib/method-library/library-fold.ts",
    "checks/lib/shared/frontmatter.mjs",
    "checks/lib/gates/findings-core.mjs",
    "checks/lib/gates/node-gate-run-gates.mjs",
    "checks/lib/gates/evidence-audit-core.mjs",
    "checks/lib/gates/plan-gate.mjs",
    "tests/run/gates/text-encoding-equivalence.spec.mjs",
    "tests/cockpit/lib/method-library/library-fold.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-414' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "bom: findings 首块 expected 1 / actual 0（BOM 让 `^## F` 失配）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-414' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
