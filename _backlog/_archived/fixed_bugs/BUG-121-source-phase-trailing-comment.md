---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-121：isCompletedMethodSourceRun 的 phase 行不接受尾部注释——模板带 `#` 注释，accepted 被读成未完成

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — run `phase: accepted` 接受行尾 `#` 注释，review 注释仍判未完成（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/method-library-source.ts`
> （`acceptedHeader` 的 `^(?:-\s*)?phase:\s*accepted\s*$`）。
> 背景：BUG-084 修复接受 `- phase:` / 裸 `phase:`，但没有接受行尾 `#` 注释。

## 症状

run 模板的状态头本身就是带注释的形态（`- phase: briefing  # ...`）。把值改成 accepted 后：

```json
{"line":"- phase: accepted","accepted":true}
{"line":"- phase: accepted   # done","accepted":false}
{"line":"- phase: accepted # briefing | research | accepted","accepted":false}
```

合法的 `accepted` 加尾部注释被判未完成，方法库来源选择器看不到该 run。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/source-phase-trailing-comment.mjs
```

## 影响与触发面

- 用户/Lead 按模板写 `- phase: accepted   # ...`，run 已完成但不可选为方法来源；
- 模板的枚举注释是自然写法，修复只处理了 bullet 前缀，没处理行尾注释；
- 与 BUG-084（phase 行形态）同函数，属于不完整修复；
- 只影响方法来源 eligible，不影响 run 本身。

## 根因（已证）

- `acceptedHeader` 正则以 `\s*$` 结束；`#` 不是空白，被当作值的一部分；
- 没有先剥 Markdown 行尾注释；
- 测试只覆盖 `- phase: accepted` / 裸行，没有注释形态。

## 修法候选（未实施）

1. 允许 `\s*(?:#.*)?$`（仅注释，不接受其它尾随文本）；
2. 或先剥行尾 `#` 注释再匹配；
3. 对 `phase` 值做 token 解析（accepted 后允许空白/注释）。

倾向 1；本卡不改代码。

## 修复判据

- [ ] `- phase: accepted   # done` 判 true；裸/`- phase:` 仍 true；
- [ ] `- phase: review # ...` 仍 false；正文/代码块 accepted 不冒充（BUG-084 保持）；
- [ ] 复现脚本 accepted 全 true；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其它行尾装饰（全角注释/HTML 注释）；不证明真实 run.md 的注释分布。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/method-library-read.test.mjs` BUG-121。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
