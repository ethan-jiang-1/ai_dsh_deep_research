---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-395：tests/cockpit/client-dom-helpers.mjs 未绑定 DOMParser，渲染含公式的真实报告即崩溃

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：`client-dom-helpers.mjs` 补齐 `DOMParser: win.DOMParser` 绑定；去向：none；审查：agent — JSDOM TeX 渲染回归。

## 症状

在 `node:test` + JSDOM 下使用 [client-dom-helpers.mjs](../../../tests/cockpit/client-dom-helpers.mjs) 挂载 `ResearchFinalTab` 渲染真实归档报告（例如含数学/TeX 片段的 `drt_api-selection-ds-openai/final/v1.md`）时，`@deepseek-ai/dsh-client-ui-primitives` 的 `MarkdownText` 调用 `renderTexToReact`，因 `globalThis.DOMParser` 未绑定而抛出 `ReferenceError: DOMParser is not defined`。

## 分诊与授权

- 严重级：P2 — 阻碍 L0 JSDOM 客户端行为测试直接消费真实归档报告，使真实样本回归被迫回退到最小 stub。
- 表面 / 边界：test infra（[client-dom-helpers.mjs](../../../tests/cockpit/client-dom-helpers.mjs)）/ ② 行为（JSDOM）。
- DSH 不变量：不适用（测试环境底座补齐）。
- 触及面：none — 测试共享助手。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 用 `ResearchFinalTab` 渲染含 `$a + b$` 数学公式的 Markdown 即稳定抛 `ReferenceError`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
const { ResearchFinalTab } = await import("./packages/deep-research-pack/src/client/ResearchFinalTab.tsx");
const { render, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({ tree: { drt_demo: { "final.md": "# Title\n\nMath: $a + b = c$\n" } } });
render(createElement(ResearchFinalTab, {
  sessionId: "s-395", t: makeTranslator(zh),
  useTabInfo: () => ({ tab: { navigation: { address: "dsh-resource://file/session/s-395/drt_demo/final.md" }, visible: true, actions: { openTab: () => {} } } }),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
cleanup();
'
```

## 根因（已证）

[client-dom-helpers.mjs](../../../tests/cockpit/client-dom-helpers.mjs)（第 52–77 行）把 `window`、`document`、`HTMLElement` 等绑定到 `globalThis`，但遗漏了 `DOMParser: win.DOMParser`。

## 牵出的失败类

- 同机制第 1 次｜处置：实例修（补齐 JSDOM globalThis 绑定，并加一条含数学公式 `MarkdownText` 的 `ResearchFinalTab` 测试）。

## 修法方向

- 在 `client-dom-helpers.mjs` 的 `bindings` 增加 `DOMParser: win.DOMParser`。

## 修复判据

- 含行内/块级 LaTeX 公式（`$...$`）的真实报告在 `ResearchFinalTab` JSDOM 测试中正常渲染，不再抛 `DOMParser is not defined`。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "tests/cockpit/client-dom-helpers.mjs",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --input-type=module -e 'import { createElement } from \"react\"; import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from \"./tests/cockpit/client-dom-helpers.mjs\"; import { zh } from \"./packages/deep-research-pack/src/client/locales.ts\"; const { ResearchFinalTab } = await import(\"./packages/deep-research-pack/src/client/ResearchFinalTab.tsx\"); const { render, cleanup, act } = await loadRtl(); const run = makeMaliciousRunSource({ tree: { drt_demo: { \"final.md\": \"# Title\\n\\nMath: $a + b = c$\\n\" } } }); render(createElement(ResearchFinalTab, { sessionId: \"s-395\", t: makeTranslator(zh), useTabInfo: () => ({ tab: { navigation: { address: \"dsh-resource://file/session/s-395/drt_demo/final.md\" }, visible: true, actions: { openTab: () => {} } } }), useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined, runSource: () => run.source, visible: true })); await flushUi(act); cleanup();'",
    "exit": 1,
    "output": "ReferenceError: DOMParser is not defined"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --test tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
