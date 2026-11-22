---
status: 修复就绪
severity: P2
opened: 2026-11-22
---

# BUG-364：空 readable-v1.md 让终稿页签显示空白「读者版」——非空审计版被藏起来

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复就绪 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权。
> 现场 = `runtime/e2e/final-reader-empty-verdict.json` + `final-reader-empty.png`；
> 夹具 = `runtime/e2e/final-reader-empty-e2e.mjs`。

## 症状

已交付 run 有非空的 `final/v1.md`（审计源），同时存在一个 **0 字节**的
`final/readable-v1.md`（读者版）。打开状态页点「读终稿 →」：

```text
读者版 · v1    看审计版 v1
（正文空白，只剩页脚“还不满意？三种改法……”）
```

读者版为空时，终稿页签把它当成有效正文，显示一个空白页；非空的审计版被默认藏起来，
用户会以为交付报告是空的。必须手动点「看审计版 v1」才能看到真内容。

## 分诊与授权

- 严重级：P2 — 空读者版被当有效正文，非空审计版被默认藏起来，用户看到空白报告。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 0 字节/纯空白读者版不是有效内容；回退审计版必须可见。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

seed 已交付 run，写入空 `final/readable-v1.md`，真浏览器点「读终稿 →」。verdict
（`runtime/e2e/final-reader-empty-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "emptyReaderShown": true,
  "auditContentShown": false,
  "finalText": "读者版 · v1看审计版 v1过程 →还不满意？三种改法……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-reader-empty-e2e.mjs
```

## 根因

`ResearchFinalTab.tsx` 的读者版判定：

```ts
const [readerText, setReaderText] = useState<string | null>(null)
...
setReaderText(reader !== null && reader.ok ? reader.value.text : null)
...
const hasReader = readerText !== null
const showingReader = hasReader && view === 'reader'
const displayed = showingReader ? readerText : ...
```

`reader.ok === true` 且正文为 `''` 时 `readerText=''`，`hasReader=true`，于是默认 view='reader'
显示空字符串；没有「空读者版 → 回退审计版 / 显示空态」的判定。`reader.value.truncated` 有
处理，空文件没有。

根因证据：2026-11-22 复跑 `runtime/e2e/final-reader-empty-e2e.mjs` → `emptyReaderShown:true`、`auditContentShown:false`；`reader.ok` 且 `text=''` 使 `hasReader=true`，默认 view 显示空字符串。

## 牵出的失败类

- 同族第 2 次（356 版本身份；364 内容有效性）｜处置：类修 — `ArtifactRead` 的 `empty` + `finalViewOf` 回退提示。
- 探针价值：所有「空文件仍走正常渲染」的观察面。

## 修法

落层：`finalViewOf`（reader empty → audit + notice）+ `ResearchFinalTab` 接线；P2 实施。

- 读者版有效判定 = `reader.ok && !truncated && trim(text) !== ''`；空/纯空白读者版不当作
  “有读者版”，默认回退审计版，并给一行「读者版为空，已显示审计版」的提示（或空态）。
- 若读者版是被截断/读失败，按 BUG-364 的同类失败态处理；不要静默显示空正文。
- 保留“读者版优先”的正常行为（非空读者版仍默认显示）。

## 修复判据

- `readable-vN.md` 为空/纯空白 → 默认显示非空审计版（或明确空态），不显示空白“读者版”。
- 非空 `readable-vN.md` → 仍默认读者版（正向不回退）。
- 读者版读失败/截断 → 有明确失败/降级提示，不静默空白。
- 审计版本身为空 → 走终稿空/失败态（见 BUG-365）。
- 红证：把 `hasReader` 改回 `readerText !== null` → 本夹具再次出现空白读者版，exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的读者版有效性纯函数/组件测试，或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2 落地；守卫 = `tests/cockpit/lib/run/final-view.spec.mjs` 4×4 矩阵 + `checks/smoke/cockpit-artifact-truth.entry.mjs` S10；去向 = implemented — 批 Note。
