---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-188：note-scan 不认加粗状态标签 `> **状态**：implemented`——合法 Note 被判缺状态行

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 notes 门禁，需用户放行
>
> 位置：[scripts/lib/note-scan.mjs](../../scripts/lib/note-scan.mjs) 的 `statusLines`；
> 消费 = [c-notes.mjs](../../scripts/verify/gates/c-notes.mjs) 的 note-format；前科 = BUG-183（缩进）。

## 症状

`statusLines` 只匹配 `^ {0,3}> 状态：(.*)$`；状态**标签**本身加粗的 Markdown（`> **状态**：implemented`）
返回 `[]`，note-format 判「缺状态行」——尽管这一行在 Markdown 里就是 blockquote 中的加粗标签：

```sh
node --import tsx/esm -e '
import { statusLines } from "./scripts/lib/note-scan.mjs";
console.log(JSON.stringify(statusLines("> **状态**：implemented\n"))); // []
'
```

## 根因（已证）

正则把 `状态` 当成固定词，没有把 `**`/`__`/反引号视为行首装饰（值面的 `**` 已剥，标签面的没有）。
与 readiness BUG-170/178 的加粗标签问题同构，只是 notes 的 status line 还没有同一归一。

## 影响面

- 用户/模型把状态标签加粗（`> **状态**：implemented` 或 `> **状态：** implemented`）时，
  note-format 假红；文档状态明明在场。
- 反向：如果同时有正文引用，仍可能被当成缺状态而不是格式变体，错误文案会误导修复方向。

## 牵出的失败类

- **C8 假红**（Markdown 装饰）+ **C4 行首语法**。
- 同机制第 **2** 次（183 缩进 → 本条标签加粗）。类修：`statusLines` 先剥标签装饰
  `**/__/\`` 再匹配 `状态`；值面继续剥；notes/readiness 的装饰词表共用。

## 修复判据

- `> **状态**：implemented`、`> __状态__：implemented`、`` > `状态`：implemented `` 都产出
  `{value:'implemented'}`；`> **状态：** implemented` 也认（标签+冒号整体加粗）。
- 负例：`> 状态：PASS | FAIL` 模板仍不是合法值；无关行不认。
- 反证：上面三例先红后绿；`tests/checks/note-scan.test.mjs` 增装饰矩阵；既有 notes 全量 verify 不回归。

## 修复关联

未修。触面 = notes 门禁，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
