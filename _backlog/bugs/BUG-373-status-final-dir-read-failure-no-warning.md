---
status: 修复落地
severity: P2
opened: 2026-11-23
---

# BUG-373：final/ 目录读不到时状态页仍显示「✅ 已交付」且无警告——终稿入口点开报错

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：修复落地 — 红证 residual full exit 1（S18 状态页显示终稿目录读取失败）→ 绿证 28/28 exit 0；批 observation-residuals-369-376。
> 现场 = `runtime/e2e/final-dir-unreadable-verdict.json` + `final-dir-unreadable.png`；
> 夹具 = `runtime/e2e/final-dir-unreadable-e2e.mjs`。

## 症状

bundle 的 `final/` 目录在场但不可读（权限/IO/工作区失败），`delivered.json` 与 present 仍说
已交付。打开「研究状态」：

```text
报告已交付
当前版已交付；历史拍板见 question.md §Decisions
...
✅ 已交付   读终稿 →   v1 已交付 · 当前工作稿
```

状态页没有任何「终稿目录读取失败」警告；点「读终稿 →」后终稿页签报「读不到终稿文件」。
用户会先被告知已交付，再在入口处撞错。

## 分诊与授权

- 严重级：P2 — 观察面把工件/派生的读失败、空、冲突折成良性态，用户会把旧内容/缺失当正常。
- 表面 / 边界：pack client（驾驶舱观察面）/ 真浏览器；本批跨 status/final/graph/config 四个页签。
- DSH 不变量：fail-loud — 文件在场但读不到/为空/冲突必须与缺席分开，并给出可行动提示。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-23 用户 goal 放行。
- 批：`observation-residuals-369-376`。

## 批

`observation-residuals-369-376` — 同批卡：369/370/371/372/373/374/375/376；批计划：[观察面残余与跨面事实一致性修复程序](../issues/2026-11-23-observation-residuals-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-23 复跑仍红）。

```sh
node --import tsx/esm runtime/e2e/final-dir-unreadable-e2e.mjs
```

## 证据

seed 已交付 run 的 `final/` 目录设为不可读，真浏览器打开状态页并点「读终稿 →」。verdict
（`runtime/e2e/final-dir-unreadable-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "statusFailure": false,
  "finalFailure": true,
  "statusText": "…… ✅ 已交付 读终稿 → v1 已交付 · 当前工作稿 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-dir-unreadable-e2e.mjs
```

## 根因

`useStatusFeed` 的 `StatusReads` 只建模 bundle/question/review/readiness/evidence/receipt，
没有 final 目录：

```ts
const finalDir = names.has('final') ? await view.list('final', { signal }) : null
const finalFileNames = finalDir !== null && finalDir.ok ? ... : []
const versions = latestRunVersion(finalFileNames)
```

`list` 失败与「目录缺席/空」同形 → `finalFileNames=[]`、`versions=0`；`face.versions=0` 不参与
交付态（交付来自 present/回执），所以 ⑤ 仍 ✅ 已交付；没有 read 失败的提示。终稿页签自己
`list('final')` 失败后按地址读文件，才报读不到。

**P0 根因证据（2026-11-23）**：P0 复跑 `final-dir-unreadable-e2e.mjs`：`deliveredBadge:true`、`statusFailure:false`，状态页仍「✅ 已交付 / v1 已交付 · 当前工作稿」，终稿页签 `finalFailure:true`；`useStatusFeed` 的 `finalDir` list 失败折成 `finalFileNames=[]`，`StatusReads` 没有 final 轴。

## 修法方向（未实施）

- 把 final 目录纳入 `StatusReads`（SourceRead）：`unreadable` 时状态页显示「终稿目录读取失败」+
  重试，不显示「v1 已交付 · 当前工作稿」的版本细节。
- 交付事实（present/回执）可以保留，但必须同时说明「终稿文件不可读」，不要让“已交付”成为
  唯一可见结论。
- 保留 final 目录缺席/空 = 0 版本（负控）；正常 final 列表照常。

## 修复判据

- final/ 不可读 → 状态页显示终稿读取失败 + 重试；不显示无条件的「v1 已交付」版本细节。
- final/ 正常 → 版本/交付入口照常（正向不回退）。
- final/ 缺席/空 → 0 版本，不冒充读取失败（负控）。
- 终稿页签的读失败态保留；点入口能看到一致的失败说明。
- 红证：把 final 目录读失败折回 `finalFileNames=[]` → 本夹具再次无警告，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 final 目录三态矩阵，或浏览器层用例。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-truth-residuals.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs",
    "exit": 1,
    "output": "FAIL S18 状态页显示终稿目录读取失败（P0 全入口 17/28，exit 1）"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-truth-residuals.entry.mjs"
  }
}
```
