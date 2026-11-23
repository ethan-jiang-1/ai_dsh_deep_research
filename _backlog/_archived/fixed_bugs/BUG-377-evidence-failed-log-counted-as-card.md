---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-377：evidence/_failed.md 被算成证据——只有失败登记也显示「1 份证据」+ 挖掘 ✓

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：`_failed.md` sentinel 排除；只有失败登记 → 0 有效证据 + 挖掘 unknown；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S27 只有失败登记 → 0 份有效证据（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/evidence-failed-only-verdict.json` + `evidence-failed-only.png`；
> 夹具 = `runtime/e2e/evidence-failed-only-e2e.mjs`。

## 症状

bundle 的 `evidence/` 里只有 `_failed.md`（检索失败登记），没有任何证据卡。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
1 evidence files ✅ 已交付
```

页面把失败登记算成 1 份证据，并让「挖掘」步骤通过；用户会以为已有证据，实际零卡。

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
node --import tsx/esm runtime/e2e/evidence-failed-only-e2e.mjs
```

## 证据

seed bundle 的 evidence/ 只保留 `_failed.md`，真浏览器打开状态页。verdict
（`runtime/e2e/evidence-failed-only-verdict.json`）：

```json
{
  "face": "bound",
  "evidenceFailedOnly": true,
  "digDone": true,
  "statusText": "…… 1 evidence files ✅ 已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/evidence-failed-only-e2e.mjs
```

## 根因

`useStatusFeed` 的证据计数：

```ts
const evidenceCount = evidenceState === 'ok' && evidenceDir !== null && evidenceDir.ok
  ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
  : 0
```

只按 `.md` 后缀计数，没有排除 `_failed.md`（也不是证据卡命名/格式校验）。
`deriveSteps` 的 `evidence: inputs.evidence > 0` 于是把「挖掘」判 done。

**P0 根因证据（2026-11-23）**：P0 复跑 `evidence-failed-only-e2e.mjs`：`evidence` 行只有 `_failed.md`，`digDone:true`；`useStatusFeed` 的 `evidenceCount` 只按 `.md` 后缀计数，`_failed.md` 与证据卡同形，`deriveSteps(evidence>0)` 让挖掘 done。

## 修法方向（未实施）

- 证据卡计数排除 `_failed.md` 与非证据命名（或按 evidence 卡 frontmatter/命名规则校验）。
- `_failed.md` 单独作为失败登记呈现（可选计数），不能计入证据数/步骤完成。
- 只有失败登记时 `evidence=0`，挖掘步骤不得 done（unknown/pending）。
- 保留正常 9 卡 + `_failed.md` 时的 9 份计数（负控）。

## 修复判据

- 只有 `_failed.md` → 0 份证据，挖掘不 done，无“已交付证据”的暗示。
- 1 张卡 + `_failed.md` → 1 份（且英文单数，见 BUG-379）。
- 9 张卡 + `_failed.md` → 9 份（不退化为 10）。
- 无 evidence/ → 0 份（负控）。
- 红证：把 `_failed.md` 加回计数 → 本夹具再次出现 1 份 + ✓ 挖掘，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的证据计数纯函数/状态矩阵，或浏览器层用例。

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
    "output": "FAIL S27 只有失败登记 → 0 份有效证据（content 入口修复前 9/24，exit 1）"
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
