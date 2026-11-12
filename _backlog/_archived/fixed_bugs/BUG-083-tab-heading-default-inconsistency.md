---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-083：方法库 heading 空白口径不一致——fold 认 `##\t`，clear/set/defaultCount 只认 `## `，默认操作静默不动或误报

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 读/写/计数共用 `isLibraryHeadingLine`，tab heading 的 clear/set 与 fold 同口径（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`（`/^##\s+/`）对照
> `packages/deep-research-pack/src/lib/method-library-write.ts` 的
> `clearDefaultMethodEntry` / `defaultCount` / `setDefaultText`（均 `line.startsWith('## ')`）。

## 症状

库文件里一个合法的 ATX heading 用 tab 分隔（`##\t方法甲\t〔默认偏好〕`）：

- `foldLibrary` 能读出 `name: 方法甲 / isDefault: true`；
- `clearDefaultMethodEntry` **不改**（`changed:false`，仍默认）；
- `setDefaultMethodEntry(text, '方法甲')` 抛「库里没有『方法甲』」；
- `defaultCount` 计 0，`upsertMethodEntry` 会放过「多个默认」的前置校验。

即：**同一个 heading，fold 认、默认操作不认**。用户手改/导入的库（或未来编辑器格式化）
会落入「看得到条目，却清不掉/设不了默认」的静默失败。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/tab-heading-default.mjs
```

实测（2026-11-12）：

```json
{
  "foldedName": "方法甲",
  "foldedIsDefault": true,
  "clearChanged": false,
  "clearStillDefault": true,
  "setResult": { "error": "Error: 库里没有「方法甲」" }
}
```

## 影响与触发面

- `method_library_set_default` 的 `clear` 会对一个「fold 仍默认」的库写空操作，随后
  `defaults.length !== 0` → 工具抛「默认操作回读未通过」，用户看到失败但文件没动；
- `set` 直接报「库里没有」——条目明明在 UI 里可见；
- `method_library_upsert` 的 `defaultCount(text) > 1` 前置校验漏计 tab heading，可能在
  「多默认」库上继续写入；
- 触发不要求恶意输入：Markdown 的 ATX heading 允许 `##` 后 tab，手工编辑/外部工具导出即可。

## 根因（已证）

- 读侧 `foldLibrary`：`/^##\s+(.+)$/`（`\s` 含 tab）；
- 写侧 `clearDefaultMethodEntry`/`defaultCount`/`setDefaultText`：`line.startsWith('## ')`；
- 两套 heading 谓词没有共享，导致同一行在「读得到」与「写不到」之间分叉。

## 修法候选（未实施）

1. 抽一个共享 heading 谓词（`^##\s`），clear/defaultCount/setDefault/`matchingHeadingLines`
   全部复用；或
2. 读入时把 heading 空白规范化（但会改用户文件，需谨慎）；或
3. 写侧明确拒绝非 `## ` 的 heading 并给诊断（不如 1 一致）。

倾向 1（最小、读/写对称）；本卡不改代码。

## 修复判据

- [ ] tab heading 的 clear 能真正清掉默认、`changed:true`，readback 零默认；
- [ ] tab heading 的 set 能命中同一条目并设为唯一默认；
- [ ] `defaultCount` 与 `foldLibrary` 对同一文件的默认计数一致；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其它 Markdown 空白形态（前导空格、`##\r`、全角空格）的全部边界；
- 不证明 UI 编辑器是否会生成 tab heading；不证明外部导入库的分布。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-083。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
