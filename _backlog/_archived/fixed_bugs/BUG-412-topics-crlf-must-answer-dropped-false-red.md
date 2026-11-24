---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-412：parseTopicsReport 的缩进子项正则缺 m 旗标，CRLF topics.md 的 must_answer 全丢→合规 run 被判 RED

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：逐行解析统一走 linesOf（剥 BOM + CRLF/CR 归一）；topics 在四种书写下同判；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

当 `topics.md` 用 CRLF 换行（Windows 编辑器/工具重写/某些 agent 写盘）时，`## T#` 下的 `  - 子问题` 缩进项一条都读不到：

- `topicsGate` 把合规的 topics 判成 **`T1 的 must_answer 数量 0 ∉ [2, 5]` → RED**，HITL2/交付前置被挡；
- 笔记本体（`parseTopicsOf`）返回的 `mustAnswer` 也是空数组 → 任何依赖它的覆盖面（critic 覆盖表比对、`deriveAnchors` 的题面）都少题。

## 分诊与授权

- 严重级：P1 — 合规输入被误判 RED（阻断主路径），且是「同一份内容换个换行符就换结论」的不可预期行为。
- 表面 / 边界：run 门禁（[findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseTopicsReport`）/ ① 代码（纯解析）。
- DSH 不变量：同一契约文本的等价书写（LF/CRLF）必须同判；门禁不得因编辑器差异误杀合法 run。
- 触及面：none — checks 解析器 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 同一份 topics（每个 topic 两条 `  - 子问题`）转成 CRLF 后，`topicsGate` 从 PASS 变 RED。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTopicsReport } from "./checks/lib/gates/findings-core.mjs";
import { topicsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
const TOPICS = ["## T1: 通道","","- must_answer:","  - 当前版本号是什么","  - 上一修订是哪天","- scope_role: primary","- depends_on: 无","","## T2: 口径","","- must_answer:","  - 总量能否官方直出","  - 分页上限是多少","- scope_role: comparison","- depends_on: T1",""].join("\n");
const gate = (text) => { const dir = mkdtempSync(join(tmpdir(), "bug412-")); try { writeFileSync(join(dir, "topics.md"), text, "utf8"); return topicsGate(dir); } finally { rmSync(dir, { recursive: true, force: true }); } };
const lf = gate(TOPICS);
const crlf = gate(TOPICS.replace(/\n/g, "\r\n"));
console.log("LF  =", JSON.stringify(lf));
console.log("CRLF=", JSON.stringify(crlf));
console.log("LF_MUST=", [...parseTopicsReport(TOPICS).topics.values()].map((t) => t.mustAnswer.length));
console.log("CRLF_MUST=", [...parseTopicsReport(TOPICS.replace(/\n/g, "\r\n")).topics.values()].map((t) => t.mustAnswer.length));
assert.deepEqual(crlf, lf);
'
```

实测：`LF = {"status":"PASS",...}` / `CRLF = {"status":"RED","detail":"T1 的 must_answer 数量 0 ∉ [2, 5]；T2 的 must_answer 数量 0 ∉ [2, 5]"}`；`LF_MUST=[2,2]` / `CRLF_MUST=[0,0]`。

## 根因（已证）

[findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的 `parseTopicsReport`：

1. 外层用 `String(text ?? '').split('\n')` 切行 —— CRLF 下每行尾部带 `\r`（同文件其它解析器用 `split(/\r?\n/)`）；
2. 缩进子项正则写成 `/^\s{2,}-\s+(.+)$/`（**无 `m` 旗标**，而同函数内 `must_answer` / `scope_role` / `lenses` / `depends_on` 的同类正则都带 `m`）——无 `m` 时 `$` 只认字符串末尾，`(.+)` 又不吃 `\r`，于是 `  - 子问题\r` 永远不匹配；
3. 结果 `mustAnswer` 保持 `listOf(must[1])` 的 `[]`（`- must_answer:` 行本身是空值），数量 0 触发下限判据。

## 牵出的失败类

- 同机制第 1 次（`split('\n')` 保留 `\r` + 个别正则漏 `m`/漏归一，与 BUG-402/407 同族）｜处置：类修——该解析器改用 `split(/\r?\n/)`，并补一条 CRLF 契约断言；同时核对全部 `split('\n')` 的解析点。

## 修法方向

- `parseTopicsReport` 改 `String(text ?? '').split(/\r?\n/)`（或先 `replace(/\r\n/g,'\n')`）；
- 给缩进子项正则补 `m` 旗标，避免再次依赖外层切行是否留 `\r`；
- 加回归：同一份 topics 的 LF / CRLF 必须产出同一 `mustAnswer` 与同一 `topicsGate` 裁决。

## 修复判据

- 复现脚本断言为绿（`crlf === lf` 且 `RF_MUST === LF_MUST`）；
- `fixture-leads-healthy` 的 CRLF 副本在 `topicsGate` 下与 LF 副本同判（现状：LF 报 `数量 1 ∉ [2,5]`、CRLF 报 `数量 0`，数字都不一致）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 parseTopicsReport 的 `linesOf(text)` 改回 `String(text ?? '').split('\n')` → CRLF 的 must_answer 子项全部失配。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "tests/run/gates/text-encoding-equivalence.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-412' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "crlf: must_answer 数量 expected 2 / actual 0（行尾 \\r 让缩进子项正则失配）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-412' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
