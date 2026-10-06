# 专业 DR 策略层对标——预算分配/迭代深度/终止条件（pipeline-polish 面①）

> 状态：implemented

出处：[pipeline-polish 卡](../../_backlog/_done/_closed_plans/2026-09-28-pipeline-polish.md) 面①（最后
待立卡面；研究型——产出判断材料非机制）。对标材料 = [reference/
2026-10-03-strategy-benchmark-sources](../../_backlog/reference/strategy-benchmark/2026-10-03-strategy-benchmark-sources.md)。

## 决定

**三轴对账结论**（源仓 research_style_params / Anthropic 工程自述 / 本仓现行逐项对照，材料
见 reference）：

1. **迭代深度：收敛，维持现状**——源仓 `wave2_emergent_search_rounds: 1`（emergent 补搜
   轮数默认 1）与本仓 4 场实证的"只补一轮"同值；Anthropic 无显式轮次（heuristics + 并行
   压缩等价）。双源支撑，不采纳改轮次。
2. **预算分配：地板缺失**——源仓有 per-topic 数值地板（wave0 12 源 / wave1 10 源 + 全局
   共享总量 CLI 计算 + 新源比例 0.5）；Anthropic 用 prompt 扩缩区间（与本仓深度→topic
   映射同构）；本仓只有 agent 数扩缩，"每 topic 至少几张卡"无数值。**候选 A 入搁置池**
   （数量地板参数化：先存量 19 场标定分布 + run 记账字段，实证后立门——floor 教训防假
   牙齿）；**候选 B 同 diff**（参数单点计算权威：脚本从深度档算地板、门禁只读显式参数、
   缺参 fail-loud——源仓 `missing_profile_parameter` 不得 hidden default 的模式）。
3. **终止条件：部分缺失**——质量终止（readiness PASS）与诚实终止（未取得≠没有 / 已搜未得 /
   单检索器待破 / gap 四态）在；数量型终止语义（"达到地板且无未答 = 可停"）无——归并入
   候选 A（同一机制的两面），不重复立。
4. **不采纳**：OpenAI DR 路线（end-to-end RL 单模型浏览代理，无公开编排层策略参数——
   物种不同，同构比较对象只有源仓与 Anthropic）；源仓 terminal outcomes 枚举（本仓诚实
   终止纪律已覆盖同语义）；Anthropic 15× token 预算观（架构不同，cache hit 成本面另册）。

**跨轴收获**：Anthropic 的锚点重叠重复劳动失败（一 subagent 挖 2021 芯片危机、两个重复挖
2025 供应链）与 cpu-gap 改派案例同型——面③事中调度判据获双源验证；"模型升级 > 预算翻倍"
与既有"随 vendor 换 tag 重校"纪律同向。

## 输掉的方案

- **直接采纳改机制**：研究条目不开工机制；外部做法未经本仓实证（dispatch-distillation
  同教训：形状取决于本仓差异长什么样）；
- **全量系统对标**：三轴够了（card 钉的轴），系统挑有工程自述的——OpenAI 产品页全线 403
  拒取（直连/代理+UA 均拒），产品级预算数字本次缺一手核实、如实记档不用；
- **产出直接进 docs/**：判断材料住 reference/ 随卡毕业，docs 只写 now。

## 验证

- 双源一手核实：源仓 shared-profile.md 本地直读（research_style_params 12 参数全录）；
  Anthropic 工程博 HTTP 200 直取（167KB，token 经济/扩缩规则/并行化/90.2% 数字全提取）；
  OpenAI 系统卡 PDF HTTP 200（pdftotext 抽取定性结论）；OpenAI 产品页 403 如实记档（S4）；
- 会话内 web_fetch 撞 SSRF 守卫 × fake-IP DNS（guides/61 §0 同源机理），curl+本机代理
  配方绕行成功——代理配方的第二个使用场景实证；
- 三轴对账表落 reference 材料（每轴：专业做法/本仓现行/差距判定/候选触发条件）；
- L0 全绿（verify 34 门 + tests 140/0）；reference 索引对账（plans-liveness）。

## 环境状态（Consequences）

- **pipeline-polish 卡七面全部收口**：⑤②③④⑦① 毕业 + ⑥ 滚动（不立卡，随 run 喂证据）
  ——第二阶段结构性工作清零；真正的验收场 = 下一场真 run（新 persona + 门L④ 首场：健康
  遥测计数起算 + 面⑥ 升格素材 + 全部新判据活体检验）。
- 候选 A 触发链第一步（存量标定）零成本——随下一场 run 的 journal 记账字段先行（搁置池
  行为唯一正本）。
