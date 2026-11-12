---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-145：manualEvidenceOf 以任意 `##` 为节尾——人工走查里出现二级标题，整节/尾部在重跑验收时静默丢弃（062 复发）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — manualEvidenceOf 只在已知回执节截断，人工走查内部二级标题与尾部完整保留（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/lib/run-receipt.mjs` 的 `manualEvidenceOf` / `withManualEvidence`。
> **062 已归档为已修——本卡是其边界复发**：062 的承诺是「人工走查是 L4 ③④ 的唯一载体，重跑验收/
> `--repair` 必须保留它」。

## 症状

人工走查节由人书写，可能含二级标题（组织笔记的自然写法）。`manualEvidenceOf` 用「下一个 `^##\s` 即节尾」
截取，于是：

| 旧 acceptance.md 内容 | manualEvidenceOf | 重跑验收（withManualEvidence） |
|---|---|---|
| `## 人工走查\n\n我逐项看过。` | 整节保留 | ✓ |
| `## 人工走查\n\n### 主界面\n\n正常。` | 整节保留（`###` 不算节尾） | ✓ |
| **`## 人工走查\n\n## 检查记录\n\n已核。`** | **null**（第二节标题即节尾、节内为空） | **整节丢失**（新回执覆盖，人工证据没了） |
| **`## 人工走查\n\n### 检查\n\n- 项1\n\n## 附注\n\n其它。`** | 只取到 `## 附注` 前 | **尾部丢失**（`## 附注` 及之后全部丢） |

复现（实测）：

```sh
node --import tsx/esm -e "
import { manualEvidenceOf, withManualEvidence } from './scripts/lib/run-receipt.mjs';
console.log('null 案例:', manualEvidenceOf('## 人工走查\n\n## 检查记录\n\n已核。'));
console.log('尾部截断:', JSON.stringify(manualEvidenceOf('## 人工走查\n\n### 检查\n\n- 项1\n\n## 附注\n\n其它。')));
console.log('重跑:', JSON.stringify(withManualEvidence('# Acceptance\n\nmech\n', '## 人工走查\n\n## 检查记录\n\n已核。')));
"
# 实测：null / 只到「## 附注」前 / 只剩 '# Acceptance\n\nmech\n'（人工证据整节消失）
```

## 根因（已证）

```js
const start = lines.findIndex((line) => /^##\s*人工走查\s*$/.test(line))
const rest = lines.slice(start + 1)
const end = rest.findIndex((line) => /^##\s/.test(line))   // ← 任意二级标题都当节尾
```

1. 只按标题层级截取，无法区分「人工走查内部的子主题」与「回执的下一节」；
2. `renderAcceptance` 生成的回执节是**已知集合**，而人工节内部标题是**自由文本**——当前实现把两者
   一视同仁；
3. 节内为空（`##` 紧跟下一个 `##`）→ 返回 null → `withManualEvidence` 视为「无可保留」→ 静默丢弃。

## 影响面

- **人工证据丢失**：重跑验收（绿跑重写）或 `--repair` 后，L4 ③④ 的唯一载体被新的机械回执覆盖；
- 用户/审查者不会收到任何提示（`ok`/正常流程），与 062 的事故形态相同；
- 触发只需人在「人工走查」里用 `##` 组织内容（如「## 检查记录」「## 附注」），是自然写法。

## 修复判据

1. **按已知回执节截取**：节尾 = 下一个 `## <已知 acceptance 节标题>`（`renderAcceptance` 的节标题集合，
   单一事实源），而不是任意 `##`；
2. **兜底**：若人工节之后没有已知节，取到文件尾（人工节按惯例最后）；
3. 先红后绿：上表第 3、4 行——当前 null/截断（红）→ 修复后完整保留；第 1/2 行不回归；
   真实历史 acceptance（含 `## 附注`）抽查；
4. `--repair` 路径同源（它调用 `manualEvidenceOf`）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

[BUG-062](BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md)（已修）
的**边界复发**：那条修了「保留人工走查」的主路径，本卡指出「节内二级标题」仍会让保留失效。
发现方式 = 062 修复的邻接输入变异（人工节内标题）。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-receipt.test.mjs` BUG-145。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
