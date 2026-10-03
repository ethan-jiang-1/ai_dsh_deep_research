# RFC：wave0 侦察打磨——leads 计数对账与交接门升格（pipeline-polish 面②）

> 状态：proposed

出处：[pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面②（wave0
机制：leads 映射波次——搜索面怎么铺、主题怎么拆、leads 的覆盖判据）；主序 ⑤→②→③→④
第二棒（面⑤首棒已毕业 2026-10-03）。

## 问题（全部带实证）

1. **写数未点数 + 内部不一致无自检**（样本 3 drt_mcp-server-ecosystem CRITICAL-2）：scout 在
   leads.md 写"`### Archived` 14 条"，自己的证据卡（registry-02/top-02）与 findings F3 全是
   13（14 是另一仓库 servers-archived 的数）；且 registry-06 卡**已记录**该口径差异却未回改
   leads.md 表格。critic 判词："这不是分歧，是同一文件的内部不一致"；**leads.md 是 analyst
   抽数入口，残留错误数字的风险高于普通过程稿**。
2. **覆盖无机械判据**：card 面② 核心问"leads 的覆盖判据"——侦察产出质量决定 wave1 天花板，
   但"每个 topic 有没有被 lead 指到"目前纯散文，裸奔到 wave1 中段才暴露（gap 改派返工）。
3. **NODES 第 3 行判据只在场级**：schema-scan 管leads.md 在场/豁免，判据级（字段齐、覆盖）
   未升格——node-gate v1 = 交付两门（第 7/8 行），第 3 行是 charter 写明的"按证据逐个升格"
   下一行。

## 方案

1. **lead-mapping skill 三判据**（模型可见面）：① **计数对账**——写进 leads.md 的每个数字
   必须是自己逐条点数或有证据卡依据，不确定不写数；② **定稿自检回改**——交稿前把自己的
   来源记录对一遍数，发现口径差异必须回改 leads.md（CRITICAL-2 的"已定案未回改"反模式）；
   ③ **覆盖自检**——对照 topics.md 数一遍，每个 primary/comparison topic 至少一条建议挖深
   lead 指向（与门 L 同判据：模型先自检，门禁兜底）。
2. **node-gate v2**：v1 交付两门原样 + **门 L（leads 交接门，两断言）**——
   - L1 字段齐：每个 `## 方向:` 节有状态行且值合法（建议挖深｜已排除）；建议挖深节须有
     支持来源（含 A–D 分级）+ 关键线索 + 建议 owner；已排除节须有原因；0 节 = RED
     （防空语料）；
   - L2 topic 覆盖：topics.md 的 scope_role ∈ {primary, comparison} 的 T# 须被 ≥1 条建议
     挖深 lead 引用；synthesis/supporting 免检（窄带，防假牙齿）；topics.md 缺席 = N/A；
   - 豁免：question.md 类型 = quick_factual → 门 L 整体 N/A（条件件，与 schema-scan 同
     语义；豁免依据 = bundle 自带事实）。
3. **NODES.md 判据级表述升格**（第 3 行纳入门 L）+ 双副本同步（sync-pack-workspace）。

## 输掉的方案

- **计数一致性机械化**（对账外部来源）：需内容级判断与重抓，机械查不出"口径真实"——归
  critic 狩猎与 skill 自检，机械门查不出就别装能查（floor 教训：实测前数值门禁是假牙齿）；
- **supporting/synthesis topic 纳入覆盖门**：背景/综合 topic 未必需要独立 leads——证据未
  到先不纳入，宁窄勿宽，按 run 证据再收紧；
- **scout persona 同步加判据**：方法是 skill 的家（一个事实一个家），persona 复述 = 双
  home 漂移源——不动 persona。

## 验收

1. tests 先红后绿：新夹具 8 形态（健康双绿 / 缺状态 / 状态非法 / 建议挖深缺来源 / 已排除
   无原因 / primary 无 lead 指向 / quick_factual 豁免 N/A / 0 节 RED）先红（未实现前）后绿；
2. L0 全绿；L1 四角色真挂载 ALL PASS；L4-lite 四角色真模型 ALL PASS（scout 文本改动行为
   证据）；
3. snapshot-replay 保持三层绿（scout skill 不在 lead 夹具请求面——角色硬隔离的间接验证）；
4. NODES 双副本 fresh（pack-workspace-fresh 门禁过）；verify 全绿。
