---
status: 已修
severity: P1
opened: 2026-11-10
---

# BUG-046：手册的 `## readiness（终局）` 形态门禁读不出，终局 PASS 被读成未判定

> 严重级别：P1｜发现：2026-11-10｜状态：已修 — 解析器增判定词后短括号段，18/18 + 1107/1107 绿（去向：implemented — 更新既有 readiness 规则 Note；审查：agent + 用户 2026-11-10 拍板修 parser）
>
> 授权：用户 2026-11-10 拍板「先修解析器」（不改手册口径、不重录 snapshot）。
> 去向：implemented — 并入既有 [终局 readiness 规则 Note](../../../notes/implemented/2026-10-11-review-readiness-terminal-rule.md)（不新建 Note）。
> 关联：claim-verdict 卡 P4 前的交付风险（[卡](../../issues/2026-11-10-claim-verdict-quality-loop.md) 的「顺带发现」）。

## 症状

[研究手册](../../../packages/deep-research-pack/content/manual.md) 对 critic 的固定指令是
`review.md` 末尾写 `## readiness（终局）: PASS|FAIL`。但门禁的终局判定读不出这个括号形态：

```text
readinessOf('## readiness（终局）: PASS') → { pass: false, conditional: false }
readinessOf('## readiness: PASS')         → { pass: true,  conditional: false }
```

真实交付之所以还能过门，是因为 review.md 别处另有一条裸 `readiness: PASS`；只按手册写一场，
node-gate 会把它读成「未判定」，交付门红。`verdict-audit` 对此打 `readiness-unparsed` 黄警，
不静默采信——但警告不解除交付阻塞。

## 复现

```sh
node --import tsx/esm -e "import('./scripts/lib/node-gate-contracts.mjs').then(m=>console.log(m.readinessOf('## readiness（终局）: PASS\n')))"
# 修复前：{ pass: false, conditional: false }
```

单测红先（修复前）：`tests/run/review-readiness.test.mjs` 新增的两条 BUG-046 用例
`null !== 'PASS'` 失败；修复后 18/18 绿。

## 根因（已确认）

`terminalVerdictLine` 的 `VERDICT_LINE` 只认 `readiness` 后**直接**冒号；括号标签写在判定词
**之后**（`readiness（终局）:`），既不在「行首装饰」的处理路径里（`stripVerdictDecor` 剥不了
判定词后的部分），也不在值后后缀的容忍里。`EMPTY_TEMPLATE` 同一形态，故空模板 `PASS | FAIL`
也会被误读成 PASS 判定。

## 牵出的失败类

**模型可见契约 ↔ 机械解析器的漂移**：手册写了一种真实模型会照抄的形态，解析器只认另一种；
两边各自测试都绿，合起来才漏。与 BUG-040（两版实现漂移）同类，但这次是「文本契约 vs 解析器」。
后续新判定形态：先看手册是否已写、再决定解析器容忍还是改手册（改手册的代价 = 四个角色
runtime context 变 + snapshot 全量重录）。

## 修复判据

1. `## readiness（终局）: PASS`、`readiness（终局）：FAIL`、`## readiness(最终): **PASS**` 都读出；
   末位为准不变；`readinessOf` 与 `terminalReadiness` 同判。
2. 不夺权负例仍成立：括号形态的空模板 `PASS | FAIL` → `null`；行内提及、>8 字长标签 → 不认。
3. 不动手册与 snapshot；pack 解析器 + 门禁委托 + 两条 BUG-046 用例同 diff；
   Note 兼容集补一行。
4. `pnpm verify` + `pnpm test` 全绿；红先（修复前两用例红）留证。

## 修复关联

- 解析器：`packages/deep-research-pack/src/lib/review-readiness.ts` 的 `VERDICT_LINE` /
  `EMPTY_TEMPLATE` 增可选短括号段（≤8 字、不含 `|`/换行）；门禁 `readinessOf` 直接委托，无第二份实现。
- 测试：`tests/run/review-readiness.test.mjs`（两条 BUG-046 用例 + 跨实现一致表加三形态）。
- Note：[终局 readiness 规则](../../../notes/implemented/2026-10-11-review-readiness-terminal-rule.md)
  兼容集与「输掉的方案」补记。
- 提交：与本卡归档同变更（见 `git log`）。

## 实际跑过的验证

- **红先**：先写两条 BUG-046 用例 → 修复前 `tests/run/review-readiness.test.mjs` **2 红**
  （`null !== 'PASS'`）；同刻 `readinessOf('## readiness（终局）: PASS')` = `{ pass: false }`。
- **后绿**：`VERDICT_LINE`/`EMPTY_TEMPLATE` 增短括号段 → 该文件 **18/18 绿**；跨实现一致表三形态同判。
- **红配方**：删掉括号段 → 两条用例回到 2 红（修复前实测）。
- **全量**：`pnpm test` **1107/1107**；`pnpm verify` 全绿；`run-accept-smoke` ALL PASS。
- 未动手册、snapshot、模型可见文本；`pnpm typecheck` 绿。
