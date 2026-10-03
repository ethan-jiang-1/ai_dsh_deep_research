# RFC：wave2 综合打磨——版本记账门④（pipeline-polish 面④）

> 状态：proposed

出处：[pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面④（wave2
机制：纯综合先行与定向补搜的写作纪律、final/ 版本演进语义）；主序 ⑤→②→③→④ 第四棒。

## 问题（全部带实证）

1. **版本记账核对零机械**——19 场 run 中 3 场走了扩张 rerun（kimi-api-pricing /
   selfhosted-ai-gateway / siliconflow-financials 落 final/v2.md），形态高度一致：
   §Decisions 均有 v2 记账行 + final/v1.md 均作跨版本索引（"已被 v2 取代"/索引表/"当前交付版
   v2"）。但 **kimi 场 §Decisions 零 v2 记账**（2026-09-26 契约前交付，grep 全节 0 命中）——
   真实历史违约形态在案。node-gate 门③ v1 头注预留的"v2+ 逐版本匹配留待按证据收紧"条件已到
   （3 场实证 + 1 反例）。
2. **G8 形态在版本停靠点再现过**——selfhosted-ai-gateway §Decisions 留有流程偏差记账：
   "v2 首次落盘时，HITL2 与 present 两项形式要件均缺席"，后操作侧补审追认。门④收紧把版本
   停靠点的记账纳入机械面。
3. **wave2 写作纪律三件均有 owner**——纯综合先行（journal 多场确认"未出现第二轮"）、只补
   一轮（面③ 4 场确认）、未取得≠没有（面③刚落）——本轮确认为**不改**（证据入卡），防无
   实证打磨。

## 方案

1. **node-gate 新增门④（版本记账门）**：final/ 存在 vN（n≥2）→ ① §Decisions 须含提及 vN
   的行（版本落盘须有对应拍板/立项/追认记账）；② final/v1.md 须登记该版本（跨版本索引——
   手册 final/ 节契约）；v1.md 缺席 = RED（fail-loud）；无 vN 或 final/ 不在场 = N/A 显式；
   **断代** VERSION_CONTRACT_DATE = 2026-10-03（kimi 09-26 实证 = 断代必要性活证，契约前
   PRE-CONTRACT 不计红）；
2. **NODES.md 回边版本语义节补门④把守表述** + 双副本同步；
3. **写作纪律不改确认**（纯综合先行/只补一轮/未取得≠没有三件证据入卡）；
4. **本棒零模型可见面改动**（scripts + NODES 契约面 only）——验证档 = L0 + 门④自带 fixtures
   先红后绿 + 真 bundle 实跑（kimi 显式指定 → 预期 PRE-CONTRACT 如实报告 = 活体反证）。

## 输掉的方案

- **同行 /HITL2.*vN/ 匹配**：过拟合三样本格式（selfhosted 的立项行与收工行分离，均含 v2 即
  已记账）——vN 行存在即记账在案，HITL2 全局判据由门③承担；
- **polish 原位机械化**：无 before-state 可比，机械查不出（如实不装）；
- **synthesis skill 再补写作判据**：三件已有 owner 且无新失败实证——不动；
- **门④放 schema-scan**：在场级/判据级分层已定，版本记账是判据级（node-gate 领地）。

## 验收

1. 先红后绿：新 fixtures（健康双证齐 / 缺 §Decisions v2 行 / 缺 v1.md 登记 / 仅 v1 N/A /
   断代 PRE-CONTRACT）实现前红后绿，tests 全绿；
2. 真 bundle 活体反证：node-gate 显式指定 kimi-api-pricing → 门④ PRE-CONTRACT 如实报告
   （不追溯红）；
3. L0 全绿；NODES 双副本 fresh；verify 全绿。
