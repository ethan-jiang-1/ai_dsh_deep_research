---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-361：question.md 读不到时状态页说「问题尚未定稿」——读失败被折成空

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/status-question-verdict.json` + `status-question.png`；
> 夹具 = `runtime/e2e/status-fixture-e2e.mjs question`。

## 症状

bundle 的 `question.md` 在场但读不到（权限/IO/工作区失败）。打开「研究状态」：

```text
🎯 尚未确认——问题定稿写盘后在这里显示
报告已交付
...
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
证据 10 份 ✅ 已交付 读终稿 →
```

页面把「question.md 读失败」说成「问题还没定稿」，同时立项步骤仍是 ✓、报告已交付。
用户会以为研究问题尚未落盘，而它其实在盘上只是读不到。

## 证据

seed 已交付 run 的 `question.md` 设为不可读，真浏览器打开状态页。verdict
（`runtime/e2e/status-question-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "delivered": true,
  "text": "🎯 尚未确认——问题定稿写盘后在这里显示 报告已交付 …… ◆立项确认 ✓ …… ✅ 已交付 读终稿 →"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-fixture-e2e.mjs question
```

## 根因

`useStatusFeed` 的 question 读取：

```ts
const questionRead = view.hasFile('question.md') ? await view.read('question.md', { signal }) : null
const questionText = questionRead !== null && questionRead.ok ? questionRead.value.text : null
```

- `read.ok === false` 与「文件缺席」都落 `questionText=null`；
- `face.hasQuestion` 仍由 `hasFile` 为 true，步骤条立项 ✓；
- 业务摘要的 `goal` 走 journal 锚点，于是显示「问题定稿写盘后」。
- 没有 `read` 失败的独立状态/重试；`questionRead.value.truncated` 也未区分。

## 修法方向（未实施）

- question 读取三态：`ok` / `missing` / `error`（含 truncated）；`error` 显示「研究问题读取失败」+重试，
  不显示「尚未定稿」。
- 立项步骤不要只用 `hasFile` 判 done；question 读取失败时给待定/失败，不冒充 ✓。
- 保留「question.md 确实缺席 = 尚未定稿」的既有语义（负控）。

## 修复判据

- question.md 在场但不可读 → 显示「研究问题读取失败」+重试；不出现「问题定稿写盘后」。
- question.md 确实缺席 → 仍显示「尚未定稿」（负控）。
- question.md 读到非空 → 问题行照常（正向不回退）。
- 红证：把 `read.ok === false` 分支改回 `questionText=null` → 本夹具再次出现「尚未定稿」，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 question 三态矩阵或浏览器层用例（本 seed 夹具可升格）。
