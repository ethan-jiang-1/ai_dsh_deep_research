# RFC：wave1 挖掘打磨——未取得纪律与事中调度编典（pipeline-polish 面③）

> 状态：proposed

出处：[pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面③（wave1
机制：spawn 规模、任务板粒度、每 lead 挖多深、补搜轮次）；主序 ⑤→②→③→④ 第三棒。

## 问题（全部带实证）

1. **"未取得 ≠ 没有"零编典**——cn-dr-products run 中途重定义核心风险时**当场发明**两条硬
   纪律（journal 原文）：①国际侧结论必须标注一手/存档/二手；②**"绝不允许把'查不到'默认填
   成'没有/不提供'——查不到就是'未取得'，进无法判定类"**。取证可达性不对称是常态（该 run
   实测洋厂商一手定价页全域 403），但 synthesis skill 现行只有"补了还缺标 insufficient"，
   没有**禁止把未取得转写成"没有"**的判据——每场 run 都可能重发明或踩坑。
2. **事中改派零编典**——dispatch-distillation 毕业 Note 点名"事中 gap → 改派/加派（最未
   编典，仅 T1 改派一例实证）"；cn-us-cpu-gap journal 实证改派形态：T1/T2 可行锚点同源
   （"双人做会重复钻同一批芯片资料"）→ task-3 中途 reassign analyst-hardware。
3. **补搜任务形态未写**——两场实证补搜走**独立专 task**（cn-llm-pricing 专派 analyst-b 三
   项同 gap / cn-llm-infra task-6 W2-B 补搜带范围锁定），team-assembly 派发四件合同没覆盖
   补搜任务的形态。

## 方案

1. **synthesis skill 补"未取得 ≠ 没有"判据**（gap 补搜节延伸）：拿不到的项只能落
   「未取得/无法判定」（写明试过的渠道），**禁止转写成「没有/不提供」**——引用 cn-dr-products
   实证；与 analyst 侧既有"已搜未得"记录纪律衔接（记录归 analyst，解读归 synthesis，一个
   事实一个家）。
2. **team-assembly 补「事中调度」两条**：①**锚点重叠改派**——判据 = 可行锚点同源、双人会
   重复钻同一批来源 → 合并单 owner，任务板 reassign + journal 记账（cpu-gap 实证）；
   ②**补搜独立任务**——gap 补搜走独立 task 带范围锁定（补哪个 gap、什么算找到），不混进
   原挖掘任务（两场实证）；收"补完"只认文件事实。
3. **两处确认为"不改"**（证据入卡）：补搜轮次"只补一轮"被 4 场 run 确认（无一第二轮）；
   spawn 规模无过载实证（9–20 卡/owner 跨场，与 synthesizer 搁置池重估一致）。
4. **零门禁新增**——两处失败都被 lead/critic 事中抓住（在-run owner 已在），判据内容级
   机械查不出（防假牙齿）。

## 输掉的方案

- **evidence 覆盖门**（primary topic 零证据卡 → RED）：单例实证（cn-llm-deep-research T1
  层级零证据、T2/T3/T4 depends_on 全指向它），且 findings gap 纪律已在-run 承担——记候选，
  跨 run 复现 ≥2 再立（与 dispatch-distillation 晋升门槛同构）；
- **evidence-extraction 侧重复补"未取得"行**：analyst 侧已有"已搜未得"承担记录纪律，解读侧
  判据归 synthesis（一个事实一个家）；
- **补搜轮次放宽**（两轮/动态轮次）：4 场实证现行"只补一轮"无一第二轮——维持；
- **spawn 矩阵/手册改动**：无规模实证缺口，手册预算不动。

## 验收

1. L0 全绿；L1 四角色真挂载 ALL PASS；L4-lite 四角色真模型 ALL PASS（lead skill 文本改动
   行为证据）；
2. snapshot-replay 三层保持绿（skill 正文改动不进 request/header——frontmatter description
   未动，B 层不红 = 预判验证）；
3. 手册/模板/NODES 零改动（预算与契约面不动）；verify 全绿。
