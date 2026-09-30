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

> **用户裁决（2026-09-30 呈批）**：①timed ask-user 采纳、超时 600s；②分层按序推进，
> 但 **auto-review 调研、workflow 辨析、browser-use 评估三项提前**——一梯队落地的同时，
> 这三项的调研/辨析尽早展开（它们可能开新的采纳面，不能压到最后）。

### 第一梯队（配置 / preset 行级，直接增益，低风险）

1. **session-query 全文检索**——base 出厂 `session-query-sqlite` `openAt: never` 关着
   （seam 已挂、仅 SQLite FTS 不开）；pack 的 `cordis.patch.yml` replace 该行改
   `openAt: first-search`（首次搜索时惰性开库，durable path 落 DSH_HOME），角色 preset 增
   `tool-session-query` 行（`session_search / event_search / trace / event_trace / event_read`
   五工具，显式 opt-in 的现成包）。收益：critic 交叉核查、lead 跨 run 找历史证据、
   会话级证据检索进模型面——研究场景天然刚需。peerDeps + `@deepseek-ai/dsh-tool-session-query`。
2. **timed ask-user（0.2.0 新增）**——`tool-ask-user` 新 `mode: timed` + `timeout`（缺省
   120s，legacy 缺省保持）。给 lead 的 ask-user 行配 `mode: timed` + 研究节奏的超时：
   超时未答走结构化落定（两结算模式，vendor
   `2026-09-19-timed-user-question-two-settlements` Note）。方法论对齐：超时落定到推荐项与
   lead persona 的「推荐项置首 + (Recommended)」设计天然咬合——人没拍板时按明示推荐走，
   且落定事件进会话日志可追溯。**用户已呈批（2026-09-30）：采纳，超时 600s**（给足思考
   窗口；非 120s 缺省）。
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

## 实施记录

**R2（2026-09-30，基线债优先 = 用户裁决）**：

- **R2-2 timed ask-user 落地（600s，修正语义下的用户呈批）**：lead preset 的 tool-ask-user
  行配 `mode: timed + timeout: 600`——超时返回 pending（问题保持可答、后答经
  answer_to_pending_question 唤醒、pending 通知明示"这不是许可"）。**配套观察谓词升级
  hitl-fold v5**：旧尾窗谓词（"末位回合事件恰为未答 ask"）在 timed 超时后会漏报可答挂起；
  新谓词 = 末位 ask 状态机（timed pending result → 仍挂起；answers 形态 result / 其后的
  user/message → 关闭；agent 自身事件不关闭；多 ask 取末位）——watch-run / 研究驾驶舱
  横幅 / 锚点问数三消费面共用。测试 +4（timed 形态矩阵），两处旧断言按"行为变了同 diff 改
  断言"纪律翻新。fixture 换代 v3（ask 工具 schema 增 timeout 参数——B 层捕获即重录）；
  run 技能超时语义节同步。验证：verify 全绿 + tests 116/0 + L1/L2/L4-lite ALL PASS +
  snapshot-replay ALL PASS（金标准重写人审：仅模型措辞差异）。

**R2（2026-09-30，基线债优先 = 用户裁决）**：

- **snapshot v2 重录完成**：借在飞 run 通道（3083）以 v1 同款探针提示词录真模型 lead 会话
  （web_search×1 成功 + web_fetch×1 + "探针完成"收尾，36 事件）；fixture 换代
  `session.v2.jsonl`（v1 移除，git 历史即归档），冒烟 FIXTURE 指针与 snapshot.yml 工具数
  注释（22→27——request/header 实测 27 工具含 session-query 五件）同步。验证：
  snapshot-replay-smoke ALL PASS（A 回放 + B1 persona + B2 工具 schema + C5 金标准重写
  人审通过——diff = 三连败搜索卡 → 一次成功搜索卡 + 新收尾文本，正是 R1 变更的镜像）。
  **e6e51bc 欠的 persona 基线债与 R1 工具面债一并清偿**；后续模型可见面变更重新获得
  keyless 秒级回归信号。

**R1（2026-09-30）**：

- 三项提前调研收口（用户裁决的三项提前）——**auto-review 否决**（零 config 面 + 固定安全
  策略 + 激活即 danger-full-access 沙箱倒退 + 每工具调用一次 LLM 请求；本仓
  evidence-audit.mjs 已是候选用途的确定性正解——调研报告带源码行号，全文见子代理留档）；
  **workflow 否决**（`agent()` 走 one-shot 裸 subagent = D3 划给单点查证的载体倒转主通道；
  前台运行原子占死父回合 = HITL 停点结构性无落点；方法论 §2 本就弃用管道编排面。重启
  条件 = workflow 引擎出现 continuable/teammate 语义或研究管道出现"无判断可扇出"步骤）；
  **browser-use 搁置进池**（缺口真实：15 场归档 run 中 13 场命中 JS 渲染证据失败，残余硬缺口
  = 消费端 SPA 定价页与 JS 榜单；但 experimental 零出厂采纳信号 + 团队形态错配
  〔mountSessionMcp 每 agent 起 MCP 子进程〕。重启判据：C1 provider 晋级 stable /
  C2 单场 scoped pilot〔leads 阶段 ≥2 条 A/B 级线索四绕行全败〕/ C3 累计 ≥4 例）。
- **一梯队 session-query 落地**：pack `cordis.patch.yml` replace `session-query-sqlite`
  （`openAt: first-search`，`:memory:` 每进程重建——持久化索引属 launcher 面）；lead/critic
  preset 挂 `tool-session-query` 五工具行（`session_search / session_event_search /
  session_trace / session_event_trace / session_event_read`）；peerDeps +2（tool-session-query
  / session-query-sqlite）+ root devDeps 镜像。验证：verify 全绿 + tests 112/0 + L1 真挂载
  ALL PASS + L2 release-smoke ALL PASS + L4-lite ALL PASS。
- **连带修掉一个升 pin 遗留回归**（020rc2 Note 已补勘误）：vendor-build.sh 顺序缺陷
  （tsdown client 先于 host 半补建 → client bundle 把 typert-protocol/util-workspace-path
  静默外置成 require → Web boot 17 包 failed）；顺序修正 + 重跑 tsdown client 后
  client-load-smoke ALL PASS；guides/60 换 pin 必跑面补 client-load-smoke；
  render-overlay 治掉 registry replace 的硬编码第二份（replace 块统一从 pack 直读）。
- **待办**：①timed ask-user 需按**修正后的语义**重新呈批（0.2.0 实测：超时不落定到推荐项，
  而是返回 pending 通知——问题保持可答、agent 可继续有用工作、用户后答经
  answer_to_pending_question 唤醒；先前呈批基于"自动落定"的错误描述）；②snapshot-replay
  B 层重录 session.v2.jsonl（B1 = e6e51bc persona 变更欠的基线债、B2 = 本次工具面变更，
  治法 = 新一代录制 + 人审；C5 金标准已重写）；③二梯队（tool-goal / tool-jobs / compaction
  调优）未动。

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
