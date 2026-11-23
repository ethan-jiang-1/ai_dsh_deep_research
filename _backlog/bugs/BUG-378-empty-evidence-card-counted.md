---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-378：0 字节证据卡也被算成 1 份——挖掘 ✓，没有「空证据」提示

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
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
