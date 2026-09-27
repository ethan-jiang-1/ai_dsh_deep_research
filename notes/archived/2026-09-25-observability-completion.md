# RFC：观察面补全（B-full 余项：步骤条 / 矩阵 / review 渐进）

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列「观察面补全」（2026-09-25 马拉松二号条目 3，已毕业离队）（feature；[observability-gui 毕业记录](../implemented/2026-09-24-observability-gui.md)
的未完成部分单独立项——原条目按时间盒毕业时如实记录的余项）。

## 决定

run-dashboard 的纯折算移植为共享 TS（单一正本），页签补渐进面（步骤条/矩阵骨架）。

## 实施记录

- `src/lib/run-fold.ts`：deriveSteps（步骤条七步三态）+ topicEvidenceMatrixCells（矩阵折算）
  ——keyless 单测 6 断言含首场 run 真实 bundle 期望值（交付步 current；bundle 是 gitignored
  运行区，缺席跳过不假绿）；
- 页签渐进面：步骤条 chip 渲染（current 高亮）+ 矩阵区 + readiness 骨架；**数据面 v1 简化**：
  workspaceFiles 扫描留空不硬猜（journal 事件面拿不到文件清单——后续接 remote.workspaceFiles
  的 bundle 目录发现，已在代码注释标注）；
- client-load-smoke 扩断言（渐进面挂载）→ ALL PASS 8/8。

**如实交代（部分交付）**：步骤条/矩阵的**渲染骨架**与**折算正本**落地且有真数据单测；
但页签上的**真数据渐进呈现**（从 bundle 文件实时读在场性）因数据面发现机制（bundle 目录
定位）未接通而留空——"挂载点在场 + 折算正确"已证，"真数据上屏"待 workspaceFiles 目录
发现（下一场 run 的 L4 收口或后续条目）。

**补记（2026-09-26）**：真数据上屏**已接通**——`ResearchStatusTab.tsx` 的 bundle 发现改用
`listDir(sessionId, '.')`（工作区根 → 最新 `drt_*`），根因链四条与修复见
[bundle-face-wiring](../implemented/2026-09-26-bundle-face-wiring.md)；`client-load-smoke` 的渐进面断言已从
观察点升级为硬断言（步骤条七步 / 证据 31 份 / ✅ 已交付 / 问题行），13 断言 ALL PASS。

## 实际跑过的验证

| 面 | 结果 |
|---|---|
| keyless tests | 6/6 绿（含首场 run 期望值） |
| client-load-smoke | ALL PASS 8/8（渐进面挂载断言 + journal 326 事件） |
| L0 | 25 门禁 + 49 tests 全绿 |

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
