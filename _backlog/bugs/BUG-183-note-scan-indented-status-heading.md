---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-183：note-scan 的行首锚不容忍 CommonMark 的 0–3 空格缩进——合法状态行/证据标题被判缺席

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 notes 门禁，需用户放行
>
> 位置：[scripts/lib/note-scan.mjs](../../scripts/lib/note-scan.mjs) 的 `statusLines` / `h2Titles`；
> 消费 = [c-notes.mjs](../../scripts/verify/gates/c-notes.mjs) 的 note-format；前科 = BUG-175。

## 症状

CommonMark 允许 blockquote（`> `）与 ATX 标题（`##`）前有最多 **3 个空格**缩进。`note-scan` 的
两个正则都锚在列 0：

```js
if (!line.startsWith('> 状态：')) continue        // statusLines
/^##(?!#)\s*(.*)$/.exec(line)                    // h2Titles
```

于是：

```sh
node --import tsx/esm -e '
import { statusLines, h2Titles } from "./scripts/lib/note-scan.mjs";
console.log(JSON.stringify(statusLines("  > 状态：implemented\n")));   // []
console.log(JSON.stringify(h2Titles("  ## 实际跑过的验证\n")));        // []
'
```

一份合法 Markdown（`  > 状态：implemented` + `  ## 实际跑过的验证`）会被 note-format 判
「缺状态行 / 缺实际跑过的验证」——假红。

## 根因（已证）

行扫描的装饰词表从旧的 `statusOf`/`VERDICT_SECTION` 继承，只认列 0；CommonMark 的容器缩进
（0–3 空格）没有进入正则。`note-scan` 的块 mask 处理了 fence 的 0–3 空格，却没有把同一
「最多 3 空格」规则用到 blockquote/heading 的行首。

## 影响面

- 用户/模型把整段 Note 缩进 2 空格（或在列表项内写状态/证据）时，门禁假红；状态行/证据节明明在场。
- 与 BUG-175 的「结构扫描」同族：块级 mask 与行级锚的缩进口径不一致（fence 认 3 空格，
  status/h2 不认），同一份 Markdown 的两个读者给出不同世界。
- 当前 notes 语料全在列 0，属门禁钝化（P2）；但缩进是 CommonMark 合法形态。

## 牵出的失败类

- **C8 假红**（合法 Markdown 被误杀）+ **C4 文本/结构边界**。
- 同机制第 **2** 次（175 fence/隐藏 md → 本条行首缩进）。类修：note-scan 的块 mask 与行锚共用
  「0–3 空格容器缩进」规则；heading/status 在剥缩进后匹配，保留原行号。

## 修复判据

- `statusLines`：允许 `^ {0,3}> 状态：`（可再叠 0–3 空格？至少 0–3）；值剥离不变。
- `h2Titles`：允许 `^ {0,3}##(?!#)`；标题 trim 后判定，行号保持原样。
- 反证：上面的两例先红后绿；`## 验证` 在 0/1/2/3 空格缩进下都算证据；4 空格是 indented code，
  不算（负例）；`> 状态` 在 0–3 空格下算状态，4 空格不算。
- `tests/checks/note-scan.test.mjs` 增缩进矩阵；既有 notes 全量 `pnpm verify` 不回归。

## 修复关联

未修。触面 = notes 门禁，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；可与 BUG-175/179 的
结构扫描同批。
