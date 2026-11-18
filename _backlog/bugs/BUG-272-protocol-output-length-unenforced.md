---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-272：protocol 的 `output.length.min/max` 只校验数字形状——final 可以只有 10 个字

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`checks/lib/gates/protocol-core.mjs:448–455`（只校验 min/max 是非负整数、min≤max、unit 闭集）；
> `final.md`/reader 门没有按 protocol.length 计字数；模板 = `content/templates/run/protocol.json`
> （`length: { min: 1200, max: 1600, unit: words }`）。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

`output.length` 是报告长度合同（min/max/unit）。协议 schema 只做形状校验；**终稿没有任何地方按它
计长度**：

- `node-gate-reader-gate` 只对**读者版**有 `READER_CHAR_CAP`/`READER_LINE_CAP`（上限），不读 protocol.length；
- `presets.test` 只看 final 首屏六节，不看字数；
- `final/vN` 没有长度断言。

因此 protocol 写 `min: 1200 / max: 1600 / unit: words`，final 可以 10 个字、或 10000 字，全部通过。
`output.length` 是模板默认值，不是可选装饰。

## 分诊与授权

- 严重级：P2 — 报告长度承诺无消费者；短报告/注水长报告都能过。
- 表面 / 边界：protocol→final 合同 / ② 静态（字数）
- DSH 不变量：fail-loud；声明的长度合同必须可核
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn 'output.length\|length.min\|length.max' checks packages/deep-research-pack/src | head
# 只有 protocol-core 形状校验；无 final 字数消费者
# 临时 final.md 10 字 + protocol min=1200 → node-gate/reader 不报
```

## 根因（已证）

`output.length` 在 protocol schema 里被校验，但 `final`/`verdict`/`node-gate` 都没读 protocol 的 length；
`reader` 的 cap 是固定读者版上限，不是 protocol 的下限/上限。

## 牵出的失败类

- 语义 C2（长度承诺无消费者）+ C7；与 271（threshold）同族。
- 类级方向 = protocol 的 output 承诺（sections/length/shape/audience）逐一有 final 消费者；
  255（sections）已修，length 仍缺。

## 修法

1. `node-gate`/`protocol-audit` 按 unit（words/pages）计 final/vN 长度；min/max 越界 → 红/警告；
2. quick_factual 可豁免 length（按 shape）；
3. 测试：10 字 < min → 红；min/max 内 → 绿；
4. 旧场按断代。

## 修复判据

- final 长度与 protocol.length 对账；越界 → 红；
- quick_factual/旧场不误伤；`pnpm test` / run-gates 绿。
