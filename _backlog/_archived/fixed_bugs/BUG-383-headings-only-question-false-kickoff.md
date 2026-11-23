---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-383：只有标题的 question.md 仍显示「问题尚未确认」+「✓ 立项」——非空≠有问题正文

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：question body 谓词；标题-only → `问题正文为空`，立项 unknown；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：红证 S25 标题-only question 显示正文为空（残余入口修复前 9/24）→ 绿证 19/19；批 observation-substance-377-384。
> 现场 = `runtime/e2e/question-headings-plan-empty-verdict.json` + `question-headings-plan-empty.png`；
> 夹具 = `runtime/e2e/question-headings-plan-empty-e2e.mjs`。

## 症状

`question.md` 只有标题和空小节（`# Scope` / `## Notes` / `## Decisions`），没有任何问题正文。
打开「研究状态」：

```text
🎯 尚未确认——问题定稿写盘后在这里显示
报告已交付
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
```

页面同时说「问题尚未确认」和「立项 ✓」，且报告已交付；没有「问题正文为空」的失败提示。
用户会以为问题已立项，只是摘要没显示。

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
```

## 证据

seed 已交付 run 把 `question.md` 写成只有标题的空壳，真浏览器打开状态页。verdict
（`runtime/e2e/question-headings-plan-empty-verdict.json`）：

```json
{
  "face": "bound",
  "questionPending": true,
  "questionStepDone": true,
  "failureShown": false,
  "statusText": "🎯 尚未确认——问题定稿写盘后在这里显示 …… ◆立项确认 ✓ ✓ 立项 ✓ …… 报告已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/question-headings-plan-empty-e2e.mjs
```

## 根因

- `questionArt.state === 'ok'` 只要正文非空（标题也算），`face.hasQuestion = true`；
- `questionLine` 取第一个非空非标题行 → null，业务摘要显示「尚未确认」；
- 步骤条 `question: face.hasQuestion` → 立项 done；两个信号不一致。
- 空文件修复（BUG-367）只覆盖 `empty`，没有覆盖「非空但没有问题正文」。

**P0 根因证据（2026-11-23）**：P0 复跑 `question-headings-plan-empty-e2e.mjs`：`questionPending:true`、`questionStepDone:true`、`failureShown:false`；`questionArt.state` 非空（标题也算 ok），`hasQuestion` 仍 true，`questionLine` 却 null → 摘要「尚未确认」+ 立项 ✓ 矛盾。

## 修法方向（未实施）

- 问题有效判定 = 非空 **且** 至少有一条非标题问题正文（或 canonical 的 `# ` 标题/问题行）；
- 只有标题/空小节 → 独立「问题正文为空/无法定稿」态，立项不 done，摘要不显示「尚未确认」；
- 保留真正问题正文的 ✓ 立项（正向）；保留确实无 question.md 的「尚未定稿」（负控）。

## 修复判据

- question.md 只有标题/空小节 → 显示「问题正文为空」/失败；立项不 ✓；不再出现“尚未确认 + ✓立项”矛盾。
- question.md 有问题正文 → 问题行 + 立项 ✓（正向）。
- question.md 0 字节 → 「问题为空」（BUG-367，不回退）。
- question.md 缺席 → 「尚未定稿」（负控）。
- 红证：把 `hasQuestion` 改回只看 `state==='ok'` → 本夹具再次出现矛盾，exit 1；还原后绿。
- guard 落点：question 有效性的纯函数/状态矩阵，或浏览器层用例。

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-content.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/research-status/types.ts",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/run/artifact-content.spec.mjs",
    "tests/cockpit/lib/run/brief-fold.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs",
    "exit": 1,
    "output": "FAIL S25 标题-only question 显示正文为空（content 入口修复前 9/24，exit 1）"
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
