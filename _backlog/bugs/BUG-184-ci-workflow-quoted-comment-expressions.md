---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-184：ci-workflow 先剥 `${{ }}` 再去引号/注释——quoted/带注释的表达式仍假红假绿

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI 执行面合同，需用户放行
>
> 位置：[scripts/lib/ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs) 的
> `normalizeExpression`；前科 = BUG-177（裸表达式归一）。

## 症状

`normalizeExpression` 的顺序是「先 replace `${{ }}`，再 unquote」，且不剥 YAML 行尾注释：

```js
const normalizeExpression = (expr) => unquote(String(expr ?? '').replace(/^\$\{\{\s*|\s*\}\}$/g, '')).toLowerCase()
```

于是合法写法 `if: "${{ always() }}"`、`if: always() # comment`、
`continue-on-error: "${{ true }}"`、`continue-on-error: true # comment` 都不被识别。

## 复现（2026-11-14 实测）

```sh
node --import tsx/esm -e '
import { executedSmokeFiles } from "./scripts/lib/ci-workflow.mjs";
const wf = (stepIf, coe = "") => `on:\n  workflow_dispatch:\njobs:\n  smoke:\n    runs-on: ubuntu-latest\n    steps:\n      - name: s\n        if: ${stepIf}\n${coe ? `        continue-on-error: ${coe}\n` : ""}        run: node scripts/smoke/foo.e2e.mjs\n  all-checks-passed:\n    needs: [smoke]\n`;
for (const [label, text] of [
  ["quoted always", wf(`"\${{ always() }}"`)],
  ["comment always", wf("always() # comment")],
  ["quoted continue-on-error", wf("", `"\${{ true }}"`)],
  ["comment continue-on-error", wf("", "true # comment")],
]) console.log(label, "=>", [...executedSmokeFiles(text)]);
'
```

实测：`quoted always`/`comment always` → `[]`（假红）；`quoted continue-on-error`/`comment true`
→ `['foo.e2e.mjs']`（假绿）。

## 根因（已证）

表达式归一顺序错误：引号与 YAML 注释把 `${{ … }}` 包住/缀住，`^\$\{\{` / `\s*\}\}$` 不匹配；
`unquote` 之后没有再次剥壳，`# comment` 也没有剥离。`isAlways`/`isTrue` 都以这个值为准。

## 影响面

- 合法 YAML 的 quoted `if`/`continue-on-error` 被当成不可执行 → `smoke-registry` 假红；
- quoted/注释的 `continue-on-error: true` 被当成 false → 失败步骤仍算执行证据（假绿）。
- 与 BUG-177 同族：表达式「外层」没有统一归一。

## 牵出的失败类

- **C7/C8**（假绿/假红）+ **C4 解析边界**。
- 同机制第 **2** 次（177 裸 `${{ }}` → 本条 quoted/comment）。类修：`normalizeExpression` 先剥
  YAML 行尾注释（引号外）、trim、unquote，再剥 `${{ }}`；所有 if/continue-on-error 共用。

## 修复判据

- `expressionValue(raw)`：外层引号、`${{ }}`、YAML 行尾注释（引号外）任意组合都能归一；
- 矩阵：`"${{ always() }}"`、`always() # c`、`"${{ true }}"`、`true # c` 均应识别；
  `"${{ false }}"` / `false` 仍跳过；`continue-on-error: false # c` 仍执行；
- 反证：上表先红后绿；`tests/checks/ci-workflow.test.mjs` 增形态。

## 修复关联

未修。触面 = CI/验收合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
