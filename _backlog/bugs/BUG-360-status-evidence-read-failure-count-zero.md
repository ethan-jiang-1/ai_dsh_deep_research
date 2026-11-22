---
status: 修复落地
severity: P2
opened: 2026-11-22
---

# BUG-360：evidence/ 读不到时状态页显示「证据 0 份」——失败被折成空计数

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复落地 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S5 仍「0 份」+ ✓ 挖掘）→ 绿证 exit 0（24/24）。
> 现场 = `runtime/e2e/evidence-read-error-verdict.json` + `evidence-read-error.png`；
> 夹具 = `runtime/e2e/evidence-read-error-e2e.mjs`。

## 症状

bundle 的 `evidence/` 目录在场但不可读（权限/IO/工作区失败）。打开「研究状态」：

```text
证据 0 份
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 ◆交付审阅 ✓ ● 交付
```

页面把「目录读不到」显示成「证据 0 份」，步骤条仍全部绿勾、交付态照常。用户会以为这场
run 没有证据卡（或证据被删），而实际上 10 张卡都在，只是读取失败。

## 分诊与授权

- 严重级：P2 — 观察面给出假空；用户会以为这场 run 没有证据卡（或证据被删），实际 10 张都在、只是读失败。
- 表面 / 边界：pack client（`useStatusFeed.ts` + `lib/run/run-fold.ts` + `ResearchStatusTab` ⑤ 行）/ 浏览器。
- DSH 不变量：fail-loud — 目录读失败 ≠ 空目录；unreadable 不得折成 0，也不得让流程全绿。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`status-truth-356-360` — 同批卡：356/357/358/359；批计划：[观察面真实性修复程序](../issues/2026-11-22-observation-truthfulness-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。
边界：浏览器（真驾驶舱状态页）— 已交付 seed 的 `evidence/` 目录设为不可读。

seed 已交付 run（`drt_unsc-p5-members`）的 `evidence/` 设为不可读（目录内仍有 10 张卡）：

```sh
chmod 000 .../drt_unsc-p5-members/evidence
```

真浏览器打开状态页。verdict（`runtime/e2e/evidence-read-error-verdict.json`）：

```json
{
  "face": "bound",
  "evidenceReadFailureShown": false,
  "paneText": "…… 证据 0 份 ✅ 已交付 读终稿 → v1 已交付 …… ◆立项确认 ✓ …… ✓ 挖掘 ✓ 综合 ✓ 审查 ◆交付审阅 ✓ ● 交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/evidence-read-error-e2e.mjs
```

## 根因

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`：

```ts
const evidenceDir = names.has('evidence') ? await view.list('evidence', { signal }) : null
const evidenceCount = evidenceDir !== null && evidenceDir.ok
  ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
  : 0
```

- `list` 失败（`ok === false`）与「目录缺席」都落 `null` → `evidenceCount=0`；
- 没有错误状态/重试；UI 直接显示「证据 0 份」。
- 步骤条的 evidence 输入 = 计数 > 0；但 `deriveSteps` 的线性推断让后面的 final 把前面
  全部标 done，所以读失败时仍显示 ✓ 挖掘/✓ 审查/✓ 交付，形成「0 份证据但全流程通过」的
  自相矛盾画面。

根因证据：2026-11-22 复跑 `runtime/e2e/evidence-read-error-e2e.mjs` → `evidenceReadFailureShown:false`，
`paneText` 命中「证据 0 份」且步骤全绿；`evidenceDir.ok === false` 与缺席同落 `null` → 0。

## 牵出的失败类

- 同机制第 5 次（045、355、358、359、本卡；均为「读失败折成良性态」）｜处置：类修 —
  状态页 `StatusFacts` 三态 + 步骤 unknown + G12/G13；本卡收口该簇的最后一个显示事实。
- 探针价值：任何「list 失败 / 空目录」不分家的计数与步骤面。

## 修法（P2a 实施）

- `evidence` 计数三态：`ok`（数量）/`absent`（目录确实缺席）/`unreadable`（list 失败）；
  `unreadable` 不落 0，显示「证据读取失败」+ 重试。
- 步骤条：`evidence` unknown 时标 `?`，不被线性推断抹成 done；概览优先显示读失败。
- 保留空证据（目录在场、0 个 .md）的既有「证据 0 份」语义；负控不回退。

## 修复判据

- `evidence/` 不可读 → 显示「证据读取失败」+ 重试，不显示「证据 0 份」；不把流程全标绿。
- `evidence/` 缺席 → 显示「证据 0 份」/无证据（既有语义）。
- `evidence/` 在场且 0 个 .md → 0 份（负控）。
- `evidence/` 正常 10 个 .md → 10 份（正向不回退）。
- 红证：把 `!ok` 分支改回 `0` → 本夹具再次出现「证据 0 份」+全绿，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 evidence 三态矩阵，或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2a 落地；守卫 = `tests/run/shared/run-fold.spec.mjs` unknown 步 +
`tests/cockpit/lib/events/status-feed.spec.mjs` evidence 三态接线 +
`checks/smoke/cockpit-truth.entry.mjs` S5；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/lib/run/run-fold.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/run/shared/run-fold.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S5 显示证据读取失败；FAIL S5 不显示「证据 0 份」；FAIL S5 不把挖掘标 ✓ — 旧实现 list 失败落 0 + 线性步骤全绿"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-truth.entry.mjs"
  }
}
```
