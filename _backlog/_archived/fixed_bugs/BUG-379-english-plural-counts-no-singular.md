---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-379：英文计数没有单数形态——「1 evidence files」「1 questions」「1 checkpoints passed」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：`countText` 单/复数；en 1 evidence file，0/≥2 复数；zh 不变；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S29 en 1 evidence file 单数（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
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

## 分诊与授权

- 严重级：P2 — 观察面把「非空/在场」当「有实质内容」，用户会以为步骤/证据已完成。
- 表面 / 边界：pack client（驾驶舱观察面）/ 真浏览器；M1/M2 是内容实质，M3 是 en 文案/导航。
- DSH 不变量：fail-loud — 空正文/只有标题/失败登记/空证据卡必须与完成分开，并给出提示。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-23 用户 goal 放行。
- 批：`observation-substance-377-384`。

## 批

`observation-substance-377-384` — 同批卡：377/378/379/380/381/382/383/384；批计划：[观察面内容实质与英文文案修复程序(../settled_issues/2026-11-23-observation-substance-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-23 复跑仍红）。

```sh
node --import tsx/esm runtime/e2e/locale-singular-real-evidence-e2e.mjs
```

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

**P0 根因证据（2026-11-23）**：P0 复跑 `locale-singular-real-evidence-e2e.mjs`（en overlay）：`singularEvidence:false`、`pluralEvidence:true`，statusText 命中 `1 evidence files`。en 计数键均固定复数；subagent 顶栏计数 P0 判定为 vendor-owned（pack locale 无该键），本卡只修 pack-owned 计数，vendor 边界记 trigger。

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

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/shared/i18n.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/research-status/TrackRail.tsx",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/ResearchGraphTab.tsx",
    "tests/cockpit/shared/i18n.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-locale.entry.mjs",
    "exit": 1,
    "output": "FAIL S29 en 1 evidence file 单数——变异：countText 固定复数 + tab 长标签，exit 1（1/3）"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-locale.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-locale.entry.mjs"
  }
}
```
