---
status: 已修
severity: P0
opened: 2026-11-28
---

# BUG-470：`/research-defaults` 命令弹窗 `set` 选项缺 `{"patch":...}` 封装必败且静默吞错不落盘

> 严重级别：P0｜发现：2026-11-28｜状态：已修

## 症状

在 Composer 输入 `/research-defaults` 唤起分组交互弹窗，选择深度（快速 / 标准 / 深度）、输出形态（完整报告 / 一页备忘等）或信源权威（一手优先等）任意 `set` 选项（共 12/15 项）后：
1. 弹窗静默关闭，界面无任何错误提示；
2. 工作区根目录 `<workspace>/research-defaults.json` 实际上**未被创建或更新**；
3. 在未打开过「研究配置」页签或 `DefaultsButton` 的新会话中首次触发 `/research-defaults`，弹窗内当前激活态（`active`）全部错标为「自动」，且 `revision` 始终为 `null`。

## 分诊与授权

- 严重级：P0 — `/research-defaults` 交互弹窗 80% 选项（全部 12 项 `set`）完全失效且静默吞错，属于主路径功能彻底坏死并违反 fail-loud。
- 表面 / 边界：`packages/deep-research-pack/src/lib/events/research-references.ts`、`packages/deep-research-pack/src/client/index.ts`、`packages/deep-research-pack/src/client/research-commands.ts`、`packages/deep-research-pack/src/defaults/command.ts` / client ↔ host command contract
- DSH 不变量：fail-loud · Honor public contracts on BOTH sides
- 触及面：pack 公共行为 — 影响 Composer `/research-defaults` 全部设置写入路径
- 授权：等人拍板（P0 / pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码端到端契约对账（客户端命令拼装 → Host `runDefaultsCommand`）
边界：client ↔ host command (`defaultsCommandLineForOption` → `runDefaultsCommand`)

1. 客户端 [research-references.ts](../../../packages/deep-research-pack/src/lib/events/research-references.ts)（`L97-L110`） 生成：
   `/research-defaults set {"effort":"deep"}`
2. Host [command.ts](../../../packages/deep-research-pack/src/defaults/command.ts)（`L150-L158`） 解析 `runSet`：读取 `record.patch`，发现非对象直接返回 `{ kind: 'error', text: 'error bad-request patch' }`；
3. 客户端 [index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L453-L456`） `executeDefaultsCommand` 只判断 RPC 外层 `result.ok`（RPC 成功返回了 `value: { kind: 'error', text: ... }`），直接返回 `{ ok: true }`，吞掉命令层错误。

## 根因（假设 → 已证）

1. **双端契约脱节**：`defaultsCommandLineForOption` 手拼裸 patch JSON（`{"effort":"deep"}`），遗漏 Host `runSet` 要求的 `{ "patch": ..., "expectedRevision"?: N }` 外壳，导致全部 12 项 `set` 命令 100% 触发 `error bad-request patch`；且缺少 `expectedRevision` 也破坏了 CAS 并发保护。
2. **错误吞咽**：[index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L453-L456`） 未检查 `result.value?.kind === 'error'`（对比 [store.ts](../../../packages/deep-research-pack/src/client/defaults/store.ts) 的解析），导致 Host 返回命令失败时客户端返回 `{ ok: true }` 并静默吞错。
3. **未预热快照**：[research-commands.ts](../../../packages/deep-research-pack/src/client/research-commands.ts)（`L109-L115`） 的 `options` 与 `onSelect` 直接读 `defaultsStore.getSnapshot(session.sessionId)`，在 `phase === 'idle'` 时未先 `refresh` 加载磁盘真值。
- 根因证据：逐行核对 [command.ts](../../../packages/deep-research-pack/src/defaults/command.ts)（`L142-L162`）、[research-references.ts](../../../packages/deep-research-pack/src/lib/events/research-references.ts)（`L92-L114`）、[index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L453-L456`） 与 [research-commands.ts](../../../packages/deep-research-pack/src/client/research-commands.ts)（`L109-L121`）。
- DSH 不变量：违反 fail-loud 与两端公共契约对账（`Honor public contracts on BOTH sides`），单测仅 mock 了 `executeDefaultsCommand` 未接真 Host `runDefaultsCommand`。

## 牵出的失败类

- 同机制第 1 次（client 命令拼装与 host 命令解析各写各的、单测只 mock 接口）｜处置：类修（客户端生成的全部命令串必须经真 `runDefaultsCommand` 端到端闭环单测验真）

## 修法

1. `defaultsCommandLineForOption` 将全部 `set` 选项改为输出 `/research-defaults set ${JSON.stringify({ patch, ...(revision !== null ? { expectedRevision: revision } : {}) })}`；
2. `index.ts` 的 `executeDefaultsCommand` 检查 `result.value` 的 `kind === 'error'` / 非 `ok` 文本并返回 `{ ok: false, error: ... }`，禁止把命令失败折成 `{ ok: true }`；
3. `research-commands.ts` 在 `options()` 打开时若 `snap.phase === 'idle'` 先触发 `await defaultsStore.refresh(session.sessionId)`，确保勾选态与 `revision` 准确。

## 修复判据

1. 端到端契约单测将 `defaultsCommandLineForOption` 的全部 15 个 `optionId` 直接喂给真 Host `runDefaultsCommand`，全部 `set`/`unset`/`clear` 返回 `kind: 'success'` 且磁盘 `research-defaults.json` 内容与 `revision` 精确一致；
2. 负控：`runDefaultsCommand` 返回 `kind: 'error'`（如 `stale` 或 `unknown-keys`）时，`executeDefaultsCommand` 返回 `{ ok: false, error }` 并在 `onSelect` 显性抛错不静默；
3. 冷会话首次打开 `/research-defaults` 时自动加载当前磁盘默认并正确高亮 `active` 项。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/events/research-references.ts",
    "packages/deep-research-pack/src/client/research-commands.ts",
    "packages/deep-research-pack/src/client/index.ts",
    "tests/cockpit/lib/events/research-references.spec.mjs",
    "tests/cockpit/client/research-commands-shortcuts.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/events/research-references.spec.mjs tests/cockpit/client/research-commands-shortcuts.spec.mjs",
    "exit": 1,
    "output": "BUG-470 defaultsCommandLineForOption: depth:quick 执行失败：error bad-request patch; source:primary_first invalid; cold session refreshCalls 0 !== 1"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/events/research-references.spec.mjs tests/cockpit/client/research-commands-shortcuts.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-commands-shortcuts.spec.mjs"
  }
}
```
