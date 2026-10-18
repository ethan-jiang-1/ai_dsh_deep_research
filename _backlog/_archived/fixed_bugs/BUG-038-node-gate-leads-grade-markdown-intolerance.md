---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-038：node-gate 门L 的分级判据不容忍 markdown 强调——对已正确分级的 leads 条目假红

> 状态：**已修**（2026-10-18 端到端真 run 暴露 → 当日定位、当日修、当日归档）。

## 症状

端到端真 run（`drt_anthropic-claude-release-line-timeline`）的 `node-gate.md` 里，门L 一次性列出
**17 条**「建议挖深但支持来源缺席或无 A–D 分级（收集而不分级反模式）」，而同场的 `leads.md`
**每一条都写了分级**，形态为：

```
- 支持来源: `https://www.anthropic.com/news`（本轮 200，**A**，`primary`）
```

## 根因

门L 的判据是 `!/[(（]\s*[ABCD]\b/.test(srcM[0])`——要求分级**紧跟括号**；而模型把分级写成
「（本轮 200，**A**，`primary`）」：既不在括号后、又被**加粗**。于是"已分级"被判成"未分级"。
（同场确实有 1 条真问题：A10 缺 `- 建议 owner:` 行——研判定向没错，只是分级那一支误报。）

## 修复判据

1. 同场复跑：**假红 17 → 0**，而**真问题（缺 owner 行）仍红**（不得把门修成"什么都不报"）；
2. 新夹具 `tests/fixtures/node-gate/bundles/fixture-leads-bold-grade`：`**A**` 条目**不**报"无分级"，
   而同夹具里真无分级的 A2 条目**必须**报——一正一反同夹具钉住；
3. `pnpm test` 绿（既有门L 用例不回归）。

## 修法

`scripts/lib/node-gate-run-gates.mjs`：判据改为先剥 `**`/`__`/反引号，再认「括号/逗号/顿号 + 独立
A–D 令牌」（`A` 后不得接字母数字，防撞 URL 片段）。见
[判据放宽 Note](../../../notes/implemented/2026-10-18-node-gate-judgment-widening.md)。

## 实际跑过的验证

同场 bundle 重跑 node-gate：门L 抱怨从 17 条降为 1 条（仅剩真问题）；`pnpm test` 524/524；
`pnpm verify` 全绿。
