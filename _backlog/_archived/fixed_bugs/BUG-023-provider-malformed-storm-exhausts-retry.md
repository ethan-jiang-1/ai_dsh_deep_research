---
status: 已修
severity: P1
opened: 2026-10-12
---

# BUG-023：上游流畸形**持续窗口**击穿有界重试——回合死亡回归（BUG-022 残留形态）

> 严重级别：P1（用户真实 run 当场死回合；重试五连全灭）｜发现：2026-10-12 18:21｜状态：已修（2026-10-12）

## 症状

[BUG-022](../suspended_bugs/BUG-022-provider-stream-malformed-turn-kill.md) 的同签名畸形
（`event precedes message_start` / `MALFORMED_RESPONSE`）在 2026-10-12 午后起呈**持续窗口**：
bundle 层有界重试（`maxRetries: 5`，[Note](../../../notes/implemented/2026-10-11-provider-malformed-response-retry.md)）
在位且确实逐次尝试（`llm/retry` / `llm/retry-started` 事件在场），但窗口内**每次重试都畸形**——
5 连尽 → `turn/end.reason = error`，回合死亡。用户侧体验 = 「This turn failed … MALFORMED_RESPONSE」，
随后 steer/继续也被同一窗口吞掉。

## 证据（2026-10-12 实测，会话日志）

| 会话 | 失败 attempt | 尾事件 |
|---|---|---|
| `session-e0408634`（渐进面探针会话——用户在其上发起「AI Coding 安全」研究） | 12/12 全畸形，turn 2 | `turn/end error(MALFORMED)` @ 1791800550220 |
| `session-579c0a4f`（国产 AI 编程助手格局 run——本日实验 run） | 16 次失败 attempt（seq 191→308，集中晚期），turn 2 | `turn/end error(MALFORMED)` @ 1791799102535 |

重试行在位实证 = 镜像 `cordis.patch.yml` 含 `retryableCodes: … + MALFORMED_RESPONSE`；`llm/retry` /
`llm/retry-started` 事件序列在两场会话日志可见（重试在打，打不穿）。

## 根因（假设，待证据确认）——**2026-10-12 晚已修正，见下节**

上游（DeepSeek Messages 流）在该时间窗内持续违约事件顺序——非本仓代码回归（机制层同 BUG-022，
vendor 只读层，本仓修不了流解析）。**本仓侧残留** = 有界重试对"持续窗口"设计性不足：耗尽即死，
且死回合后观察面没有"上游流异常，稍后重试"类恢复指引（用户不知道该等还是要弃）。

### 根因修正（2026-10-12 晚，对照实验）

上面的"上游持续窗口"假设**已被证据推翻**：真实根因 = **fetch 出口代理撕裂 LLM 的 SSE 流**。
TUN 态下 `http_proxy/https_proxy` 设给整个 DSH 进程，LLM 流被迫 ride 自旋出口代理由此被撕裂；
同刻对照——直连路径（headless 探针，含 117KB 长上下文大请求）全部正常，同一上游同一模型：
**出口路径必死、直连必活**。

- **实际修复** = `dev/boot-run.sh` 追加 `no_proxy=api.deepseek.com`（LLM 与 web_search API 直连，
  web_fetch 照走出口）；决定理由与输掉的方案 = [LLM 流直连 Note](../../../notes/implemented/2026-10-12-llm-stream-direct-no-proxy.md)；
- 本卡的观察面恢复指引（判据①）仍有价值——直连路径再现时它就是恢复面；
- 判据②（重试策略升级）**前提已变**：对"路径错"无效，只在**直连路径**再现同签名畸形时才重议（[triggers.md](../../triggers.md) 已改此行）。

## 修复判据（候选，落地需走各自权限）

1. **观察面恢复指引**（client 面，D25 观察/调试例外内）：回合因 `MALFORMED_RESPONSE` 死亡时，
   状态面板给出一句话人话提示 + 「重试」动作指向 steer/继续——机械验收 = 折算纯函数 + smoke。
2. **重试策略升级候选**（触 pack 公共行为 → 等人拍板）：指数退避 / 上限上调 / 耗尽后自动
   延迟再试一轮——需先量化窗口长度（本次窗口 ≥2h，指数退避也未必打得穿，先测窗口分布再定）。
3. **上游侧**：持续窗口期服务端异常，非本仓可修；登记归档池参考即可。

## 参考

[BUG-022](../suspended_bugs/BUG-022-provider-stream-malformed-turn-kill.md)（ suspended：本仓修不了的上游事件顺序违约）·
[重试 Note](../../../notes/implemented/2026-10-11-provider-malformed-response-retry.md)（有界重试决策与"未运行项"）

## 修复落地（2026-10-12，判据①）

- **折算层** = [stream-failure.ts](../../../packages/deep-research-pack/src/lib/stream-failure.ts)：末位 `turn/end` 为 `MALFORMED_RESPONSE` 族且无新 `turn/start` 接手 → dead；成功回合/其他码/重试中不误报（4 组 keyless 测试，真实事件形状 = session-e0408634 实录）。
- **观察面** = ResearchStatusTab 恢复横幅：「⚠️ 上游模型流连续异常，刚才那回合没跑成——研究档案都在。等一两分钟，在对话里发『继续』即可接着跑。」与 HITL 挂起互斥；[design/40](../../../docs/design/40-research-cockpit.md) 已登记。
- **证据**：`pnpm test` 415/415；`pnpm verify` 全绿；client-load-smoke **ALL PASS**——含「流失败恢复指引 = 盘侧 streamFailureOf 真值」断言在**真实死亡会话**（渐进面探针会话，12/12 畸形实录）上通过，偏好库区断言同步升级为盘侧库状态真值。
- **保持活跃的原因**：判据②（重试策略升级：退避/上限/自动延迟）触 pack 公共行为，需先量化畸形窗口分布再请拍板——本次窗口 ≥2h，盲目加次数未必打得穿。窗口再现场景中横幅真实出现一次后，本卡按流程收 `fixed_bugs`。

## 已修收结（2026-10-12）

判据①（观察面恢复指引）落地并经**真实死亡会话**浏览器验证（盘侧 streamFailureOf 对账，client-load-smoke ALL PASS）。**根因已另行收口**：出口代理撕裂流 → boot-run `no_proxy=api.deepseek.com`（上节「根因修正」）——故不再归 BUG-022 悬挂语义承载。候选②（重试策略升级：退避/上限/自动延迟）不随本卡关闭——**前提已变为仅直连路径再现时**，转 [triggers.md](../../triggers.md) 作可观察重议条件（窗口再现时量化分布再议），触发条件 owner = 本卡。
