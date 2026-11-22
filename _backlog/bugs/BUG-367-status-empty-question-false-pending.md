---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-367：0 字节 question.md 让状态页说「问题尚未定稿」但步骤 ✓ 立项

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/status-question-empty-verdict.json` + `status-question-empty.png`；
> 夹具 = `runtime/e2e/status-question-empty-e2e.mjs question`。

## 症状

bundle 的 `question.md` 存在但是 0 字节（写坏/截断）。打开「研究状态」：

```text
🎯 尚未确认——问题定稿写盘后在这里显示
报告已交付
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
证据 10 份 ✅ 已交付 读终稿 →
```

页面把空 question.md 说成「问题还没定稿」，同时立项步骤仍是 ✓、报告已交付。用户会以为
研究问题没有落盘，而文件其实在场（只是空的）。

## 证据

seed 已交付 run，把 `question.md` 写成空文件，真浏览器打开状态页。verdict
（`runtime/e2e/status-question-empty-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "delivered": true,
  "text": "🎯 尚未确认——问题定稿写盘后在这里显示 …… ◆立项确认 ✓ …… ✅ 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-question-empty-e2e.mjs question
```

## 根因

- `questionText = questionRead.ok ? text : null`；空文件 `ok=true`、`text=''`；
- `questionLine` 取第一个非空非标题行 → null；
- `face.hasQuestion = view.hasFile('question.md')` → true，步骤条立项 ✓；
- 业务摘要看到 questionLine null，显示「尚未定稿」。
- 没有“文件在场但正文为空”的独立状态；空与缺席同形，且步骤条与摘要互相矛盾。

## 修法方向（未实施）

- question 有效判定 = `ok && trim(text) !== ''`；空/纯空白 → 独立「研究问题为空/读不到」态，
  显示重试/提示，不显示“尚未定稿”。
- 立项步骤 done 的输入改为“有效问题正文在场”，不是 `hasFile`。
- 保留 question.md 确实缺席 = 尚未定稿（负控）；保留非空问题行正常显示。

## 修复判据

- question.md 为 0 字节/纯空白 → 不显示 ✓ 立项；显示「研究问题为空/读取失败」等可行动态。
- question.md 确实缺席 → 仍“尚未定稿”（负控）。
- question.md 非空 → 问题行 + ✓ 立项（正向不回退）。
- 红证：把空正文改回 `ok` 即有内容 → 本夹具再次出现“尚未定稿 + ✓ 立项”，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 question 状态矩阵（ok/empty/missing/unreadable）或浏览器层用例。
