---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-190：ci-workflow 不认 `on:` 的 inline flow mapping——合法 `on: { workflow_dispatch: {} }` 假红

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI/with-key 合同，需用户放行
>
> 位置：[scripts/lib/ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs) 的 `parseEvents`；
> 消费 = model-workflow / smoke 执行面；前科 = BUG-182（`{}` empty map）。

## 症状

`parseEvents` 只处理两种形态：`on:` 单行标量 / `on:` 块下的 2 空格键。对合法的 YAML flow mapping
`on: { workflow_dispatch: {} }`，它把整个 `{ … }` 当成一个 event 字符串：

```sh
node --import tsx/esm -e '
import { eventKeys, parseWorkflow } from "./scripts/lib/ci-workflow.mjs";
console.log(eventKeys(parseWorkflow("on: { workflow_dispatch: {} }\n")));
// [ '{ workflow_dispatch: {} }' ]
'
```

`model-workflow` 的 exact-set 断言因此把合法 workflow 判红。块形态 `workflow_dispatch : {}`
（冒号前有空格，YAML 合法）也被解析成 `[]`。

## 根因（已证）

- `parseEvents` 的 inline 分支走 `parseList`，而 `parseList` 只认 `[...]` 序列与单标量，不认
  `{...}` mapping；
- 块分支的键正则要求 `key:` 紧邻，不接受 key 与冒号之间的空格；
- flow mapping 内部的 `pull_request_target: …` 等事件键没有展开，白名单无法看到。

## 影响面

- 合法的 `on: { workflow_dispatch: {} }` 或 `on: { workflow_dispatch: { inputs: ... } }` 被
  model-workflow 判红；维护者被迫改成块形态。
- 如果 flow mapping 里藏了 `push`/`pull_request_target`，eventKeys 返回一个字符串，白名单
  exact-set 仍会红（安全方向），但错误原因指向「未知事件串」而不是真实事件；诊断质量下降。
- 与 BUG-182 同族：`on:` 的另一半形状没有统一解析。

## 牵出的失败类

- **C3/C8**（解析器形状窄于 YAML + 假红）+ **C4 边界**。
- 同机制第 **2** 次（182 empty map → 本条 flow mapping/space-colon）。类修：`on:` 解析走
  「块 / flow sequence / flow mapping / 单标量」四形态；flow mapping 展开键；键允许 `\s*:`。

## 修复判据

- `on: { workflow_dispatch: {} }` → `['workflow_dispatch']`；
- `on: { workflow_dispatch: { inputs: { x: { type: string } } } }` → `['workflow_dispatch']`；
- `on: { workflow_dispatch: {}, pull_request_target: {} }` → 两键可见；
- 块形态 `workflow_dispatch : {}`（冒号前空格）→ 认；
- 反证：上面四例先红后绿；`tests/checks/ci-workflow.test.mjs` / `model-workflow.test.mjs` 增形态。

## 修复关联

未修。触面 = CI/with-key 合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
