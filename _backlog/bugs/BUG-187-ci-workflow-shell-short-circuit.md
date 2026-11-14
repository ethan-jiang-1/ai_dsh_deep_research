---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-187：ci-workflow 按 `&&`/`||` 切段后逐段认 node——短路的 node 段仍算执行

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI 执行面合同，需用户放行
>
> 位置：[scripts/lib/ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs) 的
> `splitCommands` / `smokeFilesOfSegment`；前科 = BUG-172/177（执行面/表达式）。

## 症状

`splitCommands` 把一行按 `&&`/`||`/`;`/`|` 切成独立段，`smokeFilesOfSegment` 对每段独立看
「首词是否 node」。它不建模 shell 短路：

- `false && node scripts/smoke/foo.e2e.mjs` —— node 不会执行；
- `true || node scripts/smoke/foo.e2e.mjs` —— node 不会执行；
- `node scripts/smoke/foo.e2e.mjs || true` —— node 执行但失败被吞，job 仍绿；
- `node scripts/smoke/foo.e2e.mjs &` —— 后台执行，job 可能先结束。

四种形态 `executedSmokeFiles` 都返回 `['foo.e2e.mjs']`。

## 复现（2026-11-14 实测）

```sh
node --import tsx/esm -e '
import { executedSmokeFiles } from "./scripts/lib/ci-workflow.mjs";
const wf = (run) => `on:\n  workflow_dispatch:\njobs:\n  smoke:\n    runs-on: ubuntu-latest\n    steps:\n      - name: s\n        run: ${run}\n  all-checks-passed:\n    needs: [smoke]\n`;
for (const run of ["false && node scripts/smoke/foo.e2e.mjs", "true || node scripts/smoke/foo.e2e.mjs", "node scripts/smoke/foo.e2e.mjs || true", "node scripts/smoke/foo.e2e.mjs &"]) console.log(run, "=>", [...executedSmokeFiles(wf(run))]);
'
```

## 根因（已证）

判据把「段里出现 node」等于「node 会执行」，但 shell 控制符改变了执行条件：`&&` 要求前段成功、
`||` 要求前段失败、`|| true` 吞掉失败、`&` 不等完成。切段后丢失了运算符与后置语义。

## 影响面

- 一个 smoke 可以被 `false &&` 静默禁用、被 `|| true` 静默吞失败、被 `&` 提前结束，registry 仍算
  ci 执行证据；与 BUG-172 的 `if: false` 同族（shell 层的跳过/吞错）。
- 正向：正常 `node ... && echo done` 仍执行，不能误杀；只对「node 段被短路/后台/吞错」判红。

## 牵出的失败类

- **C7 假绿**（执行证据不等于成功/完成）+ **C4 shell 语法边界**。
- 同机制第 **3** 次（172 step 跳过、177 表达式、本条 shell 短路）。类修：把 shell 段解析成
  `{command, conjunct}` 序列，只有「无前置失败条件、node 是最后/成功链上的命令」才算；
  `|| true`/`&` 显式红。

## 修复判据

- `false && node`、`true || node`、`node ... || true`、`node ... &` → 不计（或红）；
- `node ... && echo ok`、`echo start && node ...` → 计；
- `set -e` 下的 `node ...` / 普通单命令 → 计；
- 反证：上表先红后绿；`tests/checks/ci-workflow.test.mjs` 增 shell 运算符矩阵。

## 修复关联

未修。触面 = CI/验收合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
