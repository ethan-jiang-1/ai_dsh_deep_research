---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-093：方法库四字段只认行首 `- 找来源:`——`*`/`+`/缩进/全角冒号写法被读成空段

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 四字段行支持 `*`/`+`/缩进/全角冒号；读空段不再静默（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`（`SECTION_PREFIXES` 精确
> `'- 找来源:'` 等，`line.startsWith(prefix)`）。

## 症状

方法库条目的四字段（找来源/怎么核实/报告怎么写/不承诺）用 Markdown 等价写法时被读成空：

```json
{"label":"canonical","sections":{"source":"a","verify":"b","report":"c","limit":"d"},"summary":"a"}
{"label":"asterisk","sections":{"source":null,"verify":null,"report":null,"limit":null},"summary":null}
{"label":"plus","sections":{"source":null,"verify":null,"report":null,"limit":null},"summary":null}
{"label":"indented","sections":{"source":null,"verify":null,"report":null,"limit":null},"summary":null}
{"label":"fullwidth colon","sections":{"source":null,"verify":null,"report":null,"limit":null},"summary":null}
```

即同一份库，只是把 `-` 换成 `*`/`+`、加两格缩进、或把冒号写成全角，UI 就显示四字段缺失、
摘要为 null；写库路径 `renderLibraryEntry` 又只生成 canonical `-`，读/写语法不对称。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/library-section-bullets.mjs
```


## 影响与触发面

- 用户手改/外部导入的库用 `*`/`+`/缩进/全角冒号时，条目看似存在但四字段全空；
- `summaryOfEntry` 返回 null，列表卡无摘要；详情/编辑态四字段空，保存时 `missingSectionKeys`
  会报缺失，或用户被迫重填；
- 与 BUG-054（lens 行的 bullet 变体）同族：同一份 Markdown 语义，解析器只认一种字面量；
- 不涉及默认/claim，但属于读面静默丢内容。

## 根因（已证）

- `SECTION_PREFIXES` 是字面量 `'- 找来源:'` 等，`line.startsWith(prefix)`；
- 不处理 Markdown bullet 变体、前导缩进、全角冒号；
- 写路径 `renderLibraryEntry` 只写 canonical `-`，读侧没有对称的宽松解析。

## 修法候选（未实施）

1. 共享 section-line 解析器：允许 `^\\s*[-*+]\\s*` + 四个标签 + `[:：]`，值 trim；
2. 或在导入/编辑时规范化 bullet/冒号并在写回时 canonical 化；
3. 保持写路径 canonical，读路径宽松；对无法解析的 section-like 行给 warning，不静默。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] `*`/`+`/两格缩进/全角冒号的四字段都能读出（值正确、summary 非 null）；
- [ ] canonical 写法行为不变；非 section 的普通 bullet 不被误收；
- [ ] `renderLibraryEntry` 写回仍 canonical；round-trip 稳定；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明所有 Markdown 空白/全角标点组合（如 `：` + 缩进 + 多空格）；
- 不证明旧格式 `调查要求`/`适用说明` 的兼容面；不证明 UI 编辑器是否会生成这些变体。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-093。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
