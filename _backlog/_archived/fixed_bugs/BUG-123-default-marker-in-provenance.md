---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-123：isDefault 精确标记仍看整条 title——provenance 里含〔默认偏好〕被误判默认（render 可生成）

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 默认标记只认 provenance 括号外，`（〔默认偏好〕）` 不再误判默认（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`
> （BUG-082 把 `isDefault` 从裸子串收窄到 `title.includes('〔默认偏好〕')`，但没有排除
> `（provenance）` 段）。

## 症状

标记出现在 provenance 括号内，不是独立的默认标记：

```json
{"label":"no marker","name":"方法","provenance":"来源","isDefault":false}
{"label":"marker as provenance","name":"方法","provenance":"〔默认偏好〕","isDefault":true}
{"label":"real marker","name":"方法","provenance":"来源","isDefault":true}
{"label":"rendered provenance with marker","name":"方法","provenance":"〔默认偏好〕","isDefault":true}
```

`renderLibraryEntry({provenance:'〔默认偏好〕'})` 会生成 `## 方法（〔默认偏好〕）`，fold 立即把
该条目标成默认；UI/prompt 的默认消费会误用。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/library-default-marker-in-provenance.mjs
```


## 影响与触发面

- provenance 来自来源/coach/旧库导入；来源名例如「默认偏好实验」不会含标记，但用户可写出；
- `findDefaultMethod`/UI 默认标记/`research:defaults` 方法行误认；
- 默认唯一性/保存校验可能被假默认干扰；
- 与 BUG-082 同函数，修复只收窄了子串，没有区分标记位置。

## 根因（已证）

- `isDefault: title.includes('〔默认偏好〕')` 对整条标题做子串；
- `（...）` provenance 段内的同形文字没有被排除；
- `renderLibraryEntry` 会把 provenance 原样放进括号，形成合法-looking 的假默认。

## 修法候选（未实施）

1. 解析标题为 name + 可选 provenance + 标记段，只认 **括号外** 的 `〔默认偏好〕`；
2. 或从 title 去掉第一个 `（...）` 段后再查标记；
3. 对 provenance 内的标记做转义/拒绝（但会改用户来源文本）。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] `## 方法（〔默认偏好〕）` isDefault=false；真实标记 `## 方法（来源）〔默认偏好〕` true；
- [ ] `renderLibraryEntry` 的 provenance 标记不再制造默认；
- [ ] 复现脚本 marker-as-provenance false；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明同名/多标记/全角空白等其它标题形态；不证明默认消费面的完整链路。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-123。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
