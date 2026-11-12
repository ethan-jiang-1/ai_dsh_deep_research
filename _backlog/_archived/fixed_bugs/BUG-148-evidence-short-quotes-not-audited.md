---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-148：evidence-audit 只回溯 ≥16 字的引文——短伪造摘录完全不进审计（无 finding）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — evidence-audit 收集短引文并产 INFO finding/统计，短伪造不再无痕（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/lib/evidence-audit-core.mjs:205-210`（`## 原文摘录` 内 `>` 行的长度门槛）。

## 症状

```js
const m = /^>\s*(.+)$/.exec(line)
if (m && m[1].trim().length >= 16) rec.quotes.push(m[1].trim())   // ← <16 字直接丢弃
```

在真实 bundle 的 evidence 卡里插入两条不在来源里的伪造摘录：

```
> 短句伪造。                                                     ← 6 字
> 这是一条足够长的伪造摘录文字用来触发转写不符检查。              ← 23 字
```

实测（`evidence-audit --write`）：

```
摘录回溯 0/325（复合 0 / 不符 325）· MAJOR 372
audit.md: [转写不符] …：这是一条足够长的伪造摘录文字用来触发转写不符检查。   ← 长伪造被点名
audit.md: 短句伪造。                                                       ← 0 次出现（完全没有）
```

即：**短引文伪造不产生任何 finding**（连 INFO 都没有），审计看不到它。

## 复现

```sh
cp -R research-workspace/drt_llm-inference-cost-routes /tmp/ev-short
# 在该 copy 任一 evidence 卡的 `## 原文摘录` 节内插入上面两行
source dev/env.sh
node scripts/run-gates/evidence-audit.mjs /tmp/ev-short --sessions runtime/harness-home/sessions --write
grep -c "短句伪造" /tmp/ev-short/audit.md        # → 0
grep -c "足够长的伪造" /tmp/ev-short/audit.md     # → 1
```

## 根因（已证）

1. 长度门槛（16 字）本意是排除 `>` 注记/标签这类非引文行，但它**同时排除了所有短引文**；
2. 被排除的短引文**不进入 `rec.quotes`**，也就没有「太短/不可回溯」的任何 finding——不是降级为
   INFO/MAJOR，而是**完全消失**；
3. 短引文同样可以是关键证据（"X 为真"、"支持结论 A"），而且伪造短句比伪造长句更容易；
4. 当前审计的计数（`摘录回溯 0/325`）也不包含短引文——分母本身漏掉了它们。

## 影响面

- **短引文无痕伪造**：审计报告看起来「全查过」（324/325 覆盖），实际有一批 > 行从未被检查；
- 与 [BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md) 等同族：**输入被静默丢弃**而非
  降级报告；critic/验收者无法知道哪些引文没查；
- 关键结论若由短引文支撑，机械面完全失明。

## 修复判据

1. **不再静默丢弃**：`<16` 字的 `>` 行也收集，但按「太短无法回溯」标为 **INFO 或 MAJOR**（不参与
   覆盖率分母的「通过」，但要在报告里列出数量），或明确规则：短引文必须与长引文配对/附上下文；
2. 计数面：报告里分出 `短引文 N 条（未回溯）`，避免 `0/325` 让人误以为全覆盖；
3. 先红后绿：上表两条——当前短伪造无 finding（红）→ 修复后至少 INFO/MAJOR 点名；长伪造行为不回归；
   排除 `>` 注记/标签的既有意图不丢（可用「行首 `>` + 非标签形态」或人工白名单，不用长度一刀切）；
4. `pnpm test` + `pnpm verify` 绿；真实 bundle 的短 `>` 行统计（避免大规模误报）。

## 修复关联

与 [BUG-147](BUG-147-client-hitl-zero-answers-false-green.md)（「0 题」也算通过）同族：**门槛/计数的
静默放行**。发现方式 = 审计规则的输入变异（短伪造 vs 长伪造对照）。

## 已落地（2026-11-13）

- 证据 = `tests/run/evidence-audit.test.mjs` BUG-148。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
