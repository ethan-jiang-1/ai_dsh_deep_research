---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-413：evidence-audit-core 的摘录行正则缺 m 旗标，CRLF 证据卡的引文被静默丢弃→转写核对 fail-open

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：证据卡引文按 linesOf 采集；「没采到引文」不再伪装成「引文对不上」；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

当 `evidence/*.md` 用 CRLF 换行时，`## 原文摘录` 节里的 `>` 引文行**一条都采不到**：

- 转写忠实度检查（「转写不符 web 语料覆盖率 X」）**静默不再触发** —— 该卡的引文被当成「没有引文」，于是既不报「覆盖率低」也不报「抽查通过」；
- 「短引文未回溯（<16 字）」这条 INFO 也同时消失。

即：同一张证据卡，换成 CRLF 后审计从「报 MAJOR 转写不符」变成「什么都不说」——门禁由 fail-loud 退化为沉默（fail-open）。

## 分诊与授权

- 严重级：P2 — 审计门禁在 CRLF 输入上少判一条核心断言（转写核对），属「沉默 ≠ 通过」的反面。
- 表面 / 边界：run 门禁（[evidence-audit-core.mjs](../../../checks/lib/gates/evidence-audit-core.mjs) 证据卡解析）/ ① 代码（纯解析）。
- DSH 不变量：完成定义 = 真检查；「没采到引文」与「引文对不上」必须可区分，不得因换行符不同而静默降级。
- 触及面：none — checks 解析器 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 同一张证据卡（frontmatter 齐 + `## 原文摘录` 一条 `>` 引文）在 LF 下产出「转写不符」，CRLF 下该条消失。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditBundle } from "./checks/lib/gates/evidence-audit-core.mjs";
const CARD = "---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-20\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\n---\n\n## 原文摘录\n> 官方页面写着当前版本是 2026-07-28。\n";
const audit = (text) => {
  const dir = mkdtempSync(join(tmpdir(), "bug413-"));
  try {
    const b = join(dir, "drt_demo");
    mkdirSync(join(b, "evidence"), { recursive: true });
    writeFileSync(join(b, "evidence", "e1.md"), text, "utf8");
    writeFileSync(join(b, "topics.md"), "## T1: t\n- lenses: official\n", "utf8");
    return auditBundle(b, join(dir, "sessions"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
const kinds = (r) => (r.findings ?? r).map((f) => f.kind);
console.log("LF  =", JSON.stringify(kinds(audit(CARD))));
console.log("CRLF=", JSON.stringify(kinds(audit(CARD.replace(/\n/g, "\r\n")))));
assert.deepEqual(kinds(audit(CARD.replace(/\n/g, "\r\n"))), kinds(audit(CARD)));
'
```

实测：`LF = [...,"转写不符"]`（含「转写不符 web 语料覆盖率仅 0.00」）/ `CRLF = [...]` ——「转写不符」整条消失，断言红。

## 根因（已证）

[evidence-audit-core.mjs](../../../checks/lib/gates/evidence-audit-core.mjs)（约第 232–244 行）先 `for (const line of body.split('\n'))` 找 `## 原文摘录` 节，再用

```js
const m = /^>\s*(.+)$/.exec(line)
```

取引文：该正则**无 `m` 旗标**，而 CRLF 下 `line` 尾部带 `\r`，`(.+)$` 既吃不到 `\r` 也无法在 `\r` 前命中 `$` → 引文全部丢弃。紧随其后的 `if (quote.length >= 16) rec.quotes.push(...)` 因此永不执行，转写覆盖率判据失去输入。

## 牵出的失败类

- 同机制第 2 次（继 BUG-412 之后又一处「`split('\n')` 留 `\r` + 正则漏 `m`」；BUG-402/407 同族）｜处置：类修——证据卡解析改 `split(/\r?\n/)`，并加 LF/CRLF 同判回归。

## 修法方向

- `body.split(/\r?\n/)`（或先归一 CRLF），并给 `^>` 加 `m`；
- 补一条「无引文的证据卡」显式提示（区分「没写摘录」与「引文对得上」），避免同类静默；
- 加回归：同一张卡的 LF / CRLF 审计 finding 集合必须逐条相同。

## 修复判据

- 复现脚本断言为绿（两种换行下 `findings` 的 kind 序列一致，且都包含「转写不符」）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把引文节的 `linesOf(body)` 改回 `body.split('\n')` → CRLF 证据卡引文零采集（转写核对静默失效）。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/evidence-audit-core.mjs",
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "tests/run/gates/text-encoding-equivalence.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-413' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "crlf: 引文必须被采集（无引文 = fail-open）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-413' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
