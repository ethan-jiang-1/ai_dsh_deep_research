# RFC：M2 运行机制——四角色团队在 DSH 上怎么真跑起来

> 状态：**proposed（待用户打磨）** · 2026-09-24 · 归宿：roadmap ▶「首个完整研究 run」
> 依据：codex harness 考古（notes/research/2026-09-24-deep-research-harness-analysis.md）
> + 本轮源头亲读（RUN.md / BUNDLE_ENTRY / rb_plan 实物）+ evaluation.md L4 全量判据。

## 问题

四角色 preset 从未以团队形态协作过（M1 只证了单会话挂载与单条消息响应）。三个未知：
- **Q2**：agent-team `spawn_teammate` 成员会话的 preset 挂载行为（成员拿到谁的组合）；
- **Q5**：多 analyst 并行时的 topic 争用（单 owner 纪律够不够）；
- **Q4**：lead 综合负载是否高到需要专职 synthesizer。

## 方案（run 的编队与运转）

1. **运行主体 = 一个 lead 会话**：挂 `Deep Research Lead` preset，cwd = `research-workspace/`。
   用户在 lead 会话提出研究问题 → lead 加载 research-brief skill 走 **HITL1**
   （ask_user_question：研究类型 / 深度篇幅 / 口径，每问带推荐）→ 落 `runs/<slug>/`。
2. **组队**：lead 按 team-assembly skill 定名单（探索性全景默认：scout ×1 + analyst ×1 +
   critic 后置进场；负载高再加 analyst），`spawn_teammate` 组队——成员 preset 按角色挂。
3. **派活与回收**：任务板（team 主通道，D3）；topic 单 owner（手册 owner 表）；scout 的
   leads.md 定向给 analyst；analyst 证据回来 lead 写 findings.md；critic 对成稿出
   review.md；lead 综合纪律 = 纯综合先行禁新搜、gap 定向补搜只一轮。
4. **HITL2**：lead ask_user 给审阅建议——证据充分性判断 + 交付/补研究推荐 +
   **composition 确认**（吸收源头 composition_handoff：读者是谁 / 用来做什么 /
   前景化重点——写进审阅建议而非新机制）。
5. **交付**：`final.md`（每条关键结论带 `[来源: evidence/xx.md]`）+ `present` 声明。
6. **中断恢复实测**（L4 判据 ④）：run 进行中受控 kill lead 会话 → 新开 lead 会话 →
   只凭 `runs/<slug>/` 文件重建上下文继续（不依赖 chat memory）——记进 journal。

### 源头对照（哪些照搬、哪些已有载体）

| 源头机制 | M2 落法 |
|---|---|
| RUN.md 入口选定 + 静默自律 | lead 会话即入口；手册"两点交互"节已等价（silent-wave-execution 语义） |
| queue demand → work-unit 派活 | team 任务板 + 手册 owner 表（D3 定案，不重建 CLI） |
| HITL1/HITL2 stop:yes | lead 的 ask-user（唯一持有人，工具面已表达） |
| readiness 确定性预检 | critic skill 清单（诚实降格，设计已记录） |
| ReopenResearchPass 重跑 | 简化：`runs/<slug>-v2/` 新目录 + 修订记录（见 m2-plan-shape RFC） |

## 输掉的方案

- **lead 一个人跑全程**（不组队）：否——D3 已定案 team 主通道，且 Q2/Q5 只有真组队才闭。
- **用一次性 subagent 派研究活**：否——续驶语义归 team（company D18 边界）；subagent 只做
  单点查证工人（现有定位）。
- **自建任务文件/调度器**：否——"second durable home" 禁令 + 不发明纪律。

## 验收判据

- L4 全量四判据（evaluation.md）：① final.md 存在且含来源清单；② 抽查 N 条结论可回溯
  （建议 N=5，用户可调）；③ 两点纪律：HITL 之间静默自主（会话日志核对无中途提问）；
  ④ 中断恢复实测通过；
- Q2 闭：成员会话日志核对 preset 组合（zstd 解压逐事件，方法同 l4-lite）；
- Q5/Q4 观察：journal.md 记录争用/负载现象 → 00-index 待定表销账或留证据。

## 开放问题（请用户定）

1. analyst 初始数量（默认 1；Q4 观察后议增）；
2. 抽查条数 N 与中断恢复是否要"真 kill"（建议做一次受控的，最有说服力）；
3. 研究问题（你出题——run 的输入）。
