---
status: 修复落地
severity: P2
opened: 2026-11-11
---

# BUG-064：回放的 A 层不是自包含的——真实工具调用会卡住整层（无超时归因、无并发锁）

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：修复落地 — 已落地失败归因（A 超时输出最后事件/tool name/seq）与 run lock；自包含 fixture tool/result 与工具有界超时仍未决（卡内「进展」记录）。

## 症状

`snapshot-replay-smoke` 的 lead 场景在**静默窗口**（无锁、无并发 client-load）依旧复现：

```
FAIL [research-face/lead] A 回放通路（…）（回放回合未在 240s 内以 completed 走完并让收尾文本（"探针完成"）
落进 assistant 消息——canned 回放未走通）
```

而同一天 23:47:26 的另一场回放**完整成功**（`session-8b9679cd`：67 事件 / 7 步 / 11 次工具调用与结果 /
`turn/end completed`）——说明树本身能跑通，失败是间歇/环境性的。

## 关键现场（判据都在盘上）

失败场次 `session-862284a4`（创建 23:43:10）的事件序列**停在第一个工具调用上**：

```
19 事件：session … turn/start → step/start → user/message → request/header →
assistant/message → tool/call{name:"web_search"}   ← 到此为止
（无 tool/result、无 step/end、无 turn/end）
```

成功场次 `session-8b9679cd`（创建 23:47:26）同 fixture，走完 7 步、11 个 `web_search`/`web_fetch`
调用与结果，`turn/end completed`。

## 根因方向（未证，三条）

1. **A 层依赖真实工具**：`@deepseek-ai/dsh-llm-replay` 只回放 **LLM chunk**（text / reasoning /
   tool-call），工具**照真执行**。web_search 需要真实网络与检索 API；一旦某次调用挂住，A 层只能在
   240s 后报「canned 回放未走通」——**失败归因指向模型回放，实际卡在工具**。
2. **无并发锁**：`client-load-smoke` 有 `client-load.lock`（存活拒跑 / 死亡接管），回放冒烟
   `grep lock` **零命中**。两场回放/其它宿主冒烟同时跑会共用同一 `DSH_HOME` 与
   `research-workspace`，并各自打真实检索 API——限流/争用都可能表现为工具挂起。
3. **绑定序**：fixture 按 first-call 序绑定；同宿主若有其它会话抢脚本位（title LLM 已显式禁用，
   算是历史的同类教训），该会话会拿不到响应——但本例失败会话已有 assistant 文本与 tool/call，
   更像「工具没回来」而非「脚本没喂到」。

## 影响面

- 这是**渲染金标准（C 层）的唯一入口**：A 挂住 → B/C 全不跑，驾驶舱渲染面等于没有机械证据；
- 失败文案只提「canned 回放未走通」，会把人引向 fixture/persona 方向。本次排查实际花了
  40+ 分钟才定位到「停在 web_search」——**归因成本本身就是缺陷的一部分**；
- 间歇失败在 gate 报告里与真回归不可区分（上一轮我就先怀疑产品）。

## 修复判据

1. **失败归因**：A 超时时输出最后事件类型 + 卡住的工具名/耗时（如 `stalled at tool/call web_search,
   218s since call`），并区分「工具未回」与「回放未喂到」；
2. **自包含性**：二选一——(a) 回放 fixture 里的 tool/result（A 层真 keyless，不依赖网络）；
   (b) 保留真工具但给每次工具执行加**有界超时**，超时即明确红（不是静默等 240s）；
3. **并发隔离**：给回放冒烟加与 client-load 同款 run lock（或独立 DSH_HOME/端口之外的 home 级隔离），
   并发第二实例明确拒跑（exit 2），不共享 dev home；
4. 先红后绿：在 A 层加一个「工具永不返回」的注入用例（可用假 provider/离线网络）→ 修复前静默超时、
   修复后明确红并给出工具名；
5. `pnpm verify` 绿。

## 修复关联

未定（待根因确认）；与 [BUG-061](../_archived/fixed_bugs/BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md)（C 层定位器）
和 [BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md)（locale）同一条冒烟，但本条在 A 层：
**证据是「回放本身能不能跑完」**。

## 进展（2026-11-12）

- 同一命令再跑时 A 层**成功走完**（`turn/end completed`），C0–C5 全 PASS（C5 = 1 卡 · 2 行）；失败场仍复现「停在 `tool/call web_search`、无 tool/result」。这证实根因方向 #1 的形态：树能跑通，但真实工具调用会间歇挂住，失败被 240s 静默吞掉并归因成 canned 回放。
- 本卡已落地两部分：`snapshot-replay-smoke` 加 `snapshot-replay.lock`（同 client-load 的存活/陈旧接管语义）与 A 超时归因（`stalled at tool/call web_search（最后 seq 17）` 实测）；「fixture 回放 tool/result」与「工具执行有界超时」仍需在两条修法间拍板，未在本轮改。
