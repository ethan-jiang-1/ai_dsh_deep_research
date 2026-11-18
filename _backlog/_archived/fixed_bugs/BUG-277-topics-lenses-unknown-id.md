---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-277：topics 的 `lenses` 只被当字符串集合——不校验是否为真实 lens id（`bogus` 可全链路通过）

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：LENS_IDS 与 content/lenses 单一正本
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/findings-core.mjs` 的 `parseTopicsOf`（`lenses` 只 `listOf`）；
> `checks/lib/gates/evidence-audit-core.mjs:261` 只校验 evidence.lens ∈ topics.lenses；
> 真实 lens 正本 = `packages/deep-research-pack/content/lenses/*.md`（8 个 id）。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

topics 的 `- lenses: [official, quant]` 是证据面/覆盖表的集合。`parseTopicsOf` 只做字符串数组；
`evidence-audit` 只校验 evidence 的 lens 在 **topics.lenses** 里，不校验 topics.lenses 在**真实 lens 目录**里。
因此：

- `- lenses: [bogus]` + `evidence/x.md lens: bogus` → 全链路绿；
- `findings` 的 lens_gaps 差集也按 bogus 算；
- review 的 topic×lens 覆盖表可以是虚构 lens；
- 真正的 lens（official/quant/...）一个都没用，也不报。

## 分诊与授权

- 严重级：P2 — lens 集合的主键是自由字符串；覆盖/盲区可以建立在虚构 lens 上。
- 表面 / 边界：lens 合同 / ② 静态（ID 闭集）
- DSH 不变量：fail-loud；lens id 必须有真实正本
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
ls packages/deep-research-pack/content/lenses   # 8 个真实 id
grep -rn 'lenses' checks/lib/gates/findings-core.mjs checks/lib/gates/evidence-audit-core.mjs | head
# 只比 topics↔evidence，不读 content/lenses
# 临时 topics: lenses [bogus] + evidence lens bogus → 不报
```

## 根因（已证）

`SCOPE_ROLES`/`GAP_STATES` 等闭集有常量，但 lens id 没有 `LENS_IDS` 常量/加载器；
`content/lenses/*.md` 的 `id` 没有机械消费（只有 skill 文本提到）。

## 牵出的失败类

- 语义 C2（ID 无正本）+ C7；与 276（method sha）同族。
- 类级方向 = 所有“内容 ID”（lens/method/role/kind）从随包目录加载闭集，模板/门禁共用。

## 修法

1. 从 `content/lenses/*.md` 的 frontmatter `id` 建 `LENS_IDS`（随包/构建期）；
2. topics.lenses、evidence.lens、findings.lenses/lens_gaps、review 覆盖表都校验 ∈ LENS_IDS；
3. 测试：bogus → 红；8 个真实 id → 绿；
4. 旧场按断代。

## 修复判据

- 未知 lens id 全链路红；真实 id 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/topics-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/topics-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 2 - BUG-264 / BUG-266 / BUG-277：不是真实 lens id"
  },
  "green": {
    "command": "node --test tests/run/gates/topics-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/topics-contract.spec.mjs"
  }
}
```
