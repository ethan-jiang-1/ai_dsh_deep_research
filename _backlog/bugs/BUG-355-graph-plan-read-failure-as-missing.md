---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-355：研究图谱把 plan.md 读取失败降级成「没有 plan.md」——失败态与空态不可分

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/`；seed 夹具 = `runtime/e2e/graph-read-error-e2e.mjs`。

## 症状

bundle 的 `plan.md` **在场但读不到**（权限/IO/工作区读取失败）时，研究图谱显示：

```text
研究图谱只读观察 run drt_unsc-p5-members
Team 0 任务 · 完成 0
没有可画的 DAG
此 run 没有 plan.md（旧 run / 未落盘），Team 板也没有 blocked_by。
下面是任务快照，不是 DAG；rerun 会按 plan.md 生成执行图。
```

把「读取失败」说成「没有 plan.md（旧 run / 未落盘）」。用户会以为这场 run 从未写过计划，
可能据此重跑；页面没有失败态、没有重试提示。这与
[研究驾驶舱设计 §6「失败态与空态必须可分」](../../docs/design/40-research-cockpit.md)
（2026-10-27 BUG-045 定下的原则：读不到 ≠ 没有；catch 里不许只 `console.error` 后落回空态）
直接冲突。

## 证据

seed 工作区的 `drt_unsc-p5-members/plan.md` 确实在场（2237 字节），把它设为不可读：

```sh
ls -l runtime/e2e/seed-graph-error/root/research-workspace/drt_unsc-p5-members/plan.md
# ----------  1 bowhead  staff  2237 ... plan.md
cat runtime/e2e/seed-graph-error/root/research-workspace/drt_unsc-p5-members/plan.md >/dev/null
# exit 1（permission denied）
```

真浏览器打开「研究图谱」的 verdict（`runtime/e2e/graph-read-error-verdict.json`）：

```json
{
  "planUnreadable": true,
  "emptyState": true,
  "failureState": false,
  "text": "研究图谱只读观察 run drt_unsc-p5-members ... 没有可画的 DAG 此 run 没有 plan.md（旧 run / 未落盘）..."
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/graph-read-error-e2e.mjs
```

截图 = `runtime/e2e/graph-read-error.png`。

## 根因

`packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts` 的 plan 读取分支：

```ts
// plan.md 可选读：缺文件/读失败都降级 missing（不阻塞图；任务真相仍来自投影）。
...
if (!read.ok) {
  viewRef.current = view
  setPlan(null); setPlanText(null)
  setPlanState('missing')
  setPlanLoadedAt(null)
  return
}
...
} catch (cause) {
  ...
  setPlanState('missing')
  console.error('[research-graph] plan.md 读取失败', String(cause))
}
```

`planState` 只有 `loading | missing | unbound | ready | truncated`，没有 `error`；`read.ok === false`
与 catch 都落 `missing`。下方 UI 按 `missing` 说「此 run 没有 plan.md」。30s 定时重读只更新
状态，不改变「缺文件」的措辞；没有有界重试/失败提示。注释把「读失败都降级 missing」当成设计，
但它违反 §6 的明确合同。

## 修法方向（未实施）

- `planState` 增 `error`（或 `read-failed`）；`!read.ok` 与 catch 落 `error`，不是 `missing`。
- 图谱页对 `error` 显示独立文案「计划读取失败」+ 重试入口/自动有界重试；保留 `missing`
  只给「文件确实不在」。
- 不把失败态塞进 `missing` 的 UI 分支；`planIndex` 解析失败（内容坏）可另判 `invalid`，
  也不冒充 missing。
- 既有「无 plan 的旧 run」空态（`runtime/e2e/graph-no-plan.png`）保持不变。

## 修复判据

- `plan.md` 在场但不可读 → 图谱显示失败态（「读取失败」+ 重试），不显示「没有 plan.md」。
- `plan.md` 确实缺席 → 仍显示「没有 plan.md（旧 run / 未落盘）」空态（负控）。
- 恢复可读后，重试/下一轮扫描自动回到 ready（有界重试，不无限转圈）。
- 红证：把 `!read.ok` 分支改回 `missing` → 本夹具再次出现空态措辞，exit 1；还原后绿。
- guard 落点：`useGraphFeed` 的纯函数/状态矩阵（`planState`）或浏览器层用例（本 seed 夹具可升格）。
