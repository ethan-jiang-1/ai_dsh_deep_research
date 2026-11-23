---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-400：MethodLibraryToolCard 对 method_library_remove 只读 args.entry 忽略 args.name，卡片名称永远退化成「方法条目」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：remove 卡从 args.name 取名称；upsert 仍从 entry 标题取（负控）；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在 Method Editor 会话的聊天流中调用 `method_library_remove` 删除某条方法（例如 `{ name: "比较分析法", operationId: "op-123" }`）时：
- 工具结果卡片 `MethodLibraryToolCard` 总是渲染成「✓已删除库：方法条目」（或错误态「✕未能删除：方法条目」），始终丢失被删方法的真实名称；
- 用户无法从工具卡片一眼分辨到底删了库里的哪一条方法。

## 分诊与授权

- 严重级：P2 — 方法库删除工具卡片核心标识缺失，但不破坏磁盘数据与操作结果。
- 表面 / 边界：cockpit UI（[MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx) × [method-library-tool.ts](../../../packages/deep-research-pack/src/method-library-tool.ts)）/ ② UI 边界。
- DSH 不变量：Model-visible ⟺ logged / UI fidelity — 工具卡片展示目标应忠实反映工具参数实际目标。
- 触及面：none — UI 卡片单文件 + 单测。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 传入真实 `method_library_remove` 工具参数 `{ name: '比较分析法', operationId: 'op-123' }` 渲染 `MethodLibraryToolCard`，输出 `✓已删除库：方法条目` 而非 `/比较分析法/`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { installClientDom } from "./tests/cockpit/client-dom-helpers.mjs";
installClientDom();
const React = await import("react");
const { render, cleanup } = await import("@testing-library/react");
const zh = (await import("./packages/deep-research-pack/src/client/locales/zh.ts")).default;
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replaceAll(`{${x}}`, String(y)), zh[k] ?? k);
const { MethodLibraryToolCard } = await import("./packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx");
const { METHOD_LIBRARY_REMOVE } = await import("./packages/deep-research-pack/src/client/keys.ts");
try {
  const { container } = render(React.createElement(MethodLibraryToolCard, {
    toolName: METHOD_LIBRARY_REMOVE,
    t,
    block: { kind: "result", isError: false, call: { argsRaw: JSON.stringify({ name: "比较分析法", operationId: "op-123" }) } },
  }));
  console.log("TOOL_CARD_TEXT=", container.textContent);
  assert.match(container.textContent ?? "", /比较分析法/);
} finally {
  cleanup();
}
'
```

## 根因（已证）

1. [method-library-tool.ts](../../../packages/deep-research-pack/src/method-library-tool.ts) 定义 `method_library_remove` 的入参 schema 为 `{ name, operationId }`，并不包含 `entry` 字段；
2. [MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx) 虽然在类型注解里写了 `{ entry?: unknown; action?: unknown; name?: unknown }`，但第 24–29 行只读取并正则解析 `args?.entry`，未回退读取 `args?.name`，导致 `removing` 分支里的 `name` 恒为空字符串、`target` 恒回退为 `props.t('methodEntries')`。

## 牵出的失败类

- 同机制第 1 次｜处置：点修 + 为 `MethodLibraryToolCard` 覆盖 `method_library_upsert` / `method_library_remove` / `method_library_set_default` 三工具的真实参数 shape 回归测试。

## 修法方向

- 在 [MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx) 提取 `entryName` 后，对 `typeof args?.name === 'string'` 做非空 trim 回退（即 `const argName = typeof args?.name === 'string' ? args.name.trim() : ''; const name = entryName || argName`）；
- 为三个 `method_library_*` 工具分别补齐与后端 schema 对齐的渲染单测。

## 修复判据

- 传入 `{ name: "比较分析法", operationId: "op-123" }` 渲染 `method_library_remove` 时，卡片显示 `✓已删除库：比较分析法`；同时 `method_library_upsert` 与 `method_library_set_default` 既有渲染保持正常；
- 对应组件单测及 `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 remove 的名称来源改回 `args.entry`（remove 入参没有 entry）→ 名称恒空退化成「方法条目」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx",
    "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-400 删除卡：名称' tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "exit": 1,
    "output": "The input did not match /已删除库：方案比较/：实际渲染「已写入库：方法条目」（名称被 entry 路径吞成占位）"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs"
  }
}
```
