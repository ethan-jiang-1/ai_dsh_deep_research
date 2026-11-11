---
status: 已定性
opened: 2026-11-11
---

# DSH 编排对齐：本仓研究编排的原生形状与 GAP

> 状态：已定性
> 问题：本仓的 Lead / Team / Subagent / Workflow / Goal 用法，哪些遵循 DSH 原生编排思路，哪些在组合层产生了可证的 GAP？
> 消费者：用户 2026-11-11 直派的设计复核；下游 = 本页「产出的卡」三张
> 产出的卡：[team-subagent-contract](../../settled_issues/2026-11-11-team-subagent-contract.md)、[worker-profiles-and-routing](../../settled_issues/2026-11-11-worker-profiles-and-routing.md)、[provenance-hash-contract](../../settled_issues/2026-11-11-provenance-hash-contract.md)
> 归档：2026-11-11
> 结论：本仓编排大体是 DSH 原生（不造调度器、任务板只做镜像、goal 跨轮、workflow 窄用）；主通道角色组合是**结构性限制而非已发生越界**（20/20 teammate 是 Lead 克隆，但压力探针零越界）；真模型探针证明 **subagent 续驶假承诺会真实撞错**（`active teammate "<id>" not found`），且 **workflow 有一次 SHA-256 误用**（analyst 无 bash 却被要求算 hash）。三张卡已 implemented 并归档（合同纠偏、worker/wave preset、provenance hash 合同）；D47 登记在 decisions。

本题目不属于 2026-11-10「六方向」偏好层研究；`_backlog/research/README.md` 的
§共享上下文 不适用于本题，只共用该页的收材/归档约定与门禁格式。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-11-orchestration-alignment.md](2026-11-11-orchestration-alignment.md) | 总材料：DSH 六条不变量 × 本仓形状、G1–G8、三个方案包、Phase 1–3 修订 | 2026-11-11 |
| [2026-11-11-session-evidence.md](2026-11-11-session-evidence.md) | Phase 1 会话考古：teammate 轮次、角色 child、workflow 授权、峰值并发 | 2026-11-11 |
| [2026-11-11-composition-evidence.md](2026-11-11-composition-evidence.md) | Phase 2 keyless 组合：worker/wave mount、角色 skill 目录、默认值 | 2026-11-11 |
| [2026-11-11-behavior-evidence.md](2026-11-11-behavior-evidence.md) | Phase 3 真模型：worker 实际工具面、subagent 续驶撞错、critic 边界压力 | 2026-11-11 |
| [scan-sessions.mjs](scan-sessions.mjs) + [evidence/session-scan.json](evidence/session-scan.json) | 会话扫描器与原始输出；只读 runtime，产物住本题 | 2026-11-11 |
| [prototypes/](prototypes/) | worker/wave overlay、组合探针、行为探针、默认值检查 | 2026-11-11 |
