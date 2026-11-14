---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-177：ci-workflow 的 GitHub 表达式归一不完备——`${{ always() }}` 假红、`${{ true }}` 的 continue-on-error 假绿

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI 执行面合同，需用户放行
>
> 位置：[scripts/lib/ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs)（`isTrue`、step `if` 判定、
> `parseJob` 的 `conditional`）；消费 = `smoke-registry` 等；前科 = BUG-172（step 跳过）。

## 症状

`executedSmokeFiles` 对条件的识别只覆盖裸值：

- step `if:` 只认空值 / `always()` / `success()`；`if: ${{ always() }}`、`if: true` 被当成「不保证执行」；
- `continue-on-error` 只认裸 `true`；`continue-on-error: ${{ true }}` 被当成 false；
- job `if:` 只对 `false/!true/0` 判禁用，其它任何 `if`（包括 `always()`）都标 `conditional` 并整体跳过。

## 复现（2026-11-14 实测）

```sh
node --import tsx/esm -e '
import { executedSmokeFiles } from "./scripts/lib/ci-workflow.mjs";
const wf = (ifExpr, coe = "") => "on:\n  workflow_dispatch:\njobs:\n  smoke:\n    runs-on: ubuntu-latest\n    steps:\n      - name: s\n        if: " + ifExpr + "\n" + (coe ? "        continue-on-error: " + coe + "\n" : "") + "        run: node scripts/smoke/foo.e2e.mjs\n  all-checks-passed:\n    needs: [smoke]\n";
for (const [label, text] of [
  ["step if always()", wf("always()")],
  ["step if \${{ always() }}", wf("\${{ always() }}")],
  ["step if true", wf("true")],
  ["step continue-on-error: true", wf("", "true")],
  ["step continue-on-error: \${{ true }}", wf("", "\${{ true }}")],
]) console.log(label, "=>", [...executedSmokeFiles(text)]);
'
```

实测：

```text
step if always() => [ 'foo.e2e.mjs' ]
step if ${{ always() }} => []
step if true => []
step continue-on-error: true => []
step continue-on-error: ${{ true }} => [ 'foo.e2e.mjs' ]   ← 假绿
```

job 级 `if: always()` 同样返回 `[]`（假红）。

## 根因（已证）

`isTrue` 只比较裸字符串 `true`；step 条件只白名单 `always()`/`success()` 两个裸写法；`parseJob` 把
任何非 false 的 `if` 都当 `conditional=true`。GitHub 表达式常写成 `${{ … }}`，`always()`/`true`
在语义上就是必然执行；`continue-on-error: ${{ true }}` 在语义上就是跳过/不保证成功。判据把
「表达式外壳」当成了不同语义。

## 影响面

- `smoke-registry` 会把一个实际会跑的 step 判成不执行（假红，registry 无法登记合法 CI 资产）；
- 也会把 `continue-on-error: ${{ true }}` 的失败步骤算成执行证据（假绿）——与 BUG-172 的
  「跳过仍算执行」同族，只是这次走表达式写法。
- 当前 ci.yml 没有这些表达式形态，属门禁钝化（P2）；但 `${{ always() }}` 是 GitHub 的常规写法。

## 牵出的失败类

- **C7 假绿 / C8 假红**（同一表达式面）+ **C4 边界/解析**。
- 同机制第 **2** 次（172 step 跳过 → 本条表达式归一）。类修：所有布尔/条件表达式先剥
  `${{ }}` 再按语义闭集判定；job 与 step 共用同一 `conditionVerdict`。

## 修复判据

- `normalizeExpression(value)`：去引号 + 去 `${{ }}` + trim；`isTrue` 认 `true`；step `if` 在
  `always()`/`success()`/`true` 时必然执行；`continue-on-error` 认 `true` 与 `${{ true }}`；
  job `if` 在 `always()`/`success()`/`true` 时不标 conditional。
- 矩阵：`always()` / `${{ always() }}` / `true` / `${{ true }}` / `success()` /
  `continue-on-error: ${{ true }}`；负例 `false`/`failure()`/`${{ false }}`。
- 反证：上表 3 个假红/假绿先红后绿；`tests/checks/ci-workflow.test.mjs` 增加这些形态。

## 修复关联

未修。触面 = CI/验收合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；可与 BUG-172 的
执行面同批。
