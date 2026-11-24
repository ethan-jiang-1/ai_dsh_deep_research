---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-425：交付门只验回执哈希，`version≠1` / `gate.status=FAIL` / `slug` 不符一律放行（与观察面判据分叉）

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：交付门复用 pack 解码器判 schema + slug 对账（不再比驾驶舱更宽松），哈希对账保留；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

同一份 `delivered.json`，两套判据给出相反结论：

| 回执变异 | `receiptProblems`（交付门用） | `decodeDeliveredReceipt`（驾驶舱用） |
|---|---|---|
| 基线 | `[]` → PASS | 合法 |
| `version: 2`（schema 外） | `[]` → **PASS** | 非法（`version must be 1`） |
| `gate: {status:'FAIL'}` | `[]` → **PASS** | 非法（`gate.status must be PASS`） |
| `slug: 'other'`（与 bundle 目录不符） | `[]` → **PASS** | 传 slug 时非法 |
| `present: null`（声称没有 present） | `[]` → **PASS** | 合法（可选） |
| `final.version: 9`（文件不在场） | RED | 合法（Bug-424 的反向洞） |
| `audit.sha256` 空串 | RED | 合法 |

即门禁侧只对**哈希**类字段做对账，对**身份/自述裁决**类字段（`version`/`slug`/`gate.status`）完全不看；而这些字段恰是驾驶舱判定「这份回执是否可信」的依据。后果：一份自述 `gate.status: FAIL` 或 schema 版本不对的回执，交付门照样判「交付件齐」。

## 分诊与授权

- 严重级：P2 — 门禁 fail-open（接受形态非法的回执），且与观察面形成两个事实源；不直接改数据。
- 表面 / 边界：run 门禁（[run-receipt.mjs](../../../checks/lib/shared/run-receipt.mjs) `receiptProblems`）vs pack lib（[final-target.ts](../../../packages/deep-research-pack/src/lib/run/final-target.ts) `decodeDeliveredReceipt`）/ ① 代码（判据分叉）。
- DSH 不变量：**同一工件的判据必须单点**（本仓反复出现的「禁第二份手抄件」）；门禁不得比 UI 更宽松。
- 触及面：none — checks + pack lib 共用判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = receipt-and-signature-single-source-424-430。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 构造真 bundle（`final/v1.md` + `audit.md` + `final.md` 齐），逐个变异回执字段，`receiptProblems` 对四类变异全返回空。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { receiptProblems, buildDelivered } from "./checks/lib/shared/run-receipt.mjs";
import { decodeDeliveredReceipt } from "./packages/deep-research-pack/src/lib/run/final-target.ts";
const root = mkdtempSync(join(tmpdir(), "bug425-"));
const dir = join(root, "drt_demo");
mkdirSync(join(dir, "final"), { recursive: true });
writeFileSync(join(dir, "final.md"), "# 终稿\n\n## 决策摘要\n\n正文\n");
writeFileSync(join(dir, "final", "v1.md"), "# v1\n\n## 决策摘要\n\n正文\n");
writeFileSync(join(dir, "audit.md"), "# Evidence Audit — drt_demo（2026-11-24T00:00:00.000Z）\n\n## 概要\n\n| 检查 | 结果 |\n|---|---|\n| 发现 | CRITICAL 0 · MAJOR 0 · INFO 0 |\n\n## CRITICAL（伪造链接 / 溯源断链）\n\n（无）\n");
const base = buildDelivered({ slug: "drt_demo", bundleDir: dir, corpusRoot: "ws", acceptedAt: "2026-11-24T00:00:00Z", presented: [{ path: join(dir, "final", "v1.md"), callId: "c1", version: 1 }] });
const cases = {
  "version=2": { ...base, version: 2 },
  "gate.status=FAIL": { ...base, gate: { status: "FAIL", exit: 1 } },
  "slug=other": { ...base, slug: "other" },
  "present=null": { ...base, present: null },
};
for (const [label, receipt] of Object.entries(cases)) {
  writeFileSync(join(dir, "delivered.json"), JSON.stringify(receipt, null, 2));
  const gate = receiptProblems(dir).problems;
  const ui = decodeDeliveredReceipt(receipt);
  console.log(label, "→ 门禁:", JSON.stringify(gate), "| 驾驶舱:", ui.ok ? "合法" : ui.detail);
  assert.equal(gate.length === 0 && ui.ok === false, false, `${label}: 门禁放行但驾驶舱判非法——两套判据`);
}
rmSync(root, { recursive: true, force: true });
'
```

实测四行均为「门禁 `[]` / 驾驶舱 非法」（断言红）。

## 根因（已证）

[run-receipt.mjs](../../../checks/lib/shared/run-receipt.mjs) `receiptProblems` 只做三件事：`JSON.parse`、`final.version`→文件在场+sha256、`readable`/`audit` 的 sha256；**从不校验** `version`、`slug`、`gate.status`、`acceptedAt`、`present`。而 [final-target.ts](../../../packages/deep-research-pack/src/lib/run/final-target.ts) 的 `decodeDeliveredReceipt` 校验的就是这几个字段——同一工件、两份实现、互不覆盖（正是本仓 `discipline-map` 反复点名的「第二份手抄件必腐」）。

## 牵出的失败类

- 同机制第 1 次（同一工件两套判据，各自只覆盖一半）｜处置：类修——把 `delivered.json` 的**结构判据**下沉到 pack lib（`decodeDeliveredReceipt` 为唯一正本），checks 侧 `receiptProblems` 只补「盘上在场 + 哈希」这类只能由 Node 做的事实；并给 `present` 加在场校验（与 BUG-424 同一判据）。

## 修法方向

- `receiptProblems` 先调 `decodeDeliveredReceipt`（或等价的共享校验），非法即报；
- 增加 `receipt.slug` 与 bundle 目录名一致、`present.path/version` 指向在场文件；
- 两侧共用一份用例表（驾驶舱用例 + 门禁用例同源），防再次分叉。

## 修复判据

- 复现脚本断言为绿（四类变异都被门禁判红，且与驾驶舱结论一致）；
- 合法回执仍 PASS（负控）；哈希类校验仍红（负控：`audit.sha256` 空串）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 receiptProblems 里的 decodeDeliveredReceipt 调用（回到只比哈希）→ version=2/gate=FAIL/slug 不符全放行。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/run-receipt.mjs",
    "packages/deep-research-pack/src/lib/run/final-target.ts",
    "tests/run/gates/run-receipt.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-425' tests/run/gates/run-receipt.spec.mjs",
    "exit": 1,
    "output": "version=2 必须报红（实际无问题——门禁只验哈希）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-425' tests/run/gates/run-receipt.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/run-receipt.spec.mjs"
  }
}
```
