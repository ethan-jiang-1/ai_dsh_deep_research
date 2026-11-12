---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-119：useConfigFeed 切会话清 receipt 但不清 events/adoption——旧绑定继续驱动新会话的「本次研究」

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 配置 feed 切会话清 events 并把 adoption 归 no-run，旧绑定不驱动本次研究摘要（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-config/useConfigFeed.ts`
> （BUG-108 修复清 receipt/detail/menu/confirm/switch/sending，但没有 `setEvents([])` /
> `setAdoption(no-run)`）。

## 症状

s1 有一条 write 绑定 `drt_old/run.md`，切到 s2（journal 无新帧）：

```json
{"afterS1":"{\"adoption\":\"unrecorded\"}","afterS2":"{\"adoption\":\"unrecorded\"}","staleAdoption":true}
```

s2 的「本次研究」摘要仍带着 s1 的 adoption；`bindingTrust(events)` 仍在旧 events 上，
`openRun(drt_old)` 会继续在新会话里打开旧 run。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/config-feed-adoption-stale.mjs
```


## 影响与触发面

- 切会话后「本次研究」摘要可能显示旧 run 的采纳/未记录态，直到新 journal 首帧；
- 旧绑定 slug 在新工作区若存在，`openRun` 会读该 run 的 question.md，显示别家数据；
- `events` 还是旧数组；`bindingTrust`/`kickoff` 判断随之错；
- 与 BUG-086（entries race）、BUG-108（receipt 残留）同 hook，修复漏了 journal 派生面。

## 根因（已证）

- sessionId effect 没有 `setEvents([])` / `setAdoption(no-run)`；
- `events` 只由 follow 流更新；新会话首帧前保留旧数组；
- `bindingTrust(events)` 与 adoption effect 没有 session epoch 校验。

## 修法候选（未实施）

1. sessionId effect 重置 `setEvents([])`、`setAdoption({kind:'no-run',...})`；
2. 或 adoption effect 开头校验 `sessionId` 是当前 session，旧 events 不驱动；
3. follow effect 的 history 帧到达前，摘要显示 loading/no-run，不沿用旧值。

倾向 1；本卡不改代码。

## 修复判据

- [ ] 切到 s2 后 adoption 为 no-run/loading，不保留 s1 的 unrecorded/recorded；
- [ ] 旧 `drt_old` 不在 s2 被 openRun；新 history 到达后正常恢复；
- [ ] 同会话正常 adoption 不回归；复现脚本 afterS2.adoption == 'no-run'；
- [ ] 新增 hook/组件用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 journal 首帧延迟分布；不证明其它 config feed 派生状态（trust/face 在 status hook 另卡）；
- 不证明上层是否 keyed remount。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/config-feed-session.test.mjs` BUG-119。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
