---
title: Host sessionProjections 确定性增量折叠契约
source_url: https://docs.deepseek.com/harness/session-projections
retrieved_at: 2026-11-28
quality: A
found_by: analyst-1
supports: T2
lens: official
source_tier: primary
publisher: docs.deepseek.com
---

# Host sessionProjections 确定性增量折叠契约

> `ctx.sessionProjections` 在宿主侧对每条已提交会话日志事件执行同步纯函数折叠，未关心事件返回同一对象引用（`Object.is`），向浏览器端零额外订阅推送最新态势。

- 冷启动列表经 `sessionsState.byId[id].projectionValues` 直接携带上次落盘投影，热态经 `projectionsBySession[id].values` 实时推送。
- 彻底避免浏览器在左侧会话列表按行开启 N+1 条 WebSocket `follow` 流导致的连接与内存膨胀。

## Question List（本 topic）
- [x] 是否核对了冷/热两条投影读取通道的一致性？
- [x] 是否验证了无副作用与畸形事件容错？
