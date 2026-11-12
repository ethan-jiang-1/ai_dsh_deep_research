---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-141：readiness 行内引用的修复只认上下文关键词——旧引用带关键词、真实判定不带 → 仍被旧值劫持（双向）

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — readiness 行内仲裁按「未包裹 + 本轮/现在/新判定」取裸写最后判定，旧引用不再劫持（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`packages/deep-research-pack/src/lib/review-readiness.ts` 的 `lastInlineVerdict`（074 修复引入）。
> **074 已归档为已修——本卡是其邻接变体的复发**。

## 症状

074 的修复新增 `lastInlineVerdict`：只认**引号/加粗范围之外**、且**前 20 字符含
「本轮|终局|真实|最终|当前|最后」**的 `readiness:`。但「真实判定」本身没有关键词时，旧引用反而胜出：

| 输入（review.md 一行） | 期望 | 实测 |
|---|---|---|
| `旧轮真实记录：\`readiness: PASS\`；现在 readiness: FAIL` | FAIL | **PASS**（fail-open） |
| `旧轮真实记录：\`readiness: FAIL\`；现在 readiness: PASS` | PASS | **FAIL**（误杀） |
| `见最终结论：旧记录 \`readiness: PASS\`；新判定 readiness: FAIL` | FAIL | **null**（整行不可判 → 门判非 PASS） |
| `上轮 readiness: PASS；本轮 readiness: FAIL` | FAIL | FAIL ✓（修复覆盖） |
| `本轮 readiness: FAIL；旧轮 readiness: PASS` | FAIL | FAIL ✓ |

根因是「关键词只挂在旧引用上，真实判定是裸写」：`lastInlineVerdict` 跳过裸写的 FAIL（无关键词），
返回带关键词的旧 PASS；`value = inline ?? match[1]` 于是取旧值。第三行更糟：引号里的 PASS 被范围排除、
裸写的 FAIL 无关键词 → 返回 null（不是红得明确，而是「无判定」）。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { terminalVerdictLine } from './packages/deep-research-pack/src/lib/review-readiness.ts';
for (const t of [
  '旧轮真实记录：\`readiness: PASS\`；现在 readiness: FAIL',
  '旧轮真实记录：\`readiness: FAIL\`；现在 readiness: PASS',
  '见最终结论：旧记录 \`readiness: PASS\`；新判定 readiness: FAIL',
]) console.log(JSON.stringify(terminalVerdictLine(t)?.value ?? null), '<-', t);
"
# 实测：PASS / FAIL / null（期望：FAIL / PASS / FAIL）
```

## 根因（已证）

1. 「旧引用」与「真实判定」的区分被压在**上下文关键词**上，而不是「谁未被引用包裹」；
2. 关键词检查只看前 20 字符，裸写的真实判定（`现在 readiness: FAIL` / `新判定 readiness: FAIL`）不含
   关键词 → 被丢弃；
3. 同一行多个判定时没有「位置仲裁」：`inline ?? match[1]` 让带关键词的旧值压过裸写的新值；
4. 引号范围排除后若只剩裸写判定，`rest === null` 且 inline 为 null → 整行 null（第三行），
   门把 null 当非 PASS（方向安全但仍是误判）。

## 修复判据

1. **按范围仲裁**：先剥掉引号/加粗范围，再在**剩余文本**里取**最后一个** `readiness:`（不要求关键词）；
   若剩余里没有任何判定，再看被引用范围里的（作为历史记录），并仅在整行只有引用时采用；
2. **多判定取最后裸写**：`上轮 PASS；现在 FAIL` → FAIL；反向 → PASS；旧引用（带引号）+ 裸写新判定 →
   取裸写的新判定（无论是否含「本轮/终局」字样）；
3. 先红后绿：上表 5 行——当前 1/2/3 红；修复后全部正确；既有 074 用例（附录独立行、轮次标注、
   空模板）不回归；
4. 若一行同时有裸写 PASS 与 FAIL（自相矛盾），判红（fail-closed）而不是取最后一个——需在卡内定清；
5. `pnpm test` + `pnpm verify` 绿；真实 review.md 语料（含引用旧轮）抽查。

## 修复关联

[BUG-074](BUG-074-readiness-inline-quote-hijack.md)（已修）的
**复发**：那条的修法把「引用」与「真实」的分界押在关键词上，本卡证明关键词不是可靠分界。
与 [BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md)（HITL2 词表双向误判）同族：
两处都把「语义判断」做成了有限词表/上下文窗口。

## 已落地（2026-11-13）

- 证据 = `tests/run/review-readiness.test.mjs` BUG-141。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
