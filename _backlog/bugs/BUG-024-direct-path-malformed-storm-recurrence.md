---
status: 修复落地
severity: P1
opened: 2026-10-13
---

# BUG-024：直连路径再现「event precedes message_start」畸形风暴——大会话重试全灭（BUG-023 判据②触发条件成立）

> 状态：修复落地（2026-10-13 用户裁定「对方不可能解决这个问题，只有我们来解决」→ socket 隔离已上线）｜发现：2026-10-13 01:49（session-36c68186 复醒后 8 连败）｜关联：[BUG-023](../_archived/fixed_bugs/BUG-023-provider-malformed-storm-exhausts-retry.md)（已修——按规矩复发引新卡，不重开旧卡）；根因实测定案与全程证据 = [postmortem 2026-10-13](../../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)

## 症状

同签名畸形（`turn/end.reason.error = "DeepSeek Messages stream: event precedes message_start"`，MALFORMED_RESPONSE）在 **boot-run 自报 egress = direct** 的通道上再现——BUG-023 的已证根因（TUN 态出口代理撕裂 LLM SSE，修 = `no_proxy=api.deepseek.com`）解释不了本卡，因为：

- 两次 boot 均自报 direct（2026-10-13 00:0x 与 01:3x 本地）；
- **同进程同时刻按会话分层**：小会话零失败、大会话全灭（证据见下）；
- 带钥匙小探针全部健康：`/models` 200、`/chat/completions` 非流+流通、`/anthropic/v1/messages` 小流全规整。

**范围**：dsh run 通道的 LLM 流路径（deepseek-official / `api.deepseek.com/anthropic`）。**排除项**：出口代理撕裂（direct + 同进程小会话零失败）、凭据/配额（探针 200）、本仓与 harness 回归（vendor/pack 零改动、漂移绿；同签名风暴 2026-10-12 已在——BUG-022/023）。

## 证据

| 观察对象 | 形状 | 结果 |
|---|---|---|
| `session-36c68186`（drt_cn-us-ai-gap，事件 286+ 长上下文大会话） | 32 attempts | **32 全畸形**，横跨 2026-10-12 16:31 → 2026-10-13 01:49+（≥558 分钟，0.1–1.4 次/分）；重试五连逐次打、逐次畸形 → 回合死亡（48 个失败事件，末条 seq 286） |
| `session-e5304d78`（同通道小会话，短流） | ~5 turns | **零失败**（glob×4/read×3/skill×1/ask×1 全正常推进） |
| 带钥匙小探针 ×3 面 | 小 payload | 全通（含 /anthropic 面 SSE 事件序规整） |

## 根因（已实测定案，2026-10-13；全程 = [postmortem](../../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)）

**上游边缘对长命复用连接的相位性故障**：进程连接池会进入「垃圾相位」——实拍 64 个健康响应 → 2 秒 → 23 个「200 + 零响应头 + 未声明 brotli 体」的硬切换；客户端 undici 不解压、vendor SSE 解析器从压缩字节捡出内容片段先于 `message_start` 即抛。**本卡原「大会话形状触发」假设已被受控实验证伪**（失败请求逐字节回放、并发/空闲/弃读/搜索混合全谱系 ~215 次独立尝试零复现）；真实相关量 = **连接复用暴露**（大会话 = 长命池 = 复用多；小会话/新连接零失败）。上游报告与字节证据 = `runtime/smoke-workspace/llm-stream-forensics-2026-10-13/`（含 UPSTREAM-REPORT.md）。

**已落地缓解（用户拍板 2026-10-13）**：① `dev/llm-socket-isolation.cjs`——api.deepseek.com 的 LLM 流与 web_search 两类请求**每请求一次性连接、永不复用**（全量隔离 soak：832 响应 3 命中 0.36% 且命中后重试自愈、22 会话零死亡；对照未隔离：87 响应 23 命中、逢风暴必死）；② research profile `llm-deepseek.retryPolicy` 拉长（9 次 × 45s 封顶）——短抖动自动扛过；③ 处置序 = [triggers](../triggers.md)（隔离下再现 → 重启通道 + 核隔离预载 + 抓字节）。


## 牵出的失败类

"畸形风暴窗口 × 请求形状"的暴露差——重试策略对持续窗口的设计性不足（BUG-023 判据②的原始关切）在直连路径成立时的量化与升级决策；横切面 = LLM 流解析对上游违约事件序的容错语义（vendor 只读层，本仓可做的只有策略与观察面）。

## 修复判据

1. **量化先行**：窗口分布实测——风暴期/静默期 × 请求形状的失败率矩阵 → **已交付**（隔离 soak 832 响应 3 命中；受控侧 ~215 次零复现；形状无关判定）；
2. **缓解选定**：socket 隔离（本仓可承载面，用户 2026-10-13 拍板落地）+ 重试窗口拉长（vendor 配置面）——**已落地**（不再走 pack 公共行为改重试策略：隔离后残余命中由既有重试自愈，实测 1 次重试即恢复、22 步续跑）；
3. **收卡判据**：隔离下大会话完整回合零致命 MALFORMED 连续 ≥3 场（残余瞬时命中允许，只要重试自愈）——**进行中**：隔离 soak 22 会话零死亡（1 场各 1 次瞬时命中自愈）+ 通道实地试验待观察。

## 参考

- [BUG-023](../_archived/fixed_bugs/BUG-023-provider-malformed-storm-exhausts-retry.md)——判据②触发条件（"只在直连路径再现同签名畸形时才重议"）由本卡成立，触发 owner 按该卡交接至此；
- [LLM 流直连 Note](../../notes/implemented/2026-10-12-llm-stream-direct-no-proxy.md)——no_proxy 修复与机制；
- 实录会话：`session-36c68186-66fb-49ac-b29a-9893344b91f9`（日志在 `runtime/harness-home/sessions/`，gitignored 运行数据）。
