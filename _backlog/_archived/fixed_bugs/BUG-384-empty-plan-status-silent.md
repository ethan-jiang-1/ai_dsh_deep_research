---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-384：空 plan.md 在图谱报「节点表无法解析」，状态页却无提示/无计划版本

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：plan policy nonEmpty:true；空 plan → `计划为空/计划版本未知`；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S26 空 plan 显示计划为空（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/question-headings-plan-empty-verdict.json`（状态页）+
> `runtime/e2e/graph-empty-plan-verdict.json`（图谱）；夹具 =
> `runtime/e2e/question-headings-plan-empty-e2e.mjs` / `graph-empty-plan-e2e.mjs`。

## 症状

bundle 的 `plan.md` 存在但是 0 字节（写坏/截断）。

- 「研究图谱」页签明确显示：「plan.md 没有可读节点表… 节点表无法解析：empty-source@1」；
- 「研究状态」页签却仍显示「报告已交付 ✅ 已交付」和正常轨道，没有「计划为空/读取失败」，
  也没有计划版本面。

同一文件在两个观察面给出不同结论：图谱知道计划坏了，状态页当作没有计划信息。

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
node --import tsx/esm runtime/e2e/question-headings-plan-empty-e2e.mjs
node --import tsx/esm runtime/e2e/graph-empty-plan-e2e.mjs
```

## 证据

seed 已交付 run 把 `plan.md` 写空，真浏览器打开状态页/图谱。verdict（状态页，见
`runtime/e2e/question-headings-plan-empty-verdict.json`）：

```json
{
  "face": "bound",
  "planFailure": false,
  "failureShown": false,
  "statusText": "…… 报告已交付 …… 证据 10 份 ✅ 已交付 读终稿 → v1 已交付 · 当前工作稿 ……"
}
```

图谱（`runtime/e2e/graph-empty-plan-verdict.json`）：

```json
{"planEmpty": true, "text": "…… 没有可画的 DAG plan.md 没有可读节点表 …… 节点表无法解析：empty-source@1 ……"}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/question-headings-plan-empty-e2e.mjs
node --import tsx/esm runtime/e2e/graph-empty-plan-e2e.mjs
```

## 根因

`ARTIFACT_POLICY['plan.md']` 是 `{ nonEmpty: false }`（计划允许空/仅标题，旧 run 形态），
`useStatusFeed` 的 `planArt.state='ok'`（0 字节不触发 empty），`planText=''`；
`runVersionFaceOf` 无计划版本，状态页没有 plan 失败分支（BUG-375 只修了 unreadable）。
图谱的 planIndex 空 → `empty-source` 解析错误，所以两个面不同步。

**P0 根因证据（2026-11-23）**：P0 复跑两夹具：状态页 `planFailure:false`、`failureShown:false`，图谱 `planEmpty:true` + `节点表无法解析：empty-source@1`；`ARTIFACT_POLICY['plan.md'] = nonEmpty:false`，0 字节仍 `ok`，状态页无 empty 分支（BUG-375 只修 unreadable）。

## 修法方向（未实施）

- 状态页对 `planArt.state==='ok' && text.trim()===''` 显示「计划为空」+ 入口/重试；
  或把 plan 的 empty 作为独立态（与 375 的 unreadable 并列）。
- 版本面在计划为空时显示「计划版本未知」，不要静默消失。
- 保留旧 run 没有 plan.md 的合法 absent（负控）；图谱的 empty-source 提示保留。

## 修复判据

- plan.md 0 字节/纯空白 → 状态页显示「计划为空/无计划版本」；不再只显示「已交付」。
- plan.md 不可读 → 既有「计划读取失败」（BUG-375，不回退）。
- plan.md 缺失 → 旧 run 合法空态（负控）。
- plan.md 有节点 → 版本面/图谱正常（正向）。
- 红证：把空 plan 改回静默 `planText=''` → 本夹具状态页再次无提示，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 plan 五态（absent/empty/unreadable/ok/invalid）矩阵，或浏览器层用例。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/lib/run/artifact-read.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs",
    "exit": 1,
    "output": "FAIL S26 空 plan 显示计划为空（content 入口修复前 9/24，exit 1）"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-truth-substance.entry.mjs"
  }
}
```
