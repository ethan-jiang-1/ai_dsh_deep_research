---
status: 已修
severity: P0
opened: 2026-11-23
---

# BUG-385：run-context 行数上限（40/80 行）与 artifact-read truncated=unreadable 冲突，真实规模研究束与读者版必报读取失败

> 严重级别：P0 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：canonical 研究工件统一纳入 `EOF_NAME`（500 行/页 × 64 页上限）；去向：none（与 `artifact-read` `truncated=unreadable` 策略对齐）；审查：agent — 单测矩阵 + JSDOM 真渲染；修复落地记录：红证 `readPolicyOf('final/readable-v1.md') === 40 !== 'eof'` → 绿证 `run-context.spec.mjs` + `tabs-fault-matrix.spec.mjs`。

## 症状

[run-context.ts](../../../packages/deep-research-pack/src/lib/run/run-context.ts) 对多数运行工件设定 `DEFAULT_LINES = 40`、`question.md` 为 `80` 行，且 `EOF_NAME` 未包含 `final/readable.md` / `final/readable-vN.md`；而 [artifact-read.ts](../../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 将 `outcome.value.truncated === true` 一律映射为 `'unreadable'`。

用真实归档束 `research-workspace/archive/drt_api-selection-ds-openai`（`readable-v1.md` 49 行；全归档池 `leads.md` 597–1052 行、`findings.md` 126–448 行、`evidence/*.md` 609–960 行、`question.md` 125–221 行）挂载状态页签与终稿页签时：

- 「研究状态」同时报错：`⚠ 侦察线索读取失败`、`⚠ 综合材料读取失败`、`⚠ 证据读取失败`，步骤条退化为 `? 侦察 ? 挖掘 ? 综合`，证据计数报 **`证据 0 份`**；
- 「终稿」报：**`读者版读取失败——已显示审计版`**。

## 分诊与授权

- 严重级：P0 — 阻断主路径；几乎所有真实长度的研究产物在驾驶舱观察面均无法正常读取与呈现。
- 表面 / 边界：pack lib（`run-context` / `artifact-read`）+ pack client / ② 行为（JSDOM + `nodeRunSource`）。
- DSH 不变量：fail-loud — 真实长文件不得因内部保守行窗被误判为通道/权限故障。
- 触及面：pack 公共行为（`readPolicyOf` 策略表与 `tests/run/gates/run-context.spec.mjs` 契约）— `status` 待确认后按流程推进。
- 授权：排查显性化，待确认修法与是否放宽 `readPolicyOf` 为 `'eof'` / 足够大页上限。
- 批：none。

## 复现

复现状态：稳定 — 45 行合成束（或真实归档束）经 `ResearchStatusTab` / `ResearchFinalTab` 均可稳定复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { readPolicyOf } from "./packages/deep-research-pack/src/lib/run/run-context.ts";
import { artifactStateOf } from "./packages/deep-research-pack/src/lib/run/artifact-read.ts";
assert.equal(readPolicyOf("final/readable-v1.md"), 40);
assert.equal(artifactStateOf({ ok: true, value: { text: "line", truncated: true } }, { nonEmpty: true, json: false }), "unreadable");
'
```

## 根因（已证）

1. [run-context.ts](../../../packages/deep-research-pack/src/lib/run/run-context.ts)（第 94–99 行）的 `EOF_NAME = /^(?:review\.md|final\.md|final\/v[1-9]\d*\.md)$/` 漏掉 `final/readable.md` 与 `final/readable-vN.md`，同时 `DEFAULT_LINES = 40` 覆盖了 `leads.md`、`findings.md`、`evidence/*.md`，`FIXED_LINES['question.md'] = 80` 甚至小于 [question.md](../../../packages/deep-research-pack/content/templates/run/question.md) 模板自身行数（85 行）。
2. `BUG-361…368` 落地 [artifact-read.ts](../../../packages/deep-research-pack/src/lib/run/artifact-read.ts)（第 129 行）后，`truncated === true` 不再容忍截断前缀而是转为 `'unreadable'`，与上述 40/80 行边界直接冲突。
3. 既有夹具（`tests/fixtures/client-load-home` 与 `tabs-fault-matrix.spec.mjs`）文件均在 3–40 行以内，未覆盖真实长度样本。

## 牵出的失败类

- 同机制第 1 次｜处置：类修（统一审视 `run-context` 全工件读限策略与 `artifact-read` `truncated` 语义对齐，并在矩阵加入超长正文正例）。

## 修法方向

- 将 `final/readable.md`、`final/readable-vN.md`、`question.md`、`leads.md`、`findings.md`、`evidence/*.md` 纳入 `'eof'`（或按场景提供安全可分页上限与“有界预览”显式区分，不将正常长文件打成 `unreadable`）。
- 同步更新 `tests/run/gates/run-context.spec.mjs` 与 `docs/design/40-research-cockpit.md` / `run-context.ts` 头注合同，并新增 >100 行全工件矩阵回归。

## 修复判据

- 真实长度（`>100` 行）的 `question.md`、`leads.md`、`findings.md`、`evidence/*.md`、`final/readable-v1.md` 在 `ResearchStatusTab` 与 `ResearchFinalTab` 中全部正常读取与展示，零 `读取失败` 误报。
- 超出最大安全页上限（64 页）的极端文件仍保留 `truncated` -> `unreadable` 保护（负控）。
- 红证：把 `final/readable-v1.md` 或 `leads.md` 改回 40 行上限并在 45 行输入上断言 → 红；还原后全绿。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/run-context.ts",
    "docs/design/40-research-cockpit.md",
    "tests/run/gates/run-context.spec.mjs",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --input-type=module -e 'import assert from \"node:assert/strict\"; import { readPolicyOf } from \"./packages/deep-research-pack/src/lib/run/run-context.ts\"; assert.equal(readPolicyOf(\"final/readable-v1.md\"), \"eof\");'",
    "exit": 1,
    "output": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 40 !== 'eof'"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --test tests/run/gates/run-context.spec.mjs tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/run-context.spec.mjs"
  }
}
```
