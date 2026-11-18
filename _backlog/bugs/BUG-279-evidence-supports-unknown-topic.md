---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-279：evidence 的 `supports` 只被当分组键——指向不存在的 T# 也照样过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`checks/lib/gates/evidence-audit-core.mjs` 的 supports 使用（按 topic 分组/单域提示）；
> `findings-core` 用 `fm.supports` 找 topics.lenses，但 topics 不存在时静默空；
> 模板 = `content/templates/run/evidence-entry.md`（`supports: T1`）。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

evidence 的 `supports` 是“本卡支持哪个 topic”。`evidence-audit` 只把它当分组键（单域/覆盖提示），
**不校验 T# 是否在 topics.md 中**；`findings-core` 用 `fm.supports` 匹配 topics，但匹配不到就返回空，
不报错。于是：

- `supports: T999`（不存在）→ 证据卡过；
- 该卡不属于任何 topic，L2 覆盖/ findngs lens 差集都看不到；
- 一个 run 可以有大量“孤儿证据”，audit 不报。

## 分诊与授权

- 严重级：P2 — 证据到 topic 的引用可指向虚空；覆盖统计漏卡。
- 表面 / 边界：evidence→topics 合同 / ② 静态
- DSH 不变量：fail-loud；外键必须存在
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn 'supports' checks/lib/gates/evidence-audit-core.mjs checks/lib/gates/findings-core.mjs | head
# 只分组/匹配；无 T# 存在性校验
# 临时 evidence supports T999 + topics 只有 T1 → audit 不报
```

## 根因（已证）

evidence-audit 的 topic 维度只用于“单域提示/覆盖分组”，没有 topics 集合；findings-core 的
`topics.get(id)?.lenses ?? []` 对未知 id 静默空。没有 `supports ∈ topics` 判据。

## 牵出的失败类

- 语义 C2（外键无存在性）+ C7；与 256/277 同族（lens/topic 集合）。
- 类级方向 = 所有跨文件引用（supports/lens/topic/evidence/claim）先做存在性，再做语义。

## 修法

1. `evidence-audit` 读 topics.md，`supports` 不在 T# 集合 → MAJOR（旧场按断代）；
2. `findings-core` 对未知 supports 报 issue（不再 `?? []` 静默）；
3. 测试：T999 → 红；T1 → 绿；
4. 与 277 的 lens 集合同变。

## 修复判据

- 未知 supports → 红；合法 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。
