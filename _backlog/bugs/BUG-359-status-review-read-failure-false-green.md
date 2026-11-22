---
status: 修复落地
severity: P2
opened: 2026-11-22
---

# BUG-359：review.md 读不到时状态页仍显示「✓ 审查」——读失败被折成 absent

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复落地 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S4 仍 ✓ 审查）→ 绿证 exit 0（24/24）。
> 现场 = `runtime/e2e/review-read-error-verdict.json` + `review-read-error.png`；
> 夹具 = `runtime/e2e/review-read-error-e2e.mjs`。

## 症状

bundle 的 `review.md` 在场但读不到（权限/IO/工作区失败）。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
证据 10 份 ✅ 已交付 读终稿 → v1 已交付
```

页面把审查步骤标成绿勾、报告标成已交付，**没有任何「审查读取失败」**。用户会以为
审查文件读过了、结论没问题；实际上 review.md 完全没读到。

## 分诊与授权

- 严重级：P2 — 观察面给出假绿；用户会以为审查文件读过了、结论没问题，实际完全没读到。
- 表面 / 边界：pack client（`useStatusFeed.ts` + `lib/run/run-fold.ts` + `brief-fold.ts`）/ 浏览器。
- DSH 不变量：fail-loud — 读失败 ≠ 文件缺席；审查读取失败必须有独立失败态，不得给 ✓ 或冒充 absent。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`status-truth-356-360` — 同批卡：356/357/358/360；批计划：[观察面真实性修复程序](../issues/2026-11-22-observation-truthfulness-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。
边界：浏览器（真驾驶舱状态页）— 已交付 seed 的 `review.md` 设为不可读。

seed 已交付 run（`drt_unsc-p5-members`）的 `review.md` 设为不可读：

```sh
ls -l runtime/e2e/seed-review-read-error/root/research-workspace/drt_unsc-p5-members/review.md
# ---------- ... review.md
```

真浏览器打开状态页。verdict（`runtime/e2e/review-read-error-verdict.json`）：

```json
{
  "face": "bound",
  "reviewFailShown": false,
  "paneText": "…… ◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 …… 证据 10 份 ✅ 已交付 读终稿 → v1 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/review-read-error-e2e.mjs
```

## 根因

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`：

```ts
const reviewRead = view.hasFile('review.md') ? await view.read('review.md', { signal }) : null
const reviewText = reviewRead !== null && reviewRead.ok && !reviewRead.value.truncated
  ? reviewRead.value.text : null
...
const reading = readinessOfSources({ reviewText, declarationText, hasReviewDir: names.has('review') })
```

- `hasFile('review.md')` 为 true，但 `read` 失败 → `reviewText=null`；
- `hasReviewDir` 为 false（本 bundle 只有 review.md，无 review/）→ `readinessOfSources`
  返回 `source:'absent', pass:null`；
- 步骤条又用 `view.hasFile('review.md')` 独立判在场 → `review=true`，于是「✓ 审查」。
- 读失败、文件缺席、无终局判定三种状态被折成同一条路径；`reviewRead.ok === false`
  没有进入任何失败态。

根因证据：2026-11-22 复跑 `runtime/e2e/review-read-error-e2e.mjs` → `reviewFailShown:false`，
`paneText` 命中「✓ 审查」而 `review.md` 为 `chmod 000`；`read.ok === false` 落 `reviewText=null`，
步骤条又用 `hasFile` 独立判 true。

## 牵出的失败类

- 同机制第 4 次（045 图谱绑定、355 图谱 plan、358 bundle 读失败、本卡 review 读失败）｜处置：类修 —
  状态页 `StatusFacts` 三态 + 步骤 unknown + G12/G13；同类下一处（evidence）由 360 收口。
- 探针价值：所有「在场性用 hasFile、内容用 read」分离判定的观察面。

## 修法（P2a 实施）

- 扫描区分 `review.md` 的「缺席」/「读失败」/「读到但无终局判定」；`read.ok === false`
  或 catch 置 `review: unreadable`，不要落 `absent`。
- 业务摘要：`reviewReadError` 显示「审查文件读取失败」+ 重试，不显示「审查通过」/「审查未过」。
- 步骤条：`review` 在场性不能只靠 `hasFile`；读失败时标 `unknown`（`?`），不给 ✓。
- 保留 BUG-347 的 absent 语义：文件确实没有 → absent，不冒充 FAIL。

## 修复判据

- review.md 在场但不可读 → 状态页显示「审查读取失败」+ 重试；不出现 ✓ 审查、不显示「审查通过」。
- review.md 确实缺席 → 仍按 BUG-347 absent（不显示 FAIL）；负控不回退。
- review.md 读到 FAIL → 仍出现「对抗审查发现问题」（负控）。
- review.md 读到 PASS → 审查步骤 done，正文照常。
- 红证：把 `read.ok === false` 分支改回 `reviewText=null`/absent → 本夹具再次出现 ✓ 审查，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 review 三态矩阵，或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2a 落地；守卫 = `tests/run/shared/run-fold.spec.mjs` unknown 步 +
`tests/cockpit/lib/events/status-feed.spec.mjs` review 三态接线 +
`checks/smoke/cockpit-truth.entry.mjs` S4；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/lib/run/run-fold.ts",
    "packages/deep-research-pack/src/client/research-status/TrackRail.tsx",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/run/shared/run-fold.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S4 显示审查读取失败；FAIL S4 不给「✓ 审查」— 旧实现 read.ok=false 落 absent，步骤条仍用 hasFile 判 ✓"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-truth.entry.mjs"
  }
}
```
