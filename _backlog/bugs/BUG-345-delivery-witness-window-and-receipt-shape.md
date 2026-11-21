---
status: 等人拍板
severity: P2
opened: 2026-11-20
---

# BUG-345：present 已发生，驾驶舱仍报「交付未见证」且终稿页签不出现

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：等人拍板（回执形态与观察窗口如何收口，是合同取舍）
>
> 现场 = `runtime/e2e-2026-11-20/run-a-delivered.png`；run = `research-workspace/drt_pg-latest-stable/`。

## 症状

会话日志里 present 在 22:08:25 发生（`presentCalls=1`，payload `final/v1.md`），但 22:14 新开
一个浏览器加载同一会话，右栏研究状态显示：

```text
v1 版本账 · 交付未见证
```

且页签栏只有「对话 / 方法库」，**没有「终稿」**。用种子夹具跑 `client-load.entry --seed` 时
交付门与终稿页签全绿——同一客户端代码在另一种数据下有正确行为。

## 根因（两段）

1. **观察窗口**：`useStatusFeed` 的 `journalEvents` 来自 follow 的 history 帧（窗口有界）。
   22:08 的 present 在 22:09 的 goal round（+170 事件）之后落到窗口外；`latestFinalDelivery`
   因此返回 null，状态页走「版本账在、present 不在窗口」分支。
2. **回执兜底失效**：兜底读 `delivered.json`，`deliveryFromReceipt` 期待
   `{ present: { path }, final: { version } }`；而本 run 的 `delivered.json` 是 lead 自写的
   install-only 形态（`presented: [ … ]` / `final_copy` / `machine_audit`），解析不出交付。
   同一份回执还是**先写后交**：22:05 写入时把 `presented` 记成已交付，present 22:08 才发生。

## 复现

```sh
# 1) 会话确实有 present
node --import tsx/esm probes/analyze/session-events.mjs session-93752db0-e400-4ec3-bf9a-de7641f76184 \
  --tail 0 --type tool/call | grep present
# 2) 浏览器看到未见证（需通道在跑）
node probes/browser/cdp-probe.mjs '<gui-url>' --open-session 'PostgreSQL 最新稳定版本' --open-status
#    statusPaneText 含「交付未见证」
# 3) 种子夹具对照全绿
node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home --port 3109
```

## 修法（需拍板）

1. 交付见证改为**不依赖窗口**：present 事实由回执/盘上快照承载，或 history 窗口覆盖全部
   （代价见性能）；
2. 定义 install-only 回执 schema 并让 `deliveryFromReceipt` 接受，lead 按 schema 写；
3. present 时由工具侧或 lead 写一条可解析回执，禁止「先记交付、后 present」。

## 修复判据

- 本卡现场在窗口滚出 present 后仍显示「已交付 v1」且出现终稿页签。
- 未 present 的 bundle 不显示终稿/已交付（负例），未绑定会话零泄漏（既有断言不回退）。
- `client-load.entry --seed` 与 dev-home 两手都绿。

可关闭：否
