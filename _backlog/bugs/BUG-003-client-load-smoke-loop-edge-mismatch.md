# BUG-003：盘侧 tailAskPending=true 的绑定会话，观察面不渲染 ↻ rerun 回边

> 严重级别：P2（次要——观察面诚实线断言红，不影响研究流程）｜发现：2026-10-04｜状态：活跃

## 症状

`client-load-smoke` 对绑定会话（「HITL1 四问答案立项开挖」→ `drt_2026-ai-video-generation-landscape`）
的两条断言红：

1. `重入点描边（回边落点 = 挖掘；已交付 run 才有回边）`：`outline=none（delivered=false）`——
   期望 `reentry === null`（未交付 → 无回边元素），实测拿到 `none`（元素在、描边 none）；
2. `↻ rerun 回边 = 盘侧完整真值（交付 ∨ 挂起；loopOn 同谓词）`：`delivered=false
   tailAskPending=true`——盘侧谓词判"挂起"（应渲染 ↻ 补研究回边），页面未渲染。

其余 22 条断言全绿（含步骤条/证据计数/交付状态等盘侧真值对账）。

## 根因（假设）

盘侧谓词（`tailAskPending`，读会话日志末位事件 = 未答 ask）与 UI 侧渲染判定**不同源**：
UI 的 `loopOn`/回边渲染可能基于 follow 流的 snapshot 缓存或另一份会话态，而盘侧谓词独立重算
日志——两者对"该会话是否仍挂起"答案不一致。隔离证据：`src/client/index.ts` 工具卡注册
effect 收口前后各跑一次（构建产物分别装载），失败集完全一致——**与本改动无关，系既有错位**。
验证途径：在 UI 侧打印该绑定会话的 `tailAskPending`/`loopOn` 实值，与盘侧重算值 diff；
再核 BUG-002（pending-ask-anchor-misattribution）是否同根（pending ask 的锚定/归因类失败）。

## 复现

```sh
source dev/env.sh && node --import tsx/esm scripts/client-load-smoke.mjs
```

前置 = dev home 存在末位事件为未答 ask 的带历史会话且其 run bundle 无 final.md（当前
dev/harness-home 即此态，绑定 drt_2026-ai-video-generation-landscape）。

## 牵出的失败类

**"盘侧真值 vs UI 渲染态"双源错位**类：观察面诚实线断言（client-load-smoke 的磁盘真值对账
清单）依赖 UI 渲染与盘侧谓词同源；凡 UI 从流/缓存取态、门禁从盘取态的断言，都可能被会话态
演化（HITL 代答、日志尾随写、bundle 归档搬迁）打出假分歧。值得横切排查：所有
`expectedFace` 断言逐条标注"UI 态源"与"盘侧源"，不同源者要么改谓词同源、要么显式容忍窗口。

## 修复关联

未修（发现于 test-strategy 采纳条目的真挂载证据环节，隔离反证排除本次改动后建档）。
修复落点候选：ResearchStatusTab 的 `loopOn`/回边谓词与 `deriveSteps`/盘侧谓词合流到
`src/lib/` 同一折算函数（keyless 单测可钉）——与活动流/状态页签的既有折算层纪律同向。
