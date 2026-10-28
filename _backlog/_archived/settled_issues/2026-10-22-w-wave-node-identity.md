---
status: 已结
opened: 2026-10-22
---

# 已结：W<wave>.<index> 节点与 WAVE 层

> 立卡：2026-10-22 ｜ 状态：已结 ｜ 类型：设计 ｜ 结论倾向：现在做（W2=Wave 2，W2.1=层内节点；已落地）
>
> 用户 2026-10-22 纠正：`W2/W3/W4/W5` 不是四个工作包，它们是 Wave 2 的四个并行节点，应写
> `W2.1–W2.4`；Wave 叫回 Wave，不再用 LAYER。

## 决定

- `W2` = Wave 2（按 deps 最长路径计算的层/分组，不是任务，不挂 task/output）。
- `W2.1/W2.2` = Wave 2 内的并行节点；单节点 Wave 也写 `W1.1`。
- `W2.1.1` = W2.1 的内部拆解，`parent` = W2.1，不升成新 Wave。
- `W2` 可作整层引用；具体反馈引用 `drt_<slug>/W2.1`。
- 顶层 W 节点 ID 的 Wave 前缀必须等于 `deps` 计算层；不一致报 `wave-prefix`。
- 跨 Wave 变化 = **重编号 + 重写记录旧号别名**（`W2.1 → W3.2`）；不静默保留旧前缀。
- `stage` 由节点 kind 派生；`lifecycle` 墓碑留在表里、`byId` 可解析、不进图。
- Team 仍平铺：**每个节点**一个 task；Wave 分组不建 task；复合节点用 rollup task；
  不建 nested Team；跨 Wave 子依赖禁止并提升。
- 旧 N（N1…）与旧 flat W（W1…W10，无 `.index`）只读兼容；`legacy-flat-w` 提示；新 plan 只写
  `W<wave>.<index>`。
- UI 恢复 `WAVE n`，按 Wave 泳道分组；刷新 5s；复制 `drt_<slug>/W2.1`。

## 示例

```text
WAVE 1：W1.1
WAVE 2：W2.1、W2.2、W2.3、W2.4（并行）
WAVE 3：W3.1、W3.2
WAVE 4：W4.1
```

## 落地结果（2026-10-22）

- Note：[2026-10-22-w-wave-node-identity.md](../../../notes/implemented/2026-10-22-w-wave-node-identity.md)
- `pnpm test` **628 pass / 0 fail**；固定资产 `tests/fixtures/plan-wave/plan.md` 由 `plan-graph` 消费；
  `pnpm verify` 全绿；`preset-smoke` / `client-load-smoke` ALL PASS。
- **真实 Wave run**：`drt_node24-lts-status` 使用 `W1.1 → W2.1/W2.2（WAVE 2 · 2 个并行）→ W3.1...`，
  graph 无 legacy-flat-w；验证新语义已进入真实 Lead 输出。
- 临时 Wave plan 走查：`WAVE 2 · 2 个并行`、`W2.1/W2.2` 并排、无 LAYER；恢复 plan。
- 旧 flat W run（`drt_cn-us-ai-models-hardware` v2）只读标 legacy，不自动重编号。
- **未跑**：`drt_node24-lts-status` 的完整交付；真实多 Wave B rollup 的端到端执行。不冒充通过。

## 去向

- 实现事实见 Note；新 run 用 Wave 格式，旧 plan 只读。
- 历史评审（旧 W=工作包版）：[review](../research/dynamic-research-dag/2026-10-22-w-work-package-identity-review.md)
  ——只作历史记录，不再指导当前语义。
