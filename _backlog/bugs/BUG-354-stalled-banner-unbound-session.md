---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-354：未绑定会话也显示「运行停摆」横幅——没有 run 却给出恢复指引

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/`；seed 夹具 = `runtime/e2e/unbound-stall-e2e.mjs`。

## 症状

一个**没有绑定任何 run** 的会话（seed 的未绑定 Scout 负样本），在末尾追加一个失败回合、
静默 31 分钟后打开「研究状态」：

```text
⚠️ 运行停摆：最后活动 31 分钟前，最后回合错误「E2E post-delivery transport failure」——
先看通道与上游；恢复按 guides/61 §5（run-kickoff --session）。

🎯 尚未确认
本会话尚未绑定研究 run
研究状态只跟本会话自己的 run；绑定后这里显示本场进度
...
（本会话未绑定 run bundle——研究状态只跟本会话自己的 run）
```

页面上半部分让用户去恢复一个 run，下半部分如实说「尚未绑定研究 run」——自相矛盾。
这个会话根本没有 run bundle，`run-kickoff --session` 也没有目标。

## 证据

seed 未绑定会话 `session-82b7f4fb-...`，在其日志末尾追加 post-delivery 失败回合
（`turn/start → step/start → llm/retry(TRANSPORT) → step/end → turn/end`，时间 = now−31min），
真浏览器打开「研究状态」。verdict（`runtime/e2e/unbound-stall-verdict.json`）：

```json
{
  "face": "unbound",
  "unbound": true,
  "stalled": true,
  "text": "⚠️ 运行停摆：最后活动 31 分钟前... 🎯 尚未确认 本会话尚未绑定研究 run ..."
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/unbound-stall-e2e.mjs
```

截图 = `runtime/e2e/unbound-stall.png`。

## 根因

`ResearchStatusTab.tsx` 的停摆横幅只判：

```ts
stalledBannerLine(health, props.t) !== null && !hitl.pending
```

没有要求 `trust.kind === 'bound'` / `face !== null`。`useStatusFeed` 对任何有事件的会话都
计算 `health`（`journalEvents.length > 0` 即算），所以未绑定会话的失败回合也能让横幅成立。
「未绑定」的如实说明在该横幅之后渲染，用户先看到的是可行动的恢复指引。

## 修法方向（未实施）

- 横幅渲染前置加「有可信绑定」条件（`trust.kind === 'bound'`，必要时还要求 `face !== null`）；
  未绑定/立项预检/挂起抑制态只保留各自的如实说明。
- 如果希望未绑定会话也提示「上一回合失败」，用独立、无恢复命令的文案，不叫「运行停摆」。
- 保持 `runHealthOf` 纯事件判据不变，抑制归展示层。

## 修复判据

- 未绑定会话 + 失败回合 + 静默 31 分钟 → 不出现「运行停摆」恢复指引；「尚未绑定」如实说明照常。
- 已绑定、未交付、失败回合 + 静默 31 分钟 → 仍出现停摆横幅（正控；与 BUG-353 的已交付负控配对）。
- 正常长回合（无错误）→ 不显示（既有负控不回退）。
- 红证：去掉 `trust.kind === 'bound'` 前置 → 本夹具再次出现横幅，exit 1；还原后绿。
- guard 落点：浏览器层用例（本 seed 夹具可升格），或状态页纯函数渲染矩阵。
