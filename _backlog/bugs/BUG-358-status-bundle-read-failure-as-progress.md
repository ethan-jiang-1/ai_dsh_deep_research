---
status: 修复落地
severity: P2
opened: 2026-11-22
---

# BUG-358：绑定的 run bundle 读不到时，状态页仍说「研究推进中」——失败被折成进度

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复落地 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S3 仍「研究推进中」）→ 绿证 exit 0（24/24）。
> 现场 = `runtime/e2e/status-bundle-missing-verdict.json` + `status-bundle-missing.png`；
> 夹具 = `runtime/e2e/status-bundle-missing-e2e.mjs`。

## 症状

会话 journal 绑定到 `drt_unsc-p5-members`，但该 bundle 目录已经被移走/不可读。打开「研究状态」：

```text
🎯 尚未确认——问题定稿写盘后在这里显示
研究推进中——按既定问题自主研究
来源核对推进中，尚未形成结论
你现在无需操作——只有需要你补充业务事实、确认方向或审阅交付时才会在这里标出
```

页面把「bundle 读不到」显示成「研究推进中 / 来源核对推进中」，没有任何「读取失败」或
重试入口；用户会以为 run 还在跑。机器面 `data-research-face` 是 `unknown`，但人读文案
没有对应的失败态。

## 分诊与授权

- 严重级：P2 — 观察面把读失败说成进度；bundle 不在场时用户会一直等一个不会推进的 run。
- 表面 / 边界：pack client（`client/research-status/useStatusFeed.ts` + `lib/run/brief-fold.ts` + `binding-trust.ts`）/ 浏览器。
- DSH 不变量：fail-loud — bundle 读取失败必须显式呈现 + 重试，不得用 journal 锚点冒充进度。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`status-truth-356-360` — 同批卡：356/357/359/360；批计划：[观察面真实性修复程序](../issues/2026-11-22-observation-truthfulness-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。
边界：浏览器（真驾驶舱状态页）— 绑定 seed 后把整个 bundle 目录移走。

seed 已绑定会话 + `drt_unsc-p5-members`；在打开状态页前把 bundle 目录整个移除。真浏览器
打开状态页。verdict（`runtime/e2e/status-bundle-missing-verdict.json`）：

```json
{
  "face": "unknown",
  "failureShown": false,
  "paneText": "🎯 尚未确认…… 研究推进中——按既定问题自主研究 来源核对推进中，尚未形成结论 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-bundle-missing-e2e.mjs
```

状态页的 `face=unknown` 本身是诚实的机器标记；问题在于 UI 没有把 unknown 渲染成
失败态，而是继续用 journal 锚点渲染「推进中」。

## 根因

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts` 的 bundle 扫描：

```ts
const opened = await openRun(...)
if (!opened.ok) { setFace(null); setReceiptDelivery(null); return }
...
} catch (cause) { console.error('[research-status] scan 异常', String(cause)) }
```

`!opened.ok` / catch 都不设置 `error`（`error` 只由 journal follow 设置），也不区分
`missing` 与 `io`。`ResearchStatusTab` 在 `face === null` 时仍用 `deriveBusinessBrief`
的 journal 锚点显示「研究推进中」。`statusFaceMarker` 有 `error` 态，但状态页没有把
`unknown`/bundle 读取失败映射到它。

这与设计 §6「失败态与空态必须可分 / catch 里不许只 console.error 后落回空态」
（BUG-045）同族；图谱的绑定读取失败已有独立失败态，状态页没有。

根因证据：2026-11-22 复跑 `runtime/e2e/status-bundle-missing-e2e.mjs` → `face:"unknown"`、
`failureShown:false`，`paneText` 命中「研究推进中」；`!opened.ok` 分支只 `setFace(null)`，
`brief-fold` 在 `bundleBound=true` 且无 face 时落默认「推进中」。

## 牵出的失败类

- 同机制第 3 次（前次 = BUG-045 图谱绑定读取、BUG-355 图谱 plan 读取）｜处置：类修 —
  状态页 `StatusFacts` 三态 + 读失败优先级 + G12/G13「按显示事实登记、在消费者边界守」。
- 探针价值：所有「绑定成功但读面失败」的观察面。

## 修法（P2a 实施）

- `useStatusFeed` 增加 bundle 读取失败状态（`bundle: 'missing'|'unreadable'`），扫描失败时置位；
  恢复/重试后清除；`retry()` 触发一次重扫。
- 状态页 `face === null && trust.kind === 'bound'` 时优先渲染「研究状态读取失败」+「重试」，
  不要用 journal 锚点冒充进度；`statusFaceMarker` 映射到 `error`。
- 未绑定会话仍显示「尚未绑定」；立项抑制仍显示各自如实说明（不回退）。
- 不改 `watch-run` 的 durable-log 判据；本修复只补观察面失败态。

## 修复判据

- 绑定 bundle 缺失/不可读 → 状态页显示「研究状态读取失败」+ 重试，不出现「研究推进中」。
- bundle 恢复可读 → 重试/下一轮扫描自动回到 bound 渐进面（有界重试）。
- 未绑定会话 → 仍「本会话尚未绑定研究 run」（负控）。
- 正常 bound 会话 → 既有渐进面/交付态不回退。
- 红证：把 `!opened.ok` 分支改回只 `setFace(null)` → 本夹具再次出现「研究推进中」，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` 状态矩阵（纯函数/组件测试）或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2a 落地；守卫 = `tests/cockpit/lib/run/brief-fold.spec.mjs` bundle 三态 +
`tests/cockpit/lib/events/status-feed.spec.mjs` 接线 + `checks/smoke/cockpit-truth.entry.mjs` S3；
去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "tests/cockpit/lib/run/brief-fold.spec.mjs",
    "checks/smoke/cockpit-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S3 显示研究状态读取失败；FAIL S3 不显示「研究推进中」— 旧实现 face=unknown 时仍用 journal 锚点渲染「研究推进中」"
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
