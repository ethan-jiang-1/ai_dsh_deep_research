---
status: 推敲中
opened: 2026-10-09
---

# 推敲：队员活动流进渐进面——观察面的队员会话可见性

> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 研究驾驶舱的渐进面只 follow lead 会话——scout/analyst/critic 作为 teammate 的检索与取证动作住在各自会话，不进 lead journal，run 期观察队员得逐个开会话或切 ui-agent-team 任务板。出处 = [pack README 已知限制](../../packages/deep-research-pack/README.md)登记的后续候选 + [钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)。期望：run 期在观察面一处看见队员在干什么，不用逐会话翻。

**当前情况：** 现有缓解 = `wait_agent` 的"队员作业中"活动行（全静缓解）+ ui-agent-team 任务板（任务粒度）。缺的是队员**动作粒度**的流。company client-face 有先例可参照（8 页签里的 presence/board 从 sessions 座位的 agentTeam 投影读行数据——2026-10-09 复核确认的数据通道形态）。**通道供给侧已探明**（2026-10-10，vendor 同 pin 源码锚点）=[通道探明材料](../research/2026-10-10-teammate-channel-probe.md)：动作粒度唯一可达通道 = 多路 follow 队员会话（任意会话可 follow、journal 同词表、无已知并发上限）；agentTeam 投影天花板 = roster+任务板+turn 级 running（但它是**队员会话 id 的唯一发现源**——spawn_teammate 返回不带 id，源码实测）；新 @Remote = typert 生成步硬前置、仓外零先例、当前不采纳。**本卡刻意排在下一场研究 run 之后**：先拿真实 run 的观察素材定"多痛、要什么粒度"，再动工——不猜需求。

**需求侧定夺（2026-10-10，用户三问直答；归档素材挖掘替代"等下一场 run"——用户即观察者，35+ 场 run 经验为基底）：**

- 未决 1（通道选型）→ **通道二（多路 follow 队员会话）为动作流本体 + 通道一（agentTeam 投影）作队员 id 发现与 roster**；动作粒度 = **检索/抓取/出错级**（web_search 查询词 + web_fetch 目标与失败态；文件读写不入流——实测 read 最高 64 次/人是噪音大头）。
- 未决 2（UI 形态）→ **每人折叠区**（研究状态页签内，默认折叠，展开看尾部动作 + 错误徽标；混排会淹没 lead 自己的流——实测队员 86–830 事件/人）。
- 未决 3（任务板分工）→ 任务板（ui-agent-team 面）= 任务粒度；本流 = 动作粒度（检索/抓取/出错）；边界句进 design/40。
- 验证载体 → **实施内证明**（折算纯函数 keyless 测试 + client-load-smoke 无团队负例；有团队正例 = 下一场真实 run 首验或可选真模型档 smoke——投影不进 journal，keyless 回放道不可造正例）。

**归档素材挖掘（2026-10-10，= 通道材料遗留不确定性 #1 的答案）：** 4 场归档 run 的 4 lead + 18 队员会话实测——队员可辨 = session 头 `delegationDepth=1`（root lead=0；`agentPreset` 恒 lead，composeFrom 语义）；量级 = 86–830 事件/人、zstd 150KB–1.4MB（多路 follow 首帧 ≈ lead 同阶，通道材料风险注实证）；动作分布 = web_search 1–23、web_fetch 9–54、read 3–64、write/edit 1–45 次/人。挖掘教训：macOS zgrep 不支持 zstd 且**静默空手**（首查全组零命中假象）——zstd 日志搜索一律 `zstd -dc | grep` 管道。

## 验收标准（2026-10-10 按 validation-design 重写）

| # | 行为 | 类别 | 输入态 / 信号 | 反例与互补态 | 证据 owner（能证/不能证） | 人工判断 |
|---|---|---|---|---|---|---|
| 1 | 队员动作折算（🔍 检索词 / 🌐 抓取目标 / ⚠️ 失败行；计数与尾部截断） | 确定性逻辑 | 注入合成事件（形状取自真实归档 journal）：web_search call、web_fetch call、fetch 成败 result、非目标工具 | 非目标工具滤除（read/write/edit 不进流）；失败有独立行；空事件 = 空区 | `tests/member-activity-fold.test.mjs` + `pnpm test`（红→绿） | 无 |
| 2 | 无团队负例：无 teammate 行 → 队员区不渲染 | 编排（客户端） | 无团队会话（投影无 agentTeam/无 teammate） | 有团队正例（#3）互补 | `client-load-smoke` 扩展断言（keyless 真浏览器） | 无 |
| 3 | 有团队正例：roster + 折叠区 + 动作行 + 错误徽标 | 编排（客户端） | 真实团队（投影 teammate 行 + 队员 journal 流） | — | **待首验**（下一场真实 run 或可选真模型档 smoke；投影不进 journal，keyless 回放不可造正例——通道材料实证） | 无 |
| 4 | design/40 构成/边界/分工句 + pack README 已知限制更新 | 文档合同 | 队员区进构成节；任务板 vs 动作流分工句；限制行退役 | — | `pnpm verify`（md 门禁）+ 文档评审 | 无 |

**下一步：** 通道供给侧探明已完成并落 [research 材料](../research/2026-10-10-teammate-channel-probe.md)（2026-10-10）。剩余关键路径 = 下一场研究 run：需求侧按下方观察清单收割 → 回答未决 2/3 + 未决 1 的选型决定 → 最薄切片实施（改动面 = `src/client/` + 多路 follow 接线〔队员 id 从 agentTeam 投影行取〕+ client-load-smoke 断言 + design/40 同步）。

## 方案与取舍

- **推荐候选**：真实 run 观察 → 通道探明 → 最薄切片（先一种通道一个折叠区，垂直轮加宽）。
- **不采纳**：现在就动工（没有真实观察素材，UI 形态与粒度全是猜——等 run）；复制 company 页签全形态（我们只要动作流，不要八页签）。

## run 期观察清单（需求侧素材按单收割，防"靠记忆"）

下一场 run 无论题目，观察者按此单记（每条落 run bundle 侧笔记或交付记录，卡只收结论）：

1. **痛点频次**：每次想逐个开队员会话看动作记一笔——时机 + 想看什么（检索词 / 取证文件 / 失败重试）；
2. **粒度需求**：`ui-agent-team` 任务板在哪几次不够用、缺的动作粒度是什么级（检索级 / 读文件级 / 出错级）；
3. **UI 直觉**：混排活动流 vs 每人折叠区的倾向**只记不定案**（定案在方案节，等素材齐）。

## 实施记录（2026-10-10）

- 验收 #1 **通过**：`tests/member-activity-fold.test.mjs` 5/5（红→绿：模块未建红 → 实现绿；事件形状 = 归档 journal 实证——web_search 参数 `queries` 数组、web_fetch 参数 `url`、失败 result `isError:true` + "Error: " 前缀）。
- 验收 #2 **通过**：`client-load-smoke` **ALL PASS**——新增两处无团队负例断言（绑定会话遍 + 未绑定会话遍）；正例断言（盘侧 spawn 名 ↔ 投影 roster 对账）已编码，当前绑定会话（cn-moe 停滞 lead，未组队）走负例分支——断言届时随真实团队自动生效。
- 验收 #3 **待首验**：投影不进 journal（实测 token-factory lead journal grep `agentTeam` = 0——投影走宿主控制流，会话日志无此事件），keyless 回放道不可造正例；首验 = 下一场真实 run（client-load-smoke 的 spawn 对账断言自动咬合）。
- 验收 #4 **通过**：design/40（构成表 + 折算层六件 + ⑦ 区描述 + 已知边界重写含分工句）+ pack README 限制行更新；`pnpm verify` 全绿（staged 后）、`pnpm test` 332/332（含新增 5）。
- 接线：`src/client/ResearchStatusTab.tsx` ⑦ 区（roster = 标准注入的 `useProjection('agentTeam')`——队员 id 唯一发现源；多路 follow 每队员一条，AbortController 统一回收）+ `src/lib/member-activity.ts` 折算 + pack devDep `@deepseek-ai/dsh-experimental-agent-team`（类型链，非 bundle 行——row-deps 不涉）；构建绿（tsc + tsdown client 50KB）。
- 顺带修（同 diff）：**client-load-smoke 深列表脆弱性**——dev home 累积 250+ 会话把目标埋 8 层 "Show N more sessions"，单次展开够不着（实测复现 + CDP 探针独立证实非 Playwright actionability 问题）→ clickRowByText 改循环展开（60 轮上限，至目标在场/按钮消失）；修复后冒烟 ALL PASS 复归。诊断脚本住 runtime/（gitignored 一次性）。
- 通道材料遗留 #1（队员 journal 真实形状）由归档挖掘闭环（见 §需求侧定夺）；遗留 #2（N 流稳定性）的最薄证据 = 首验时多路 follow 同开（gateway 无上限，源码级 + 单 lead 双流既有实证）。

**下一步**：#3 首验（下一场真实 run——断言已就位自动生效）→ 全绿后按关闭条件收档。

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
