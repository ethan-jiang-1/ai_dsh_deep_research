---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-163：model-smoke 的触发面只禁 pull_request/push——pull_request_target 仍绿

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — model-smoke on: 键集合恰为 workflow_dispatch（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[tests/checks/model-workflow.test.mjs](../../../tests/checks/model-workflow.test.mjs)；
> 合同正本 = [.github/workflows/model-smoke.yml](../../../.github/workflows/model-smoke.yml)
> （只手动触发；secret 注入 `DEEPSEEK_API_KEY`）。

## 症状

`model-workflow` 断言：

```js
assert.match(TEXT, /^on:\s*\n\s+workflow_dispatch:\s*$/m)
assert.doesNotMatch(TEXT, /^  pull_request:/m)
assert.doesNotMatch(TEXT, /^  push:/m)
```

第一条只匹配 `on:` 后紧接的 `workflow_dispatch:` 两行，不检查 `on:` 块是否还有别的键；
两条否定断言只覆盖 `pull_request:` 与 `push:`。加入 `pull_request_target:` 后测试仍 **2/2 PASS**。

## 复现（2026-11-14 实测）

```sh
cp .github/workflows/model-smoke.yml /tmp/model-smoke.bak
python3 - <<'PY'
from pathlib import Path
p = Path('.github/workflows/model-smoke.yml')
t = p.read_text()
old = 'on:\n  workflow_dispatch:\n'
new = 'on:\n  workflow_dispatch:\n  pull_request_target:\n'
assert old in t
p.write_text(t.replace(old, new, 1))
PY
node --test tests/checks/model-workflow.test.mjs
# ok 1 - model-smoke：只 workflow_dispatch，不进 PR/push
# ok 2 - model-smoke：用 secret 注入 key，跑 l4-lite.e2e
# # tests 2 / # pass 2 / # fail 0      ← 应红
cp /tmp/model-smoke.bak .github/workflows/model-smoke.yml
```

## 根因（已证）

判据是**否定词表**（只列 `pull_request`/`push`），不是「`on:` 的键集合恰为
`{workflow_dispatch}`」。`pull_request_target`、`workflow_run`、`release` 等事件都能让一个
带 secret 的 with-key workflow 在非手动场景触发，而测试只认识两个历史词。

## 影响面

- `pull_request_target` 是 GitHub 上带 secret 的高危触发面；虽然当前 `actions/checkout`
  默认取 base ref，但合同句「只 workflow_dispatch」已被违反，测试仍绿。
- 真模型档的预算/日志/secret 暴露面：任何非手动触发都该由门禁拦住。
- 当前 `on:` 只有 `workflow_dispatch`，属门禁钝化而非现行故障（P2）。

## 牵出的失败类

- **C7 假绿**（安全/CI 合同）+ **C11 文档/合同漂移**（测试标题声称「只 workflow_dispatch」）。
- 同机制第 **2** 次（BUG-160/161 是枚举面；本条是**允许面**用否定词表）。类修：白名单应
  枚举完整键集合，不用「禁止几个已知坏词」。

## 修复判据

- 解析 `on:` 块，断言键集合**恰为** `{workflow_dispatch}`（或显式允许列表 = 仅它）；任何
  额外事件键（`pull_request` / `pull_request_target` / `push` / `workflow_run` / `release` …）
  一律红。
- 反证：加入 `pull_request_target:` → 必须红；删除 → 绿。当前实测为绿 = 反例成立。
- 同时断言 secret 注入与 `l4-lite.e2e` 仍在（防止修触发面时误删）。

## 修复关联

已修（2026-11-14）。触面 = 门禁与 with-key/CI 合同，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`。

## 修复落地（2026-11-14）

- **改动**：`tests/checks/model-workflow.test.mjs` 新增 `onKeysOf`，断言 `on:` 的键集合 deepEqual `[workflow_dispatch]`；保留 secret/l4-lite 断言。
- **证据**：`node --test tests/checks/model-workflow.test.mjs` → 3/3 PASS。
- **反证**：在 `on:` 下加 `pull_request_target:` → 测试 1 红「只能有 workflow_dispatch」；删除 → 绿。
