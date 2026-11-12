---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-082：方法库默认判定用裸子串「默认偏好」——provenance 含该词即误判默认；写后回读与写前 expected 自相矛盾

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 默认判定只认精确 `〔默认偏好〕` 标记，provenance 含词不误判（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`（`foldLibrary` 的
> `isDefault: title.includes('默认偏好')`）；对照组 =
> `method-library-write.ts` 的 `renderLibraryEntry`/`defaultCount`/`upsertMethodEntry`
> （只认精确标记 `〔默认偏好〕`）。

## 症状

一个**没有** `〔默认偏好〕` 标记的条目，只要标题附近的 provenance 文本含
「默认偏好」四个字，就被 `foldLibrary` 判为默认：

```json
{"input":"## 方法甲（2026-11-12，源自 默认偏好实验）","isDefault":true,"hasMarker":false}
```

后果分两层：

1. **读面误判**：UI 默认标记、`priorDefaults`、`research:defaults`/`research-brief` 的
   `findDefaultMethod` 都可能把这个条目当成默认；多个这样的条目会制造「多个默认」。
2. **写面自相矛盾**：写库路径用精确标记判断默认（`defaultCount` / `renderLibraryEntry` /
   `upsertMethodEntry` 的 `makeDefault`）。新建一个 provenance 含「默认偏好实验」的条目时：
   - 写出的文本**没有** `〔默认偏好〕`；
   - 但写后 `foldLibrary` 仍判 `isDefault: true`；
   - `method_library_upsert` 的 `expectedDefault`（preserve + 空库）= false，写后回读 true
     → 工具抛「写入后方法…回读核对失败」；**文件已经写入**，UI 收到失败/未知，形成
     「写成功但报失败」的错位。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/default-marker-substring.mjs
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/default-marker-write-path.mjs
```

实测（2026-11-12）：

- 无标记 + provenance `默认偏好实验` → `isDefault: true`、`hasMarker: false`；
- 无标记 + provenance `默认偏好` → 同上；
- 真标记 → true（正确）；真标记 + provenance 含词 → true（正确）。
- 写路径：`textHasMarker:false`、`savedIsDefault:true`、`expectedDefaultForPreserveOnEmpty:false`、
  `wouldFailToolReadback:true`。

## 影响与触发面

- **导入/历史库**：任何来源注记里出现「默认偏好」的条目（例如用户把一场关于默认偏好的讨论
  存成来源）都会被误判；不是必须有恶意输入。
- **新建/编辑**：`provenance` 来自来源条目/coach；若来源标题含该词，保存会在最后一步回读失败，
  但文件已落盘。用户重试可能造成重复条目/更困惑的状态。
- **默认消费**：`findDefaultMethod` 只按 `isDefault` 过滤；误判会把非默认方法注入
  `research:defaults` 的方法行，或让 `setDefault` 看到「多个默认」而拒绝。

## 根因（已证）

- `foldLibrary` 的 `isDefault` 用 `title.includes('默认偏好')`，没有要求 `〔〕` 标记；
- 写路径的默认语义用 `renderLibraryEntry` 的精确 `〔默认偏好〕` 标记；
- 读/写两套口径不一致，导致「写前 expected=false、写后 readback=true」。

## 修法候选（未实施）

1. `isDefault` 改为精确标记 `title.includes('〔默认偏好〕')`（与写路径/格式正本对齐）；
2. 若需兼容旧格式 `- 默认偏好:` 行，另行显式识别，不用裸子串；
3. `method_library_upsert` 的写后回读失败若发生在「文件已变」场景，至少如实区分
   `written-but-unverified`，不要只报通用失败。

倾向 1（最小、与 skill 的格式正本一致）；本卡不改代码。

## 修复判据

- [ ] provenance 含「默认偏好」但无 `〔默认偏好〕` 的条目，`isDefault` 为 false；
- [ ] 真标记条目仍 true；写路径的 `expectedDefault`/readback 与 fold 一致；
- [ ] 两个复现脚本的断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其他默认语法（旧 `- 默认偏好:` 行、全角/半角空白、marker 重复）的全部边界；
- 不证明真实浏览器/coach 来源标题的分布；不证明方法库之外默认消费的所有路径。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-082。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
