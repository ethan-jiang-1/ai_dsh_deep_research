---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-150：readiness 行内仲裁仍以「关键词窗口」区分真实判定——`随后/复核后/结论/本 run` 的裸写 FAIL 仍被旧 PASS 劫持

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — readiness 行内仲裁按未包裹范围取最后一个裸写判定，不再依赖关键词窗口（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/review-readiness.ts` 的 `lastInlineVerdict`（141 修复后：
> 关键词表扩到 `本轮|终局|真实|最终|当前|最后|现在|新判定`）。**141 已归档为已修——本卡是其邻接变体的复发。**

## 症状

141 的修法给裸写判定加了更多「上下文关键词」，但**裸写的真实判定仍需命中关键词**才会被采纳；
未命中的自然措辞仍让旧引用（带关键词）夺权：

| 输入（review.md 一行） | 期望 | 实测 |
|---|---|---|
| `旧轮真实记录：\`readiness: PASS\`；随后 readiness: FAIL` | FAIL | **PASS** |
| `旧轮真实记录：\`readiness: PASS\`；复核后 readiness: FAIL` | FAIL | **PASS** |
| `旧轮真实记录：\`readiness: PASS\`；结论 readiness: FAIL` | FAIL | **PASS** |
| `旧轮真实记录：\`readiness: PASS\`；本 run readiness: FAIL` | FAIL | **PASS** |

（141 修复覆盖了「现在」「新判定」，但「随后/复核后/结论/本 run」等同等自然的措辞不在表内；
`value = inline ?? match[1]` 的结构未变——旧引用仍可胜出。）

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { terminalVerdictLine } from './packages/deep-research-pack/src/lib/review-readiness.ts';
for (const t of [
  '旧轮真实记录：\`readiness: PASS\`；随后 readiness: FAIL',
  '旧轮真实记录：\`readiness: PASS\`；复核后 readiness: FAIL',
  '旧轮真实记录：\`readiness: PASS\`；结论 readiness: FAIL',
  '旧轮真实记录：\`readiness: PASS\`；本 run readiness: FAIL',
]) console.log(terminalVerdictLine(t)?.value, '<-', t);
"
# 实测均为 PASS（应为 FAIL）
```

## 根因（已证）

1. 「旧引用 vs 真实判定」的分界仍是**关键词白名单**，而不是「是否被引号/加粗包裹」+「位置」；
2. 141 只扩了词表（现在/新判定），未实现「剥掉包裹范围后取最后一个裸写判定」；
3. `value = inline ?? canonicalMatch` 让带关键词的旧引用压过裸写新判定；
4. 词表路线必然漏同义措辞（随后/复核后/结论/本 run/据此/重新判 …）——与 BUG-149 同构。

## 修复判据

1. **范围仲裁**（141 卡原建议）：先剥掉反引号/加粗/括号范围，在剩余文本里取**最后一个** `readiness:`
   （不要求关键词）；被剥离范围里的判定只在「整行没有任何裸写判定」时作为历史记录采用；
2. 同一行有多个**裸写**判定且互相矛盾 → 判红（fail-closed），不取最后一个冒充；
3. 先红后绿：上表 4 行——当前全 PASS（红）→ 修复后全 FAIL；141 原覆盖的「现在/新判定」与
   074 原覆盖的引号/附录用例不回归；
4. 删除对关键词表的依赖（或仅作为「历史引用」辅助），`review-readiness` 的文档与测试同步；
5. `pnpm test` + `pnpm verify` 绿；真实 review.md 语料抽查。

## 修复关联

[BUG-141](BUG-141-readiness-inline-context-keyword-gap.md) /
[BUG-074](BUG-074-readiness-inline-quote-hijack.md)（均已修）的
复发；与 [BUG-149](BUG-149-hitl2-pending-vocabulary-holes.md) 同构：**用有限词表做语义判断**。
发现方式 = 141 修复后的裸写措辞邻接矩阵。

## 已落地（2026-11-13）

- 证据 = `tests/run/review-readiness.test.mjs` BUG-150。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
