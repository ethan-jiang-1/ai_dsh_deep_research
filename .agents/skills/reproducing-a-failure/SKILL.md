---
name: reproducing-a-failure
description: Use when a bug cannot be reproduced on demand, is intermittent or environment-dependent, or when evidence must be captured from a live failing process — covering staged load batteries to isolate triggers, transparent request/response tees to capture the scene, same-minute standalone contrasts, and instrumented soaks that wait for a natural failure under capture.
---

# 复现找现场（间歇性/环境依赖缺陷的方法论）

范本事故 = [LLM 流 MALFORMED 风暴 postmortem](../../../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)；
可复用工具 = [scripts/probe/llm-stream-tee.cjs](../../../scripts/probe/llm-stream-tee.cjs)——§2 透明 fetch tee
的 tracked 实现（预载只抄写字节、零行为路径改动；四件套证据包 `req/meta/sse/err`，
凭据头脱敏；单跑 `--port` 做接入预检）。一次性脚手架仍住 `runtime/`，不当长期资产。
核心律：**抓字节先于理论**——错误字符串是通用遮羞布，原始字节才说真话。

## 1. 阶梯负载定触发器（在全新受控对象上）

混杂因子先排除：失败可能来自「预毒化的现场」而不是「新触发器」。阶梯序：

1. **单发基线**（solo）——确认全新对象健康；
2. **并发续载**——同对象上叠加并发，若绿则并发假设死；
3. **首发即并发**（换新对象）——区分「触发器」与「踩尸体」。

每一格都要在**全新对象**上可重复，否则结论不可信（本事故实证：预毒化池上 3 并发全死、新池上 3 并发全绿）。

## 2. 透明 tee 抓现场

对目标进程挂透明 fetch/connection tee（预载补丁只**抄写**字节，不改任何行为路径），
同时记：请求头+体、响应状态+头、响应体原始字节、流读取异常。
判读要点：**响应头集合本身是证据**（本事故：失败响应 = 200 + 零头 + 未声明压缩体，
对照组 = 完整 16 头 + content-encoding）。

## 3. 同分钟独立对照

仪器对象跑负载的**同时**，并行跑独立裸探针（curl/独立进程，同请求体同 key），
逐条记时间戳。死亡发生时无需事后补测——同分钟「通道死/独立活」直接裁决
「进程内毒化 vs 全局窗口」，事后补测永远说不清。

## 4. 按需复现不了就等自然死亡

阶梯负载若全绿（触发器不可控），转**常驻仪器 soak**：循环负载直到首例死亡，
死亡即停并自动解剖。这是假设无关的证据收集——比继续猜触发器便宜。
（附带收益：soak 全绿本身也是「当前健康」的量化证据。）

## 5. 判别矩阵

交互假设（A×B）用四格实验各跑一遍再下结论；单变量逐一排除。
警惕「把错误字符串当语义」——先看字节，再立假设。

## 6. 证据包与上报

现场目录模式：`*.req.json` / `*.meta.json` / `*.sse` / `*.err` + 捕获工具本体 +
`UPSTREAM-REPORT.md`（摘要/字节证据/时间线/影响链/已排除清单/复现建议）。
外部故障的修复 owner 在外部——仓内只留：处置序（triggers）+ 证据包 + 配置面缓解。

## 红线（研发宪章延伸）

- 抓字节先于理论；对照实验先读代码确认**真实端点/协议**再打；
- 修复只用**原有机制**（vendor 配置面/上报），不自造进程内补丁；
- 所有「绿」都要能说出证明了什么——不能复现的绿只是没踩到。
