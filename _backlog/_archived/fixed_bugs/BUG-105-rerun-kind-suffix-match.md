---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-105：rerun kind 正则用 `\b`——`polish-extra` / `structural-extra` 被截成合法 kind

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — rerun kind 边界改为 `(?=\s|·|$)`，`polish-extra` 不再截断（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-version.ts`（`rerunDeclarationOf` 的
> `(evidence-expansion|polish|structural)\b`）。

## 症状

question.md 的 rerun 声明写了非法 kind：

```json
{"line":"> rerun: v2 · polish 2026-11-12","rerun":{"version":2,"kind":"polish","date":"2026-11-12"},"state":"rerun-in-progress"}
{"line":"> rerun: v2 · polish-extra 2026-11-12","rerun":{"version":2,"kind":"polish","date":"2026-11-12"},"state":"rerun-in-progress"}
{"line":"> rerun: v2 · structural-extra 2026-11-12","rerun":{"version":2,"kind":"structural","date":"2026-11-12"},"state":"rerun-in-progress"}
```

`polish-extra` / `structural-extra` 不是合法 kind，但 `\b` 在 `h`/`l` 与 `-` 之间成立，
正则截到前面的合法前缀，声明被当成合法。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/rerun-kind-suffix-match.mjs
```

## 影响与触发面

- 非法/手误 kind 被静默归为 polish/structural；版本面状态与 kind 标签错误；
- 本该「未声明/不解析」的 rerun 被当成进行中，影响 delivered/rerun 状态与提示；
- 与 BUG-102（版本作用域）同族：正则边界过宽，非法输入被截成合法值；
- 其它后缀（`evidence-expansion-extra`、大小写、全角分隔）也需同类边界。

## 根因（已证）

- `(evidence-expansion|polish|structural)\b` 的 `\b` 只要求单词边界，`-` 是边界；
- 没有要求 kind 后必须跟 `·`/空白/行尾；
- `rest` 仍被接受并供日期解析。

## 修法候选（未实施）

1. 改为 `(evidence-expansion|polish|structural)(?=\s|·|$)`（或 `(?=\s|·)`）；
2. 解析后校验 kind ∈ 闭集，且分隔符/日期位置符合模板；
3. 非法声明返回 null，不进入 rerun 状态。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] `polish-extra` / `structural-extra` 不再产生 rerun；合法 `polish`/`structural` 仍识别；
- [ ] `evidence-expansion` 仍识别；无日期/占位符仍拒绝；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明全角分隔符/大小写等其它变体；不证明 rerun 状态与交付版本的完整交互。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/run-version.test.mjs` BUG-105。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
