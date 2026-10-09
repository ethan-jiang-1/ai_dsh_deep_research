# workflow 工具在研究管道的采纳（否决）

> 状态：rejected

归宿：本 Note 拥有否决理由与重启条件；采纳目录扫描见 [plugin-shelf-adoption](../implemented/2026-09-30-plugin-shelf-adoption.md)；调研全文 = 辨析子代理报告
（2026-09-30，vendor `dsh-v0.2.0-rc.2` 源码逐行核对），本 Note 存蒸馏结论与重启条件。

## 决定

**否决在研究管道（含 rerun 环节）采纳 `workflow`（tool-workflow / workflow-ptc）。** 依据三层：

1. **内核错位**：方法论内核是角色协作不是管道编排（design/20 §0 用户定案"多角色 + agent
   team"；design/30 §2 把 codex 的确定性管道面整体弃用）。scout→analyst→critic→lead 的
   "确定性步骤"外观只是角色分工的副产品，内容物全是判断（分层过滤、交叉验证、对抗狩猎、
   动态组队），没有一件可预写进 JS。
2. **载体倒转**：workflow 的 `agent()` 走 `subagents.start` **one-shot 裸子代理**
   （workflow-ptc/src/host.ts:200；选项无 preset/persona——runtime.ts:37），正是 D3 划给
   "单点快捷查证"、D16 被 agent-team-profile 层机械强制 one-shot 的那个载体——用它跑主通道
   = 倒转通道分层定案。且前台运行原子占死父回合，HITL1/HITL2（方法论明文"原生"的停点）
   在 workflow 里结构性无落点。
3. **run 实证反例**：归档 run 里每个高价值行为都是 workflow 表达不了的——动态拆编制
   （analyst ×2 按证据面宽）、critic 四～五轮对抗并撤回自身判定、analyst 复算纠正 lead、
   跨天 owner 回执、append-only 血统（workflow 无 journaling/resume）。"rerun 固定循环"
   候选环节实测形态 = 任务板 re-dispatch + owner 回执，team 通道已干净承载，无疼痛即无窄用
   理由。机械确定性的现行答案（evidence-audit / schema-scan / node-gate 等 keyless 脚本
   门禁）在可测性、成本、纪律上全面优于模型写 JS 编排。

工具自带的使用纪律也独立支持否决：其 system prompt 指南明文"仅当用户显式要求 workflow
或大规模多代理编排时使用"（tool-workflow README）——写进 preset 常规研究流违反工具自述。

## 输掉的方案

- **窄用（rerun 固定循环）**：否决——rerun 入口是判断（HITL2 拍板 + lead 的 gap 四态），
  补搜内容全是现场判断；固定循环表达不了。
- **开发者侧留用（全仓审计类任务）**：不在本 Note 范围（那是 harness 会话的工具面，不是
  pack 采纳面）；workflow 在 base 已对开发者会话可用，无须任何本仓动作。

## 重启条件（2026-10-02 按 vendor 源码重估改写——事实基础先记录）

重估事实（vendor `dsh-v0.2.0-rc.2` 源码核实，与 [m2-run-mechanics Q2](../implemented/2026-09-24-m2-run-mechanics.md) run 实证交叉一致）：

- agent-team-profile 只禁四个 subagent 工具行（tool-subagent-control / -list-agents / -subagent / -subagent-fork），**workflow spawn 通道机制层保留**（`agent-team-profile/cordis.patch.yml:4-14`；README:49）——"teams 与 workflow 互斥"不是事实；
- 但 web-app 把 host 平面 workflow-ptc / tool-workflow 都禁了、移入 preset 平面（`web-app/cordis.patch.yml:539-541` + `standard.patch.yml:119-123`）——**模型可见性由 preset 行决定**，本仓四角色 preset 均未声明；
- teammate 一律继承 lead preset（`child-agent.ts:200-219` composeFrom + registry bindScopeParent `273-289`）——给 teammate 扇出能力 = 在 lead preset 声明 `workflow-ptc（provider: spawn）+ tool-workflow` **两行**（tool-workflow inject workflowEngine，只加一行挂载即 fail-loud）；
- teammate 手里的 subagent 工具被默认 maxDepth=1 封死（`tool-subagent/src/index.ts:514-522`），而 workflow 的 agent() 直调 subagents.start **不带 cap**（`workflow-ptc/src/host.ts:197-211`）——workflow 是 teammate 唯一不受深度预算约束的扇出通道；
- HITL 侧否定性事实不变：子代理/teammate 调 ask_user_question 必败 `DELEGATED_CALLER`（`user-questions/src/index.ts:131-144,287-295`）、approval 钉 'never'（`child-agent.ts:249-256`）、引擎零停点/恢复语义（`runtime-types.ts:37-47`）。

据此，否决理由的现况：**内核错位与 HITL 无落点仍然成立**（否决主通道采纳的依据不变）；**载体倒转被实质削弱**——workflow 可作为角色 preset 内的受控扇出内线存在而不倒转 D3/D16。重启辨析分双轨：

- **主通道轨**（维持原条件）：workflow 引擎出现 continuable/teammate 子代理、人格挂载或 HITL 感知语义（workflow 与 teams 融合）；
- **受控内线轨**（2026-10-02 新写，三条同时满足才开）：
  1. **受控内线**：仅在某角色 preset 显式声明 `workflow-ptc + tool-workflow` 两行（后台另加 tool-jobs 行），只作该角色的扇出内线，不进主流程、不替代任务板主通道（机制依据：可见性由 preset 行控制）；
  2. **封闭子任务域**：仅用于无需人裁决的封闭扇出（批量检索/审计/反例扫描），一切 HITL 停点留根会话（机制依据：DELEGATED_CALLER + approval never + 零停点）；
  3. **实证疼痛**：run 实证扇出段载体疼痛（如 scout 多源检索串行成瓶颈、teammate 深度预算挡住合法扇出）——无疼痛不采纳（维持原"无疼痛即无窄用理由"判据）；采纳时显式设 maxTotalAgents 收紧预算（引擎默认 1000 agents/并发 16，深度预算对 workflow 通道无效）。

附带事实：`workflow` 三包不在本仓 pack 的 bundle/preset 任何行中，本否决不产生行变更；
语义上更近"固定新代理循环"的 `tool-ralph` 出厂默认禁用，同样不在采纳面。
