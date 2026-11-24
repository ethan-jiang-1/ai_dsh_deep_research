---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-428：`topics.md` 的 `lenses` 有三套读法——换一个 bullet 字符就静默丢掉全部 lens 义务

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：lenses 行文法单一正本 lensDeclarationOf（bullet/大小写/严格括号），lensScanOf 与其同源；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

同一份 `topics.md`，三个模块对「这个 topic 声明了哪些 lens」给出不同答案：

| `lenses` 写法 | `lensScanOf`（protocol-audit / strategy） | `parseTopicsReport`（findings 差集 / coverage 表要求） | 结果 |
|---|---|---|---|
| `- lenses: official` | `['official']` | `['official']` | 一致 |
| **`* lenses: official`**（星号 bullet） | `['official']` | **`[]`** | 分叉 |
| **`- LENSES: official`**（大写键） | `['official']` | **`[]`** | 分叉 |
| **`- lenses: [official`**（括号不成对） | **`[]`**（判不可解） | **`['official']`**（静默接受） | 分叉 |

后果（以星号形态为例）：`protocol-audit`/`strategy` 认为「本 run 有 official lens」（于是 lens 相关判据按"有 lens"走），而 `findingsContractIssues` 的 `lens_gaps` 差集与 `review-contract.coverageIssues` 的「有 lens 的 run 缺 topic × lens 覆盖表」都认为**没有 lens**——两条 lens 纪律**同时静默失效**。换一个 CommonMark 等价的列表符即可绕过整组 lens 义务。

反向的畸形形态更糟：`[official`（坏了）在 `lensScanOf` 里被正确判「不可解」，却在 `parseTopicsReport` 里被 `listOf` 宽松剥括号后**静默当成合法 `official`**——畸形声明被一条路径掩盖。

## 分诊与授权

- 严重级：P2 — lens 面 fail-open（义务可被书写变体关掉）+ 畸形声明被静默接受；不破坏数据。
- 表面 / 边界：run 门禁三套解析（[protocol-core.mjs](../../../checks/lib/gates/protocol-core.mjs) `lensScanOf` × [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseTopicsReport`/`listOf` × [run-dashboard-core.mjs](../../../checks/lib/analyze/run-dashboard-core.mjs) `parseTopics`）/ ① 代码（同语义多实现）。
- DSH 不变量：**同一条语义只有一份实现**（本仓 discipline-map「禁第二份手抄件」）；`[-*+]` bullet 与大小写键属于 Markdown 等价书写（`library-fold` 与 `lensScanOf` 都已按等价接受）。
- 触及面：none — checks 解析器 + 单测。
- 授权：排查显式化，待分诊推进。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 四种写法同时打印三套读法。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { lensScanOf } from "./checks/lib/gates/protocol-core.mjs";
import { parseTopicsReport } from "./checks/lib/gates/findings-core.mjs";
for (const lensLine of ["- lenses: official", "* lenses: official", "- LENSES: official", "- lenses: [official"]) {
  const topics = `## T1: t\n\n- must_answer:\n  - a\n  - b\n- scope_role: primary\n${lensLine}\n`;
  const scan = lensScanOf(topics).ids;
  const parsed = [...parseTopicsReport(topics).topics.values()].flatMap((t) => t.lenses);
  console.log(JSON.stringify(lensLine), "→ lensScanOf=", JSON.stringify(scan), "parseTopicsReport=", JSON.stringify(parsed));
  assert.deepEqual(parsed, scan);
}
'
```

实测：
`"- lenses: official" → ["official"] / ["official"]`（一致）
`"* lenses: official" → ["official"] / []`（断言红）
`"- LENSES: official" → ["official"] / []`（断言红）
`"- lenses: [official" → [] / ["official"]`（断言红）

## 根因（已证）

1. [protocol-core.mjs](../../../checks/lib/gates/protocol-core.mjs) `lensScanOf`：`/^\s*[-*+]\s+lenses\s*[:：]\s*(.*)$/i` —— 接受 `[-*+]` 与大小写，括号不成对判 unparsable；
2. [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseTopicsReport`：`/^\s*-\s*lenses\s*[:：]\s*(.*)$/m` —— 只认 `-`、只认小写；值交给 `listOf`（`replace(/^\[|\]$/g,'')`）**单侧剥括号**，`[official` 剥后成 `official`（畸形被接受）；
3. [run-dashboard-core.mjs](../../../checks/lib/analyze/run-dashboard-core.mjs) 另有第三份 `parseTopics`（本次实测其 `lenses` 字段恒为空，不参与判断）。
   —— 同一字段三处实现，接受面各不相同。

## 牵出的失败类

- 同机制第 1 次（同语义多实现，接受面不同 → 义务可被书写变体关掉）｜处置：类修——`lenses` 解析收敛到 `lensScanOf`（它已是 protocol 面正本），`parseTopicsReport` 调它取 lens 列表；`listOf` 的括号处理改为「成对才剥、不成对报错」。

## 修法方向

- `parseTopicsReport` 的 lens 字段改为 `lensScanOf(line)` 或共享同一正则常量；
- `listOf` 对 `[` / `]` 不成对的值返回「不可解析」而不是宽松剥；
- 回归：`-` / `*` / `+` / 大写键 / 成对括号 / 不成对括号 六形态 × 两模块**同判**。

## 修复判据

- 复现脚本断言为绿（四形态两模块逐一致）；
- 不成对括号在两个模块都产生「不可解」而不是静默接受（负控方向改变时同 diff 更新测试）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 parseTopicsReport 的 lens 行解析改回 `- lenses:` 字面 + listOf → 等价 bullet/大小写静默丢 lens、坏括号被接受。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "checks/lib/gates/protocol-core.mjs",
    "tests/run/gates/topics-parsing.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-428' tests/run/gates/topics-parsing.spec.mjs",
    "exit": 1,
    "output": "等价书写下 parseTopicsReport 的 lenses expected ['official'] / actual []"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-428' tests/run/gates/topics-parsing.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/topics-parsing.spec.mjs"
  }
}
```
