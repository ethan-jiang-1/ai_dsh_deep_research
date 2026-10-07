# BUG-017：代答 provenance 行日期用 UTC——与本地拍板行日期错位，破坏 append-only 次序

> 严重级别：P2（重要）｜发现：2026-10-07｜状态：活跃

## 症状

mcp-hosts 归档 bundle 的 question.md §Decisions 实物：顶部「2026-10-06 HITL2 定稿」「2026-10-06
HITL1 定稿」，其下（更旧位）却是「2026-10-05 操作侧代理模拟…Q1『delivery_review』→『按现稿定稿』」
——HITL2 的代答 provenance 日期早于 HITL1 定稿日期，时序不可能；且代答行题面为空（Q1「」）。
归档 audit.md 时间戳 2026-10-05T16:44Z = 本地 2026-10-06 00:44——UTC/本地换算正是错位量。

## 根因

`dev/hitl-answer.mjs:351` 写 provenance 行时取 `new Date().toISOString().slice(0, 10)` = **UTC
日期**；而模型/手册侧的日期纪律（先跑 `bash date`）产生**本地日期**（Asia/Shanghai）。凌晨
16 小时窗口内两源差一天；append-only 次序（最新在上）被"新行带旧日期"破坏。题面为空 = 独立
小缺陷（pickNote 组装时未带题面文本）。

## 复现

在本地时间 00:00–08:00（Asia/Shanghai）之间用 hitl-answer 代答一次，比对 provenance 行日期与
`date +%F` 输出——差一天。

## 牵出的失败类

「日期最小契约」（手册：先跑 date 核对）只约束了模型侧文本，工具侧写日期的路径没有同口径——
值得横切 grep 所有工具脚本里 `toISOString().slice(0, 10)` 形态的日期源（run-dashboard/
evidence-audit/仪表盘若有同款，一并修）。

## 修复关联

修法 = hitl-answer 的 provenance 日期改本地口径（如 `new Date().toLocaleDateString('sv')` 或
显式 Asia/Shanghai 格式化）+ 题面缺失补齐 + 横切清扫；发现与登记 = 全仓 DSH-native 审计
（run 通道面审计代理发现，父会话核实归档实物）。
