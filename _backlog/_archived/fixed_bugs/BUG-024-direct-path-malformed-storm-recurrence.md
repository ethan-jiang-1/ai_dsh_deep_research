---
status: 已修
severity: P1
opened: 2026-10-13
---

# BUG-024：直连路径再现「event precedes message_start」畸形风暴——大会话重试全灭（BUG-023 判据②触发条件成立）

> 状态：已修（2026-10-13 用户裁定「对方不可能解决这个问题，只有我们来解决」→ socket 隔离上线 → 2026-10-15 盘点判据未满足转 等人拍板 → **用户拍板走 A** → 通道预载核实后三场大会话探针零致命 MALFORMED → 判据满足 → 同日归档）｜发现：2026-10-13 01:49（session-36c68186 复醒后 8 连败）｜关联：[BUG-023](BUG-023-provider-malformed-storm-exhausts-retry.md)（已修——按规矩复发引新卡，不重开旧卡）；根因实测定案与全程证据 = [postmortem 2026-10-13](../../../notes/archived/2026-10-13-llm-stream-malformed-storm.md)

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

## 根因（已实测定案，2026-10-13；全程 = [postmortem](../../../notes/archived/2026-10-13-llm-stream-malformed-storm.md)）

**上游边缘对长命复用连接的相位性故障**：进程连接池会进入「垃圾相位」——实拍 64 个健康响应 → 2 秒 → 23 个「200 + 零响应头 + 未声明 brotli 体」的硬切换；客户端 undici 不解压、vendor SSE 解析器从压缩字节捡出内容片段先于 `message_start` 即抛。**本卡原「大会话形状触发」假设已被受控实验证伪**（失败请求逐字节回放、并发/空闲/弃读/搜索混合全谱系 ~215 次独立尝试零复现）；真实相关量 = **连接复用暴露**（大会话 = 长命池 = 复用多；小会话/新连接零失败）。上游报告与字节证据 = `runtime/smoke-workspace/llm-stream-forensics-2026-10-13/`（含 UPSTREAM-REPORT.md）。

**已落地缓解（用户拍板 2026-10-13）**：① `dev/llm-socket-isolation.cjs`——api.deepseek.com 的 LLM 流与 web_search 两类请求**每请求一次性连接、永不复用**（全量隔离 soak：832 响应 3 命中 0.36% 且命中后重试自愈、22 会话零死亡；对照未隔离：87 响应 23 命中、逢风暴必死）；② research profile `llm-deepseek.retryPolicy` 拉长（9 次 × 45s 封顶）——短抖动自动扛过；③ 处置序 = [triggers](../../triggers.md)（隔离下再现 → 重启通道 + 核隔离预载 + 抓字节）。


## 牵出的失败类

"畸形风暴窗口 × 请求形状"的暴露差——重试策略对持续窗口的设计性不足（BUG-023 判据②的原始关切）在直连路径成立时的量化与升级决策；横切面 = LLM 流解析对上游违约事件序的容错语义（vendor 只读层，本仓可做的只有策略与观察面）。

## 修复判据

1. **量化先行**：窗口分布实测——风暴期/静默期 × 请求形状的失败率矩阵 → **已交付**（隔离 soak 832 响应 3 命中；受控侧 ~215 次零复现；形状无关判定）；
2. **缓解选定**：socket 隔离（本仓可承载面，用户 2026-10-13 拍板落地）+ 重试窗口拉长（vendor 配置面）——**已落地**（不再走 pack 公共行为改重试策略：隔离后残余命中由既有重试自愈，实测 1 次重试即恢复、22 步续跑）；
3. **收卡判据**：隔离下大会话完整回合零致命 MALFORMED 连续 ≥3 场（残余瞬时命中允许，只要重试自愈）——**已满足（2026-10-15 用户拍板走 A）**：通道预载核实后三场大会话探针全部达标（证据与边界见 §收卡证据）。此前"盘点未满足"的经过保留在 §收卡判据盘点（它是 A 路径的必要性依据，不是被推翻的结论）。

## 收卡判据盘点（2026-10-15，keyless 盘侧对账）

判据缺口 = **"隔离下"与"大会话"两个限定词在落地后的实地证据中同时缺席**：

1. **落地后没有任何大会话**：`runtime/harness-home/sessions` 中 mtime ≥ 落地点、含 LLM 活动的 canonical 日志共 **74 个**，事件数上界 **46** 事件 / ≤5 条 `assistant/message`（多为冒烟与客户端加载产生的短会话）；`>100` 事件的大会话（375/418/616 事件）全部落在 10-13 上午，即**提交前的 soak 窗口**。
2. **"隔离下"未能证实**：全部日志中只有 `runtime/smoke-workspace/web.log`（mtime **2026-10-13 14:44**）含预载行 `[llm-socket-isolation] 第 1 次骑行一次性连接`；**落地后没有任何通道日志**。当前 3083 监听进程（pid 72657）在本沙箱内**命令行与 env 均读不到**（父链为空），故其是否带 `NODE_OPTIONS=--require dev/llm-socket-isolation.cjs` **不可核实**——按"仪器对准目标"纪律，不得把不可核实的预载当作隔离证据。
3. **两场邻接致命**：10-13 12:23 与 14:25 各 1 次 `turn/end error MALFORMED_RESPONSE`（分别伴 5 / 9 次 MALFORMED 重试后仍终局）。12:23 早于隔离激活 boot（14:44）→ 归属未隔离；14:25 紧邻激活前 19 分钟 → **归属不可判**（无当时通道日志）。两场都不落在落地后的观察窗内。
4. **缓解自身有静默回退面**（新观察，牵出项）：10-13 日志含 3 条 `[llm-socket-isolation] 守卫自身异常（透传原始 fetch）: fetch failed`——隔离件在自身异常时**透传原始 fetch（即未隔离）**。这意味着"隔离下"是条件性的：现场判读前必须先核预载在场（[triggers](../../triggers.md) 处置序已要求）。

**下一步（用户选择）**：以 `bash dev/boot-run.sh` 起通道（预载由它 export，boot 日志应现隔离行），跑 **≥3 场大会话完整回合**并逐场核对（`turn/end` 无 MALFORMED 终局；瞬时命中允许且须见重试自愈）→ 判据满足即归档 `已修`。备选（更省）：只核预载 + 观察既有 run 通道的自然使用，任其自然积累 ≥3 场。两者都需真实模型档投入，故本卡转 `等人拍板`。

## 收卡证据（2026-10-15，A 路径；原始件 = `runtime/smoke-workspace/bug-024-evidence/iso-probe-2026-10-15.md`）

**用户拍板**：2026-10-15 用户"听你的建议，继续"→ 走 A（真实模型档投入）。

**隔离绑定（"隔离下"的机械前提）**：boot-run 漂移门先正确拦停（工作树改过 pack、镜像过期）→ 按门禁点名路径重建 `profiles/research` → 启动后 `web.log` 第 1 行现**预载自证**（本轮新增）：`[llm-socket-isolation] 预载已生效 pid=87351`；每次驱动前与轮询中反复核验 **监听 3083 的 pid == 自证 pid（87351）**。

**三场探针（scout 预设、20 步串行 web_search 循环、题面要求收官标记）**：

| # | session | 事件 | assistant/message | tool/call | 重试 | 终局错误（MALFORMED） | turn/end | 收官标记 |
|---|---|---|---|---|---|---|---|---|
| A | session-a6d958d4（含一次通道重启中断 → `--session` 续跑唤醒） | 187 | 23 | 21 | 0 | **0**（0） | 3（末次 completed） | PROBE-DONE-A ✓ |
| B | session-ffd8c691 | 164 | 21 | 20 | 0 | **0**（0） | 1（completed） | PROBE-DONE-B ✓ |
| C | session-0ebea509 | 163 | 21 | 20 | 0 | **0**（0） | 1（completed） | PROBE-DONE-C ✓ |

三要素齐：**隔离下**（pid 绑定）· **大会话**（163–187 事件，对照判据盘点的"小会话 ≤46 事件"）· **完整回合零致命**（三场 `turn/end` 均 completed、终局错误 0、MALFORMED 重试 0）。

**边界（不夸大）**：① 三场是工程探针会话而非完整研究 run，结论只覆盖"隔离下 LLM 流路径在长会话高复用暴露下的表现"；② 本窗口零瞬时命中，"命中后重试自愈"支未被本次触发（既有证据 = 提交前 soak：832 响应 3 命中且全部自愈、22 会话零死亡）；③ 窗口外上游边缘仍可能故障，处置序（[triggers](../../triggers.md)）常在。④ 探针期间通道曾被重启一次（非本卡工具链问题），A 场经续跑唤醒恢复——该中断同时实证了恢复通道。

## 参考

- [BUG-023](BUG-023-provider-malformed-storm-exhausts-retry.md)——判据②触发条件（"只在直连路径再现同签名畸形时才重议"）由本卡成立，触发 owner 按该卡交接至此；
- [LLM 流直连 Note](../../../notes/implemented/2026-10-12-llm-stream-direct-no-proxy.md)——no_proxy 修复与机制；
- 实录会话：`session-36c68186-66fb-49ac-b29a-9893344b91f9`（日志在 `runtime/harness-home/sessions/`，gitignored 运行数据）。
