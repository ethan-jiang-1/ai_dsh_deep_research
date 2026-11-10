# 终稿页签认领 glob 修复：basename 匹配 + canOpen 收窄

> 状态：implemented
> 归档：2026-11-10

## 决定

- **「终稿」页签的认领 pattern 只写 basename**：`final.md` / `v*.md` / `readable*.md`；
  精确性全部由 `canOpen: isFinalAddress`（终稿族：根 / `archive/` / `_abandoned/` + `final/vN` +
  `readable*`）承担。
- **回归锁** = `tests/cockpit/final-tab-patterns.test.mjs`：三个 pattern 不得含 `/` 或 `:`，
  集合固定为三个 basename。理由：vendor `tab-registry` 对**不含 `:`** 的 pattern 一律用
  `picomatch(..., { basename: true })` 编译——它拿地址 basename 去匹配，带分隔符的 glob
  永不命中。

## 输掉的方案

- **保留 `**/final/v*.md` / `final/v*.md` 等带分隔符写法**：vendor 按 basename 编译，`/` 在
  basename 里不存在，静默永不命中；不是"更宽的匹配"，是零匹配。
- **改成含 `:` 的整地址 glob**（`dsh-resource://file/session/**/final/v*.md`）：能命中，
  但把地址前缀抄进 keys.ts，和 `final-target.ts` 的 `SESSION_ADDRESS_PREFIX` 形成第二份正本；
  basename + canOpen 已经够精确。
- **去掉 patterns、只留 canOpen**：vendor 的 `candidates()` 先要求至少一个 pattern 命中，
  没有 pattern 就不进候选，canOpen 不会被调用。
- **让 vendor 改 basename 语义**：vendor 是 pinned submodule，机制权威；本包按它的合同写。

## 实际跑过的验证

- **红**（修前，rebuilt client）：`client-load-smoke` 5 FAILURE——交付门点开页签标题是 `v1.md`
  （tabs 含 `v1.md` 不含 `终稿`）、终稿页脚折叠块/版本切换/静音条/滚动口全缺。debug 行证明
  `isFinalAddress(address) = true`，即 canOpen 没问题，是 pattern 从未命中。
- **绿**（修后）：`client-load-smoke` ALL PASS（含 5 条修复项：页签标题「终稿」、页脚折叠块、
  版本切换 `v1`、静音条「审计版 · v1 看当前工作稿」、滚动口 `sh=2269 ch=647`）。
- `pnpm test` 981/981；`pnpm verify` 51 门绿；`pnpm typecheck` 绿。
- 回归日期：`ee8755a`（reader-final，2026-10-23）引入 vN/readable 的带分隔符 pattern 起，
  终稿页签一直不认领；本修复把三种形态收回。
