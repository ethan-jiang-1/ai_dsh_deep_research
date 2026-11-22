---
status: 修复就绪
severity: P2
opened: 2026-11-22
---

# BUG-357：已交付 run 的 review.md 变 FAIL 后，状态页同时说「报告不交付」和「已交付」

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复就绪 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权。
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

## 分诊与授权

- 严重级：P2 — 观察面自相矛盾；不阻断主路径/发布，但用户无法判断报告算不算交付，可能误重跑或误用。
- 表面 / 边界：pack client（`lib/run/brief-fold.ts` + `ResearchStatusTab` 合成）/ 浏览器。
- DSH 不变量：fail-loud — 合法共存的两个事实（已交付历史 + 新审查失败）必须同时说清，不得互相否定。
- 触及面：none — 观察面文案/折算 + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`status-truth-356-360` — 同批卡：356/358/359/360；批计划：[观察面真实性修复程序](../issues/2026-11-22-observation-truthfulness-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。
边界：浏览器（真驾驶舱状态页）— 已交付 seed + `review.md` 终局 PASS→FAIL。

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

根因证据：2026-11-22 复跑 `runtime/e2e/review-fail-e2e.mjs` → `reviewFailShown:true`，
同一 `paneText` 同时命中「报告不交付」与「✅ 已交付」；`brief-fold` 的 `reviewFail` 分支
在 `delivered` 之前返回，文案常量是交付前政策（`briefUnknownReviewFail`）。

## 牵出的失败类

- 同族第 2 次（前次 = BUG-353/354 的可行动横幅缺轴：只判停摆，不判已交付/已绑定）｜处置：类修 —
  `brief-fold` 的 `delivered × reviewFail` 真值表 + G14「多轴文案必须枚举全组合 + 无矛盾性质」。
- 探针价值：任何「同一页两个独立事实源各说一句」的观察面。

## 修法（P2b 实施）

- reviewFail 文案分两态：
  - **未交付**：保留「报告不交付」的交付前政策；
  - **已交付**：改成「已交付版本仍可用；新审查发现问题，补研究/复审后再出新版本」，
    并链到 review.md / 版本轨。
- 交付态与审查态的优先级写进业务摘要折算（纯函数），不要在 JSX 里各写一份条件；与读失败轴共用一次设计。
- 不把 review FAIL 折成「已交付失效」；也不把已交付折成「审查通过」。

## 修复判据

- 已交付 + review FAIL → 不出现「报告不交付」；出现「已交付版本可用 + 新审查问题」文案，
  终稿入口照常可用。
- 未交付 + review FAIL → 仍出现「报告不交付」/复审指引（负控）。
- 已交付 + review PASS → 既有「报告已交付」文案不变。
- 红证：把 reviewFail 文案回退成单态 → 已交付夹具再次出现「报告不交付」，exit 1；还原后绿。
- guard 落点：`brief-fold` 的 reviewFail × delivery 矩阵（纯函数）；浏览器层用本 seed 夹具。

## 修复关联

P2b 落地；守卫 = `tests/cockpit/lib/run/brief-fold.spec.mjs` 四组合 + 无矛盾性质 +
`checks/smoke/cockpit-truth.entry.mjs` S2；去向 = implemented — 批 Note。
