---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-086：useConfigFeed 切换会话时旧 reload 不取消/不校验 sessionId——慢读覆盖新会话的方法库

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — config reload 加 session epoch + abort，旧结果不跨会话回写（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-config/useConfigFeed.ts`
> （`reload` 与 `useEffect([sessionId, reload])`）。

## 症状

研究配置页签在两个会话之间切换时：

1. 旧会话的 `reload(sessionId)` 已经发出 `readFile`/`listDir`；
2. 用户切到新会话，effect 再发一次 `reload`；
3. 新会话读得快、先 `setEntries`；旧会话读得慢、后 resolve，**无条件再 `setEntries`**；
4. 页签最终显示旧会话的方法库，但当前 `sessionId` 是新会话。

hook 级真跑（happy-dom + react-dom/client，假 `readFile` 让 s1 延迟 120ms、s2 立即）：

```json
{"reads":["s1","s2"],"afterNew":"新会话方法","afterOld":"旧会话方法","expected":"新会话方法","bug":true}
```

即：切换后先短暂显示新库，随后被旧库覆盖。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/config-feed-session-race.mjs
```

实测输出见上；`afterOld` 是新会话页签里的旧库名。

## 影响与触发面

- 页签显示的工作区方法库与实际会话不一致；用户可能基于旧条目点击管理/删除/设默认；
- `send` 用的是当前 `sessionId`，但目标名/回执基于旧库投影——可能出现「对 A 库展示的条目，
  向 B 会话发指令」的错位；
- 慢 `readFile`（大库、远端工作区、网关抖动）会放大窗口；
- `send` 的 20×3s 对账轮询里也调用 `reload`，切会话后同样可能把旧结果写回。

## 根因（已证）

- `useEffect` 对 `sessionId` 变化只 `void reload(sessionId)`，**没有 cleanup**；
- `reload` 内部 `new AbortController().signal` 是每次调用新建的，effect 没有持有/abort 它；
- `reload` 在 `await` 之后无条件 `setEntries`/`setLibraryRead`，没有 `sid === sessionId` 的
  epoch 守卫；
- `send` 的轮询 `reload` 也走同一函数，没有 session 校验。

## 修法候选（未实施）

1. `useEffect` 持有 controller，cleanup 时 abort；`reload` 接受 signal 并让 read/list 用同一 signal；
2. 或引入 session epoch，`reload` 在 setState 前检查 `sid === 当前 sessionId`（并在 send 轮询里同样检查）；
3. 最小：effect cleanup 设 `stopped`，`reload` 接收 `isCurrent` 谓词；不直写盘。

倾向 1/2（根治异步回写）；本卡不改代码。

## 修复判据

- [ ] 切换会话后，旧 reload 的 resolve 不再覆盖新会话 entries/libraryRead；
- [ ] `send` 轮询中的 reload 同样不跨会话回写；
- [ ] 复现脚本在旧结果晚到时仍显示 `新会话方法`；新增 hook/组件测试先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 DSH workspaceFiles 的延迟分布；不证明页签在会话切换时是否被上层 remount
  （若上层 keyed remount，本 race 被掩盖；当前 tab 注册未带 session key）；
- 不证明其它 feed（status/graph）的同类 race；不证明 UI 管理动作的完整影响面。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/config-feed-session.test.mjs` BUG-086 + `workspace-files` 分页。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
