---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-434：崩溃尾帧把整份会话日志判成不可读——恢复工具在崩溃现场看不到任何事件

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：会话日志三态：完好 / 尾帧截断（可用前缀 + truncatedTail）/ 中间损坏（不可读）；run-state 如实外露；去向：implemented — 批 Note [2026-11-24-vendor-wire-semantics-and-log-tail](../../../notes/implemented/2026-11-24-vendor-wire-semantics-and-log-tail.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

会话日志是**逐次 append 一帧**的 zstd 多帧文件（vendor 语义），崩溃/断电会留下**尾部半帧**——这是 vendor 自己就有修复路径（`openTurnClosers` / `repair.ts` 专为它设计）的正常形态。但 `readSessionEvents` 遇到任何一帧解压失败就返回 `{ readable: false, events: [] }`，于是：

| 日志形态 | `readSessionText` | `readSessionEvents` |
|---|---|---|
| 两帧完好 | 文本 | `readable: true`，3 events |
| **尾部截断 8 字节**（崩溃形态） | **null** | **`readable: false`，0 events** |
| 尾部半帧 | null | `readable: false`，0 events |

下游后果（全部在**最需要它的时刻**失效）：

- `run-state.runStateOf`：`turnOpen/pending/liveSubagents/health/lastAsk` 全变 null → watch-run 显示"不可读"；
- `hitl-answer`：`pending: state.readable && …` → **挂起问询被判"没有"**（第 96/122 行），操作者无法代答崩溃现场的 HITL；
- `node-gate`（zstd CLI 路）：解压失败按空语料继续 → 门①②③ 全 UNATTESTED —— 一份 99% 完好的交付证据被判「无证据」。

即：**「尾部一帧坏了」= 正常崩溃形态，被当成「整份日志损坏」**；而真正需要区分的是「尾部坏（可用前缀）」与「中间坏（真损坏）」。

## 分诊与授权

- 严重级：P2 — 崩溃恢复路径失效（恢复工具恰好在崩溃场景盲掉）；不破坏数据。
- 表面 / 边界：会话日志读取（[session-log.mjs](../../../checks/lib/shared/session-log.mjs) `decompressSessionLog`/`readSessionText`/`readSessionEvents`）× 消费方 run-state / hitl-answer / node-gate / evidence-audit / 观察工具 / ③ 分析层 + 工具。
- DSH 不变量：fail-loud 不等于 fail-blind——「不可读」必须与「尾部截断（可读前缀）」分开；vendor 的 `repair` 语义就是按这个区分做的。
- 触及面：run 通道操作面（hitl-answer 前置）→ 修法与授权按分诊推进。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = wire-semantics-and-log-tail-431-434。
- 批：wire-semantics-and-log-tail-431-434。

## 复现

复现状态：稳定 — 两帧 zstd，砍掉第二帧尾部 8 字节即整份不可读。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import { readSessionEvents } from "./checks/lib/shared/session-log.mjs";
const header = JSON.stringify({ type: "session", version: 4, id: "s1", createdAt: 1, cwd: "/tmp", isSeeded: false, delegationDepth: 0, agentPreset: "lead" }) + "\n";
const ev1 = JSON.stringify({ type: "turn/start", seq: 0, data: { turn: 1 } }) + "\n";
const ev2 = JSON.stringify({ type: "turn/end", seq: 1, data: { turn: 1, reason: { kind: "completed" } } }) + "\n";
const f1 = zstdCompressSync(Buffer.from(header + ev1));
const f2 = zstdCompressSync(Buffer.from(ev2));
const dir = mkdtempSync(join(tmpdir(), "bug434-"));
const path = join(dir, "session.v4.jsonl.zstd");
const probe = (buf) => { writeFileSync(path, buf); return readSessionEvents(path); };
const ok = probe(Buffer.concat([f1, f2]));
const crashed = probe(Buffer.concat([f1, f2.subarray(0, f2.length - 8)]));
console.log("完好 →", ok.readable, ok.events.length, "| 尾帧截断 →", crashed.readable, crashed.events.length);
assert.equal(crashed.readable, true);
rmSync(dir, { recursive: true, force: true });
'
```

实测：`完好 → true 3 | 尾帧截断 → false 0`（断言红）。

## 根因（已证）

[session-log.mjs](../../../checks/lib/shared/session-log.mjs)：

```js
export function decompressSessionLog(buf, decompress = …) {
  const frames = scanZstdFrames(buf)
  if (!frames) return null
  const parts = []
  try {
    for (const [start, end] of frames) {
      const part = decompress(buf.subarray(start, end))
      if (!part) return null
      parts.push(part)
    }
  } catch {
    return null            // ← 任意一帧失败 = 整份 null
  }
  return Buffer.concat(parts)
}
```

`readSessionText` 把 null 当「不可读」的唯一判定点，`readSessionEvents` 再把它压成空事件集——**没有「前缀可用」这一档**。同一仓的 `zstd-read.mjs`（CLI 路）也只回答 ok/不 ok，丢弃 CLI 已解出的好帧（`r.status !== 0` → `{ok:false}`）。

## 牵出的失败类

- 同机制第 1 次（把「尾部坏」与「整份坏」压成同一状态；与 BUG-431「未知 vs 失败」同族：三态压成两态）｜处置：类修——`decompressSessionLog` 返回 `{ text, truncatedTail: boolean }`：**尾帧**失败 → 保留已解帧 + 标记；**中间帧**失败 → 仍旧不可读。消费方分别处理（run-state 显示「日志尾部截断，已读 N 条」；hitl-answer 允许在前缀上判定 pending；node-gate 用前缀语料而不是空语料）。

## 修法方向

- 帧扫描时记录最后一帧边界；若仅尾帧解压失败，按前缀拼接并 `truncatedTail: true`；
- `readSessionEvents` 增加 `truncatedTail` 字段（不改 `readable` 语义）；
- 回归：完好 / 尾帧截断 / 中间帧损坏 / 全坏 四种形态 × 读取器与 run-state 两个消费方。

## 修复判据

- 复现脚本断言为绿（尾帧截断 `readable: true` 且事件数 = 前缀事件数，并带 `truncatedTail: true`）；
- 中间帧损坏仍 `readable: false`（负控）；
- `run-state`/`hitl-answer` 在尾帧截断的日志上能读出 pending（新增断言）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 decodeSessionLog 改回「扫描/解压任一帧失败即整份 null」（删掉尾帧前缀分支）→ 尾帧截断用例红。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/session-log.mjs",
    "checks/lib/shared/run-state.mjs",
    "tests/run/shared/run-state.spec.mjs",
    "tests/run/analyze/run-dashboard.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-434：尾帧截断' tests/run/shared/run-state.spec.mjs",
    "exit": 1,
    "output": "尾帧截断日志 expected readable=true / actual false（整份被当不可读，恢复工具盲掉）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-434：尾帧截断' tests/run/shared/run-state.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/shared/run-state.spec.mjs"
  }
}
```
