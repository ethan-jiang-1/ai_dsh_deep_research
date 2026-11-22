---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-359：review.md 读不到时状态页仍显示「✓ 审查」——读失败被折成 absent

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
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

## 证据

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

## 修法方向（未实施）

- 扫描区分 `review.md` 的「缺席」/「读失败」/「读到但无终局判定」；`read.ok === false`
  或 catch 置 `reviewReadError`，不要落 `absent`。
- 业务摘要：`reviewReadError` 显示「审查文件读取失败」+ 重试，不显示「审查通过」/「审查未过」。
- 步骤条：`review` 在场性不能只靠 `hasFile`；读失败时不要给 ✓ 审查（可待定/失败）。
- 保留 BUG-347 的 absent 语义：文件确实没有 → absent，不冒充 FAIL。

## 修复判据

- review.md 在场但不可读 → 状态页显示「审查读取失败」+ 重试；不出现 ✓ 审查、不显示「审查通过」。
- review.md 确实缺席 → 仍按 BUG-347 absent（不显示 FAIL）；负控不回退。
- review.md 读到 FAIL → 仍出现「对抗审查发现问题」（负控）。
- review.md 读到 PASS → 审查步骤 done，正文照常。
- 红证：把 `read.ok === false` 分支改回 `reviewText=null`/absent → 本夹具再次出现 ✓ 审查，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 review 三态矩阵，或浏览器层用例（本 seed 夹具可升格）。
