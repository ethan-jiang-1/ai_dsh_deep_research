---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-182：model-workflow 又写了一份 onKeysOf——`workflow_dispatch: {}` 被判「没有事件」

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 CI/with-key 合同，需用户放行
>
> 位置：[tests/checks/model-workflow.test.mjs](../../tests/checks/model-workflow.test.mjs) 的本地
> `onKeysOf`；共享件 = [scripts/lib/ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs) 的 `eventKeys`；
> 前科 = BUG-163（触发面白名单）。

## 症状

BUG-163 修复后，`model-workflow.test.mjs` 仍保留自己的 `onKeysOf`（没有复用 `ci-workflow` 的
`parseEvents`/`eventKeys`）。它的正则只接受 `^  key:$`，因此 GitHub 合法的空映射
**`workflow_dispatch: {}`** 被解析成 `[]`：

```sh
cp .github/workflows/model-smoke.yml /tmp/ms.bak
python3 - <<'PY'
from pathlib import Path
p=Path('.github/workflows/model-smoke.yml')
p.write_text(p.read_text().replace('on:\n  workflow_dispatch:\n', 'on:\n  workflow_dispatch: {}\n', 1))
PY
node --test tests/checks/model-workflow.test.mjs
# not ok 1 - model-smoke：只 workflow_dispatch，不进 PR/push
#   model-smoke 的 on: 只能有 workflow_dispatch（…）      ← 假红
cp /tmp/ms.bak .github/workflows/model-smoke.yml
```

共享 `eventKeys` 对同一文本也返回 `[]`（`parseEvents` 的正则同样只认 `key:` 空值）。所以这不是
测试单点，而是 **on: 解析的两份实现同时漏掉 `{}`**。

## 根因（已证）

- C3：`onKeysOf` 是 `ci-workflow` 的**第二份实现**（BUG-163 的修复没把测试切到共享件）；
- C4：`parseEvents` 的键正则 `^\s{2}([A-Za-z_][\w-]*):\s*(?:#.*)?$` 只接受空值/行尾注释，
  不接受 `{}`（空映射）或 `{ inputs: ... }`（带 inputs 的 mapping 首行）；
- 两份实现对同一合法 YAML 给出同一个错误答案，未来修一处仍会漂移。

## 影响面

- 给 `model-smoke.yml` 的 `workflow_dispatch` 加 inputs（`workflow_dispatch: {inputs: ...}`）或
  写成 `{}`（常见空映射）时，测试假红；维护者会被迫改回不规范的裸冒号。
- C3 双份解析：`ci-workflow` 的 `eventKeys` 修复不会自动传到 `model-workflow`；下一次
  `pull_request_target` 类门禁仍可能在两份实现间漂移。

## 牵出的失败类

- **C3 双份事实** + **C8 假红 / C4 边界**。
- 同机制第 **2** 次（163 否定词表 → 本条第二份解析器 + 空映射）。类修：`model-workflow` 只
  import `eventKeys`；`parseEvents` 接受空值、`{}`、`{ ... }` 行内 mapping 与行尾注释；一个解析器。

## 修复判据

- `onKeysOf` 从 `model-workflow.test.mjs` 删除，改用 `eventKeys(parseWorkflow(TEXT))`。
- `parseEvents` 接受 `key:`、`key: {}`、`key: { inputs: ... }`、`key: # comment`；`on: [a,b]` 仍认。
- 反证：`workflow_dispatch: {}` / `{ inputs: ... }` → 事件集合仍 `['workflow_dispatch']`，测试绿；
  加入 `pull_request_target:` → 仍红；还原裸冒号 → 绿；`tests/checks/ci-workflow.test.mjs` 增形态。

## 修复关联

未修。触面 = CI/with-key 合同，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；
可与 BUG-163 的触发面同批。
