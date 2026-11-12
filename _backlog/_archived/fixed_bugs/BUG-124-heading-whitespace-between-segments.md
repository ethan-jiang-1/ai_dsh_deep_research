---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-124：heading 段间空白——fold 接受 `## 方法 （来源）` / `（来源） 〔默认偏好〕`，upsert 只认无空白段，同名被复制

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — heading 段间允许空格，`## 方法 （来源） 〔默认偏好〕` upsert 仍 updated（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/method-library-write.ts`
> （`methodHeadingPattern` 的 `(?:(?:（…）)|(?:〔…〕))*` 段间无 `\s*`）对照
> `library-fold.ts`（`foldLibrary` 对 name/provenance 做 trim、对整条 title 查标记）。

## 症状

标题在 name/provenance/标记之间带空格：

```json
{"heading":"## 方法（来源）〔默认偏好〕","beforeName":"方法","beforeDefault":true,"action":"updated","duplicateNames":1}
{"heading":"## 方法（来源） 〔默认偏好〕","beforeName":"方法","beforeDefault":true,"action":"created","duplicateNames":2}
{"heading":"## 方法 （来源）","beforeName":"方法","beforeDefault":false,"action":"created","duplicateNames":2}
```

无空格形态 `updated`（正确）；有空格形态被当 `created`，写后产生两条同名条目。
自然写法（`## 方法 （来源）`、`（来源） 〔默认偏好〕`）即可触发。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/heading-whitespace-between-segments.mjs
```


## 影响与触发面

- 用户/导入库在 name、provenance、默认标记之间留空格 → 保存同名条目复制而不是更新；
- 复制后 set-default/remove 因「重名」拒绝，只能手工修；
- `foldLibrary` 的 name/provenance 已 trim，读面认为同一条；写面正则不认——读/写语法不对称；
- 与 BUG-085（顺序）同函数，修复允许任意顺序但没有允许段间空白。

## 根因（已证）

- `methodHeadingPattern`：`name` 后直接 `(?:(?:（…）)|(?:〔…〕))*\s*$`；段间空格使重复中断；
- 末尾 `\s*` 只能吞掉最后一段之后的空白，不能吞段间；
- `foldLibrary` 对标题做 trim/切片，接受这些空格。

## 修法候选（未实施）

1. 段间允许 `\s*`：`(?:\s*(?:（…）|〔…〕))*`；
2. 或抽共享 heading 解析器，按 name + 段序列解析（fold/write 同源）；
3. 写前规范化标题空白，但会改用户文本。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] `## 方法 （来源）` / `（来源） 〔默认偏好〕` 的 upsert 为 updated，不新增同名；
- [ ] 无空格/正序/反序形态不回归；真重名仍拒；
- [ ] 复现脚本 duplicateNames=1；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明全角空白/多空格/换行 heading；不证明所有新旧库的空白形态。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-124。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
