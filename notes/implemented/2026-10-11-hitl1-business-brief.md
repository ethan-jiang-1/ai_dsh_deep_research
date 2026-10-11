# HITL1 业务决策简报——信息充分性触发的第四问扩展

> 状态：implemented

出处 = 推敲卡 [2026-10-11-executive-research-intake-brief](../../_backlog/issues/2026-10-11-executive-research-intake-brief.md)
（用户 2026-10-11 直派落地；设计依据 = 研究稿
[2026-10-11-executive-research-ux](../../_backlog/research/2026-10-11-executive-research-ux/index.md)
P0 候选①「立项补业务决策简报」）。机制基座 = [计划确认闸门 Note](2026-10-07-plan-review-gate.md)
——HITL1 两段卡结构与四处对账面由其拥有，本篇只记业务决策简报这一扩展的决定理由。

## 决定

HITL1 第一段新增**业务决策简报**采集（决策对象 / 待决定事项 / 比较选项 / 期限 / 成功标准
与约束），并入**既有第四问触发机制**（persona「确需澄清……加第四问」句扩展），不设固定
第四问：

1. 信息充分性触发：用户已提供的信息直接落格不重复问；缺项标「尚未确认」（模板 open 显式
   形态），仅当缺项**会改变研究范围**（如预算上限改变盈亏比较、期限改变深度取舍）才随
   第四问追问；不影响范围的缺项不追问；
2. question.md HITL1 Alignment Snapshot 增「业务决策简报」行（五字段 + 尚未确认形态）；
3. 计划确认卡 ≤200 字要点增业务决策简报行（决定 / 比较范围 / 输出形式 / 主要未知）——
   计划卡从研究参数摘要升级为业务可读简报；三种计划动作与一轮制不变；
4. 落面四处（同 diff）：persona 第四问句 + 计划要点（`lead.patch.yml`）· research-brief
   skill 采集规则（第 3 步）与计划卡构成（第 6 步）· 模板 question.md Snapshot 行 ·
   pack README「研究怎么跑」§1；契约钉 = `tests/presets.test.mjs`「HITL1 业务决策简报」
   （模板五字段在场 + 尚未确认形态 + skill 触发判据 + `[ACCEPTED]` 禁词 + 「不设固定
   第四问」positive 钉）。

## 输掉的方案

- **固定第四问**（每次必答业务字段）：问卡疲劳换不来信息增益——多数题面已含决策对象；
  研究稿 P0 判据「采取信息充分性触发，不得把决策字段机械设为每次必答」；
- **第三个 HITL 决策点**（运行中业务简报呈报/审批）：直接改两点交互合同——无证据证明
  价值超过打断成本；运行中补充信息的消费路径是独立未决问题，住
  [2026-10-11-executive-research-ux-delivery](../../_backlog/issues/2026-10-11-executive-research-ux-delivery.md)，
  不含在本变更；
- **自由文本反馈协议**（`[ACCEPTED]` 标记）：[hitl-feedback-protocol 否决](../rejected/2026-10-06-hitl-feedback-protocol.md)
  同款理由——结构化选项已承载接受/修改语义；
- **新建计划文件 / 独立采集节点**：计划确认闸门 Note 输掉方案同款——question.md 已是
  方向契约的家，一处事实不设两个家。

## 实际跑过的验证

- 立红：`tests/presets.test.mjs` 新断言先红（「question.md 模板缺业务决策简报字段」实录）
  → 实现转绿（focused 11/11）；注入反证：skill 注入「[ACCEPTED]」→ 禁词断言红 → 还原绿；
- L0：verify 全绿 + tests 338/338（净 +1）；
- L1：preset-smoke 真挂载四 preset ALL PASS；
- 回放面：lead fixture 真模型重录（录制器 fail-loud 先删旧语料后录）+ `snapshot.json`
  source 身份同 diff 更新（codeAnchor/recordedAt）+ C5 渲染金标准重写人审（差异 = 新
  录制中模型自选检索词与收尾复述措辞，UI 结构不变）→ snapshot-replay 4 场景 ALL PASS；
- 真模型档：l4-lite 四角色 assistant 响应 + scout web_search ALL PASS；
- 未跑（如实分开）：四类输入样例的人工走查与真实 run 提问行为观察 = 卡上人工判据行，
  待授权 run 执行（human judgment pending）；L2 未跑（改动面不含部署脚本，任务型路由
  非必跑）。

## 环境状态

运行中 web 进程缓存 boot 时文本——下次 boot run 通道时新 persona/skill 自然生效；lead
回放 fixture 已随本变更换代；工作区种子与 overlay 为重生成非手改（`pack-workspace-fresh`
/ `overlay-fresh` 绿）。
