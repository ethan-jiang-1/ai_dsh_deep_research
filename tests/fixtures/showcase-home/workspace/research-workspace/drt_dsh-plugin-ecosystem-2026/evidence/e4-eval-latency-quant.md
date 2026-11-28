---
title: 量化对照：并行工件扫描与行内悬停溯源的复核耗时评估
source_url: https://benchmarks.example.org/agent-ux-latency-2026
retrieved_at: 2026-11-28
quality: B
found_by: analyst-1
supports: [T2, T3]
lens: quant
source_tier: secondary
publisher: benchmarks.example.org
---

# 量化对照：并行工件扫描与行内悬停溯源的复核耗时评估

> 将状态页独立文件读取由串行改为并行 `Promise.all` 后，冷切换打开耗时由 ~1.4s 降至 ~220ms；全屏三栏精读配合 150ms 悬停溯源卡，将单份长报告逐条核查的页面往返次数降低约 70%。

- 实测 12 份 bundle 工件并发读取可稳定控制在单个 RTT 窗口内完成，避免首帧闪烁。
- 悬停溯源引入 48 槽有界 LRU 缓存，二次悬停同一证据卡耗时 < 2ms。

## Question List（本 topic）
- [x] 是否对齐了测试样本规模与冷/热缓存口径？
- [ ] 待补更多超大规模（>100 张证据卡）工作区下的内存基准。
