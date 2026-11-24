---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-407：acceptance-check.mjs 的 frontmatter_fields 自写正则只认 LF，遇到 CRLF 换行文件必判缺全部字段

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：收活验收复用 splitFrontmatter 唯一正本（CRLF 同判；真缺字段仍 FAIL）；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

当 `acceptanceCheck` 对包含 `frontmatter_fields` 的判据（例如 `{ type: 'frontmatter_fields', file: 'evidence/e1.md', fields: ['title', 'source_url'] }`）进行求值时，只要目标 Markdown 文件使用 CRLF（`\r\n`）换行：
- 同仓 [frontmatter.mjs](../../../checks/lib/shared/frontmatter.mjs) 能正常解析出所有字段，但 `acceptanceCheck` 返回 `FAIL`（`缺字段：evidence/e1.md 缺 title, source_url`），把合法在场且非空的证据卡误拒。

## 分诊与授权

- 严重级：P2 — 收活验收门与仓内唯一 frontmatter 解析器 `splitFrontmatter` 分叉（影子正则不兼容 CRLF，与 `BUG-393` 同类）。
- 表面 / 边界：收活验收核（[acceptance-check.mjs](../../../checks/lib/gates/acceptance-check.mjs) × [frontmatter.mjs](../../../checks/lib/shared/frontmatter.mjs)）/ ③ 门禁解析边界。
- DSH 不变量：不留影子契约与第二事实源 — frontmatter 拆解应复用仓内唯一正本 `splitFrontmatter`。
- 触及面：none — gate 纯函数单文件 + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 写入带 CRLF 的合法 `evidence/e1.md`，调用 `acceptanceCheck` 稳定判为 `FAIL`。

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptanceCheck } from "./checks/lib/gates/acceptance-check.mjs";
const tmp = mkdtempSync(join(tmpdir(), "bug407-"));
try {
  mkdirSync(join(tmp, "evidence"), { recursive: true });
  writeFileSync(join(tmp, "evidence", "e1.md"), "---\r\ntitle: test\r\nsource_url: https://example.com\r\n---\r\nbody\r\n", "utf8");
  const res = acceptanceCheck(tmp, [{ type: "frontmatter_fields", file: "evidence/e1.md", fields: ["title", "source_url"] }]);
  console.log("RESULT=", JSON.stringify(res));
  assert.equal(res.verdicts[0].status, "PASS");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

[acceptance-check.mjs](../../../checks/lib/gates/acceptance-check.mjs) 第 56–57 行没有复用仓内唯一正本 `splitFrontmatter`，而是内联了两行正则：
```js
const fm = /^---\n([\s\S]*?)\n---/.exec(readFileSync(p, 'utf8'))?.[1] ?? ''
const missing = c.fields.filter((f) => !new RegExp(`^${f}\\s*:\\s*\\S`, 'm').test(fm))
```
1. 第 56 行硬编码 `\n` 而非 `\r?\n`，遇到 CRLF 直接匹配失败落空为 `''`；
2. 第 57 行既未转义字段名 `f` 中的正则元字符，也与 `splitFrontmatter`（第 15–23 行）的键-值解析口径脱节。

## 牵出的失败类

- 同机制第 3 次（继 `BUG-393` / `BUG-402` 之后，又一处未复用正本解析器导致的 CRLF / 影子正则失效）｜处置：删除手写 frontmatter 正则，直接复用 `splitFrontmatter`（并注意空值判定）。

## 修法方向

- 在 [acceptance-check.mjs](../../../checks/lib/gates/acceptance-check.mjs) 改用 `splitFrontmatter(readFileSync(p, 'utf8'))`，在 `fm !== null` 时校验每个 `f` 满足 `typeof fm[f] === 'string' && fm[f].trim() !== ''`（或若需兼顾字段名非 `splitFrontmatter` 字符集/多行 YAML 亦显式对齐契约）；
- 为 `acceptance-check` 补充 CRLF frontmatter 回归单测。

## 修复判据

- 复现脚本中 `res.verdicts[0].status === "PASS"` 且 `summary.fail === 0`；
- 新增单测及 `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 `splitFrontmatter` 调用改回 LF-only 影子正则 → CRLF 证据卡被判缺全部字段。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/acceptance-check.mjs",
    "tests/run/gates/acceptance-check.spec.mjs",
    "checks/README.md"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-407' tests/run/gates/acceptance-check.spec.mjs",
    "exit": 1,
    "output": "CRLF frontmatter 用例 expected 'PASS' / actual 'FAIL'（影子正则只认 LF）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-407' tests/run/gates/acceptance-check.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/acceptance-check.spec.mjs"
  }
}
```
