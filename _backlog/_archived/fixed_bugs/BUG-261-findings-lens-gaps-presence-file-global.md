---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-261：findings 的 `lens_gaps` 存在性检查是文件级正则——一个块的合法行替所有缺行块背书

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：lens_gaps 缺行按块判，不再被别块背书
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) 的
> `if (block.lenses.length > 0 && !/^\s*-\s*lens_gaps\s*[:：]/m.test(text))`；
> 模板 = `content/templates/run/findings.md`。探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

“有 lenses 的 finding 必须显式写 lens_gaps”这条判据用的是**整份 findings.md** 的正则：

```js
if (block.lenses.length > 0 && !/^\s*-\s*lens_gaps\s*[:：]/m.test(text)) ...
```

只要文件里任意一个块有 `- lens_gaps:`，其它有 lenses 但**没有** lens_gaps 的块就不会报。
实测：F1 写 lens_gaps、F2 有 `lenses: [quant]` 但无 lens_gaps → `findingsContractIssues` 只报 evidence
路径（若存在则 `[]`）。即一个块的合法行替所有缺行块背书。

## 分诊与授权

- 严重级：P2 — findings 的 lens 缺口声明可被同文件其它块掩盖；与 260 同一模块。
- 表面 / 边界：findings 合同 / ② 静态（块级）
- DSH 不变量：fail-loud；块级字段必须块级校验
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "…findingsContractIssues(tmpBundle)…"
# topics T1 lens official, T2 lens quant
# F1: lenses official + lens_gaps 无
# F2: lenses quant（无 lens_gaps）
# → 不报 F2 缺 lens_gaps
```

## 根因（已证）

`parseFindingsOf` 已把每块解析成 `{lenses,lensGaps,...}`，但存在性检查仍回到全文 `text` 正则；
`block.lensGaps` 无法区分“写了 无”与“没写行”（两者都 []）。应记录 `hasLensGapsLine` 或按块正则。

## 牵出的失败类

- 语义 C7（全文/块级混淆）；与 262（`[]` 文件级）同根。
- 类级方向 = 块级字段一律用块对象，不用整份文本。

## 修法

1. `parseFindingsOf` 给每块加 `hasLensGapsLine`（或 `lensGapsRaw`）；
2. 判据用 `block.lenses.length>0 && !block.hasLensGapsLine`；
3. 测试：F1 有行、F2 缺行 → 红；两块都有 → 绿。

## 修复判据

- 缺行块必红，不被同文件其它块掩盖；
- 旧场按断代；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/findings-contract.spec.mjs",
    "tests/run/gates/evidence-audit.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 6 - BUG-261 / BUG-262：F2 有 lenses 但缺 lens_gaps"
  },
  "green": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/findings-contract.spec.mjs"
  }
}
```
