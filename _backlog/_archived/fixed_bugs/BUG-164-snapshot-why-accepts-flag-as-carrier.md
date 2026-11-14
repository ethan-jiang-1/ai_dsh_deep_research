---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-164：snapshot 的 --why 接受下一个 flag 当载体——`--why --port 3110` 静默通过

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — snapshot --why 拒绝 flag/缺值（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[scripts/lib/snapshot-mode.mjs](../../../scripts/lib/snapshot-mode.mjs)（`whyIndex + 1`）；
> 消费 = [snapshot-replay.entry.mjs](../../../scripts/smoke/snapshot-replay.entry.mjs) 的
> `--update-expected --why <载体>`；下游 = `staged-change-pairing` 的 `lastRewrite.why` 校验。

## 症状

`resolveSnapshotMode` 只判断 `--why` 的下一个 argv 是否为空，不判断它是不是另一个 flag：

```js
const why = whyIndex === -1 ? null : (argv[whyIndex + 1] ?? null)
if (updateExpected && (why === null || why.trim() === '')) throw ...
```

于是缺失值时，后面的 flag 被当成「载体」接受：

```sh
node --import tsx/esm -e "
import { resolveSnapshotMode } from './scripts/lib/snapshot-mode.mjs';
for (const argv of [
  ['--update-expected','--why','--port','3110'],
  ['--update-expected','--why','--case'],
]) console.log(JSON.stringify(resolveSnapshotMode({ argv })))
"
# {"readOnly":false,"updateExpected":true,"why":"--port"}
# {"readOnly":false,"updateExpected":true,"why":"--case"}
```

`snapshot-replay.entry` 会把这个值写进 `snapshot.json` 的 `lastRewrite.why`；`staged-change-pairing`
只在**提交时**发现 `why` 不是可解析路径（`--port` 不存在），而快照已经被改写。

## 复现

```sh
node --import tsx/esm -e "
import { resolveSnapshotMode } from './scripts/lib/snapshot-mode.mjs';
console.log(resolveSnapshotMode({ argv: ['--update-expected','--why','--port','3110'] }));
"
# 期望：抛「--why 必须带 <载体>」；实测：why='--port'
```

负对照：`--why none` 正常返回 `why='none'`；`--why` 在末尾 / `--why ''` 抛错——说明缺值分支
只覆盖了「没有下一个 token」，没覆盖「下一个 token 是 flag」。

## 根因（已证）

CLI 解析用位置取值，没有 token 类型校验；`--why <载体>` 的载体形态（仓内路径或 `none`）
没有在纯函数层判定。`--why=foo` 这种等号形态反而不被识别（`indexOf('--why')` 为 -1 → 抛错），
说明解析器只支持一种形态，却没有拒绝另一种「看起来像值」的 flag。

## 影响面

- 金标准重录的 `why` 可以写成 `--port` / `--case` 等非载体；`snapshot.json` 的审计链被污染。
- 错误在提交门才暴露（如果提交），或者永远不暴露（本地刷新后不提交），属于**验收证据静默降级**。
- 快照刷新是模型可见变更的核心证据；`why` 是唯一的变更理由记录。

## 牵出的失败类

- **C4 边界/解析**（缺值 token 与 flag token 同形）+ **C9 夹具/证据漂移**（写入了不可复核的理由）。
- 同机制第 **1** 次（W1-1 新判据核）；按类修：argv 解析要对「值以 `-` 开头」显式拒绝，或改为
  已知选项表 + 单值校验。

## 修复判据

- `resolveSnapshotMode` 在 `--why` 缺值、值为空、值以 `-` 开头时抛错；`none` 仍合法。
- 新增矩阵：`--update-expected --why --port 3110`、`--why --case`、`--why` 末尾、`--why ''`、
  `--why none`、`--read-only --update-expected`；期望与实测分列。
- 反证：先让新矩阵在旧实现上红（当前实测 `--port` 被接受），修后全绿。

## 修复关联

已修（2026-11-14）。P2 修理型，授权范围 = `scripts/lib/snapshot-mode.mjs` + `tests/checks/snapshot-readonly.test.mjs`；
不触产品代码，去向可记 `none — 机械修复`。

## 修复落地（2026-11-14）

- **改动**：`scripts/lib/snapshot-mode.mjs` 先 trim 再拒绝空值/以 `-` 开头的值；`tests/checks/snapshot-readonly.test.mjs` 增加 `--why --port 3110` / `--why --case` / 末尾缺值用例，`none` 保留。
- **证据**：`node --test tests/checks/snapshot-readonly.test.mjs` → 1/1 PASS；红证用例先在旧实现失败。
- **反证**：旧实现返回 `why:"--port"`；新矩阵 assert.throws 红；修后全绿。
