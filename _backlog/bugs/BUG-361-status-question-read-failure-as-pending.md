---
status: 修复落地
severity: P2
opened: 2026-11-22
---

# BUG-361：question.md 读不到时状态页说「问题尚未定稿」——读失败被折成空

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复落地 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S6 显示研究问题读取失败）→ 绿证 exit 0（31/31）。
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

## 分诊与授权

- 严重级：P2 — 观察面把 question 读失败说成「尚未定稿」；用户会以为问题没落盘，实际在现场只是读不到。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 文件在场但读不到必须有独立失败态 + 重试，不得折成「尚未定稿」。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

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

根因证据：2026-11-22 复跑 `runtime/e2e/status-fixture-e2e.mjs question` → `failureShown:false`，text 命中「尚未定稿」；`questionRead.ok=false` 落 `questionText=null`，`face.hasQuestion` 仍由 `hasFile` 为 true。

## 牵出的失败类

- 同机制第 5 次（045/355/358/359/360 的「读失败折良性态」）｜处置：类修 — `artifact-read` 五态 + G19 读取点收口。
- 探针价值：所有「文件在场但读不到」的观察面。

## 修法

落层：`artifact-read` + `useStatusFeed` question 状态 + `brief-fold`/`run-fold` 步骤；P3a 实施。

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

## 修复关联

P3a 落地；守卫 = `tests/cockpit/lib/run/artifact-read.spec.mjs` question 矩阵 + `brief-fold.spec` + `run-fold.spec` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S6；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/lib/run/run-fold.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/run/artifact-read.spec.mjs",
    "tests/cockpit/lib/run/brief-fold.spec.mjs",
    "tests/run/shared/run-fold.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-artifact-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S6 显示研究问题读取失败 — 修复前九场景入口 15/31；还原/修复后 31/31"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-artifact-truth.entry.mjs"
  }
}
```
