# RFC：M2 运行机制——四角色团队在 DSH 上怎么真跑起来

> 状态：**approved（2026-09-24 用户批准形状/队形；开跑待用户就位 HITL1）** ·
> 2026-09-24 · 归宿：roadmap ▶「首个完整研究 run」
> 依据：codex harness 考古（notes/research/2026-09-24-deep-research-harness-analysis.md）
> + 本轮源头亲读（RUN.md / BUNDLE_ENTRY / rb_plan 实物）+ evaluation.md L4 全量判据。

## 依赖与落地次序

第 ④ 件（落地序见 roadmap 队列行）：前置 = ① m2-plan-shape + ② m2-data-caliber
（模板形状、纪律文本——流程图与验收直接引用两件产物）+ ③ m2-run-dashboard
（run 期间的用户观察面）。

## 可视化原则（run 期间用户怎么看）

静默自律 ⟹ 进度可见性必须住**文件投影**，不住角色汇报（汇报即破坏两点交互纪律）。
观察两层：L0 现成面（web GUI 各角色会话实时流 + ui-agent-team 任务板 + deliverables
面板——P1 操作指南写明"看哪里"）；L1 仪表盘（m2-run-dashboard RFC：keyless 只读
投影脚本——topic×evidence 矩阵 / A–D 分布 / gap 四态 / journal feed）。观察是
**被动的**：可视化不构成第三个交互点，不从观察面向角色发指令。

## 问题

四角色 preset 从未以团队形态协作过（M1 只证了单会话挂载与单条消息响应）。三个未知：
- **Q2**：agent-team `spawn_teammate` 成员会话的 preset 挂载行为（成员拿到谁的组合）；
- **Q5**：多 analyst 并行时的 topic 争用（单 owner 纪律够不够）；
- **Q4**：lead 综合负载是否高到需要专职 synthesizer。

## 运行流程总览（一眼版）

```
你（用户）           lead 会话（主编，唯一入口/出口）        队员会话（scout/analyst/critic）
   │ 提出研究问题        │                                    │
   ├──────────────────▶ │ 加载 research-brief skill           │
   │ ◀── HITL1 三问 ──── │ （ask_user_question，每问带推荐：    │
   │  （类型/深度/口径）   │   研究类型/深度篇幅/时间口径语言）     │
   ├─ 拍板 ───────────▶ │                                    │
   │                    │ 建 drt_<slug>/（从模板起步）：         │
   │                    │   question.md（定稿+Purpose+RQ+       │
   │                    │     Scope In/Out+Constraints+        │
   │                    │     HITL1 快照+Decisions 第 1 条）    │
   │                    │   topics.md（T1..Tn：must_answer 列表  │
   │                    │     + scope_role + depends_on）       │
   │                    │ 组队（team-assembly skill）：          │
   │                    │   spawn_teammate scout、analyst        │
   │                    │   （critic 后置进场）——Q2 在此验证     │
   │                    │ ═══════ 静默自主区（不问你、不汇报）═════
   │                    │ 任务板派活                           │
   │                    │ ───────────────────────────────────▶ │ wave0 侦察（scout）
   │                    │                                    │   lead-mapping：query 三轮
   │                    │                                    │   多样化+30 秒去留+A–D 分级
   │                    │                                    │   → leads.md（含显式排除）
   │                    │ ───────────────────────────────────▶ │ wave1 挖掘（analyst）
   │                    │                                    │   evidence-extraction：
   │                    │                                    │   evidence/*.md 一条一档
   │                    │                                    │   （身份链+口径+交叉 ≥2+
   │                    │                                    │    反例必搜+单源标"待破"）
   │                    │ 收活 → findings.md                   │
   │                    │   （F1..Fn：结论+支撑+gap 四态；         │
   │                    │    纯综合先行禁新搜；needs_search       │
   │                    │    → 定向补搜只一轮）                   │
   │                    │ 成稿交 critic ────────────────────▶ │ 三线对抗审查
   │                    │                                    │   （无来源狩猎 CRITICAL/
   │                    │                                    │    质量审计 MAJOR 含口径/
   │                    │                                    │    反例覆盖 MAJOR）
   │                    │ ◀── review.md ───────────────────── │ （CRITICAL 未修复→回修再审）
   │                    │ readiness: PASS                     │
   │ ◀── HITL2 审阅 ──── │ （ask_user：证据充分性判断+           │
   │  （审阅建议）        │   交付/补研究推荐+composition 确认：    │
   ├─ 拍板 ───────────▶ │   读者是谁/用来做什么/前景化重点）       │
   │                    │ final.md（关键结论带                  │
   │                    │   [来源: evidence/xx.md]）            │
   │ ◀═══ 报告 + present ════════════════════════════════════
   │                    │ （可选）方向修订 → Decisions 追加一条   │
   │                    │  （delta+受影响 topics+你的原话）      │
   │                    │  → 原地补搜 或 final/ 下一版          │
```

**你只在两处出手**：HITL1（定问题形状）和 HITL2（审阅拍板）；两点之间全部静默自主
（不问"要不要继续"、不汇报中间进度）。**每个里程碑的实物**：question/topics → leads →
evidence/ → findings → review → final——全部落在 `drt_<slug>/`，中断恢复只认这些文件。

## 方案（run 的编队与运转）

1. **运行主体 = 一个 lead 会话**：挂 `Deep Research Lead` preset，cwd = `research-workspace/`。
   用户在 lead 会话提出研究问题 → lead 加载 research-brief skill 走 **HITL1**
   （ask_user_question：研究类型 / 深度篇幅 / 口径，每问带推荐）→ 落 `drt_<slug>/`。
2. **组队**：lead 按 team-assembly skill 定名单（探索性全景默认：scout ×1 + analyst ×1 +
   critic 后置进场；负载高再加 analyst），`spawn_teammate` 组队——**成员挂 roster 默认
   preset（=lead，P2 实证），角色人格与技能经 lead 的 spawn prompt 携带角色章程
   （persona-by-prompt——P2 毕业 Note 的设计后果）**。
3. **派活与回收**：任务板（team 主通道，D3）；topic 单 owner（手册 owner 表）；scout 的
   leads.md 定向给 analyst；analyst 证据回来 lead 写 findings.md；critic 对成稿出
   review.md；lead 综合纪律 = 纯综合先行禁新搜、gap 定向补搜只一轮。
4. **HITL2**：lead ask_user 给审阅建议——证据充分性判断 + 交付/补研究推荐 +
   **composition 确认**（吸收源头 composition_handoff：读者是谁 / 用来做什么 /
   前景化重点——写进审阅建议而非新机制）。
5. **交付**：`final/` 当前版（每条关键结论带 `[来源: evidence/xx.md]`）+ `present` 声明。
6. **中断恢复实测**（L4 判据 ④）：run 进行中受控 kill lead 会话 → 新开 lead 会话 →
   只凭 `drt_<slug>/` 文件重建上下文继续（不依赖 chat memory）——记进 journal。

### 源头对照（哪些照搬、哪些已有载体）

| 源头机制 | M2 落法 |
|---|---|
| RUN.md 入口选定 + 静默自律 | lead 会话即入口；手册"两点交互"节已等价（silent-wave-execution 语义） |
| queue demand → work-unit 派活 | team 任务板 + 手册 owner 表（D3 定案，不重建 CLI） |
| HITL1/HITL2 stop:yes | lead 的 ask-user（唯一持有人，工具面已表达） |
| readiness 确定性预检 | critic skill 清单（诚实降格，设计已记录） |
| ReopenResearchPass 重跑 | 同 bundle 版本演进：证据扩张 → final/ 下一版（表述修订 polish 版本不变；结构性另起才开新 bundle + sibling 预检——D17，见 run-bundle Note） |

## 输掉的方案

- **lead 一个人跑全程**（不组队）：否——D3 已定案 team 主通道，且 Q2/Q5 只有真组队才闭。
- **用一次性 subagent 派研究活**：否——续驶语义归 team（company D18 边界）；subagent 只做
  单点查证工人（现有定位）。
- **自建任务文件/调度器**：否——"second durable home" 禁令 + 不发明纪律。

## 验收判据

- L4 全量四判据（evaluation.md）：① final/ 当前版存在且含来源清单；② 抽查 N 条结论可回溯
  （建议 N=5，用户可调）；③ 两点纪律：HITL 之间静默自主（会话日志核对无中途提问）；
  ④ 中断恢复实测通过；
- Q2 闭：成员会话日志核对 preset 组合（zstd 解压逐事件，方法同 l4-lite）；**含 D18
  边界复核：team 语境下成员的 tool-subagent（backgroundMode: continuable）是否可用——
  company 实证"team-scoped 会话里 continuable child 不可达"（D3 明文"不重蹈"），若
  复现则降级 = 前台 one-shot worker（scout persona 已是此语义）或 lead 代派，如实记
  journal，不现场发明机制**；
- Q5/Q4 观察：journal.md 记录争用/负载现象 → 00-index 待定表销账或留证据；
- 汇总验收：本 run 同时核销另两件的落地验收——plan-shape（question.md 四节非空 +
  Decisions ≥1 条）、data-caliber（final.md 至少一处"单源——待破 / 已搜未得"如实记录）；
- 映射表 §1 hitl2 行同步：审阅建议吸收 composition_handoff（读者/用途/前景化——
  源头 rb_profile 的 composition 契约，原映射只写了"证据充分性+交付/补研究推荐"）。

## 开放问题（部分已定，2026-09-24 用户拍板）

1. **run 形状已定：端到端最薄直跑**——环节 = run 内部检查点（文件契约：leads →
   evidence → findings → review），不做独立分段排练。依据：company D11 横切否决先例
   （"活体时刻"不得推迟）+ 源头 harness 的 gate-in-run 设计 + 环节机制已全部预飞
   （M1/L4-lite/P2）+ 剩余未知（Q2 行为半边/Q4/Q5/L4③④）均为组合性质，分段产生
   不了证据；环节内容劣化 → run 后蛇形折回（「M2 收口与复盘」条目收证据修订）；
2. analyst 初始数量：**1**（随最薄配置定案；Q4 观察后议增）；
3. 中断恢复：**做一次受控真 kill**（最便宜地证明"文件即真相"，L4 判据④）；
   抽查条数 **N=5**（已确认，可调）；
4. **研究题不是本 RFC 的事项（D17 分层，2026-09-24 拍板）**：题目是 run bundle 的第一个
   变量（kickoff/HITL1 给定，落 question.md），框架文档不记录、不拍板任何具体题目——
   原先写在本条的具体题目段已按分层删除。

## 暂停点记录（2026-09-24，用户指令"先停下来打扫卫生"；同日按 D17 去实例化重写）

**停在哪儿**：④ 已起跑至 HITL1 挂起 → 用户暂停。机制事实：组队前清理执行毕（ad-hoc
会话收队、旧会话挂起回合 cancel，现场无半开回合）、lead 会话已 kickoff 进正规通道
（cwd=research-workspace）、HITL1 三问挂起未答；web 3081 + 仪表盘 watcher 已停、无残留
进程。实例状态（题面、会话号、侦察线索）属运行区与 bundle（D17），本 RFC 不记账——
题面文件在 `dev/smoke-workspace/`（gitignored 运行区）。

**重启配方（机制三条）**：

```sh
bash dev/boot-run.sh                                  # web 3081 + 仪表盘（--latest 只读投影）
node dev/run-kickoff.mjs --port 3081 --token <横幅token> --prompt-file <题面文件>
# GUI 打开 token 链接 → 新会话（kickoff 脚本自建）→ 答 HITL1；题面由用户届时给定（D17：
# 题目 = bundle 变量，不进框架文档）
```

**暂停时的已知偏差记录**：① ~~boot-run 的 trap 在 job_kill 下未杀净 watcher + 不检测
pack 内容漂移~~——**已销账（2026-09-24）**：随 debug-dashboard-plus 条目毕业修复（trap
cleanup + 仪表盘孤儿自退出实证 + drift_check 漂移检测首跑即抓到真漂移，见该毕业 Note
实施记录）；② L4 四判据/Q2 行为半边/Q4/Q5/①② run 内判据全部未核销——run 已在旧通道
交付（通道错位叙事见 §收口方案），判据随收口方案的迁移与闭合步骤走。

## 收口方案（2026-09-24 追加：通道错位 run 的迁移与判据闭合——已批准，同日放行静默自主执行）

**事故背景**：run 实际起跑于旧实验会话（a2a6850a，cwd=dev/harness-home，创建于全部
修复之前、上下文冻结在化石契约）——bundle 落在 `dev/harness-home/runs/cn-us-cpu-gap/`，
drt_ 契约与观察面未走到；这是三段注入面事故链（化石镜像 → pack 文本 → 旧会话复用）的
第三段。立项质量本身合格（question.md 五维拆解 + HITL1 快照 + 验收判据齐）。

**迁移方案**（run 交付后执行；期间以 research-workspace/drt_cn-us-cpu-gap → 现目录的
symlink 桥接仪表盘可见性）：

1. A 系会话先收队（teammates 终局 + lead 会话自然结束，不搬活会话脚下的目录）；
2. 真搬家：`mv dev/harness-home/runs/cn-us-cpu-gap → research-workspace/drt_cn-us-cpu-gap`
   （撤桥接 symlink）；
3. 契约补齐：question.md 补 `## Decisions（append-only，最新在上）` 节（首条 = HITL1
   定稿回填）；化石命名修正（`review-critic.md` → `review.md`）；`final.md` →
   `final/v1.md`；journal.md 补纪要（含通道错位事故如实记录）；
4. **判据④ 实测 = 迁移本身构成场景**：新开正规 lead 会话说"继续 drt_cn-us-cpu-gap"，
   只凭 bundle 文件重建上下文续跑（顺带一次受控 kill）——"文件即真相"的最便宜实证。

**判据闭合清单**：① final/v1.md 存在且含来源清单；② 抽查 N=5 结论可回溯；③ 两点
纪律 = A 系会话日志 zstd 逐事件核对（HITL1→HITL2 间静默自主）；④ 如上；Q2 = teammate
会话日志核对 preset 组合（含 D18 one-shot 边界）；Q4/Q5 = journal + 日志观察记账。

**诚实账**：M2 收口 Note 如实写"run 主体走旧通道"，不粉饰为"正规通道验证通过"；
drt_ 契约的 in situ 验证缺口由"迁移 + 判据④ 续跑"部分覆盖，残余缺口在 M3 重排时
评估是否需要第二个正规通道 run。
