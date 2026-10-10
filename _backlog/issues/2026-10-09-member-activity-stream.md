---
status: 推敲中
opened: 2026-10-09
---

# 推敲：队员活动流进渐进面——观察面的队员会话可见性

> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 研究驾驶舱的渐进面只 follow lead 会话——scout/analyst/critic 作为 teammate 的检索与取证动作住在各自会话，不进 lead journal，run 期观察队员得逐个开会话或切 ui-agent-team 任务板。出处 = [pack README 已知限制](../../packages/deep-research-pack/README.md)登记的后续候选 + [钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)。期望：run 期在观察面一处看见队员在干什么，不用逐会话翻。

**当前情况：** 现有缓解 = `wait_agent` 的"队员作业中"活动行（全静缓解）+ ui-agent-team 任务板（任务粒度）。缺的是队员**动作粒度**的流。company client-face 有先例可参照（8 页签里的 presence/board 从 sessions 座位的 agentTeam 投影读行数据——2026-10-09 复核确认的数据通道形态）。**通道供给侧已探明**（2026-10-10，vendor 同 pin 源码锚点）=[通道探明材料](../research/2026-10-10-teammate-channel-probe.md)：动作粒度唯一可达通道 = 多路 follow 队员会话（任意会话可 follow、journal 同词表、无已知并发上限）；agentTeam 投影天花板 = roster+任务板+turn 级 running（但它是**队员会话 id 的唯一发现源**——spawn_teammate 返回不带 id，源码实测）；新 @Remote = typert 生成步硬前置、仓外零先例、当前不采纳。**本卡刻意排在下一场研究 run 之后**：先拿真实 run 的观察素材定"多痛、要什么粒度"，再动工——不猜需求。

**未决问题：**
1. **数据通道选型**：供给侧已探明（见上）；**选型决定待 run 素材**——接不接、接多少条流、混排还是折叠，由需求侧（多痛/粒度）定；队员 journal 运行时帧形状与 N 流稳定性两项运行时确认也归 run 期；
2. **UI 形态**：并入现有活动流（混排 lead+队员，来源打标）vs 队员折叠区（每人一节）——真实 run 素材后定；
3. **与 ui-agent-team 任务板的分工边界**：动作流与任务粒度不双 home（一个事实一个家的观察面投影）。

**下一步：** 通道供给侧探明已完成并落 [research 材料](../research/2026-10-10-teammate-channel-probe.md)（2026-10-10）。剩余关键路径 = 下一场研究 run：需求侧按下方观察清单收割 → 回答未决 2/3 + 未决 1 的选型决定 → 最薄切片实施（改动面 = `src/client/` + 多路 follow 接线〔队员 id 从 agentTeam 投影行取〕+ client-load-smoke 断言 + design/40 同步）。

## 方案与取舍

- **推荐候选**：真实 run 观察 → 通道探明 → 最薄切片（先一种通道一个折叠区，垂直轮加宽）。
- **不采纳**：现在就动工（没有真实观察素材，UI 形态与粒度全是猜——等 run）；复制 company 页签全形态（我们只要动作流，不要八页签）。

## run 期观察清单（需求侧素材按单收割，防"靠记忆"）

下一场 run 无论题目，观察者按此单记（每条落 run bundle 侧笔记或交付记录，卡只收结论）：

1. **痛点频次**：每次想逐个开队员会话看动作记一笔——时机 + 想看什么（检索词 / 取证文件 / 失败重试）；
2. **粒度需求**：`ui-agent-team` 任务板在哪几次不够用、缺的动作粒度是什么级（检索级 / 读文件级 / 出错级）；
3. **UI 直觉**：混排活动流 vs 每人折叠区的倾向**只记不定案**（定案在方案节，等素材齐）。

## 关闭条件

- 数据通道选型有 vendor 同 pin 实测依据（不是抄文档）；
- 最薄切片落地且 client-load-smoke 真浏览器断言全绿 + design/40 同步；
- 与任务板的分工边界写进 design/40（非 owner 文档不重述）。

## 验收标准

| 判据 | 检查方式 |
|---|---|
| 队员动作真实出现在观察面 | client-load-smoke 真浏览器断言（绑定会话盘侧对账） |
| 数据通道形态有实测依据 | 通道探明记录（vendor 源码行号锚点） |
| 不双 home | design/40 分工边界句 + 折算单一正本 |
