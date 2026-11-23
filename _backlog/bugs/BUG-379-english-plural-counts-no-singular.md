---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-379：英文计数没有单数形态——「1 evidence files」「1 questions」「1 checkpoints passed」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/locale-singular-real-verdict.json` + `locale-singular-real.png`；
> 夹具 = `runtime/e2e/locale-singular-real-evidence-e2e.mjs`。

## 症状

英文界面（locale=en）下，计数为 1 时仍用复数：

```text
1 evidence files ✅ Delivered
```

同一字典里的其他计数同样没有单数形态：

- `questionCount: ' ({count} questions)'` → `1 questions`
- `statusDecisionStops: '{count} checkpoints passed'` → `1 checkpoints passed`
- `graphKept: 'Kept {count} nodes'` / `graphCoverage: '... {nodes} nodes'` → `1 nodes`
- `graphTeamTasks: 'Team {total} tasks ...'` → `Team 1 tasks`
- 顶栏 subagent 计数 → `1 subagents`

## 证据

seed bundle 只保留一张有效证据卡，移除 `_failed.md`，真浏览器打开状态页（locale=en）。verdict
（`runtime/e2e/locale-singular-real-verdict.json`）：

```json
{
  "face": "bound",
  "singularEvidence": false,
  "pluralEvidence": true,
  "statusText": "…… 1 evidence files ✅ Delivered ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/locale-singular-real-evidence-e2e.mjs
```

## 根因

`en.ts` 的计数文案是固定复数模板（`{count} evidence files`），没有按值选单数；`en-fold.ts`
同理。中文量词「份/个/项」不区分单复数，所以中文界面正常；英文界面暴露。

## 修法方向（未实施）

- 计数文案提供 `one`/`other` 两形态（或 `count === 1 ? singular : plural` 的本地化 helper），
  覆盖 evidence/questions/checkpoints/nodes/tasks/subagents。
- 0 用复数（English 常规），1 用单数，≥2 用复数。
- 中文保持现文案；en 的键集不变，补单数分支。

## 修复判据

- 1 evidence → `1 evidence file`；0/2/10 → `evidence files`。
- 1 question/checkpoint/node/task/subagent → 单数；0/≥2 → 复数。
- 中文界面不变（负控）。
- 红证：把单数分支删回固定复数 → 本夹具再次出现 `1 evidence files`，exit 1；还原后绿。
- guard 落点：en 计数文案的单/复数矩阵（或 locale 层 helper 测试），浏览器层至少覆盖 evidence。
