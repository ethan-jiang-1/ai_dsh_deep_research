---
status: 修复就绪
severity: P2
opened: 2026-11-22
---

# BUG-367：0 字节 question.md 让状态页说「问题尚未定稿」但步骤 ✓ 立项

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复就绪 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权。
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

## 分诊与授权

- 严重级：P2 — 0 字节 question.md 被说成「尚未定稿」，同时立项步 ✓，摘要与步骤自相矛盾。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 空问题文件是「为空」，不是「尚未定稿」；立项步只认有效正文。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

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

根因证据：2026-11-22 复跑 `runtime/e2e/status-question-empty-e2e.mjs question` → `failureShown:false`，text 命中「尚未定稿」+「✓ 立项」；空 text 使 `questionLine=null`，`face.hasQuestion` 仍由 `hasFile` 为 true。

## 牵出的失败类

- 同族第 2 次（361 读失败；367 空内容）｜处置：类修 — `empty` 态 + 立项步只认 ok。
- 探针价值：所有「空文件折 absent/未定稿」的观察面。

## 修法

落层：`artifact-read` question empty + `useStatusFeed`/`brief-fold`/`run-fold`；P3a 实施。

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

## 修复关联

P3a 落地；守卫 = `tests/cockpit/lib/run/artifact-read.spec.mjs` question empty + `brief-fold.spec` + `run-fold.spec` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S13；去向 = implemented — 批 Note。
