---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-084：方法库来源完成判据要求行首 `phase:`，run 模板写 `- phase:`——按模板交付的 run 永远不可选

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — run `phase:` 只认头部块且允许 `- phase:` 列表形态，正文假 phase 不认（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/method-library-source.ts:32`
> （`/^phase:\s*accepted\s*$/m`）对照
> `packages/deep-research-pack/content/templates/run/run.md:8`（`- phase: briefing ...`）。

## 症状

`isCompletedMethodSourceRun` 只接受**行首** `phase: accepted`：

```js
/acceptedHeader = \/^phase:\\s*accepted\\s*$\/m/
```

但 run 模板（`content/templates/run/run.md`）的状态头是 Markdown 列表：
`- schema: 2` / `- phase: briefing` / `- next: ...` / `- delivered: ...`。一个完全按模板
写成 `- phase: accepted` 的已交付 run：

- `isCompletedMethodSourceRun` 返回 **false**；
- 方法库「从 run 选择」不会把它列为可选来源；
- 只有 fixture/旧手写形态的裸 `phase: accepted` 才会 true。

`tests/fixtures/client-load-home/.../run.md` 的注释甚至明说「phase 行必须行首，写成
`- phase:` 不匹配」——**测试夹具迁就了谓词，而模板与谓词不一致**。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/source-phase-bullet.mjs
```

实测（2026-11-12）：

```json
{"label":"模板形态（- phase）","accepted":false}
{"label":"夹具形态（裸 phase）","accepted":true}
{"label":"非 accepted","accepted":false}
```

## 同函数第二形态（false positive）

正则只要求「行首」，没有限定 run.md 的状态头。一个 `- phase: review` 的 run，正文或代码块里
出现一行裸 `phase: accepted`，也会被判完成：

```sh
node --import tsx/esm runtime/explore-20261112/source-phase-false-positive.mjs
```

实测（2026-11-12）：`- phase: review` + 正文裸行 → `accepted:true`；代码块内裸行 →
`accepted:true`；`- phase: accepted` → `false`（BUG-084 主形态）。即同一谓词既**漏模板**又
**认正文**；修法应解析状态头，而不是只放宽 `-`。

## 影响与触发面

- 新 run 全部按模板写状态头；交付后想「把这次打法存成方法库来源」时，来源选择器看不见它；
- 用户可能误以为 run 未完成，或被迫手工把 `- phase:` 改成裸行（非模板形态）；
- 依赖 `hasLegacyAcceptance` 的旧 run 可能绕过；新 run 没有旧回执；
- 与 D28「run.md 状态头 = 声明」的格式合同冲突：模板是用户/Lead 的写作正本。

## 根因（已证）

- 模板用列表项 `- phase:`；
- `isCompletedMethodSourceRun` 的正则只认行首 `phase:`，没有 `(?:-\s*)?`；
- 测试 fixture 用裸 `phase:` 构造，未覆盖模板形态；消费面（方法库来源）因此永不命中新 run。

## 修法候选（未实施）

1. 正则接受两种形态：`/^(?:-\s*)?phase:\s*accepted\s*$/m`；
2. 或把模板改成裸 `phase:`（会改 run 格式正本，需更大决策）；
3. 更稳：抽 `runHeader` 解析器，模板/消费共用同一 heading/bullet 口径。

倾向 1（最小、向后兼容）；本卡不改代码。

## 修复判据

- [ ] 模板形态 `- phase: accepted` 的已交付 run 被 `isCompletedMethodSourceRun` 判 true；
- [ ] 裸 `phase: accepted` 的旧形态仍 true；`- phase: review` 仍 false；
- [ ] `- phase: review` + 正文/代码块裸 `phase: accepted` **不得**被判完成；
- [ ] 方法库来源选择在真实 run/fixture 上能看到模板形态；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明所有 run.md 状态头的解析（`delivered`/`parked`/`next`）都一致；
- 不证明 UI 来源选择器的完整交互；不证明旧 run 的 legacy acceptance 覆盖。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/method-library-read.test.mjs` BUG-084。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
