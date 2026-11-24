---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-417：leadsGate 的错误文案把行尾 CR 一起嵌进引号，用户可见输出带控制字符

> 严重级别：P2（影响面小：文案卫生，不改变裁决） ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：leadsGate 的单元切分走 linesOf；失败文案可直接阅读/复述（无控制字符）；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

对 CRLF 的 `leads.md` 跑 `leadsGate`，RED 详情里出现**内嵌回车**的引号段（终端/日志里表现为行被截断或错行）：

```
「方向: T1 — 状态值不在合法集
」状态值非法："待定"（…）
```

即 `「…」` 里多出一个 `\r`。同一批其它 CRLF 输入（topics/findings/plan）不带这个问题，属单点文案缺陷。

## 分诊与授权

- 严重级：P2（低）— 不改变 PASS/RED 结论，但告警文案是操作侧唯一修正入口，带控制字符会让复制/比对失真。
- 表面 / 边界：run 门禁文案（[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `leadsGate`）/ ① 代码（字符串拼接）。
- DSH 不变量：失败信息 = 失败对象 + 违反规则 + 修正入口，且必须可直接阅读/复述。
- 触及面：none — checks 文案 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — CRLF 的 leads.md 与 LF 版除目录名外只差引号里那个 `\r`。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leadsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
const LEADS = "## 方向: T1 — 通道\n\n- 状态: 待定\n";
const gate = (text) => { const d = mkdtempSync(join(tmpdir(), "bug417-")); try { writeFileSync(join(d, "leads.md"), text, "utf8"); return leadsGate(d); } finally { rmSync(d, { recursive: true, force: true }); } };
const crlf = gate(LEADS.replace(/\n/g, "\r\n"));
console.log("DETAIL=", JSON.stringify(crlf.detail));
assert.doesNotMatch(crlf.detail, /\r/);
'
```

实测：`DETAIL` 中含 `…状态值不在合法集\r」…`（断言红）。

## 根因（已证）

`leadsGate` 用 `leads.md` 的 `split('\n')` 逐行匹配，状态行捕获组把行尾 `\r` 一起收进 `方向` 文本后再拼进告警引号；同类「方向标题」在 LF 下不带该字符，故此前未暴露（与 BUG-412/413 同源：`split('\n')` 未归一）。

## 牵出的失败类

- 同机制第 3 次（`split('\n')` 保留 `\r`；前两次 = BUG-412 must_answer 丢失、BUG-413 引文丢失）｜处置：类修——`leadsGate`（及其同文件其余 `split('\n')` 解析点）统一 `split(/\r?\n/)`；文案侧对每个插值再 `.trim()`。

## 修法方向

- `leadsGate` 的逐行遍历改 `split(/\r?\n/)`；
- 告警拼装统一走一个 `quote(text)` 小工具（`trim()` 后再包「」），防止再次把控制字符带进用户可见文案。

## 修复判据

- 复现脚本断言为绿（CRLF 的 detail 不含 `\r`）；
- CRLF 与 LF 的 `leadsGate` 裁决逐字相同；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 leads 分节改回 `text.split('\n')` → 行尾 \r 进入 heading/状态值，detail 夹带 CR。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/node-gate-run-gates.mjs",
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "tests/run/gates/text-encoding-equivalence.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-417' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "crlf: detail 含 CR（用户可见文案带控制字符）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-417' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
