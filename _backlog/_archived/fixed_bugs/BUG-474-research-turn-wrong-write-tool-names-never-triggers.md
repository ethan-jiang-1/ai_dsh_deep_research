---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-474：`research-turn.ts` 写错文件工具名（`write_file`/`edit_file`），导致 `protocol`/`review` 里程碑卡在真实运行中永不触发

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在真实 DSH 深度研究运行中，当 Lead 写盘 `protocol.json` 或 Critic 写盘 `review.md` 时，对话流回合尾的 `ResearchMilestoneCard`（`conversation.chat.turnTail`）**永远不会出现**「已定稿研究契约（protocol.json）」与「已完成对抗审查（review.md）」里程碑卡；仅有使用假工具名 `write_file` 的单测才能触发。

## 分诊与授权

- 严重级：P1 — 驾驶舱对话流回合尾里程碑卡 2/3 核心节点（`protocol`、`review`）在真实 DSH 环境下完全失效（影子工具名脱节）。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-turn.ts` / client ↔ vendor DSH wire tool names
- DSH 不变量：Honor public contracts on BOTH sides · verify the world
- 触及面：pack 公共行为 — 对话流里程碑渲染
- 授权：自授权（P1 修理型修复）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 核对 `vendor/dsh` 与本仓 `bundle-bind.ts` / `research-projection.ts` 的真实 wire 工具名
边界：client (`research-turn.ts`) ↔ real DSH v4 journal `tool/call` events

- `vendor/dsh` 及本仓 [bundle-bind.ts](../../../packages/deep-research-pack/src/lib/run/bundle-bind.ts)（`L21`）、[research-projection.ts](../../../packages/deep-research-pack/src/lib/events/research-projection.ts)（`L48`） 的真实写文件 wire 工具名为 `write` / `edit` / `multiedit`（且参数字段含 `filePath` / `file_path` / `path` / `file`）；
- [research-turn.ts](../../../packages/deep-research-pack/src/client/research-turn.ts)（`L42-L47,L87-L97`） 仅判断 `rec.data?.name === 'write_file' || rec.data?.name === 'edit_file'` 且 `pathOfToolArgs` 漏掉 `args.filePath` / `args.file`，真实 `write`/`edit`/`multiedit` 全部被忽略。

## 根因（假设 → 已证）

`research-turn.ts` 在 M3 新增时凭记忆手写了非 DSH 的工具名（`write_file` / `edit_file` / `TargetFile`），未复用本仓已与 `vendor/dsh` 对齐的 `WRITE_TOOLS = new Set(['write', 'edit', 'multiedit'])` 与路径字段集；对应单元测试也手造了 `write_file` 事件，形成影子契约自圆其说。
- 根因证据：比对 [research-turn.ts](../../../packages/deep-research-pack/src/client/research-turn.ts)（`L42-L47,L87-L97`） 与 [research-projection.ts](../../../packages/deep-research-pack/src/lib/events/research-projection.ts)（`L48-L49`）、[bundle-bind.ts](../../../packages/deep-research-pack/src/lib/run/bundle-bind.ts)（`L21`） 及 `vendor/dsh` 真实 `tool/call` 载荷。
- DSH 不变量：Honor public contracts on BOTH sides — 消费端未对准上游真实 wire 工具名与入参字段。

## 牵出的失败类

- 同机制第 1 次（client 新建事件折算器未共享 lib 真实 wire 常量）｜处置：类修（将写盘工具名集合与路径提取抽取/共享为单源常量）

## 修法

1. `research-turn.ts` 改用与 `research-projection.ts` / `bundle-bind.ts` 一致的 `WRITE_TOOLS`（`write` / `edit` / `multiedit`，兼容对象与 JSON 字符串两种 `arguments` 形态）及完整路径字段提取（`file_path` / `filePath` / `path` / `file`）；
2. 同步补齐 `protocol.json` / `review.md` 必须位于 `drt_<slug>/` 下的路径边界校验，避免无关目录误触；
3. 更新测试覆盖真实 DSH `write` / `edit` / `multiedit`（含 `filePath` / `file_path` / 对象参数）以及负控（`read` 工具不触发里程碑）。

## 修复判据

1. 真实 DSH wire 事件 `tool/call { name: 'write', arguments: { filePath: 'drt_demo/protocol.json' } }` 与 `edit`/`multiedit` 写入 `review.md` 均正确产出 `protocol` / `review` 里程碑；
2. 负控：`read` 读取 `protocol.json` 或写入非 `drt_*` 目录下的无关 `review.md` 不产出里程碑；
3. 原有同回合 `ui-deliverables` 交付去重测试继续全绿。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/events/journal-wire.ts",
    "packages/deep-research-pack/src/client/research-turn.ts",
    "packages/deep-research-pack/src/lib/events/research-projection.ts",
    "packages/deep-research-pack/src/lib/run/bundle-bind.ts",
    "tests/cockpit/client/research-turn.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-turn.spec.mjs",
    "exit": 1,
    "output": "BUG-474 researchTurnDefinition: actual [] !== expected [[\"protocol\",\"drt_demo/protocol.json\"],[\"review\",\"archive/drt_demo/review.md\"]]"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-turn.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-turn.spec.mjs"
  }
}
```
