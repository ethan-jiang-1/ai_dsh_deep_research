---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-186：fix-evidence 的 fail/pass 判据是裸子串——「未失败」/「exit 1」都能当红绿证

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及修复卡实证合同，需用户放行
>
> 位置：[scripts/lib/fix-evidence.mjs](../../scripts/lib/fix-evidence.mjs) 的
> `fixEvidenceProblems`；消费 = `staged-change-pairing` ③ 与 backlog-liveness 的真实假修防线。

## 症状

`红证` 只要匹配 `FAIL|RED|not ok|AssertionError|exit\s*[1-9]|失败`，`绿证` 只要匹配
`PASS|ok\b|exit\s*0|全绿|通过`；没有否定词判定，也不要求命令实际运行测试。下面两张卡都
`fixEvidenceProblems` 返回 `[]`（被当成可复核修复）：

```sh
node --import tsx/esm -e '
import { fixEvidenceProblems } from "./scripts/lib/fix-evidence.mjs";
const negation = "## 修复落地\n\n- 改动：`tests/checks/foo.test.mjs`\n- 红证：`node --test tests/checks/foo.test.mjs` 未失败（实际上没有失败）\n- 绿证：`pnpm test` 未通过（实际上没有通过）\n";
const exit = "## 修复落地\n\n- 改动：`tests/checks/foo.test.mjs`\n- 红证：`exit 1`\n- 绿证：`exit 0`\n";
console.log(JSON.stringify(fixEvidenceProblems(negation))); // []
console.log(JSON.stringify(fixEvidenceProblems(exit)));     // []
'
```

## 根因（已证）

判据是**子串**而不是「实跑结果」：

- `未失败` 含 `失败`，`未通过` 含 `通过`；
- `exit 1` / `exit 0` 是标记而不是测试命令；`改动` 里有测试路径就满足 replayable 的替代条件；
- `labeledBlockOf` 不区分「命令」与「描述」。

## 影响面

- 2026-11-14 的「只翻状态/移卡 = 假修」防线可被一张写「未失败/未通过」的卡绕过；
  `staged-change-pairing` ③ 只再看一个 staged 路径，整个门禁仍绿。
- 这不是要证明测试一定真跑（不可能），而是判据至少不能把**否定句**和**裸 exit** 当红绿证。

## 牵出的失败类

- **C7 假绿**（文本 marker 冒充实跑）+ **C11 合同/判据漂移**。
- 同机制第 **1** 次（fix-evidence 是 2026-11-14 新件）；类修：marker 判定必须拒绝否定前缀，
  红/绿的 replayable 信号必须是测试/门禁命令，`exit N` 不单独算。

## 修复判据

- `红证`/`绿证` 的 body 中，marker 前不得紧邻 `未|不|没有|非|无` 等否定词；
- `exit 1`/`exit 0` 只有在同一行还包含 `node --test`/`pnpm test`/`gates.e2e` 时才可作为结果片段；
- 反证：上面两例从 `[]` 变红；真实卡（`FAIL`/`PASS` 实际输出）仍绿；
  `tests/checks/fix-evidence.test.mjs` 增否定/裸 exit 负例。

## 修复关联

未修。触面 = 修复卡实证合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
