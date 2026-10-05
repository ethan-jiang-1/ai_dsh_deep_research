# BUG-012：HTML 仪表盘与驾驶舱状态判据分叉，可能漏报 HITL

> 严重级别：P2｜发现：2026-10-05｜状态：活跃 — 已修复 2026-10-05：共享日志选择与 HITL/步骤事实适配；[Note](../../../notes/implemented/2026-10-05-project-navigability.md)

## 症状

[仪表盘](../../../scripts/run-dashboard.mjs) 的 `detectHitlWait` 固定读 `session.v3.jsonl.zstd`，
只认日志最后一条为 ask 工具调用。[watch-run](../../../scripts/watch-run.mjs) 使用 v4 日志，
[驾驶舱 HITL 折算](../../../packages/deep-research-pack/src/lib/hitl-fold.ts) 则保留 timed pending，
后续 agent 事件也不会自动关闭问卡。

因此 v4 日志或 ask 后出现 timed pending/result 等事件时，仪表盘可能无等待横幅，
不能据此判断无需人答题。仪表盘步骤条另有自己的 `deriveStep`，并未直接调用 pack 的 run-fold。
[驾驶舱设计](../../../docs/design/40-research-cockpit.md) 对两套折算的描述已纠正；实现尚未合流。

## 根因（源码核对）

两种投影各自实现状态发现和步骤折算，日志版本与 pending 语义更新没有同步到 HTML 投影。
仪表盘是 fail-soft 观察工具，没有横幅也不会以失败退出暴露遗漏。

## 复现

最小隔离场景：只有 v4 日志，或 v3 日志末位 ask 后追加 timed pending 工具结果。
前者固定 v3 路径读不到，后者末条不再是 ask；仪表盘都不列等待项。
同样的事件给 `foldHitlPending`，没有真实答复/关闭事件时仍为 pending。
本次为源码核对，未启动真实 run 或伪造运行日志；实现修复须用隔离夹具复现上述差异。

## 牵出的失败类

观察投影复制业务判据后产生静默分叉。“页面能渲染”不能证明状态语义正确，
“交付节点在场”也不能证明 present 与用户拍板发生。

## 修复关联

[目录与入口治理 Note](../../../notes/implemented/2026-10-05-project-navigability.md)。
候选统一日志发现与 HITL/步态接口，使用现有纯折算模块，并用 timed pending、已答、
不同日志版本和缺失日志夹具建立反证。仪表盘继续保持观察工具职责，交付判定归 node-gate。

## 修复验证（2026-10-05）

仪表盘复用 canonical v4/v3 选择与原生解码，再通过 `detectHitlWait`、`deriveStep` 适配到共享折算。
坏 v4 不降级到旧 v3，包括断链目录项；timed pending、后续元数据/agent 事件、v3 嵌套结果、call ID 匹配与
稀疏文件计数都有行为断言。相关 focused tests 50 项通过；公开投影适配器保留。

`client-load-smoke` 真浏览器 ALL PASS，覆盖装配、共享 HITL/步骤折算和文件真值对账。仪表盘仍为只读、
fail-soft 观察工具，交付裁决归 node-gate。
