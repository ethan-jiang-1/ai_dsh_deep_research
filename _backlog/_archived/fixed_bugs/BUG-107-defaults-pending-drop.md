---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-107：defaultsStore pending 期间第二次写静默丢弃——不排队、无回执；快速跨轴编辑丢改动

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — defaults 写请求按 session 串行排队，pending 期间不丢改动（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/defaults/store.ts`（`runWrite` 的
> `if (current.pending) return`），消费 = 按钮/面板的 set/unset/clear。

## 症状

第一次写还在 pending（execute 未返回）时，第二次 `setPatch` 立即返回，**不发命令、不排队、
不回执**：

```json
{
  "commandsBeforeRelease": 1,
  "commandsTotal": 1,
  "commands": ["/research-defaults set {\"expectedRevision\":0,\"patch\":{\"effort\":\"deep\"}}"],
  "outcome": { "kind": "ok", "revision": 1 },
  "secondPatchApplied": false
}
```

第二次 `output.shape` 丢失；promise resolve，没有 busy/error outcome。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/defaults-pending-drop.mjs
```

## 影响与触发面

- 面板的读者输入在 blur 时发一次写；用户立刻点输出形态，形态写落到 pending 窗口 →
  第二次被丢，控件回弹/无变化，用户以为没点上；
- 来源 chip / authority / recency 连续改同理；
- 按钮/面板在 pending 渲染后才 disabled；事件落在之前的一帧即可触发；
- 没有 receipt/日志说明「写被丢弃」，用户只能重试。

## 根因（已证）

- `runWrite` 只做 `if (current.pending) return`，不等待、不排队、不设置错误回执；
- `setPatch` / `unset` / `clear` 都把 promise 当成功返回；调用方无法知道被丢弃；
- 面板每个控件独立写，没有本地 draft/串行队列。

## 修法候选（未实施）

1. store 内串行化写：pending 时把下一次 patch 入队，前一次 settle 后合并执行；
2. 或在 pending 时返回显式 `busy` outcome，面板提示并允许重试；
3. 面板侧改为本地草稿 + 单次提交（跨轴合并），避免两次独立写。

倾向 1；本卡不改代码。

## 修复判据

- [ ] pending 期间的第二次写要么排队执行、要么返回显式 busy，不静默丢弃；
- [ ] 面板快速改读者→形态不会丢第二次改动；正常单写路径不变；
- [ ] 复现脚本第二条 patch 最终生效或收到 busy；新增 store/组件用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实浏览器事件顺序一定触发（源码/ store 级已证）；
- 不证明所有跨轴组合的合并语义；不证明 host command 的 revision 行为。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/defaults-store.test.mjs` BUG-107 排队。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
