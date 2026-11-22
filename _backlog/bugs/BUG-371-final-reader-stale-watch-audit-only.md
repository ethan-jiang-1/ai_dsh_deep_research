---
status: 修复落地
severity: P2
opened: 2026-11-23
---

# BUG-371：读者版更新后终稿页签不提示——stale watcher 只盯审计版

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：修复落地 — 红证 residual full exit 1（S17 读者版更新出现 stale 提示）→ 绿证 28/28 exit 0；批 observation-residuals-369-376。
> 现场 = `runtime/e2e/final-reader-stale-verdict.json` + `final-reader-stale.png`；
> 夹具 = `runtime/e2e/final-reader-stale-e2e.mjs`。

## 症状

终稿页签默认显示 `final/readable-v1.md`（读者版），审计版 `final/v1.md` 也在。页面开着时
读者版被重新生成（内容从 `first reader text` 变为 `UPDATED reader text`），等 35 秒以上：

- 页面仍显示旧读者版 `first reader text`；
- 没有「终稿已更新」等 stale 提示；
- 审计版未变，所以 watcher 也认为没有变化。

用户会把旧读者版当成最新稿。

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
node --import tsx/esm runtime/e2e/final-reader-stale-e2e.mjs
```

## 证据

seed 已交付 run，加入 `final/readable-v1.md`（读者版）；打开状态页 → 点「读终稿 →」→
把读者版文件改写为 `UPDATED reader text`，等 35 秒。verdict
（`runtime/e2e/final-reader-stale-verdict.json`）：

```json
{
  "staleBanner": false,
  "updatedReaderShown": false,
  "afterText": "读者版 · v1 …… E2E READER V1 first reader text ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-reader-stale-e2e.mjs
```

## 根因

`ResearchFinalTab.tsx` 的 stale watcher（`REFRESH_MS=30_000`）比较的是 `targetRef.current.name`：

```ts
targetRef.current = { dir: viewIo.dir, name: bodyArt.state === 'ok' ? target.audit : ... }
```

正文可读时 `name=target.audit`（`final/v1.md`），即使用户正看 `reader`（`final/readable-v1.md`）。
读者版变化不触碰 audit 的 version/token，watcher 判定“没变”。默认 view='reader'，所以这正是
最常见的展示路径。

同样的洞也覆盖 `draft` 视图：`view='draft'` 时 watcher 仍盯 audit。

**P0 根因证据（2026-11-23）**：P0 复跑 `final-reader-stale-e2e.mjs`（35s）：`staleBanner:false`、`updatedReaderShown:false`，页面仍显示 `first reader text`；`ResearchFinalTab` 的 `targetRef` 在 body ok 时固定为 `target.audit`，默认 view=reader，reader 文件令牌变化不被比较。

## 修法方向（未实施）

- watcher 盯**当前显示的 primary 文件**：reader 视图盯 reader 文件，draft 视图盯 `final.md`，
  audit 视图盯 audit 文件；或同时盯 audit+reader+draft 的版本令牌，任一变化触发 stale。
- 读者版更新后给「读者版已更新，重读」的可行动提示；不要静默继续显示旧正文。
- 保留 audit 更新提示（既有行为不回退）。

## 修复判据

- 页面停留在读者版时改写 readable-vN.md → ≤35s 出现「终稿/读者版已更新」提示；点击可重读。
- 页面停留在审计版时改写 final/vN.md → 出现提示（既有）。
- 页面停留在 draft 时改写 final.md → 出现提示。
- 无变化 → 不误报（负控）。
- 红证：把 targetRef 改回只盯 audit → 本夹具再次无提示，exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的 watcher 目标矩阵，或浏览器层用例（本 seed 夹具可升格）。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/final-target.ts",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "tests/run/gates/final-target.spec.mjs",
    "tests/cockpit/client/final-tab-patterns.spec.mjs",
    "checks/smoke/cockpit-truth-residuals.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs",
    "exit": 1,
    "output": "FAIL S17 读者版更新出现 stale 提示（P0 全入口 17/28，exit 1）"
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
