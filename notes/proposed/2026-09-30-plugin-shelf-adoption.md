# RFC：0.2.0 插件货架适配（deep-research pack 对 DSH 出厂插件的分层采纳）

> 状态：proposed

## 问题

pack 的插件面是 0.1.7 时代框定的子集（fs / fs-search / skill / todo / web / subagent /
ask-user / present / agent-instructions + agent-team-profile 层），升 pin 到
`dsh-v0.2.0-rc.2`（全档绿，见 [020rc2 升 pin Note](../implemented/2026-09-30-vendor-pin-bump-020rc2.md)）
后货架本身没有重审。0.2.0 出厂 316 包 / 92 服务 / 30 工具包（语料 =
`/Users/bowhead/deepseek-harness/_digested/plugin-inventory/`，基线同为 `639ed01539`——
与我们的 pin 完全一致，语料可直接采信）里有多项与 deep research 场景直接契合的能力未被利用；
其中两项是 0.2.0 **新增**的（timed ask-user、schedule-bundle 进 OPTIONAL_BUNDLES）。

用户指令（2026-09-30）：「我们要充分利用它们……拟定一个 ongoing goal 是充分的利用 DSH 的
新插件合适我们场景的插件」。

## 方案：三层收口（每项 = 采纳落地或否决记档，不悬置）

### 第一梯队（配置 / preset 行级，直接增益，低风险）

1. **session-query 全文检索**——base 出厂 `session-query-sqlite` `openAt: never` 关着
   （seam 已挂、仅 SQLite FTS 不开）；pack 的 `cordis.patch.yml` replace 该行改
   `openAt: first-search`（首次搜索时惰性开库，durable path 落 DSH_HOME），角色 preset 增
   `tool-session-query` 行（`session_search / event_search / trace / event_trace / event_read`
   五工具，显式 opt-in 的现成包）。收益：critic 交叉核查、lead 跨 run 找历史证据、
   会话级证据检索进模型面——研究场景天然刚需。peerDeps + `@deepseek-ai/dsh-tool-session-query`。
2. **timed ask-user（0.2.0 新增）**——`tool-ask-user` 新 `mode: timed` + `timeout`（缺省
   120s，legacy 缺省保持）。给 lead 的 ask-user 行配 `mode: timed` + 研究节奏的超时（提案
   300s）：超时未答走结构化落定（两结算模式，vendor
   `2026-09-19-timed-user-question-two-settlements` Note）。方法论对齐：超时落定到推荐项与
   lead persona 的「推荐项置首 + (Recommended)」设计天然咬合——人没拍板时按明示推荐走，
   且落定事件进会话日志可追溯。**这是行为语义变更，列呈批点**（默认方案 = 采纳）。
3. **compaction / spill 调优**——长研究会话（实测 26/46 张证据卡）的工具结果裁剪：
   `compaction-tool-result-pruner` 的 thresholdChars / headChars / tailChars 与
   `spill-policy.maxInlineTokens` 都是 base 已挂载行的 config 字段，pack patch replace 调值。
   值级改动按 guides/60 §2 值级条款处理（同 diff 补断言或交付报告显式写不可证）。

### 第二梯队（机制采纳，preset 行 / OPTIONAL_BUNDLE）

4. **tool-goal（三工具）**——`create_goal / get_goal / update_goal`（base+preset 形态）+
   goal-round-driver（base 已挂）。研究 run 的跨 turn 目标态：lead 立项后 create_goal 钉
   「本次 run 的问题与验收」，补研究轮 update_goal 推进——与 drt_ bundle 文件态互补
   （bundle = 交付事实的家，goal = 会话内驱动态）。观察面 `ui-goal`（GoalBar）web 层自带，
   免费增益。挂 lead 行；scout/analyst/critic 不挂（单 run 单 owner）。
5. **tool-jobs（三工具）**——`job_list / job_output / job_kill`（base+preset 形态）。与
   subagent one-shot 的分工辨析：subagent = 派活（生 worker 等结果），jobs = 观测与收割
   （异步任务生命周期）。研究主通道是 Teams（spawn_teammate 持续会话），subagent 已覆盖
   单点查证；jobs 的增量收益存疑——**辨析后定夺，预期窄用（lead 观测长搜索）或否决**。
6. **auto-review（OPTIONAL_BUNDLES）**——tools/pre-execute 自动审查插件。候选用途：
   交付前机械审查（present 前置检查证据链在场）。先调研其审查面（读 vendor 包 README +
   源码 config），与场景对上才采纳；对不上（如仅代码审查）则否决记档。

### 第三梯队（方法辨析，预期多数否决/搁置）

7. **workflow（tool-workflow）**——多步编排工具。与 Agent Teams 主通道重叠（m2 定案
   team 优先，协作与任务板走 spawn_teammate）；确定性管道步骤是否值得用 workflow 表达
   需辨析——预期否决（方法论内核是角色协作不是管道编排），辨析结论入 Note。
8. **browser-use（experimental）**——动态页研究是真实缺口（web_fetch 仅 HTTP 抓取，
   JS 渲染页拿不到），但实现全在 experimental（合同随时会变）。预期记缺口 + 重启条件
   进搁置池（重启条件：stable Provider 出现或研究 run 实证高频撞动态页）。
9. **office-to-pdf**——final 报告 PDF 版交付（deliverables 增值，web 层已挂）。低优先，
   可选采纳（lead 的交付面加 PDF 变体）或搁置。
10. **schedule-bundle**——定时检查点（长研究的超时看护）。观察：我们的 run 节奏由 HITL
    与人驱动，定时提醒无明确需求——预期搁置。
11. **web-search-exa / perplexity 换源**——直接引用既有定案
    （[search-fallback-seam Note](../implemented/2026-09-27-search-fallback-seam.md)）：
    换源留给用户拍板，本仓不擅动；不重开讼。

### 依赖与文档同步（所有采纳项的共同义务）

- peerDeps 按实际引用增补（tool-session-query / tool-goal 等），随包分发面保持 semver 区间；
- `render-overlay` 先于 L1（overlay 是生成物）；模型可见面变更（工具行 / persona）走
  guides/60 任务型路由的完整序（L1 → snapshot-replay B 层 → 重启 run 通道）；
- design/20-roles（角色工具面）、guides/61（run 操作）、pack README 同 diff 更新；
- 采纳面全部过 L0 + L1 + L2 + L4-lite。

## 输掉的方案

- **全面采纳（把 base/web 暴露的工具行都塞进 preset）**：否决——preset scoping 是有意
  设计（scout 无 ask-user、critic 无 subagent 皆然）；工具面膨胀稀释模型注意力，
  「充分利用」≠「全挂」。
- **自写 provider / 胶水插件补缺口**（搜索降级链、自定义检索）：已有定案
  （search-fallback-seam：pack 层不可行且破坏「配置为主 + D18 单点例外」形态）；
  session-query 用现成包不自写。
- **观察面新页签全量接入研究驾驶舱**：驾驶舱最小面设计（D18 正本 = design/40）；
  非研究语义的页签（ui-jobs / ui-workflow-run 等）随对应工具采纳与否走，不单独接。
- **等 0.2.0 正式版再动**：语料基线与我们 pin 完全一致，现在就是采纳窗口；
  rc.2 → 正式版若再有破坏面，升 pin 重审程序兜底。

## 验收

1. 十一个候选全部收口：采纳项（落地 + 门禁绿 + 文档同步）或否决项（理由 + 归宿：
   rejected/ 搁置池或 Note 记档）——不允许「待定」离场；
2. 采纳项验证序 = 任务型路由表「改 preset」行：render-overlay → L1 真挂载 →
   snapshot-replay B 层（模型可见面变化）→ L2 → L4-lite 全绿；
3. peerDeps / 兼容矩阵 / preset-structure / row-deps / pack-bundle-compat 门禁同步绿；
4. timed ask-user 的行为语义变更经用户呈批（反馈门①）后落地；
5. 方法论文档（design/20 / guides/61）与角色工具面同 diff 一致；
6. 条目毕业：RFC 迁 implemented/（正文改写为事实体）+ 队列行删除 + 毕业记录含
   逐项收口表（采纳/否决 + 证据）。
