# LLM 流 MALFORMED 风暴三小时——错误字符串当语义、干预史污染嫌疑面

> 2026-10-13，run 通道 lead 会话 6 连 `MALFORMED_RESPONSE: event precedes message_start` 团灭（用户真实研究 run + 三次 fixture 重录全灭）。根因：api.deepseek.com 的 CDN/边缘层在复用连接上把 SSE 响应体 brotli 压缩后**丢失全部响应头**（含 `content-encoding`），undici 不解压、vendor 解析器从压缩字节捡出内容片段先于 `message_start`——服务端/链路侧故障，与本仓代码无关；但本仓花了约三小时才定位，本卡复盘的是**为什么这么慢**。缺陷工作项 = [BUG-024](../../_backlog/_archived/fixed_bugs/BUG-024-direct-path-malformed-storm-recurrence.md)（修复落地 = socket 隔离）。

## 1 症状

用户在 GUI 起的真实研究 run（「研究一下中美AI的差距」）首回合 6/6 尝试死亡；同日三次 fixture 重录同签名死亡（或 step1/2 活、step3 必死）；同机 GUI 会话（zai/glm-5.3，**另一 provider**）完全正常——制造了「就这个插件怪」「是不是昨天的网络拆除搞坏了」的强错觉，且该怀疑因仓史而**合理**（见下）。

## 2 为什么没早发现（本节是复盘的产出）

- **干预史污染嫌疑面**：10-10 我们建了网络干预机器（egress 探针 + 自旋代理），10-12 它自己撕裂 LLM SSE 流（BUG-023：两场 run 12/12、16/16 全灭），补丁（`no_proxy`）又引出 channel-supervisor 自愈实验的一夜翻车（[撤回 Note](../rejected/2026-10-12-channel-restart-selfheal.md)）。同一错误签名在仓史里**三次**归因于"我们的机器"。今天复发时"是不是我们又搞坏了"成了必须全链路排除的第一怀疑——零干预仓的嫌疑面本可半小时收窄到"环境/上游"。信任是被自己的干预史污染的。
- **把错误字符串当语义**：自 BUG-022/023 起，`event precedes message_start` 被当作"事件序/上游窗口/代理撕裂"的证据使用，从未抓过**原始字节**。vendor 的错误信息是通用遮羞布——它掩盖的真相是"响应字节根本是垃圾"。这一方法论债务从上一次调查原样继承到了本次。
- **本次诊断自己的方法债**：第一轮 curl 打了**错误端点**（`/chat/completions`——没先读 vendor `PUBLIC_BASE_URL = api.deepseek.com/anthropic` 就开测，"上游健康"的结论建立在不相干的端点上）；随后用会话日志重建的"精确"请求体实为残缺（53KB vs 真实 79KB——agent-instructions 等注入不可从日志全量重建），二十多轮"绿"毫无信息量。挂上 fetch tee 抓到真字节后 **30 分钟破案**。
- **录制器哨兵假阳性**：判据"日志包含哨兵字样"被 prompt 原文回显满足——首场死回合被误收为合格录制品，把最早的红信号吞了一轮。
- **"别的插件没有"是幸存者偏差 + 暴露面差异**：本插件是 `/anthropic` 端点最重的用户——每个 lead 会话 = title LLM + 多步工具回合（search→fetch→总结）= 4-6 条流式请求打在同一连接池上，58 工具 + thinking 的重请求形态；别的插件一个会话 1-2 条流、或走别的 provider。重负载意味着**第一发现人**身份，不是第一责任人。

## 3 根因

服务端/链路侧：CDN/边缘在复用的 keep-alive 连接上发出 brotli 压缩的响应体，但响应头整丢（失败响应 = status 200 + 零头 + ~1KB brotli；流式部分解压得**完整干净的 SSE**，`cache_read_input_tokens: 17792` 证明是服务端真实处理后的响应体；同刻新连接的 curl/undici 逐字节复刻全绿）。undici 因无 `content-encoding` 头不解压；`TextDecoder` + eventsource-parser 从 brotli 字节里捡出可读片段（实测帧序 `ping` → `content_block_stop` → …），vendor `llm-deepseek/src/translate.ts` 的流折算在 `message_start` 前遇内容事件即抛。同连接前序响应的**分块流永不终止**（旁路读取器等不到结束信号）→ 连接帧序失步是可见的伴生现象。字节级证据与捕获工具留存于 `runtime/smoke-workspace/llm-stream-forensics-2026-10-13/`（38 件）。

## 4 修复

根因在服务端，本仓无可修代码。落地件：① 录制器哨兵收紧为"**assistant 文本**包含"（死回合 fail-loud 拒收；红证 = 收紧后第二场死回合即被正确拒绝而非误收）；② **重试窗口拉长（vendor 自有配置面）**——research profile 的 `llm-deepseek.retryPolicy` 覆盖（9 次 × 45s 封顶 ≈ 2.5 分钟），纯 YAML、零代码，实证 policyKey 生效；③ 本卡 + triggers 行更新；④ fetch tee 取证工具留存。**恢复动作（实测有效）**：重启通道拿全新连接池 + 给挂起会话发「继续」。**教训附录**：调查中一度自造进程内 fetch 补丁（llm-stream-guard），即建即拆——用户裁定「利用原有的机制，别自己乱写」（研发宪章"循 DSH 而不发明"）；真正的修复 owner = 上游 CDN / DSH 适配层，证据已留存可直接上报。

## 5 新增防线

**本仓承担修复（用户裁定 2026-10-13：「对方不可能解决这个问题，只有我们来解决」）**——落地
`dev/llm-socket-isolation.cjs`（NODE_OPTIONS 预载，boot-run 与录制器同源接入）：**api.deepseek.com
的 LLM 流与 web_search 两类请求均每请求一次性连接、永不复用 socket**。依据：150+ 次受控「新建
连接」请求零失败，而全部故障样本都落在长命复用池上；**独立池+复用是无样本假设，不予采纳**
（重议条件 = 上游修复或握手开销规模化可测，届时一行切换）。验收 = 隔离 soak：**边缘在窗口内
仍在发作（搜索侧最初挨了 44 次零头），全量隔离后零头归零、14 会话全活**；用户原话问题 4 步全绿。

无新 L0 门禁，理由：根因在服务端，本仓无机械断言面（不能对上游行为立门）。防线以工具与纪律落地：

- **抓字节先于理论**：流异常第一动作 = 挂 tee 看原始字节与响应头（工具已留存），不以错误字符串推断归因；
- **测代码真正用的端点**：对照实验前先读 vendor 源码确认 URL/协议；
- **永不再造网络机器**（[网络零干预 Note](../rejected/2026-10-13-network-vanilla-restore.md) 已载，本次再次验证其诊断成本收益）；
- 触发器行已改写：复发时的处置 = 重启通道 + 取证，不再评估重试升级。
