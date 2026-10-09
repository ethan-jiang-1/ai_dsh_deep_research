# 角色方法论传递机制——spawn 队友的技能到达缺口（验收 run 实证发现）

> 状态：implemented

出处：验收 run drt_2026-ai-coding-agent-landscape（2026-10-04）操作侧收尾的系统性发现；
第二场 run（drt_2026-ai-browser-landscape）追加实证；喂 [pipeline-polish 卡](../../_backlog/_archive/settled_issues/2026-09-28-pipeline-polish.md) 面②与技能传递面。

## 决定

1. **team-assembly 派发四件扩五件**：新增第⑤件"方法论装载"——spawn prompt 首段令队友
   **开工先 `read` 自己的方法论技能文件**，角色→路径常量钉死（scout→lead-mapping／
   analyst→evidence-extraction／critic→adversarial-review，路径 = lead 技能安装位的兄弟
   目录）；找不到路径 → glob 枚举 `presets/*/skills/*/SKILL.md`。
2. **读不到的合规出路显式化**：路径漂移时队友**如实回报偏差并按任务验收判据 + templates/
   run/ 模板形态执行，不得静默跳过**——第二场 scout 的显式报偏即正确形态（判据进正文）。
3. **边界**：本决定是 prompt 级装载（零 vendor 依赖）；手册索引（双家）与等 vendor 参数
   （seam 未开）维持否决；队友读了技能后的执行质量仍由任务验收判据 + 门禁把守，装载≠免检。

## 输掉的方案

- **手册加"角色方法论索引"节**：手册行数预算 120 行顶 + 技能路径的家在 preset，复述进
  手册 = 一个事实两个家（pack-workspace-fresh 门禁防的就是这类双份）；
- **等 spawn_teammate 出 preset 参数**：上游 seam 未开（vendor 源码钉死无参数），搁置池
  形态——复活条件 = vendor 加参或 agent-team-profile 层出现 per-teammate 组合面；
- **把角色技能改为随 composeFrom 复制**：vendor 机制层（composeFrom 语义钉死），本仓
  不发明。

## 验证

- L0：verify 34 门全绿 + tests 140/0；
- L1：preset-smoke 四角色真挂载 ALL PASS（team-assembly 文本变更真挂载绿）；
- L4-lite：四角色真模型 ALL PASS；
- snapshot-replay 三层 ALL PASS（skill 正文不进 request/header——两场一致的既证行为）；
- **模式活体预验**：第二场 run 的 lead **自发**执行了同款装载（三份 spawn prompt 均带
  "开工先加载你自己的 lead-mapping / evidence-extraction skill"，且自己 read 了
  templates/run/leads.md 拿格式）——prompt 级装载在真 run 可行的直接证据；
- 效果终验 = 下一场 run：队友日志 grep 角色技能内容应从零命中转非零，门L 预期转绿。

## 环境状态（Consequences）

- **效果终验结果（2026-10-04 第三场 run）**：装载确认到达（队友会话实测含指令），但门L 仍红
  （第三例）——scout 带着技能内容仍按 T0 实体边界任务选择清单组织。**判定：候选 A 装载有效
  （方法论到达），但 leads.md 模板形态与实体边界型任务天然不合**——"leads 形态契约按 topic
  类型分形"升级为独立推敲议题（方向清单型 vs 实体边界型 vs 通道地图型，三场 run 各出一种）；
  门L 的 `## 方向:` 计数判据需要按此重推敲（不排除判据本身演进）；
- **效果终验终局（2026-10-06，drt_mcp-hosts-governance）**：队友日志 grep 角色技能内容 = **非零命中**（4/4 team 队友——scout→lead-mapping、analyst×2→evidence-extraction、critic→adversarial-review——各自技能路径与内容标记均在日志在场；第五会话 = subagent 一次性 worker，设计上不装角色技能）；**门L PASS**（22/22 单元字段齐、挖深 22/排除 0、覆盖 6/6，零漂移形态——第三场形态不合的问题本场未复发，实体边界型任务外的常规分型照常产出 leads）。挂账终验两半全绿，销账（queue 注记同步移除）。
- run 通道重启（镜像重建）后新文本生效——本决定同 diff 已重启通道（代理配方自起）。
