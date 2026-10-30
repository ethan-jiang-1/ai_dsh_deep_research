# LLM 流永远直连——fetch 出口代理不碰 API 流（`no_proxy=api.deepseek.com`）

> 状态：implemented

## 决定

LLM 流与 web_search API **永远直连**，不走任何出口代理。2026-10-12 的落地形态 = boot-run TUN
分支追加 `no_proxy=api.deepseek.com`（`http_proxy/https_proxy` 自旋出口只服务 `web_fetch`）；
2026-10-13 起该分支随网络干预整体拆除（[网络零干预
Note](../rejected/2026-10-13-network-vanilla-restore.md)）——本仓不再设任何代理 env，「LLM 流
直连」从分支行为升级为结构保证。本 Note 保留的价值 = 教训与复发观察。

## 为什么（2026-10-12 实证，BUG-023）

TUN 态下 `http_proxy` 此前设给**整个 DSH 进程**——LLM 的 SSE 流被迫走自旋出口代理，被撕裂成
`event precedes message_start` / `MALFORMED_RESPONSE`，5 连有界重试打不穿持续窗口 → 回合死亡
（用户真实 run 18:21 实证；两个会话 12/12、16/16 attempt 全灭）。

**对照实验同刻成立**：直连路径（headless 探针，含 117KB 长上下文大请求）全部正常——同一时刻、
同一上游、同一模型。出口路径必死、直连必活，根因是代理路径撕裂流，不是上游服务异常
（此前 BUG-023 卡的"上游持续窗口"假设被此证据修正）。

## 输掉的方案

- **重试策略升级**（退避/上限/自动延迟）：对"代理路径撕裂"无效——路径错了重试几次都死；
  已转 [triggers.md](../../_backlog/triggers.md) 复发观察（仅当**直连路径**再现畸形才重议）。
- **只代理 fetch 工具配置、不动进程 env**：vendor `util/http-proxy` 读进程级 `http_proxy/https_proxy`，
  fetch 工具无独立代理配置面——env + `no_proxy` 是最小手术。

## 边界与复发观察

- TUN/fake-IP 态下 `web_fetch` 会被原生 SSRF 守卫拒（环境形态问题，本仓不干预——见网络零干预 Note）；LLM/search 直连不受影响。
- 若**直连路径**再现同签名畸形，那才是上游/模型面问题——从会话日志量化分布后再议重试策略
  （[triggers.md 行](../../_backlog/triggers.md)）。
- 相关：[BUG-023 已修卡](../../_backlog/_archived/fixed_bugs/BUG-023-provider-malformed-storm-exhausts-retry.md)、
  [BUG-022 已修卡（2026-10-20 归档）](../../_backlog/_archived/fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md)、
  [有界重试 Note](2026-10-11-provider-malformed-response-retry.md)、
  [run 指南 §0.1](../../docs/guides/61-run-playbook.md)。
