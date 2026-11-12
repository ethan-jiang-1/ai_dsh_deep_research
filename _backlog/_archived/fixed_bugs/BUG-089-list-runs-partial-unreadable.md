---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-089：listRuns 部分桶 unreadable 仍返回 ok——归档/停放桶的 run 被静默漏枚举

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — `listRuns` 部分桶不可读返回 warnings，三个门禁遇缺口 exit 2（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-context.ts:264`（`listRuns`）；
> 消费 = `scripts/run-gates/schema-scan.mjs`、`node-gate.mjs`、`evidence-audit.mjs`。

## 症状

`listRuns` 扫三个桶（root / archive / _abandoned）。只要**一个桶有 run**，另一个桶的
`unreadable` 就被丢弃，返回 `ok` + 部分清单：

```json
{
  "result": {
    "ok": true,
    "value": [{ "slug": "root-run", "dir": "drt_root-run", "bucket": "root" }]
  },
  "silentPartial": true
}
```

archive 桶返回 `{ok:false, reason:'unreadable', detail:'EACCES archive'}`，但结果里没有
任何 error/warning；调用方无法知道归档 run 被漏掉。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/list-runs-partial-unreadable.mjs
```

## 影响与触发面

- `schema-scan`（只扫 archive）、`node-gate`（root+archive）、`evidence-audit`
  （root+archive+abandoned）都用 `listRuns`；归档目录权限/通道异常时，门禁会**少扫 run**
  而继续报绿；
- `listRuns` 的 `Outcome` 只有 `ok|missing|unreadable`，没有 partial 形态；当前实现选择
  「有部分结果就算成功」，把不可读桶静默降级；
- 与 BUG-018 的同族：广告覆盖 ≠ 实际覆盖；验证门不能把「没扫到」当成「没有」。

## 根因（已证）

- 循环里 `firstError` 只在 `refs.length === 0` 时返回；
- 一旦任意桶有 run，`ok` 直接返回，`firstError` 被丢弃；
- 没有 `unreadableBuckets`/`warnings` 字段，消费方无法区分「桶为空」与「桶读失败」。

## 修法候选（未实施）

1. `Outcome` 增加 partial 形态（`ok:true, value, warnings: [...]`），消费方在门禁里把
   warning 当红或显式记账；或
2. 任一桶 unreadable 即返回 `unreadable`（保守，但会丢失可用桶结果）；或
3. 保留 partial，但在返回对象上带 `unreadableBuckets`，并让三个门禁消费该字段。

倾向 1/3（保留可用结果、显式暴露缺口）；本卡不改代码。

## 修复判据

- [ ] 任一桶 unreadable 时，`listRuns` 的结果携带可机检的缺口信息（或整体 unreadable）；
- [ ] `schema-scan` / `node-gate` / `evidence-audit` 在缺口存在时不再静默报绿；
- [ ] 三桶全可读的正常路径结果不变；复现脚本断言按所选修法通过；
- [ ] 新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实归档目录的权限故障分布；不证明三个门禁的完整调用链；
- 不证明 `listRuns` 对 `other` 类型目录/symlink 的发现语义。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-context.test.mjs` BUG-089；三个门禁 warnings → exit 2。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
