# RFC：观察面补全（B-full 余项：步骤条 / 矩阵 / review 渐进）

> 状态：proposed

归宿：roadmap §队列「观察面补全」（feature；[observability-gui 毕业记录](../implemented/2026-09-24-observability-gui.md)
的未完成部分单独立项——原条目按时间盒毕业时如实记录的余项）。

## 问题

「研究状态」页签当前只有 journal 流 + HITL 横幅；B-full 计划的**流程步骤条、topic×evidence
矩阵、review readiness** 未做（时间盒边界，当时如实记档）。数据通道与折算范本都已验证
（workspaceFiles 读取 = company cultivation 页签范本；折算 = run-dashboard 的
parseTopics/parseEvidenceDir/parseFindings/parseReview/topicEvidenceMatrix）。

## 方案

- **共享折算进 `src/lib/`**：把 run-dashboard 的纯折算函数移植为共享 TS（`run-fold.ts`：
  文件内容 → 步骤/矩阵/review 模型），keyless 单测（TS 折算——tsx loader 已就位）；
  run-dashboard.mjs 改为消费同一份（单一正本，防两处漂移）；
- **页签渐进呈现**：顶部流程步骤条（question→topics→leads→evidence 计数→findings→review→
  final 的在场性 + 当前步高亮）→ 矩阵（topic × evidence，A–D 分布）→ review readiness；
  数据 = `remote.workspaceFiles` 读 run bundle 文件（范本同上）；
- **client-load-smoke 扩断言**：页签在既有会话上呈现步骤条与矩阵（真数据）。

## 输掉的方案

- **让 run-dashboard 的 HTML 仪表盘代替页签**：已否决——GUI 内可见性是独立需求（首场
  run 实证：仪表盘在浏览器另开一页）；
- **host `@Remote` 读模型**：押后——workspaceFiles 零 host 面改动（原 RFC 同款拍板）。

## 验收

- 折算单测绿（含首场 run 真实 bundle 文件的期望值快照断言）；
- client-load-smoke 扩断言 ALL PASS（步骤条在场、矩阵有真数据行）；
- run-dashboard 行为不回归（消费共享折算后输出不变——对拍断言）；
- 不破坏：L0 全绿。
