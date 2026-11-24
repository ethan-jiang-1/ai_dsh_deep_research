---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-433：门② 的 present 见证不认 `readable*`——只声明读者版的交付被判「present 缺席」RED

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：门② 见证改用 pack finalPathOf/终稿族词法（认 readable.md / readable-vN.md），门禁不再比驾驶舱窄；去向：implemented — 批 Note [2026-11-24-vendor-wire-semantics-and-log-tail](../../../notes/implemented/2026-11-24-vendor-wire-semantics-and-log-tail.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`deliverables/presented` 事件里 `files[]` 的路径，两套判据接受面不同：

| present 声明的文件 | checks 见证 `presentedInLogs` | pack `latestFinalDelivery` |
|---|---|---|
| 仅 `drt_x/final/v1.md` | ✓ | ✓ |
| `readable-v1.md` + `v1.md`（真实日志形态） | ✓（只收 v1） | ✓（取读者版优先） |
| **仅 `drt_x/final/readable-v1.md`** | **空 → status NONE** | ✓ |
| `drt_x/final.md` | ✓（version=null） | ✓ |
| **仅 `drt_x/final/readable.md`** | **空 → NONE** | ✓ |

后果：一场**只把读者版 present 出去**的交付（真实日志里读者版是列表第一项，产品语义就是"先读读者版"）在门② 被判 **「present 声明缺席」→ RED**，而驾驶舱能正常打开同一份终稿。同一份事件，两个模块结论相反。

## 分诊与授权

- 严重级：P2 — 交付门假阳性（合规交付被判未声明）；不破坏数据。
- 表面 / 边界：run 门禁（[node-gate-session-gates.mjs](../../../checks/lib/shared/node-gate-session-gates.mjs) `scanWitnessLogs` 的 `pathRe`）vs pack（[final-target.ts](../../../packages/deep-research-pack/src/lib/run/final-target.ts) `finalPathOf`/`latestFinalDelivery`）/ ① 代码（同语义两套路径词法）。
- DSH 不变量：终稿族路径的识别必须单点（pack `finalPathOf` 已是正本）；门禁不得比观察面更窄。
- 触及面：none — checks 判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = wire-semantics-and-log-tail-431-434。
- 批：wire-semantics-and-log-tail-431-434。

## 复现

复现状态：稳定 — 同一 `deliverables/presented`，只保留读者版路径即见证为空。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { presentedInLogs } from "./checks/lib/shared/node-gate-session-gates.mjs";
import { latestFinalDelivery } from "./packages/deep-research-pack/src/lib/run/final-target.ts";
const probe = (paths) => {
  const root = mkdtempSync(join(tmpdir(), "bug433-"));
  const logDir = join(root, "sessions", "grp", "session-1");
  mkdirSync(logDir, { recursive: true });
  const header = { type: "session", version: 4, id: "session-1", createdAt: 1, cwd: "/tmp", isSeeded: false, delegationDepth: 0, agentPreset: "lead" };
  const write = { type: "tool/call", seq: 1, data: { callId: "c1", name: "write", arguments: JSON.stringify({ file_path: "drt_demo/question.md", content: "x" }) } };
  const present = { type: "deliverables/presented", seq: 2, time: 1795224000000, data: { turn: 1, callId: "c2", files: paths.map((p) => ({ path: p, description: "d" })) } };
  writeFileSync(join(logDir, "session.v4.jsonl"), [header, write, present].map((e) => JSON.stringify(e)).join("\n") + "\n");
  const witness = presentedInLogs(join(root, "sessions"), "demo");
  const delivery = latestFinalDelivery([present]);
  rmSync(root, { recursive: true, force: true });
  return { witnessEvents: witness.events?.length ?? witness.length, delivery: delivery?.path ?? null };
};
console.log("仅 v1        :", JSON.stringify(probe(["drt_demo/final/v1.md"])));
console.log("仅 readable-v1:", JSON.stringify(probe(["drt_demo/final/readable-v1.md"])));
assert.ok(probe(["drt_demo/final/readable-v1.md"]).witnessEvents > 0);
'
```

实测：`仅 v1 → {witnessEvents: 1, delivery: "drt_demo/final/v1.md"}` / `仅 readable-v1 → {witnessEvents: 0, delivery: "drt_demo/final/readable-v1.md"}`（断言红）。

## 根因（已证）

[node-gate-session-gates.mjs](../../../checks/lib/shared/node-gate-session-gates.mjs) `scanWitnessLogs`：

```js
const pathRe = new RegExp(`(?:^|/)(?:archive/|_abandoned/)?drt_${escapeRe(bare)}/(final(?:/v(\\d+))?\\.md)$`)
```

只收 `final.md` 与 `final/vN.md`；`final/readable.md` / `final/readable-vN.md` 不匹配。而 pack 的终稿族正本 `FINAL_FAMILY_RELATIVE` / `finalPathOf` 明确包含 `readable(?:-vN)?\.md`（且 `familyRank` 把读者版排在最高优先级）。

## 牵出的失败类

- 同机制第 1 次（终稿族路径词法两套；与 BUG-428/433 同族：同语义多实现）｜处置：类修——门禁侧改用 pack `finalPathOf`（或共享 `FINAL_FAMILY_RELATIVE`）解析 present 路径，`version` 从 `finalVersionOfPath` 取。

## 修法方向

- `pathRe` 改为调用 pack 的 `finalPathOf(path)` + 校验 slug 前缀；版本取 `finalVersionOfPath`；
- 回归：五种 present 文件集（vN / readable-vN / 两者 / final.md / readable.md）在两模块**同判**。

## 修复判据

- 复现脚本断言为绿；
- 非终稿族路径（`drt_x/notes/final.md`）仍不计见证（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 scanWitnessLogs 的 present 路径判定改回只认 `final(?:/vN)?.md` 的正则（读者版不计）。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/node-gate-session-gates.mjs",
    "tests/run/gates/node-gate-session.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-433' tests/run/gates/node-gate-session.spec.mjs",
    "exit": 1,
    "output": "drt_demo/final/readable-v1.md 必须构成见证（status=NONE：见证正则不认读者版）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-433' tests/run/gates/node-gate-session.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-session.spec.mjs"
  }
}
```
