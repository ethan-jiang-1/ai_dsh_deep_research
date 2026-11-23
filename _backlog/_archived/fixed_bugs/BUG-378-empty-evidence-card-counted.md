---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-378：0 字节证据卡也被算成 1 份——挖掘 ✓，没有「空证据」提示

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：证据卡正文非空才计数；0 字节卡 → 0 有效 + 空证据提示；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S28 0 字节证据卡 → 0 份/空证据提示（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/evidence-empty-card-verdict.json` + `evidence-empty-card.png`；
> 夹具 = `runtime/e2e/evidence-empty-card-e2e.mjs`。

## 症状

bundle 的 `evidence/` 只有一张 **0 字节** 的 `.md`（原证据卡被截断），没有 `_failed.md`。
打开「研究状态」：

```text
✓ 挖掘 ✓ 综合 ✓ 审查
...
1 evidence files ✅ 已交付
```

0 字节文件被算成 1 份有效证据，挖掘步骤完成，没有任何「证据为空」提示；用户会以为证据卡在场。

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
node --import tsx/esm runtime/e2e/evidence-empty-card-e2e.mjs
```

## 证据

seed bundle 只保留一张证据卡并把正文清空，真浏览器打开状态页。verdict
（`runtime/e2e/evidence-empty-card-verdict.json`）：

```json
{
  "face": "bound",
  "emptyEvidenceCounted": true,
  "failureShown": false,
  "digDone": true,
  "statusText": "…… 1 evidence files ✅ 已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/evidence-empty-card-e2e.mjs
```

## 根因

`useStatusFeed` 只按目录里的文件名计数（`.md`），不读证据卡内容；0 字节与有效卡同形。
`deriveSteps` 的 `evidence > 0` 判 done。证据卡的内容有效性（frontmatter/摘要/正文）没有进入状态面。

**P0 根因证据（2026-11-23）**：P0 复跑 `evidence-empty-card-e2e.mjs`：0 字节卡 `emptyEvidenceCounted:true`、`failureShown:false`、`digDone:true`；计数不读正文，`isEvidenceCard` 谓词不存在。

## 修法方向（未实施）

- 证据卡有效判定至少要求正文非空（最好带 evidence frontmatter）；0 字节/纯空白不计入证据数。
- 只有空卡时挖掘步骤不得 done；显示「证据为空/读取失败」+ 重试/说明。
- 保留有效卡正常计数（正向）；`_failed.md` 另见 BUG-377。

## 修复判据

- 一张 0 字节证据卡 → 0 份有效证据，挖掘不 done，有空证据提示。
- 一张有效卡 → 1 份（且英文单数，见 BUG-379）。
- 空卡 + 有效卡 → 只计有效卡。
- 无 evidence/ → 0 份（负控）。
- 红证：把空卡加回计数 → 本夹具再次出现 1 份 + ✓ 挖掘，exit 1；还原后绿。
- guard 落点：证据计数/有效性矩阵（useStatusFeed 或纯函数），或浏览器层用例。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-content.ts",
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/research-status/types.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/lib/run/artifact-content.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs",
    "exit": 1,
    "output": "FAIL S28 0 字节证据卡 → 0 份/空证据提示（content 入口修复前 9/24，exit 1）"
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
