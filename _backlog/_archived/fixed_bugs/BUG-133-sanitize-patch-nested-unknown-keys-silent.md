---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-133：sanitizePatch 对 output/source 的未知子键「静默忽略」——与头注「未知子键拒绝」相反，拼错即丢

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — sanitizePatch 把 output/source 未知子键并入 problems，拼错不再静默丢失（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/research-defaults.ts` 的 `sanitizePatch`（347-385 行）。
> 其头注明写：「**output/source 的未知子键拒绝**；空 output/source 拒绝（清空走 unset）」。

## 症状

`set` 的 patch 里，顶层未知键会被**拒绝**，但 output/source 的未知子键被**静默丢弃**、写入照常成功：

```js
sanitizePatch({ efort: 'deep' })
// → { patch: {}, problems: [efort:not-allowed] }            ← 拒绝（正确）

sanitizePatch({ output: { shape: 'full_report', audiance: 'CFO' } })
// → { patch: { output: { shape: 'full_report' } }, problems: [] }
//    ← audiance（拼错）被静默丢弃，无 error 无 warning

sanitizePatch({ source: { familes: ['official'] } })
// → { patch: {}, problems: [] }
//    ← 整条 source 丢了，无 error；runSet 随后只报 bad-request empty-patch（误导）
```

命令实际行为（实测）：`/research-defaults set {"patch":{"output":{"shape":"full_report","audiance":"CFO"}}}`
→ `ok revision=2 output=full_report`，文件里没有 audience——用户以为设置了读者，实际没有。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { sanitizePatch } from './packages/deep-research-pack/src/lib/research-defaults.ts';
console.log(JSON.stringify(sanitizePatch({ output: { shape: 'full_report', audiance: 'CFO' } })));
console.log(JSON.stringify(sanitizePatch({ source: { familes: ['official'] } })));
"
# 期望：problems 含 output.audiance:unknown / source.familes:unknown（拒绝或显式告警）
# 实测：problems 均为 []
```

## 根因（已证）

`normalizeOutput`/`normalizeSource` 把未知子键写进 **warnings** 数组；`sanitizePatch` 调用时传入的
warnings 是**临时空数组 `[]`**，随后被丢弃：

```js
const normalized = normalizeOutput(patch.output, problems, [])   // warnings 丢掉
const normalized = normalizeSource(patch.source, problems, [])   // 同上
```

于是「未知子键拒绝」的合同从未执行；顶层未知键（for 循环）走 problems 才被拒。

## 影响面

- **拼错即丢**：`audiance`/`familes`/`authorityy` 等拼写错误被静默忽略，用户以为设置成功；
- **诊断误导**：source 全是未知子键时 patpi 为空 → `error bad-request empty-patch`，用户看到的错误
  与真实原因（键名拼错）无关；
- 与 BUG-131（文件里的未知键 warnings 无人消费）叠加：两条路径都不告诉用户键名错了；
- 面板走 `sanitizePatch` 前置校验（`store.setPatch` 里 `sanitized.problems.length > 0` → 显示 invalid），
  但**未知子键永远不进 problems**，所以面板同样放行并丢字段。

## 修复判据

1. `sanitizePatch` 把 output/source 的未知子键并入 **problems**（`code: unknown`/`not-allowed`），
   与顶层未知键一致；或至少作为可被命令/面板消费的 **warnings** 返回并上屏（不可丢进 `[]`）；
2. 先红后绿：上表两条——修复前 problems=[] 且写入成功（红）；修复后 `error invalid output.audiance:unknown`
   / `source.familes:unknown`，文件不被写（或保留原键并明确告警）；
3. 回归：合法 patch（shape+audience、families+authority+recency）、空 output/source 拒绝、
   顶层未知键拒绝、`sanitizePatch` 的既有测试不变；
4. 与 [BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md) 统一「未知键」的词表：错误码、面板文案、
   命令返回文本同源；
5. `pnpm test` + `pnpm verify` 绿；client-load 面板断言「拼错子键 → 显示 invalid 且不写」。

## 修复关联

头注与实现的自相矛盾（合同写了「拒绝」，实现只丢弃）是本条的核心；与
[BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md)（warnings 无消费者）同源。发现方式 =
D50 写入面梳理（sanitizePatch 的 warnings 实参追踪）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/research-defaults.test.mjs` + `defaults-command` BUG-133。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
