---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-095：web-harness.bootWeb 成功路径不清理 banner timeout——库式消费者被长 timer 多留

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — bootWeb 成功/失败/提前退出都清 banner timer，库式消费者不再被多留（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/web-harness.mjs`（`bootWeb` 的 `setTimeout(... reject ...)`）。
> 消费 = 所有 web 冒烟/probe（多数末尾 `process.exit`，当前被掩盖）。

## 症状

`bootWeb` 在 `banner` Promise 里 `setTimeout(reject, timeoutMs)`，成功拿到横幅后
**没有 clearTimeout**。成功路径复现：

```json
{"token":"fake-token","activeTimeouts":1,"timeoutMs":5000,"note":"success path leaves boot timeout handle"}
```

即 banner 已 resolve，进程仍持有一个 5s（实际站点 120–240s）的 Timeout；
`setTimeout` 的 reject 落在已 settle 的 Promise 上（no-op），但 timer 仍让事件循环多活。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/boot-web-timer-leak.mjs
```

夹具 = 一个打印 banner 后立即退出的 fake CLI；`process.getActiveResourcesInfo()` 过滤 Timeout。

## 影响与触发面

- 当前冒烟/probe 末尾都 `process.exit`，影响被掩盖；
- 库式消费者或未来探针若 `await bootWeb()` 后继续跑（不立即 exit），进程会被多留
  `timeoutMs`（站点常见 120_000 / 180_000 / 240_000ms）；
- timer 的 reject 在已成功 Promise 上无副作用，但属于未回收资源；
- 若 boot 失败由 child exit reject，timer 也可能未被清理（同样到超时才释放）。

## 根因（已证）

- `bootWeb` 没有保存 timeout handle，也没有在 banner resolve/reject、child exit 时清除；
- timer 未 `unref()`；注释只处理「横幅失败即 reject」，未处理成功路径资源。

## 修法候选（未实施）

1. 保存 `const timer = setTimeout(...)`；在 resolve/reject/exit 任一结算点 `clearTimeout(timer)`；
2. 或对 timer `unref()`（但失败路径仍需 reject；unref 后若没有其它 handle 可能提前退出）；
3. 用 `AbortSignal.timeout` + race 并清理；或把超时收进调用方。

倾向 1（显式清理，保持失败语义）；本卡不改代码。

## 修复判据

- [ ] bootWeb 成功 resolve 后 `process.getActiveResourcesInfo()` 不再有该 Timeout；
- [ ] 超时/child exit 失败路径也会清理 timer；失败 reject 文案不变；
- [ ] 所有消费站点不回归；复现脚本断言按所选修法通过；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明所有站点的进程退出行为；不证明 `unref` 对失败路径的副作用；
- 不证明 child stdout/stderr listener 的资源回收（本卡只覆盖 timer）。

## 已落地（2026-11-13）

- 证据 = 一次性 active-resource 探针：成功路径 timers=[]（fake CLI banner）。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
