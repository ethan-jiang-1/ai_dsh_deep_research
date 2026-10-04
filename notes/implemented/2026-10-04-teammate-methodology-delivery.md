# 角色方法论传递机制——spawn 队友的技能到达缺口（验收 run 实证发现）

> 状态：implemented

出处：验收 run drt_2026-ai-coding-agent-landscape（2026-10-04）操作侧收尾的系统性发现；
第二场 run（drt_2026-ai-browser-landscape）追加实证；喂 [pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面②与技能传递面。

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

- 门L 的两次 RED（两场 run 的 leads.md 模板形态违约）随本决定进入"待修复验证"态：第三场
  run 若门L 仍红，则候选 A 的装载措辞需重推敲（不排除 lead 端执行方差）；
- run 通道重启（镜像重建）后新文本生效——本决定同 diff 已重启通道（代理配方自起）。
