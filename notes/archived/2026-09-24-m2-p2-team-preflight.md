# RFC：M2 铺垫 P2——team 机制迷你预检

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap 队列行已 销账（▶ 移交「首个完整研究 run」）；Q2 机制半边答案已登记 00-index。授权 = 用户睡前 指令（自主推进至完成，"当做我们的 goal，完成前不打扰"——呈批门由该指令替代，计划落 本 RFC 正文）。依据：队列行 + l4-lite 形状（标记法 + 会话日志即真相）+ P1 毕业（run 通道 = research profile 安装域）+ 机制预读（下节，全部 vendor 源码亲读）。毕业记录在文末。

## 机制预读（写码前从 vendor 源码读出的事实）

- `spawn_teammate` 参数 = name / description / prompt / context（fresh|fork）——
  **无 preset / persona 参数**（tool-agent-team/src/index.ts:174-185）；
- 成员经 `subagents.startContinuable` 创建（agent-team/src/roster.ts:282）→ spawn
  provider = "fresh child Agent, own session, **own system prompt**, zero parent
  context"（subagent-spawn-in-process 头注）；continuable 请求可带 persona / toolFilter，
  但 **roster 调用未传**；
- ⟹ 预读结论（待实证）：**成员不是角色 preset**——裸代理 + team 工具面
  （send_message / list_agents / wait_agent / interrupt_agent + 任务板）+ lead 的
  spawn prompt 即角色指令。run-mechanics RFC"成员 preset 按角色挂"的假设大概率要修
  （角色人格走 spawn prompt，或另寻载体——留给该 RFC 打磨）。
- team 工具名（vendor 实证）：spawn_teammate / send_message / list_agents /
  wait_agent / interrupt_agent。

## 问题

首个完整 run 的第一步 = lead 组队。这一步从未真跑过；Q2（成员会话拿到谁的组合）与
D18（team 语境 worker 可用性）都是未知数。雷区若在 run 中途爆炸最贵——用个位数模型
调用提前拆掉。

## 方案：scripts/team-preflight-smoke.mjs（真模型档）

- 通道 = run 通道（`--profile research` 安装域，boot 形状同 boot-run）；前置校验 =
  research 组合在位（缺则提示先跑 `dev/boot-run.sh`）+ dev home 凭据 + zstd；
- boot → 建 lead 会话（cwd = dev/smoke-workspace，不污染 research-workspace）→
  一条指令性 prompt：spawn 两名 probe 队友（各自 prompt 只要求回标记词）+
  list_agents 确认 + lead 自己做一次 one-shot 单点查证 + 回总标记；禁止走研究流程、
  禁止提问；
- 会话日志断言（zstd 解压，事件词汇沿 l4-lite 实证词汇表 assistant/message / tool/call）：
  1. lead 模型响应（标记法）；
  2. `spawn_teammate` 真调用 ×2 + `list_agents`（lead log 的 tool/call 行）；
  3. 成员会话建立（lead log 提取成员 session id → 会话目录与日志在位）；
  4. 成员响应初始 prompt（各自标记，证明成员是活模型代理）；
  5. lead 的 one-shot `subagent` 调用真实发生（team 语境 worker 探针——D18 现状）；
  6. **成员组合画像（发现型，不硬断言）**：成员 log 的 agentPreset 字段值 + 工具面
     线索 → 打印事实结论（预读预期 = 无角色 preset；实证结果回填 Q2 机制半边）。
- 红证说明：真模型档不做注入反证（成本纪律）；失败诊断直接打印相关日志尾部。

## 输掉的方案

- **直接开 run（队列 item 2）让 Q2/D18 在真研究里爆**：雷区最贵的暴露方式，正是本
  条目存在的理由；
- **断言成员"必须挂角色 preset"**：机制预读已否定该预期——硬断言会把预检做成假红；
  画像型断言才是诚实形状；
- **在预检里让成员各自做复杂任务**：超预算且非本条目目的（机制可用性 ≠ 研究质量）。

## 验收判据

- 脚本 ALL PASS（机制绿）**或**失败诊断完整（雷区如实暴露 + 处置建议）——两者都算
  条目完成（预检的价值在暴露，不在粉饰）；
- 成员组合画像结论 + D18 现状落毕业 Note；00-index Q2 行更新（机制半边）；
- run-mechanics RFC 的打磨钩子：spawn prompt 即角色指令的设计修订建议（正文留给
  用户打磨，不代改）。

## 开放问题

无（本条目机制自包含；run 本体的开放问题归 item 2 的 RFC 与用户）。

## 毕业记录（2026-09-24，两轮实跑）

**第 1 轮（红——脚本时序 bug + 提示遵从，全部自修）**：

- 核心机制已绿：spawn_teammate ×2 真调用、两成员会话建立并响应标记；
- 暴露三修：① 模型会在确认语里**早现标记词**且回合多步——等标记 ≠ 等回合完成
  （脚本改静默检测：日志行数连续 4 次轮询不变才算落定）；② 成员定位的日志级匹配会把
  含 spawn prompt 文本（内嵌标记词）的 **lead 自己的日志**误当成员——改行级匹配 +
  "Background subagent <uuid>" 行的机制原生提取（roster childId）；③ lead 跳过
  list_agents / subagent 步骤——提示词硬化（指名工具、禁替代、禁早输出标记词）。

**第 2 轮（ALL PASS，8 断言全绿）**：

- lead 回合落定 + 标记；spawn_teammate ×2；list_agents ×1；
- **one-shot subagent ×3 真调用（D18 现状实证：one-shot worker 在 team 语境可用——
  P1 的 one-shot 对齐经行为验证）**；
- 两成员会话建立 + 各自标记响应（seq 14 各一条 assistant/message）。

**成员组合画像（Q2 机制半边，实证答案）**：

- 成员 session 事件原样：`"origin":"subagent","delegationDepth":1,"agentPreset":"lead"`——
  **成员挂 roster 默认 preset（= lead）**：非裸代理，也非调用方指定角色；
- 成员工具面 = lead 全套（ask_user_question / present / synthesis 等 lead 独有面在场）
  + team 工具（send_message / list_agents / interrupt_agent / spawn_teammate——后者
  描述声明仅 Team Lead 可执行）+ subagent；
- 机制对账：与源码预读一致 = spawn_teammate 无 preset 参数、成员经 startContinuable
  创建；**预读修正** = "裸代理 own system prompt" 的实际形状是 roster 默认 preset
  兜底组合（default: lead）；
- **设计后果（run-mechanics RFC 打磨材料，正文未代改）**：scout/analyst/critic 的
  人格与技能无法经 spawn_teammate 挂到成员——现实路径 = lead 的 spawn prompt 携带
  角色章程（persona-by-prompt；角色 skill 内容也须进 prompt 或以"手册为准"引用），
  或升 pin 后看 vendor 是否为 spawn 增加 preset 参数。

**预算与验证**：两轮合计约 10–15 次模型请求（小上下文）；`verify` 9 门禁 + 10 tests
绿（改动面前后各跑）；真模型档无注入反证（成本纪律），失败诊断能力经第 1 轮真实失败
验证（红是自己的断言时序与提示遵从问题，非机制故障——如实记录）。

**环境状态**：预检会话留在 dev home（gitignored；队列「M2 收口与复盘」的打扫项处理）；
research profile 组合未动；web 已停。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的遗留形态——内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
