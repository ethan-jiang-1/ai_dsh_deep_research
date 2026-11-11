# 当前安装事实：本地 tarball，npm/Plugins staged

> 状态：implemented

> 历史注记：版本事实已由 [交接缺口收口](2026-11-11-handoff-gap-closure.md) 更新到 0.3.1；安装形态与 staged 结论不变。

## 决定

D40/D41 保留 2026-11-01/02 的决定语境（bundle + custom profile；Plugins 页是发布后的默认形态）。0.3.0 的当前安装事实另立 [D42](../../docs/decisions.md#d42)：本地 tarball 是唯一发布形态，npm 包名 / Plugins 页 / Discover 均未发布（staged）。装/卸/验证命令的 owner = [安装手册](../../_dist/安装手册.md)；台账不再复制命令。

D40/D41 行尾加“0.3.0 当前安装事实 = D42”指针，不修改原决定正文；历史语境与当前事实各有一个可判读入口，fresh agent 不会在“默认 Plugins 页”上猜。

## 输掉的方案

- **直接改写 D40/D41 的安装句**：会把 2026-11-01/02 的决定记录变成事后修订，失去“当时为什么这样定”的证据。
- **只改手册、不碰台账**：D 号台账是入口链的按需权威页；旧的“默认 Plugins 页”仍在，fresh agent 会先信它。
- **删掉 D40/D41 的 Plugins 页句**：等于抹掉发布后目标形态，后续发布时又要重新考古。

## 实际跑过的验证

- `pnpm verify` → `verify: 全绿`（52 道门禁；含 `readme-shape` 顺序断言、`content-shape` 手册预算、`pack-bundle-compat` engines 副本同步）。
- `pnpm test` → 全绿（含 `decisions-now` D1–D42 连续性与新增 `host-health` 直测）。
- `node scripts/smoke/gates-smoke.mjs --case=readme-shape-install-before-profile,content-shape-manual-over-budget,pack-bundle-compat-engines-copy-drift` → 注入案例全绿（3 案例、0 对照；全量对照由 `pnpm verify` 绿作对照）。
- `node scripts/smoke/lifecycle-smoke.mjs` / `install-shape-smoke.mjs` / `doctor-smoke.mjs` → ALL PASS。
- 真安装：干净 home `plugin add file:_dist/dsh-deep-research-pack-0.3.0.tgz` → 启动打印 `dsh web:` URL；remove 后 profile bundles 回 base + web-app，无本包行。

## 环境状态

macOS 已验；`client-load-smoke` 在 2026-11-10 低内存主机上的复跑由 [lib/host-health](../../scripts/lib/host-health.mjs) 归类为 NOT-RUN（exit 2），健康主机复跑仍待；未跑 ≠ 通过。
