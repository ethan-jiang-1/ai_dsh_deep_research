---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-393：method-of-question.ts 不兼容 CRLF / 全角冒号 / * 列表符，合法 question.md 退化成 unrecorded

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：方法节解析对齐 library-fold 口径（CRLF/BOM/全角冒号/列表符/加粗键）；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

当 `question.md` 的 `## 研究方法（本次实际采用）` 使用 Windows `CRLF` 换行、全角冒号（`- 采用：方案比较`）、缩进或 `* ` 列表符时，「研究配置」页签的 `foldMethodAdoption` 会退化为 `kind: 'unrecorded'`（提示“未记录”），而同仓的 [library-fold.ts](../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts)（第 34 行）已兼容上述全部 Markdown 变体。

## 分诊与授权

- 严重级：P2 — 解析器比同仓兄弟模块更脆，合法格式漂移导致“已记录方法”消失。
- 表面 / 边界：pack lib（[method-of-question.ts](../../../packages/deep-research-pack/src/lib/method-library/method-of-question.ts)）/ ② 行为（纯函数）。
- DSH 不变量：Honor public contracts on BOTH sides — 同类 Markdown 键值解析应同源同容错。
- 触及面：none — pack lib + 契约测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 直接调用 `foldMethodAdoption` 传入含 `CRLF` 与全角冒号的 `question.md` 即可复现。

```sh
node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { foldMethodAdoption } from "./packages/deep-research-pack/src/lib/method-library/method-of-question.ts";
const q = "# Topic\r\n\r\n## 研究方法（本次实际采用）\r\n- 采用：方案比较\r\n- 来源：内置\r\n";
assert.equal(foldMethodAdoption(q, { bundle: true, question: true, questionState: "ok" }).kind, "recorded");
'
```

## 根因（已证）

[method-of-question.ts](../../../packages/deep-research-pack/src/lib/method-library/method-of-question.ts)（第 46–51、73 行）：
`parseMethodSection` 直接 `questionText.split('\n')`（未归一 `\r\n`），且 `fieldValue` 硬编码 `const prefix = \`- ${field}:\`; line.startsWith(prefix)`，拒绝了全角冒号 `：`、前导空白、`*`/`+` 列表符与加粗键名。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（对齐 `library-fold.ts` 的 `^\s*[-*+]\s*...[:：]` 解析，并把 `question.md` `§研究方法` 纳入 `skill-parser-contract.spec.mjs` 双向扫面）。

## 修法方向

- 归一 `\r\n`、`^\uFEFF`，把 `fieldValue` 改为正则匹配 `^\s*[-*+]\s*(?:\*\*)?${field}(?:\*\*)?\s*[:：]\s*(.*)$`，并与 `library-fold.ts` 保持同一套 bullet/冒号宽容口径。

## 修复判据

- 含 `CRLF`、全角冒号 `：`、`*` 列表符的 `question.md` 均能稳定折出 `kind: 'recorded'` 与正确的 `adopted`/`origin`/`requirements`。
- 缺方法节或空值仍返回 `'unrecorded'`，占位符仍返回 `'unparsable'`（负控）。

## 修复落地（2026-11-24）

红证配方：把 fieldValue 退回 `- ${field}:` 字面前缀（或让 parseMethodSection 退回 `split('\n')`）→ CRLF/全角冒号/列表符全退化成 unrecorded。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/method-library/method-of-question.ts",
    "tests/cockpit/lib/method-library/method-of-question.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-393' tests/cockpit/lib/method-library/method-of-question.spec.mjs",
    "exit": 1,
    "output": "expected 'unparsable' / actual 'unrecorded'"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/method-library/method-of-question.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/lib/method-library/method-of-question.spec.mjs"
  }
}
```
