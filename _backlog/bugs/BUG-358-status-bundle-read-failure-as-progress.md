---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-358：绑定的 run bundle 读不到时，状态页仍说「研究推进中」——失败被折成进度

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
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

## 证据

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

## 修法方向（未实施）

- `useStatusFeed` 增加 bundle 读取失败状态（`faceError: 'missing'|'io'`），扫描失败时置位；
  恢复/重试后清除。
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
