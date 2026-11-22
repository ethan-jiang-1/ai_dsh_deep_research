---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-357：已交付 run 的 review.md 变 FAIL 后，状态页同时说「报告不交付」和「已交付」

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/review-fail-verdict.json` + `review-fail.png`；
> 夹具 = `runtime/e2e/review-fail-e2e.mjs`。

## 症状

一个已交付的 run（present + canonical `delivered.json` 指向 v1），其 `review.md` 的终局块
已经变成 `readiness: FAIL`（例如交付后 critic 复审/补研究复核失败）。打开「研究状态」：

```text
对抗审查发现问题——团队修复后复审
审查未决项修复中；复审轮次记账见 review.md
⚠ 审查未决项存在——修复完成并通过复审前报告不交付
...
✅ 已交付   读终稿 →   v1 已交付 · 当前工作稿
```

同一页面上「报告不交付」与「已交付」同时成立。用户无法判断这份报告到底算不算交付；
如果按「不交付」理解，会误以为终稿不可用；如果按「已交付」理解，又会忽略新的审查失败。

## 证据

seed 已交付 run（`drt_unsc-p5-members`，canonical 回执 + present 在窗口内），把
`review.md` 的终局 `readiness: PASS` 改为 `readiness: FAIL`，真浏览器打开状态页。verdict：

```json
{
  "face": "bound",
  "reviewFailShown": true,
  "paneText": "对抗审查发现问题——团队修复后复审…… ⚠ 审查未决项存在——修复完成并通过复审前报告不交付 …… ✅ 已交付 读终稿 → v1 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/review-fail-e2e.mjs
```

## 根因

- `deriveBusinessBrief` 的 `reviewFail` 分支输出的是**交付前**政策文案
  （「修复完成并通过复审前报告不交付」），它不知道 `delivery !== null`。
- `ResearchStatusTab` 同一页同时渲染业务摘要（reviewFail）与 ⑤ 交付态（present/回执），
  两者没有互斥/优先级。
- 这不是「review FAIL 时不该有交付」的非法状态：交付是历史事实（present 已发生），
  review.md 可以在交付后被 rerun/critic 改写；观察面必须同时说清「已交付的版本仍可用」
  与「新审查发现问题」，而不是让两句互相否定。

## 修法方向（未实施）

- reviewFail 文案分两态：
  - **未交付**：保留「报告不交付」的交付前政策；
  - **已交付**：改成「已交付版本仍可用；新审查发现问题，补研究/复审后再出新版本」，
    并链到 review.md / 版本轨。
- 交付态与审查态的优先级写进业务摘要折算（纯函数），不要在 JSX 里各写一份条件。
- 不把 review FAIL 折成「已交付失效」；也不把已交付折成「审查通过」。

## 修复判据

- 已交付 + review FAIL → 不出现「报告不交付」；出现「已交付版本可用 + 新审查问题」文案，
  终稿入口照常可用。
- 未交付 + review FAIL → 仍出现「报告不交付」/复审指引（负控）。
- 已交付 + review PASS → 既有「报告已交付」文案不变。
- 红证：把 reviewFail 文案回退成单态 → 已交付夹具再次出现「报告不交付」，exit 1；还原后绿。
- guard 落点：`brief-fold` 的 reviewFail × delivery 矩阵（纯函数）；浏览器层用本 seed 夹具。
