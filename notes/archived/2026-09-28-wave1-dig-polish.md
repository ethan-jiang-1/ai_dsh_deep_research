# wave1 挖掘打磨——未取得纪律与事中调度编典（pipeline-polish 面③）

> 状态：implemented
>
> 归档：2026-10-20（pipeline-polish 面③已落地，挖掘纪律现由 skills/手册承载）

出处：[pipeline-polish 卡](../../_backlog/_archived/settled_issues/2026-09-28-pipeline-polish.md) 面③（主序
⑤→②→③→④ 第三棒；面⑤②已毕业 2026-10-03）。

## 决定

1. **synthesis skill 补「未取得 ≠ 没有」判据**（gap 补搜节延伸）：拿不到的项，报告里只能落
   「未取得/无法判定」（写明试过的渠道），**禁止转写成「没有/不提供」**——取证可达性不对称
   是常态（实证 = cn-dr-products run 中途发明的硬纪律 journal 原文："绝不允许把'查不到'
   默认填成'没有/不提供'"，洋厂商一手定价页全域 403），查不到 ≠ 官方没有。与 analyst 侧
   既有「已搜未得」记录纪律衔接：记录归 analyst、解读归 synthesis，一个事实一个家。
2. **team-assembly 新增「事中调度（改派与加派）」节**：
   ① **锚点重叠改派**——判据 = 可行锚点同源、双人会重复钻同一批来源 → 合并单 owner，任务板
   reassign + journal 记账（实证 = cn-us-cpu-gap：T1/T2 锚点同源，task-3 中途 reassign
   analyst-hardware）；② **补搜独立任务**——gap 补搜走任务板独立 task 带范围锁定（补哪个
   gap、什么算找到），不混进原挖掘任务（实证两场：cn-llm-pricing 专派 analyst-b、
   cn-llm-infra task-6）；收"补完"只认文件事实，不认 teammate 自报。
3. **两处确认为"不改"（证据入卡）**：补搜轮次"只补一轮"被 4 场 run 确认（cn-llm-infra/
   cn-llm-deep-research/cn-us-cpu-gap/cn-llm-pricing，无一出现第二轮）；spawn 规模无过载
   实证（9–20 卡/owner 跨场，与 synthesizer 搁置池重估一致）。
4. **零门禁新增**：两处失败都被 lead/critic 事中抓住（在-run owner 已在），判据内容级机械
   查不出（防假牙齿——实测前数值门禁是假牙齿的同源纪律）。

## 输掉的方案

- **evidence 覆盖门**（primary topic 零证据卡 → RED，node-gate row 4）：单例实证
  （cn-llm-deep-research T1 层级零证据、T2/T3/T4 depends_on 全指向它），findings gap 纪律
  已在-run 承担——记候选，跨 run 复现 ≥2 再立（与 dispatch-distillation 晋升门槛同构）；
- **evidence-extraction 侧重复补"未取得"行**：analyst 侧已有「已搜未得」承担记录纪律，解读
  侧判据归 synthesis（一个事实一个家）；
- **补搜轮次放宽**（两轮/动态）：4 场实证无一第二轮——维持现状；
- **spawn 矩阵/手册改动**：无规模实证缺口，手册预算不动。

## 验证

- **L0**：verify 34 门全绿 + tests 133/0。
- **L1**：preset-smoke 四角色真挂载 ALL PASS。
- **L4-lite**：四角色真模型 ALL PASS + scout 真调 web_search（lead skill 文本改动的行为
  证据——两处改动都在 lead 的 skill）。
- **snapshot-replay 三层 ALL PASS 且 B 层不红**：skill 正文改动不进 request/header
  （frontmatter description 未动）的预判被实测验证；C 层金标准不受影响。
- overlay 重渲染随改（render-overlay）。

## 环境状态（Consequences）

- **evidence 覆盖门候选留档**：primary topic 零证据卡的失败形态单例在案（cn-llm-deep-research
  C1 CRITICAL）；再现场次 → 按晋升门槛立 node-gate row 4 升格卡。
- **主序进度**：⑤②③已毕业，下一棒 = 面④ wave2 综合（写作纪律 + final/ 版本语义，与面③
  共享的补搜回边已在本棒覆盖一半）；面①并行、面⑥随 run 滚动、面⑦收尾。
