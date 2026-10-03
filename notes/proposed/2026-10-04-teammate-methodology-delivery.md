# RFC：角色方法论传递机制——spawn 队友的技能到达缺口（验收 run 实证发现）

> 状态：proposed

出处：验收 run drt_2026-ai-coding-agent-landscape（2026-10-04）操作侧收尾的系统性发现；
喂 [pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面②（wave0 机制）
与技能传递面。

## 问题（全部带实证）

1. **spawn_teammate 子一律 composeFrom lead**（vendor 源码事实，mcp-client 货架落定
   e2f2661）→ 队友会话拿到的是 lead 的技能集，**scout/analyst/critic 各自的方法论技能
   （lead-mapping / evidence-extraction / adversarial-review）从未到达队友**。实测：验收
   run 两队友会话日志全量 grep "lead-mapping"/"evidence-extraction" 零命中。
2. **下游后果已被门L 活体抓捕**：scout 无格式指令 → leads.md 用实体清单表格而非模板
   `## 方向:` 节 → 门L RED（首场活体违约，2026-10-04 交付审计在案）。
3. **证据卡守约靠注入手册而非角色技能**：analyst 无 evidence-extraction 技能，但 40 卡
   七字段全齐——契约来自研究手册（agent-instructions 注入每个会话）；即现行体系"靠手册
   兜底、技能失联"。手册与技能的判据分工（手册=跨角色契约、技能=角色方法论）因此倒挂。
4. **面②③ 的判据投喂面失联**：lead-mapping 三对账（计数对账/口径差异回改/覆盖对账）与
   evidence-extraction 的 question-list 工作流只住技能——队友看不到 = 判据没进 run。

## 方案

**候选 A（prompt 级装载，零 vendor 依赖）**：team-assembly 派发四件扩一件"方法论装载"——
spawn prompt 首行令队友 `read` 自己的方法论技能文件（pack 内 `presets/<role>/skills/…`
路径，fs 工具可读）；team-assembly 技能给各角色的路径常量。

## 输掉的方案

- **候选 B（手册加"角色方法论索引"节）**：手册已注入每个会话、队友可自查——但手册行数
  预算 120 行顶 + 技能路径的家在 preset，复述进手册 = 一个事实两个家（漂移险实测在案：
  pack-workspace-fresh 门禁防的就是这类双份）；
- **候选 C（等 spawn_teammate 出 preset 参数）**：上游 seam 未开（vendor 源码钉死无参数），
  搁置池形态——复活条件 = vendor 加参或 agent-team-profile 层出现 per-teammate 组合面。

## 验收

1. 队友会话日志含角色技能内容（grep 实证从零命中转非零）；
2. 下一场 run 的 leads.md 过门L（模板形态）；
3. L0/L1（改 team-assembly 技能文本→真模型档证据）。
