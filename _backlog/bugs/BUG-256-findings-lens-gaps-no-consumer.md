---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-256：findings 的 `lens_gaps` 没有任何消费者——空/假 gap 表不影响任何门

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`packages/deep-research-pack/content/templates/run/findings.md:9`（`lens_gaps:`）；
> 消费面 = `checks/lib/gates/*` / `checks/run-gates/*`（无 `lens_gaps` 解析）。
> 探索轮 = [模型可见语义卡](../issues/2026-11-18-model-visible-semantics.md)。

## 症状

findings 模板要求每个 F# 有：

```yaml
- lenses: [<id>, …]
- lens_gaps: [<topic × lens 未覆盖的 id，或 无>]
- gap: supported | needs_search | contradicted | insufficient
```

`grep lens_gaps checks packages` 无消费者；`node-gate`/`schema-scan`/`review-readiness`/`verdict-audit`
都不读它。于是：

- 有 lens 的 run 可以把 `lens_gaps` 写成 `[]` 或省略；
- `review.md` 的覆盖表（254）即便写了，也无从与 findings 的 lens_gaps 对账；
- “空视角的原因与补救”只活在 review 散文。

## 分诊与授权

- 严重级：P2 — lens 缺口的报告字段无机械消费者；与 254 一起构成“lens 覆盖无人守”。
- 表面 / 边界：findings/ review lens 合同 / ② 静态
- DSH 不变量：fail-loud；模板声明的字段必须有消费者
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
grep -n 'lens_gaps' packages/deep-research-pack/content/templates/run/findings.md
grep -rn 'lens_gaps' checks packages/deep-research-pack/src --include='*.mjs' --include='*.ts'   # 无
# 临时 findings.md 删/改 lens_gaps → node-gate 不报
```

## 根因（已证）

`lenses`/`lens_gaps` 是 D18 lens 面新增字段，只进了 findings 模板与 synthesis/critic 散文；
`findings` 没有解析器，`node-gate` 也不读它。`schema-scan` 只查文件在场。

## 牵出的失败类

- 语义 C2（模板字段无消费者）/ C7（空表不报）；与 250/254 同族。
- 类级方向 = findings 的 lenses/lens_gaps 与 topics 的 lenses、evidence 的 lens 统一解析；lens_gaps
  为空时必须与 review 覆盖表的 `—/gap/n/a` 对账（或有“无 lens”豁免）。

## 修法

1. 解析 findings 的 `lenses`/`lens_gaps`；对有 lens 的 topic，`lens_gaps` 必须显式（含 `无`）且
   与 topics `lenses:` 的差集一致；
2. 与 review 覆盖表/evidence lens 同源集合；
3. 测试：空/假 lens_gaps → 红；合法 `无`/差集 → 绿；
4. 旧场按断代（无 run.md）豁免。

## 修复判据

- 有 lens 的 run 的 findings lens_gaps 与 topics/evidence 对账；缺/假 → 红；
- 旧场不误伤；`pnpm test` / run-gates 绿。
