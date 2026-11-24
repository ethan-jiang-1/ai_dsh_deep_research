---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-411：方法库工具卡运行态读不到流式入参，set_default 显示成「正在清除默认偏好…」

> 严重级别：P2（影响面小：纯观察面文案/详情，不阻断主路径）｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：运行态动作三态（set/clear/未知中性）+ 流式字段容错提取；未知不冒充方向；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在方法库页点「设为默认」后，对话流里的 `method_library_set_default` 工具卡在**运行态**显示：

```
… 正在清除默认偏好…
```

而实际动作是**设置**默认。等工具结算后才纠正成 `✓已设默认：<名>`。用户在运行期间看到的是反方向的描述（清默认 ≠ 设默认），且运行态也不带方法名。

## 分诊与授权

- 严重级：P3 — 纯展示层的动词错位，持续时间为工具运行窗口（短），不改变任何落盘结果。
- 表面 / 边界：cockpit UI（[MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)）/ ② UI 边界。
- DSH 不变量：model-visible ⟺ logged 的对偶面——UI 陈述的动作必须与实际工具调用一致（不得把 `set` 说成 `clear`）。
- 触及面：none — 观察面 client + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 运行态（block 无 `kind`）传入**流式截断前缀** `{"action":"set","name":"名称B"` 即渲染成 clear 文案；传入完整 JSON 则正确。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import React from "react";
import { installClientDom, loadRtl, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { MethodLibraryToolCard } from "./packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx";
import { METHOD_LIBRARY_DEFAULT } from "./packages/deep-research-pack/src/client/keys.ts";
installClientDom();
const { render, cleanup } = await loadRtl();
const { container } = render(React.createElement(MethodLibraryToolCard, {
  toolName: METHOD_LIBRARY_DEFAULT,
  t: makeTranslator(zh),
  block: { argsRaw: "{\"action\":\"set\",\"name\":\"名称B\"" },
}));
console.log("RUNNING_TEXT=", container.textContent);
assert.doesNotMatch(container.textContent ?? "", /清除/);
cleanup();
'
```

实测输出：`RUNNING_TEXT= …正在清除默认偏好…`（断言红）；完整 JSON 时输出 `…正在设定默认偏好…`（正确）。

## 根因（已证）

[MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)（约第 22–28 行）：

```ts
const args = parseArgsObject(argsRaw) as {...} | null
...
const defaultAction = args?.action === 'set' ? 'set' : 'clear'
```

`parseArgsObject` 按设计对**截断前缀返回 null**（流式期间的正常形态，见 [tool-card.ts](../../../packages/deep-research-pack/src/lib/events/tool-card.ts) 第 29–35 行），而 `defaultAction` 的兜底分支写成了 `'clear'` → 运行态（参数尚未闭合时）恒被当成 clear。结算后 `args` 可解析，故只在运行窗口错。

同类兜底不一致：运行态 `name` 也只从可解析 args 取，参数截断时必然空（`remove` 的运行文案不含名，故不可见；`set_default` 的文案不再拼名，故只表现为动词错）。

## 牵出的失败类

- 同机制第 1 次（「无法解析的入参」被静默当成某个具体语义，而不是「未知」）｜处置：点修 + 补一条运行态截断前缀的渲染回归（与 [BUG-400](../../_archived/fixed_bugs/BUG-400-method-library-tool-card-remove-ignores-name.md) 同一张卡族）。

## 修法方向

- 把 `defaultAction` 改为三态：`args?.action === 'set' ? 'set' : args?.action === 'clear' ? 'clear' : null`；`null` 时用一个**不指定方向**的运行中键（如新增 `toolDefaultRunning: '正在更新默认偏好…'`，zh/en 同 diff），或复用 `toolSaveRunning` 的中性措辞；
- 顺带核对 `args === null` 时的其它回退是否也把"未知"折成了某个具体语义。

## 修复判据

- 复现脚本断言为绿：运行态截断前缀渲染中性「正在更新默认偏好…」（zh/en 各一条），不再出现「清除」；
- 运行态完整 `{"action":"clear"}` 仍显示「正在清除默认偏好…」、完整 `{"action":"set"}` 仍显示「正在设定默认偏好…」（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 defaultAction 改回二元兜底（`action === 'set' ? 'set' : 'clear'`）或删 stringFieldOfArgsRaw → 截断前缀的 set 显示成「正在清除默认偏好…」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/events/tool-card.ts",
    "packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "tests/run/shared/tool-card.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-411 运行态截断前缀' tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "exit": 1,
    "output": "运行态渲染「正在清除默认偏好…」（doesNotMatch 命中；截断前缀的 set 被兜底成 clear）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-411 运行态截断前缀' tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs"
  }
}
```
