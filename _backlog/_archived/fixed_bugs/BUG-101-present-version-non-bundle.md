---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-101：latestPresentedFinalVersion 不校验终稿族——`notes/final/v9.md` 被当交付版本，版本面 label 说「已交付」但 state 是 none

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — presented 版本只认终稿族；无 present 不渲染「已交付」（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/final-target.ts`（`latestPresentedFinalVersion`
> 的正则 `(?:^|/)final/(?:v|readable-v)N\.md$`）+
> `packages/deep-research-pack/src/lib/run-version.ts`（`runVersionFaceOf` 的
> `deliveredVersion`/label）。

## 症状

一条 `deliverables/presented` 只点名非 run bundle 的 `notes/final/v9.md`：

```json
{
  "delivery": null,
  "deliveredVersion": 9,
  "faceState": "none",
  "faceLabel": "v9 已交付",
  "contradiction": true
}
```

- `latestFinalDelivery` 正确返回 null（`finalPathOf` 要求 `drt_...` 终稿族）；
- `latestPresentedFinalVersion` 只按 `.../final/vN.md` 后缀匹配，不要求 `drt_`/终稿族，返回 9；
- `runVersionFaceOf` 在 `delivered:false` 时仍把 `deliveredVersion:9` 渲染成
  `v9 已交付`，而 `state` 是 `none`——同一条版本面自相矛盾。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/present-version-non-bundle.mjs
```

## 影响与触发面

- `present` 可以点名任意文件；只要路径以 `/final/vN.md` 结尾（`notes/final/v9.md`、
  `drafts/final/v2.md`），版本面就会拿到一个「交付版本」；
- `delivered` 为 false 时 label 仍说「已交付」；用户看到 state none / label 已交付的冲突；
- 若同时有真正的 `drt_x/final/v1.md` 和 `notes/final/v9.md`，`max` 会取 9，交付版本被抬高；
- `latestPresentedFinalVersion` 与 `latestFinalDelivery` 的族判定不一致（一个宽、一个严）。

## 根因（已证）

- `latestPresentedFinalVersion` 的正则只匹配 `final/vN.md` 后缀，没有复用 `finalPathOf`
  的 `drt_` 终稿族判定；
- `runVersionFaceOf` 只要 `deliveredFinalVersion !== null` 就走 `versionDelivered` 文案，
  不要求 `delivered===true`；
- 调用方（useStatusFeed）分别折 `delivery` 与 `deliveredVersion`，没有绑定同一条事件。

## 修法候选（未实施）

1. `latestPresentedFinalVersion` 用 `finalPathOf`/`FINAL_FAMILY_RELATIVE` 过滤，非族路径忽略；
2. `runVersionFaceOf` 只在 `delivered===true` 时使用 `deliveredVersion`，或把两者合并成
   「一条 present 的交付 + 版本」事实；
3. 同一条 present 事件内取版本，避免跨事件 max。

倾向 1+2；本卡不改代码。

## 修复判据

- [ ] `notes/final/v9.md` 不再产生 deliveredVersion/label「已交付」；
- [ ] 真 `drt_x/final/v2.md` 仍能给出 v2；present 缺席时 label 不写已交付；
- [ ] 同时存在真/假路径时交付版本只取真族；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 present files 的非族路径分布；不证明 readable-vN/版本面其它文案；
- 不证明 `latestFinalDelivery` 与 `latestPresentedFinalVersion` 之外的所有版本源。

## 已落地（2026-11-13）

- 证据 = `tests/run/final-target.test.mjs` BUG-101 + `tests/cockpit/run-version.test.mjs`。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
