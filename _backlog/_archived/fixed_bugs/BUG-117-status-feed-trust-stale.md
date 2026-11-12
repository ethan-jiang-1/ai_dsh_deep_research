---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-117：useStatusFeed 切会话只清 journal/rows，trust/face/unbound 仍保留旧值——旧绑定继续驱动新会话扫描

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 状态 feed 切会话复位 trust/face/unbound/kickoff/memberSummaries，旧绑定不驱动新扫描（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`
> （BUG-087 修复只 `setJournalEvents([])` / `setRows([])` / `setJournalSeen(false)` /
> `setHitl` / `setError`；`trust`/`face`/`unbound`/`kickoffHold` 未清）。

## 症状

s1 有一条 write 绑定 `drt_old/run.md`；切到 s2（journal 首帧未到）：

```json
{
  "afterS1": "{\"trust\":{\"kind\":\"bound\",\"slug\":\"old\",\"boundBy\":\"write\"},\"face\":null,\"unbound\":false,\"events\":1}",
  "afterS2": "{\"trust\":{\"kind\":\"bound\",\"slug\":\"old\",\"boundBy\":\"write\"},\"face\":null,\"unbound\":false,\"events\":0}",
  "staleTrust": true
}
```

journal/rows/seen 已清零，但 `trust` 仍是 s1 的 bound；bundle 扫描 effect 以
`sessionId=s2 + trust=drt_old` 继续跑，`openRun` 会打开新会话里的旧 slug（若存在），
`unbound`/`kickoffHold` 也保留旧态。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx esm runtime/explore-20261112/status-feed-trust-stale.mjs
```

（实际命令用 `tsx/esm`。）

## 影响与触发面

- 切会话后，状态页可能继续展示/扫描旧 run（旧 slug 在新工作区存在时直接显示别家数据）；
- `unbound`/`kickoffHold` 旧值影响页面横幅与 `statusFaceMarker`；
- `useMemberActivity` 的 summaries 也未在该 effect 清（但 memberIds 变化会重开）；
- 与 BUG-087（journal 残留）同 effect，但修复漏了 policy state。

## 根因（已证）

- sessionId effect 只重置 journal 派生 state；
- `trustRef.current = {kind:'unbound'}` 只改 ref，不改 `trust` state；
- `face`/`unbound`/`kickoffHold` 没有 reset；bundle scan effect 的依赖 `trust` 仍是旧 bound。

## 修法候选（未实施）

1. sessionId 变化时显式 `setTrust({kind:'unbound'})`、`setFace(null)`、`setUnbound(false)`、
   `setKickoffHold(false)`、`setMemberSummaries({})`；
2. 或给 bundle scan/face 的 setState 加 session epoch，旧 trust 不驱动新 session；
3. 上层 keyed remount 只能掩盖，仍建议 hook 自清。

倾向 1；本卡不改代码。

## 修复判据

- [ ] 切到 s2 后 `trust` = unbound（或新会话首帧后的值），不保留 s1 的 bound；
- [ ] 旧 `drt_old` 不在 s2 被 openRun/扫描；unbound/kickoff 初态正确；
- [ ] 正常同会话绑定/扫描不回归；复现脚本 afterS2.trust.kind != 'bound'；
- [ ] 新增 hook/组件用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 workspace 中旧 slug 是否恰好存在；不证明 memberSummaries 的完整清理；
- 不证明 BUG-087 的 journal 残留修复（另一面）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/status-feed.test.mjs` BUG-117。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
