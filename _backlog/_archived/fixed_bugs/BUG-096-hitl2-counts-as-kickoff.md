---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-096：isKickoffCall 把任何 ask_user_question（含 HITL2）当新 run 开工——恢复会话交付审阅后 read 绑定被 kickoff 抑制

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — kickoff 只认 HITL1（`研究类型`）与 research-brief，HITL2 不再抑制（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/bundle-bind.ts`（`isKickoffCall`）+
> `packages/deep-research-pack/src/lib/binding-trust.ts`（read + kickoff 抑制）。

## 症状

恢复一个已存在的 run（本会话只有 read，无 write），走到 HITL2 交付审阅并答完：

```json
{
  "binding": { "slug": "resumed", "boundBy": "read", "kickoffSeen": true },
  "trust": { "kind": "suppressed", "slug": "resumed", "reason": "kickoff" }
}
```

`isKickoffCall` 把 `ask_user_question` 一律当立项信号；HITL2 也是 `ask_user_question`，
于是 `kickoffSeen=true`。HITL2 已答（无 pending）后，`bindingTrust` 仍按「立项轨道」
把 read 绑定抑制成 kickoff，状态/配置面看不到这个已审阅的 run。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/hitl2-counts-as-kickoff.mjs
```

## 影响与触发面

- 恢复会话 + 只读观察 + HITL2 是很正常的交付审阅路径；答完卡后面板仍显示「这场还没开始」
  的 kickoff 抑制，而不是已绑定 run 的状态/终稿；
- HITL1 与 HITL2 都是 `ask_user_question`，`isKickoffCall` 只看工具名，没有判型；
- `research-brief` skill 调用也应算 kickoff，但 HITL2 不应；
- 与 BUG-001 同族（绑定可信性政策），但方向相反：把「交付审阅」误当「新 run 开工」。

## 根因（已证）

- `isKickoffCall(name,args)` 对 `name === 'ask_user_question'` 直接 true，不解析 args 的
  HITL1/HITL2 签名；
- `bindingTrust` 的 read + kickoff 抑制是全局政策，无法区分 HITL1 与 HITL2；
- 测试夹具只覆盖 HITL1 ask 作为 kickoff，未覆盖 HITL2。

## 修法候选（未实施）

1. `isKickoffCall` 只把 HITL1 签名（`研究类型` / `askKindOf === 'hitl1'`）当 kickoff；
   HITL2 / unknown 不算；
2. 或让 `bindingTrust` 的 kickoff 抑制只在「无已答 HITL2 / 无 write」时生效；
3. 保留 research-brief skill 为 kickoff；HITL2 永不。

倾向 1；本卡不改代码。

## 修复判据

- [ ] HITL2 ask（已答或未答）不再置 `kickoffSeen`；恢复会话 read 绑定不被 kickoff 抑制；
- [ ] HITL1 ask 仍置 kickoff；research-brief skill 仍置 kickoff；
- [ ] HITL2 的 pending 抑制（reason=pending）不被误改；有 write 的绑定仍可信；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明恢复会话在真实 wire 上是否只有 read（可能之前有 write）；
- 不证明 HITL2 卡与终稿/状态面的完整可见链；不证明 kickoff 抑制的其它触发形态。

## 已落地（2026-11-13）

- 证据 = `tests/run/bundle-bind.test.mjs` BUG-096 + `tests/run/binding-trust.test.mjs`。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
