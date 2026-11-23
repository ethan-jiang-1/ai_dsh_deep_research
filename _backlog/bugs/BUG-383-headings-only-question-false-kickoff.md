---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-383：只有标题的 question.md 仍显示「问题尚未确认」+「✓ 立项」——非空≠有问题正文

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/question-headings-plan-empty-verdict.json` + `question-headings-plan-empty.png`；
> 夹具 = `runtime/e2e/question-headings-plan-empty-e2e.mjs`。

## 症状

`question.md` 只有标题和空小节（`# Scope` / `## Notes` / `## Decisions`），没有任何问题正文。
打开「研究状态」：

```text
🎯 尚未确认——问题定稿写盘后在这里显示
报告已交付
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
```

页面同时说「问题尚未确认」和「立项 ✓」，且报告已交付；没有「问题正文为空」的失败提示。
用户会以为问题已立项，只是摘要没显示。

## 证据

seed 已交付 run 把 `question.md` 写成只有标题的空壳，真浏览器打开状态页。verdict
（`runtime/e2e/question-headings-plan-empty-verdict.json`）：

```json
{
  "face": "bound",
  "questionPending": true,
  "questionStepDone": true,
  "failureShown": false,
  "statusText": "🎯 尚未确认——问题定稿写盘后在这里显示 …… ◆立项确认 ✓ ✓ 立项 ✓ …… 报告已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/question-headings-plan-empty-e2e.mjs
```

## 根因

- `questionArt.state === 'ok'` 只要正文非空（标题也算），`face.hasQuestion = true`；
- `questionLine` 取第一个非空非标题行 → null，业务摘要显示「尚未确认」；
- 步骤条 `question: face.hasQuestion` → 立项 done；两个信号不一致。
- 空文件修复（BUG-367）只覆盖 `empty`，没有覆盖「非空但没有问题正文」。

## 修法方向（未实施）

- 问题有效判定 = 非空 **且** 至少有一条非标题问题正文（或 canonical 的 `# ` 标题/问题行）；
- 只有标题/空小节 → 独立「问题正文为空/无法定稿」态，立项不 done，摘要不显示「尚未确认」；
- 保留真正问题正文的 ✓ 立项（正向）；保留确实无 question.md 的「尚未定稿」（负控）。

## 修复判据

- question.md 只有标题/空小节 → 显示「问题正文为空」/失败；立项不 ✓；不再出现“尚未确认 + ✓立项”矛盾。
- question.md 有问题正文 → 问题行 + 立项 ✓（正向）。
- question.md 0 字节 → 「问题为空」（BUG-367，不回退）。
- question.md 缺席 → 「尚未定稿」（负控）。
- 红证：把 `hasQuestion` 改回只看 `state==='ok'` → 本夹具再次出现矛盾，exit 1；还原后绿。
- guard 落点：question 有效性的纯函数/状态矩阵，或浏览器层用例。
