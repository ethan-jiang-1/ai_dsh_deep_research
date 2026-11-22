---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-370：空的 plan/v1.md 快照在版本轨里显示一个空面板——没有「快照为空」态

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/graph-empty-snapshot-verdict.json` + `graph-empty-snapshot.png`；
> 夹具 = `runtime/e2e/graph-empty-snapshot-e2e.mjs`。

## 症状

bundle 有 `plan.md`（当前图正常），`plan/v1.md` 是 0 字节。展开「看 v1 旧图」后，版本轨显示：

```text
旧图快照 v1（只读）
（下面没有节点，也没有任何「快照为空」的说明）
```

用户会以为 v1 旧图本来就没有节点；实际上快照文件在场但为空（写坏/截断）。当前图仍正常，
所以不是「没有快照」——是一个空快照被当成有效的零节点图。

## 证据

seed 已交付 run 写入 0 字节 `plan/v1.md`，真浏览器打开研究图谱并点「看 v1 旧图」。verdict
（`runtime/e2e/graph-empty-snapshot-verdict.json`）：

```json
{
  "snapshotEmpty": true,
  "snapshotTitle": true,
  "emptyCopy": false,
  "failureState": false,
  "text": "…… 旧图快照 v1（只读） ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/graph-empty-snapshot-e2e.mjs
```

## 根因

`useGraphFeed` 的 snapshot 读取：

```ts
const text = await view.read(`plan/v${latestSnapshot}.md`, ...)
if (!text.ok) { setSnapshotState('missing'); return }
setSnapshotPlan(planIndex(text.value.text))
setSnapshotState('ready')
```

`planIndex('')` 返回一个零节点 plan，`snapshotState='ready'`；`GraphVersionRail` 对 `showSnapshotPlan`
只渲染 `snapshotPlan.topLevel` 的节点，空数组就什么都不画。没有「快照为空」的第四态/文案
（`snapshotState` 只有 idle/loading/ready/missing）。

## 修法方向（未实施）

- snapshot 状态增 `empty`（读成功但正文为空/零节点）：显示「旧图快照 vN 为空」+ 查看原文/重试，
  不画空面板。
- 若快照解析出零节点但文件非空，按「无法解析」提示；不冒充「零节点图」。
- 保留「快照确实缺席」的 missing 文案；不改当前图/版本轨的取数。

## 修复判据

- plan/vN.md 为 0 字节/纯空白 → 版本轨显示「快照为空」；不出现只有标题的空面板。
- plan/vN.md 有节点 → 正常渲染旧图（正向不回退）。
- plan/vN.md 缺席/读不到 → 既有 missing/“读不到”文案（负控不回退）。
- 红证：把空正文改回 `snapshotState='ready'` → 本夹具再次出现空面板，exit 1；还原后绿。
- guard 落点：`useGraphFeed`/`GraphVersionRail` 的 snapshot 四态矩阵，或浏览器层用例。
