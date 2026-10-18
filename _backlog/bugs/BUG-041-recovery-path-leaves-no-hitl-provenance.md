---
status: 修复落地
severity: P2
opened: 2026-10-18
---

# BUG-041：官方恢复路径（`run-kickoff --session` 自由文本关挂起）不落任何 HITL 记账

> 状态：**修复落地**（修法已进树 + 单测/同钉反证；**端到端绿证待跑**——需一场真挂起 + kickoff 关单）。
> 从 [BUG-040](../_archived/fixed_bugs/BUG-040-terminal-readiness-two-copies-drift.md) 闭环时带出：
> readiness 判据修正后，`drt_cambricon-commercial-sustainability` 的门②/门③ 由 N/A 转**如实判红**。

## 症状与根因

那场 bundle 的 §Decisions 有 HITL1 拍板行，**没有任何 HITL2 行** → 门③（交付拍板行）与门②（present
声明）判红。查下来**判红是对的**，缺的是记账：

- 当时代答链路故障（BUG-035 的"侧栏找不到会话"），恢复手段用的是**仓里官方推荐的那条**——
  `node dev/run-kickoff.mjs --session <id> --prompt "<文本>"`（发一条自由文本关闭挂起）；
- 而 `dev/run-kickoff.mjs` **完全没有 provenance 记账**（`appendProvenance` 只在 `dev/hitl-answer.mjs`
  里被调用）→ 谁在何时答的、答了什么，**盘侧无痕**；
- 后果：交付段的记账链断在"外力关单"这一步，门②/门③ 如实判红，复盘只能靠人回忆。

## 修法

1. `scripts/lib/hitl-provenance.mjs`：新增纯函数 `closingProvenanceRow({cardKey, text, date})`——按代驱
   记账纪律产出 §Decisions 行（写明**卡名**（交付审阅／计划确认 HITL1）+ **代理模拟**标记 + 文本摘录），
   措辞与门侧 `isHitl2Row` **同钉**；新增 `appendDecisionsRow({bundle, row, journalNote})`（question.md +
   journal.md 双写，bundle/契约件缺席即 throw，与 `appendProvenance` 同契约）。
2. `dev/run-kickoff.mjs`：发送前判"该会话是否有挂起 + 挂起是哪张卡 + 归属哪个 bundle"（挂起 = 会话日志
   `foldHitlPending`；卡种 = 末位 ask 的问题头经 `isDeliveryReviewCard`；归属 = `attributionBundleOf`（同
   BUG-020 正修的判据），三位置查找 bundle）→ 发送成功后落行；归属不唯一/无挂起 → 静默跳过（不猜、不误归）。

## 修复判据

1. **同钉（keyless，已过）**：`closingProvenanceRow({cardKey:'anchor-2', …})` 的产出**必须**被门的
   `isHitl2Row` 认作拍板行（否则记账白落）；HITL1 卡的产出**不得**被认成 HITL2 拍板行（不越权）。
2. **反证（已做）**：两例先看红（函数不存在时整文件红）→ 实现后 530/530 绿。
3. **端到端（待跑）**：对一场真挂起会话跑 `run-kickoff --session <id> --prompt "<关单文本>"` →
   该 bundle §Decisions 出现对应行、journal 出现备注，且门③/门② 对该 bundle 转绿（或至少门③ 认行）。

## 边界（写清楚免得被误用）

- **不追改历史 bundle**：`drt_cambricon-commercial-sustainability` 的红是**当时事实的如实记录**，
  禁止手改它的 §Decisions 去"修绿"（append-only 记录 + 文件即真相）；
- 本修法只保证**今后**走这条恢复路径会留痕；自由文本关单仍**不等价于**结构化代答（内容取舍责任在操作者）。
