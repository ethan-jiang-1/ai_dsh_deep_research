---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-353：已交付 run 仍显示「运行停摆」横幅——交付与停摆同时成立

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/`；seed 夹具 = `runtime/e2e/delivered-stall-e2e.mjs`。

## 症状

一个已经交付的 run，在交付之后又经历了一个失败的回合，静默 31 分钟后打开「研究状态」：

```text
⚠️ 运行停摆：最后活动 31 分钟前，最后回合错误「E2E post-delivery transport failure」——
先看通道与上游；恢复按 guides/61 §5（run-kickoff --session）。

报告已交付
当前版已交付；历史拍板见 question.md §Decisions
你现在无需操作；需要继续研究时在会话里提出（补研究/修订表述走交付审阅语义）
...
✅ 已交付   读终稿 →
```

同一页面上「已交付」「你现在无需操作」与「运行停摆」「恢复按 guides/61 §5」同时成立。
用户会以为已交付的报告还需要恢复，可能去跑 `run-kickoff --session`，产生一次不必要的
真模型回合；而报告本身已经在 `final/` 里。

## 证据

seed 夹具：`materializeSeedHome` 的已交付 run（`drt_unsc-p5-members`，canonical
`delivered.json` + present 在窗口内），在 seed 会话日志末尾追加一个 **post-delivery 失败回合**
（`turn/start → step/start → llm/retry(TRANSPORT) → step/end → turn/end`，时间 = now−31min），
再以真浏览器打开「研究状态」。verdict
（`runtime/e2e/delivered-stall-verdict.json`）：

```json
{
  "face": "bound",
  "delivered": true,
  "stalled": true,
  "text": "⚠️ 运行停摆：最后活动 31 分钟前... 报告已交付 ... ✅ 已交付 读终稿 →"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/delivered-stall-e2e.mjs
```

截图 = `runtime/e2e/delivered-stall.png`。

## 根因

- `packages/deep-research-pack/src/client/research-status/useStatusFeed.ts` 的 `health`
  只依赖 `journalEvents`，不读 `delivery` / `trust` / run settled 状态。
- `ResearchStatusTab.tsx` 的渲染条件只有 `stalledBannerLine(health, t) !== null && !hitl.pending`；
  没有「已交付 / 已落定」的抑制。
- `runHealthOf` 的 `lastTurnError` 只看最后一回合的错误，不看交付是否已经发生；交付后的
  失败回合（例如补研究前的通道错误）会重新触发 stalled。

## 修法方向（未实施）

- 在状态页渲染前加「已交付/已落定」抑制：`delivery !== null`（或 run settled 且无 open turn）
  时不显示可行动的停摆恢复横幅；如仍需提示，用独立的非行动文案，不冒充「研究失败」或
  「需要恢复」。
- 判据归属：抑制属于**展示层**（交付事实已在 `delivery`），不要把 `delivered.json` 塞进
  `runHealthOf`；保持 `runHealthOf` 的输入只有事件流，便于 `watch-run` 复用。
- 不改 BUG-348 的「静默 + 最后回合错误」核心判据；只加「已交付」前置。

## 修复判据

- 已交付 run + 交付后的失败回合 + 静默 31 分钟 → 不出现「运行停摆」/恢复指引；交付徽标
  与终稿入口照常。
- 未交付 run 的同形失败回合（无 present/回执）→ 仍出现停摆横幅（负控）。
- 正常长回合（无错误）→ 不显示（既有负控不回退）。
- 红证：去掉 `delivery !== null` 抑制 → 本夹具再次出现横幅，exit 1；还原后绿。
- guard 落点建议：`tests/cockpit/lib/run/health.spec.mjs` 之外，加一个状态页/浏览器层
  用例（本 seed 夹具可升格为 `client-load` 相位）。
