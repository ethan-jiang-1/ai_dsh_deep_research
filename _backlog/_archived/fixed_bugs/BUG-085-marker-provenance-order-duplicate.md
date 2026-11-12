---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-085：方法库 heading 的〔默认偏好〕与（provenance）顺序——fold 认反序，upsert 只认正序，同名条目被复制

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 标题正则接受 provenance/marker 任意顺序，同名 upsert 不再复制（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`（标题先找 `（`，再从 name 剥
> `〔…〕`）对照 `packages/deep-research-pack/src/lib/method-library-write.ts` 的
> `methodHeadingPattern`（`## name(?:（provenance）)?(?:〔默认偏好〕)*`）。

## 症状

一个库条目的标题把默认标记写在 provenance **之前**：

```md
## 方法甲〔默认偏好〕（2026-11-12，源自 对话）
```

- `foldLibrary` 能读成 `name=方法甲 / provenance=2026-11-12，源自 对话 / isDefault=true`；
- `upsertMethodEntry(text, 同名条目)` 的 `matchingHeadingLines` **匹配不到**这个标题
  （regex 只允许 `（provenance）` 在 `〔默认偏好〕` 前），于是走 `created` 分支，把同名条目
  **再写一份**；
- 写后 `foldLibrary` 得到两条 `方法甲`（一条默认、一条非默认）。之后的 `set-default` /
  `remove` 会因「重名」拒绝；UI 会出现两个同名条目。

正序（provenance 在前、marker 在后）是模板/`renderLibraryEntry` 的写法；反序是 fold 接受、
写入侧不接受的形态——读/写语法不对称。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/marker-before-provenance.mjs
```

实测（2026-11-12）：

```json
{
  "before": [{ "name": "方法甲", "provenance": "2026-11-12，源自 对话", "isDefault": true }],
  "action": "created",
  "after": [
    { "name": "方法甲", "provenance": "2026-11-12，源自 对话", "isDefault": true },
    { "name": "方法甲", "provenance": "2026-11-12，源自 对话", "isDefault": false }
  ],
  "duplicateNames": 2
}
```

## 影响与触发面

- 用户手写/外部导入的库若把 `〔默认偏好〕` 放在括注前（Markdown 上完全合理），保存同名条目
  会**复制**而不是更新；
- 复制后 `defaultCount`/fold 看到两个默认候选（一条 true、一条 false），`setDefault`/remove
  因重名拒绝，条目只能手工修；
- 不是恶意输入：默认标记和 provenance 的顺序没有用户可见的语法说明。

## 根因（已证）

- `foldLibrary` 先找 `（` 切 name/provenance，再从 name 剥 `〔…〕`，因此接受任意顺序；
- `methodHeadingPattern` 固定 `(?:（...）)?(?:〔...〕)*`，只接受 provenance 在 marker 前；
- `matchingHeadingLines` 的 0 命中 → `upsertMethodEntry` 走 created，生成第二份同名条目。

## 修法候选（未实施）

1. 抽共享 heading 解析器，fold 与写侧共用同一「name + 可选 provenance + 可选 marker」语法
   （允许两序或明确拒绝反序）；或
2. 写入前对标题做规范化匹配（先剥 marker 再比 name/provenance）；
3. 至少把 `matchingHeadingLines` 的 regex 改为同时接受 marker 在 provenance 前后。

倾向 1（根治读/写不对称）；本卡不改代码。

## 修复判据

- [ ] 反序标题的同名 upsert 走 `updated`，不新增副本；
- [ ] 正序标题行为不变；两条同名（真重名）仍被拒绝；
- [ ] 复现脚本 `action`/`duplicateNames` 按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 marker 与 name 的其它排列（marker 在 name 前、多个 marker、全角空白）；
- 不证明 UI 编辑器/coach 生成的标题顺序；不证明外部导入库的分布。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-085。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
