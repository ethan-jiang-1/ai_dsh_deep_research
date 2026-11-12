---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-155：manualEvidenceOf 的「已知回执节」来自表格行标签，而生成的 acceptance 没有 `##` 节——人工写 `## 检查/## 清单` 仍整节丢失

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 人工走查取到文件尾（生成器不产 ## 节），## 检查/清单/回执/读者版不再误当节尾（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/run-receipt.mjs` 的 `ACCEPTANCE_SECTION_TITLES` / `manualEvidenceOf`。
> **145 已归档为已修——本卡是其邻接输入（标题名）的复发。**

## 症状

145 的修法把「任意 `##` 截断」收窄为「只在**已知回执节标题**截断」，但那张表是：

```js
const ACCEPTANCE_SECTION_TITLES = new Set(['人工走查', '检查', '回执', '清单', '读者版'])
```

这些词来自 `renderAcceptance` 生成的 **Markdown 表格行标签**（`| 检查 | 结果 |`、`| 回执 | … |`、
`| 清单 | … |`、`| 读者版 | … |`），而生成的 acceptance **没有任何 `##` 节**（只有一个 `# Acceptance`
标题 + 表格 + 段落）。于是人工在走查里写这些**自然标题**时，整节被当成「回执节」截断：

| 旧 acceptance 的人工走查 | manualEvidenceOf |
|---|---|
| `## 人工走查\n\n## 检查\n\n首屏正常。` | **null**（整节丢失） |
| `## 人工走查\n\n## 清单\n\n- 项1` | **null** |
| `## 人工走查\n\n## 回执\n\n已核。` | **null** |
| `## 人工走查\n\n## 读者版\n\n读过。` | **null** |
| `## 人工走查\n\n## 检查记录\n\n已核。` | 保留 ✓（145 的用例） |

`## 检查`/`## 清单` 是人工走查里最常见的组织标题——重跑验收或 `--repair` 时又一次**静默丢人工证据**。

## 复现

```sh
node --import tsx/esm -e "
import { manualEvidenceOf, renderAcceptance } from './scripts/lib/run-receipt.mjs';
const g = renderAcceptance({ slug:'x', stamp:'2026-11-13', critical:0, finalVersion:1, readableVersion:null, present:null, corpusRoot:'~/.dsh', legacy:false });
console.log('generated ## headings =', g.split('\n').filter(l => l.startsWith('## ')).length);   // 0
console.log(manualEvidenceOf('## 人工走查\n\n## 检查\n\n首屏正常。'));                            // null
console.log(manualEvidenceOf('## 人工走查\n\n## 清单\n\n- 项1'));                              // null
"
```

## 根因（已证）

1. 「已知回执节」集合取自**表格行标签**（`检查/回执/清单/读者版`），不是真正的 Markdown 节标题；
2. 生成器当前根本不产出 `##` 节，因此截断规则对**生成内容**没有对象，只对**人工标题**生效——
   纯误伤；
3. `withManualEvidence` 总是把人工节**追加到末尾**，所以对生成器的输出，正确语义就是「从人工标题
   到文件尾」；只有历史/手工移动过的人工节才需要更精确的边界。

## 影响面

- 人工写 `## 检查`/`## 清单` → 重跑验收/`--repair` 静默丢整节（062/145 同类数据丢失）；
- 表里的词全是通用词，命中概率远高于 145 修好的 `## 检查记录`/`## 附注`；
- 交付回执的 L4 ③④ 唯一载体再次不可靠。

## 修复判据

1. **按生成器实际结构取边界**：既然 `renderAcceptance` 不产 `##` 节，`manualEvidenceOf` 应取「`## 人工走查`
   到**文件尾**」；若未来生成器加了节，用**生成器产出的精确节标题**（单一事实源）而非表格标签；
2. 若担心历史 acceptance 的人工节不在末尾：只在遇到「`# ` 一级标题」或「已知**生成行**（如 `> 由 … 生成`）」
   时截断，不用通用 `##` 词；
3. 先红后绿：上表 4 行——当前 null（红）→ 修复后完整保留；145 的 `## 检查记录/## 附注` 不回归；
   纯文本/`###` 子标题不回归；
4. `pnpm test` + `pnpm verify` 绿；真实 acceptance（含人工节）重跑 `--repair` 验证字节级保留。

## 修复关联

[BUG-145](BUG-145-manual-evidence-subheading-truncation.md) /
[BUG-062](BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md)
（均已修）的再次复发；根因是「用**呈现层标签**当结构边界」——与 148（短引文门槛）/153（在场即通过）
同族：**边界/判据没有以真实结构为准**。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-receipt.test.mjs` BUG-155。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
