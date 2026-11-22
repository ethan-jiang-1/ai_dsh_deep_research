---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-365：0 字节的 final/v1.md 让终稿页签显示空白——已交付报告被读成空

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：已修 — 结论：空终稿正文 → 明确空态 + 重试，不渲染空白；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S11 显示终稿为空）→ 绿证 exit 0（31/31）。
> 现场 = `runtime/e2e/final-empty-verdict.json` + `final-empty.png`；
> 夹具 = `runtime/e2e/final-empty-e2e.mjs`。

## 症状

已交付的 `final/v1.md` 是 0 字节（生产者截断/写坏），`delivered.json` 与 present 仍说已交付。
打开状态页点「读终稿 →」：

```text
审计版 · v1    （正文空白，只剩页脚“还不满意？三种改法……”）
```

终稿页签把空正文当成正常内容渲染，没有「终稿为空/读取失败」提示；用户看到一份空白报告，
状态页却仍显示「✅ 已交付」。

## 分诊与授权

- 严重级：P2 — 0 字节终稿正文被当正常内容渲染，已交付报告显示空白。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 空/纯空白正文必须有明确空态；不得渲染空白当作内容。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../settled_issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

seed 已交付 run，把 `final/v1.md` 写成空文件，真浏览器点「读终稿 →」。verdict
（`runtime/e2e/final-empty-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "emptyFinalShown": true,
  "failureShown": false,
  "finalText": "审计版 · v1过程 →还不满意？三种改法……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-empty-e2e.mjs
```

## 根因

`ResearchFinalTab.tsx` 的正文读取：

```ts
if (!body.ok) { setFailure(...); ... }
...
setText(body.value.text)
```

只判 `read.ok`（存在 + 可读），不判正文是否为空/纯空白。`text=''` 时：
`text === null` 为 false，正常渲染 `displayed=''`，没有空态/失败态。终稿页签没有“正文为空”
这个失败分支（只有 `finalUnreadable` / `finalReadFailed`）。

根因证据：2026-11-22 复跑 `runtime/e2e/final-empty-e2e.mjs` → `emptyFinalShown:true`、`failureShown:false`；`body.ok` 不判正文非空，`text=''` 正常渲染。

## 牵出的失败类

- 同族第 2 次（356 版本身份；365 正文内容有效性）｜处置：类修 — `ArtifactRead` 的 `empty` + `finalViewOf` 空态。
- 探针价值：所有「空文件仍走正常渲染」的观察面。

## 修法

落层：`finalViewOf`（body empty → 空态；有 reader 则 reader + notice）+ `ResearchFinalTab`；P2 实施。

- 正文有效判定 = `body.ok && trim(text) !== ''`；空/纯空白终稿落独立空态（「终稿为空」+重试/
  查看版本账），不要渲染空白正文。
- 读者版为空时回退审计版（BUG-364）；审计版也为空 → 空态，不显示“已交付即可读”的假象。
- 不改“交付 = present/回执”的事实判定；本卡只让终稿页签不把空正文当内容。

## 修复判据

- `final/vN.md` 为 0 字节/纯空白 → 终稿页签显示明确空态（不是空白正文）；状态页的交付徽标
  可保留，但终稿入口点开必须能看出“终稿为空”。
- 非空终稿 → 正常渲染（正向不回退）。
- 缺失终稿 → 既有 `finalUnreadable` 错误态（负控不回退）。
- 红证：把空正文判定改回 `text !== null` → 本夹具再次出现空白正文，exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的正文有效性纯函数/组件测试，或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2 落地；守卫 = `tests/run/gates/final-target.spec.mjs` + `tests/cockpit/client/final-tab-patterns.spec.mjs` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S11；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/final-target.ts",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/run/gates/final-target.spec.mjs",
    "tests/cockpit/client/final-tab-patterns.spec.mjs",
    "checks/smoke/cockpit-artifact-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S11 显示终稿为空 — 修复前九场景入口 15/31；还原/修复后 31/31"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-artifact-truth.entry.mjs"
  }
}
```
