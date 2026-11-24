---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-432：门①（HITL1 锚点门）只认中文字面「研究类型」——英文/措辞变体的合规 run 判 RED

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：门① 的 HITL1 签名走 askKindOf（结构化 id 优先 + 英文兜底），与门③/观察面同源；去向：implemented — 批 Note [2026-11-24-vendor-wire-semantics-and-log-tail](../../../notes/implemented/2026-11-24-vendor-wire-semantics-and-log-tail.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`hitlAskGate`（`gateBundle` 的门①，**交付阻断**）判定「本 run 有没有走 HITL1」的方式是：写过滤 `question.md` 的会话里，是否有 `ask_user_question` 调用的 arguments **包含字面「研究类型」**：

| HITL1 问卡（同一语义） | `askKindOf`（判型正本） | 门① |
|---|---|---|
| `header: 研究类型`（zh，真实日志形态） | `hitl1` | **PASS** |
| `header: Research type`（en） | `hitl1` | **RED**「HITL1 签名 0 次」 |
| `id: research_type` + 英文题面 | `hitl1` | **RED** |

即英文 locale（或任何非「研究类型」字面的问卡）的合规 run，在交付时被门①判「跳过了立项拍板」——BUG-006 形态的**假阳性**。

同一文件里的门③（HITL2）**已经有英文兜底**（`/定稿|finalize|deliver as[- ]is/i`，第 241/269 行），`askKindOf` 也有（id 优先 + `/research type/`）——**只有门①这一处没跟上**。

## 分诊与授权

- 严重级：P1 — 交付门前置判据在英文面 fail-closed 到误杀（合规 run 无法交付）；与 BUG-427（观察面同源假设）构成一对。
- 表面 / 边界：run 门禁（[node-gate-session-gates.mjs](../../../checks/lib/shared/node-gate-session-gates.mjs) `hitlAskGate`）/ ① 代码（判型签名）。
- DSH 不变量：同一 wire 签名必须单点判型（`askKindOf` 是正本）；同一文件内不得一半有 i18n 兜底、一半没有。
- 触及面：none — checks 判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = wire-semantics-and-log-tail-431-434。
- 批：wire-semantics-and-log-tail-431-434。

## 复现

复现状态：稳定 — 造一个 lead 会话（写过 `drt_demo/question.md`）+ 一张英文 HITL1 卡，门① 判 RED。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hitlAskGate } from "./checks/lib/shared/node-gate-session-gates.mjs";
import { toolCall } from "./tests/fixtures/events.mjs";
const run = (askArgs) => {
  const root = mkdtempSync(join(tmpdir(), "bug432-"));
  const bundle = join(root, "ws", "drt_demo");
  const sessions = join(root, "sessions"); const logDir = join(sessions, "grp", "session-1");
  mkdirSync(bundle, { recursive: true }); mkdirSync(logDir, { recursive: true });
  writeFileSync(join(bundle, "question.md"), "# Q\n\nbody\n");
  writeFileSync(join(bundle, "run.md"), "- schema: 2\n- created: 2026-11-20\n- phase: research\n- next: x\n- delivered: none\n- parked: none\n");
  const events = [
    { type: "session", version: 4, id: "session-1", createdAt: 1, cwd: "/tmp", isSeeded: false, delegationDepth: 0, agentPreset: "lead" },
    toolCall({ callId: "c-w", name: "write", arguments: { file_path: "drt_demo/question.md", content: "# Q" } }),
    toolCall({ callId: "c-ask", name: "ask_user_question", arguments: askArgs }),
  ];
  writeFileSync(join(logDir, "session.v4.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  const v = hitlAskGate(bundle, sessions, "2026-11-24");
  rmSync(root, { recursive: true, force: true });
  return v;
};
const zh = run({ questions: [{ id: "q1_type", header: "研究类型", question: "按哪类来做？", options: [{ label: "A" }] }] });
const en = run({ questions: [{ id: "research_type", header: "Research type", question: "Which type?", options: [{ label: "A" }] }] });
console.log("zh →", zh.status, "| en →", en.status);
assert.equal(en.status, zh.status);
'
```

实测：`zh → PASS | en → RED`（断言红）。

## 根因（已证）

[node-gate-session-gates.mjs](../../../checks/lib/shared/node-gate-session-gates.mjs) `hitlAskGate` 内：

```js
if (d?.name === 'ask_user_question') {
  sessionAsks++
  if (/研究类型/.test(args)) sessionSigned++
}
```

判据是整串 arguments 的中文子串，不看 `questions[].id`、也没有英文兜底；而同一文件的 HITL2 判据、以及 pack 的 `askKindOf` 都已经语言无关。真实日志实证：HITL1 的 id 是 `q1_type`（非 `research_type`），所以**连 id 兜底都不能只靠固定 id**——正解是复用 `askKindOf` 的「id + 文案」双面判定。

## 牵出的失败类

- 同机制第 2 次（中文字面判据散落在多处；BUG-427 为观察面同源）｜处置：类修——门① 改为 `askKindOf(argsObjectOf(args)) === 'hitl1'`；把「HITL 签名」收敛成 pack 的唯一导出，checks 侧只调用。

## 修法方向

- 门① 复用 `askKindOf`；
- 回归：中 / 英 / id-only 三形态 × 门① 与 `askKindOf` **同判**；
- 顺带扫一遍 `grep 研究类型` 的其余命中（`bundle-bind.isKickoffCall`、skill 文案除外）确认无第三处判据。

## 修复判据

- 复现脚本断言为绿（英文卡 PASS）；
- 中文卡仍 PASS（负控）；真「跳过 HITL1」的 run 仍 RED（负控：只写 bundle 不发 ask）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 hitlAskGate 的签名判据改回 `/研究类型/.test(args)`（英文/结构化 id 判 RED）。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/node-gate-session-gates.mjs",
    "tests/run/gates/node-gate-session.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-432' tests/run/gates/node-gate-session.spec.mjs",
    "exit": 1,
    "output": "英文/结构化 id 的 HITL1 门① expected 'PASS' / actual 'RED'（只认中文字面）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-432' tests/run/gates/node-gate-session.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-session.spec.mjs"
  }
}
```
