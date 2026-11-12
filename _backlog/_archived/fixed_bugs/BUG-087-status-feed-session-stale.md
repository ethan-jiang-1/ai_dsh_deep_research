---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-087：useStatusFeed 切换会话不重置 journalEvents/rows/journalSeen——旧会话活动在新会话页签里残留

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — status 切会话清空 journalEvents/rows/journalSeen/hitl/error（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`
> （journal 流 effect 的 sessionId 切换分支）。

## 症状

研究状态页签从 s1 切到 s2：

- effect 重置了 `trustRef` / `prevPending`，但**没有重置** `journalEvents` / `rows` /
  `journalSeen` / `hitl` / `face` / `unbound` 等 state；
- 新会话的 journal 首帧晚到或为空时，旧会话的活动行、journal 事件与 `journalSeen=true`
  继续显示在 s2 的页签里。

hook 级真跑（happy-dom + react-dom/client；s1 先 yield 一条 history，s2 的 follow 挂起）：

```json
{"afterS1":"{\"events\":1,\"rows\":0,\"seen\":true}","afterS2":"{\"events\":1,\"rows\":0,\"seen\":true}","stale":true}
```

即 s2 页签仍持有 s1 的 journal 事件与 seen 标志。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/status-feed-session-stale.mjs
```

## 影响与触发面

- 跨会话观察面泄漏：新会话第一帧前，用户看到上一个会话的活动/pending/版本面；
- `journalSeen=true` 参与 `unbound` 计算，可能把新会话短暂标成「未绑定/有历史」的错误态；
- `deriveAnchors`/`foldHitlPending` 用旧 events 可能显示旧 HITL 锚点，直到新 history 覆盖；
- 慢 journal/断流时窗口可持续；不是纯视觉闪烁。

## 根因（已证）

- sessionId 变化时，`useEffect` 只重置 `trustRef.current` / `prevPending.current` 并 abort 旧流；
- 新 effect 启动后，state 层没有清空；新流为空/慢时，旧 state 原样保留；
- 状态页签注册未带 session key，组件很可能跨会话复用；即便上层 remount，hook 内的
  state 也会在 remount 前的窗口显示旧值（本次真跑按复用路径证明）。

## 修法候选（未实施）

1. sessionId effect 开头统一重置 `journalEvents([]) / rows([]) / journalSeen(false) /
   hitl(false) / face(null) / unbound(false) / error(null)`（以及 member summaries）；
2. 或给状态页签/feed 加 session epoch，所有 setState 前校验当前 session；
3. 上层 keyed remount 只能掩盖，不修 hook 的陈旧回写。

倾向 1（最小、显式）；本卡不改代码。

## 修复判据

- [ ] 切到新会话后，旧 journal 事件/rows/journalSeen 不再出现在新会话页签；
- [ ] 新 history 到达后正常恢复；旧流的晚到事件/历史不写回；
- [ ] 复现脚本 `afterS2` 的 events/rows/seen 均为空；新增 hook/组件测试先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 `face`/`hitl`/`unbound` 在真实 journal 时序下的完整可见窗口（本次只测事件/seen）；
- 不证明上层是否 remount；不证明其它 feed（config/graph）的同类陈旧面。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/status-feed.test.mjs` BUG-087。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
