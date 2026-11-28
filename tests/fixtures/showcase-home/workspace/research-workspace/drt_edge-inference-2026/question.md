# Question — drt_edge-inference-2026

## 研究问题（定稿）

2026 年主流端侧推理引擎（llama.cpp / MLX / ONNX Runtime GenAI）在 7B–14B 量化模型上的首字延迟与内存占用对比。

## Purpose——为谁决策什么

为本地桌面 AI 插件选型团队确定默认离线推理后端与内存预算红线。

## 研究方法（本次实际采用）

- 采用: 方案比较
- 来源: 推荐接受
- 调查要求: 以官方基准与可复现脚本为主，区分 Apple Silicon 与 x86 CPU 口径。
- 明确不承诺: 不在缺乏统一硬件条件下做绝对排行榜。

## Decisions（append-only，最新在上）

- 2026-11-28 等待 HITL1 确认研究深度与硬件口径范围。
