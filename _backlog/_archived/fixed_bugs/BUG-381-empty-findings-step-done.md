---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-381：空 findings.md 让「综合」✓——综合步骤只检查文件在场，不检查正文

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：findings 进 policy/reads；空正文 → 综合 unknown + `综合材料为空`；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S23 空 findings 显示综合材料为空/读取失败（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/empty-findings-leads-verdict.json` + `empty-findings-leads.png`；
> 夹具 = `runtime/e2e/empty-findings-leads-e2e.mjs`。

## 症状

bundle 的 `findings.md` 存在但是 0 字节（写坏/截断）。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
报告已交付 ✅ 已交付
```

「综合」步骤仍 ✓，页面没有「findings 为空/读取失败」提示。用户会以为综合材料已经写成。

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
node --import tsx/esm runtime/e2e/empty-findings-leads-e2e.mjs
```

## 证据

seed 已交付 run 把 `findings.md`（和 `leads.md`）清空，真浏览器打开状态页。verdict
（`runtime/e2e/empty-findings-leads-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "statusText": "…… ◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 …… 报告已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/empty-findings-leads-e2e.mjs
```

## 根因

`useStatusFeed` 的步骤输入：

```ts
findings: view.hasFile('findings.md'),
```

只判文件在场，不读正文；0 字节与有效 findings 同形。`findings.md` 没有进
`ARTIFACT_POLICY` / `StatusReads`，所以既没有 empty 态也没有失败横幅。

**P0 根因证据（2026-11-23）**：P0 复跑 `empty-findings-leads-e2e.mjs`：findings 0 字节，状态页仍 `✓ 综合`、`failureShown:false`；`useStatusFeed` 的 `findings: view.hasFile('findings.md')` 只判在场，且未进 `StatusReads`/policy。

## 修法方向（未实施）

- 把 `findings.md` 纳入工件五态（nonEmpty；truncated 视为 unreadable）；空/读失败 →
  综合步骤 unknown/失败 + 明确提示 + 重试。
- 只有正文有效（非空）时综合 done；不要用 `hasFile` 冒充内容。
- 保留 findings 有效时的正常综合（正向）；保留 findings 缺席的语义（旧 run，不误报）。

## 修复判据

- findings.md 0 字节/纯空白 → 综合不 done，显示「综合材料为空/读取失败」。
- findings.md 不可读 → 同上（读失败 ≠ 空）。
- findings.md 可读非空 → 综合 ✓（正向）。
- findings.md 缺席 → 既有形态（负控）。
- 红证：把空 findings 改回 `hasFile` 判 done → 本夹具再次出现 ✓ 综合，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 findings 五态矩阵，或浏览器层用例。

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
    "tests/run/shared/run-fold.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs",
    "exit": 1,
    "output": "FAIL S23 空 findings 显示综合材料为空/读取失败（content 入口修复前 9/24，exit 1）"
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
