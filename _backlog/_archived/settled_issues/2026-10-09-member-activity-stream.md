---
status: 已结
opened: 2026-10-09
---

# 推敲：队员活动流进渐进面——观察面的队员会话可见性

> 立卡：2026-10-09 ｜ 状态：已结（2026-10-11 验收 4/4 绿，证据 = 真实 run drt_mcp-security-landscape 首验）｜ 类型：Feature ｜ 可关闭：是

**问题与期望结果：** 研究驾驶舱的渐进面只 follow lead 会话——scout/analyst/critic 作为 teammate 的检索与取证动作住在各自会话，不进 lead journal，run 期观察队员得逐个开会话或切 ui-agent-team 任务板。出处 = [pack README 已知限制](../../../packages/deep-research-pack/README.md)登记的后续候选 + [钉版复核 Note](../../../notes/implemented/2026-10-09-company-repin-review.md)。期望：run 期在观察面一处看见队员在干什么，不用逐会话翻。

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
| 1 | 队员动作折算（🔍 检索词 / 🌐 抓取目标 / ⚠️ 失败行；计数与尾部截断） | 确定性逻辑 | 注入合成事件（形状取自真实归档 journal）：web_search call、web_fetch call、fetch 成败 result、非目标工具 | 非目标工具滤除（read/write/edit 不进流）；失败有独立行；空事件 = 空区 | `tests/run/member-activity-fold.test.mjs` + `pnpm test`（红→绿） | 无 |
| 2 | 无团队负例：无 teammate 行 → 队员区不渲染 | 编排（客户端） | 无团队会话（投影无 agentTeam/无 teammate） | 有团队正例（#3）互补 | `client-load-smoke` 扩展断言（keyless 真浏览器） | 无 |
| 3 | 有团队正例：roster + 折叠区 + 动作行 + 错误徽标 | 编排（客户端） | 真实团队（投影 teammate 行 + 队员 journal 流） | — | **通过**（2026-10-11 真实 run 首验：client-load-smoke 正例断言全绿〔roster↔spawn 逐名对账〕+ 真通道 CDP 探针 ⑦ 区实证） | 无 |
| 4 | design/40 构成/边界/分工句 + pack README 已知限制更新 | 文档合同 | 队员区进构成节；任务板 vs 动作流分工句；限制行退役 | — | `pnpm verify`（md 门禁）+ 文档评审 | 无 |

**下一步：**（收卡时收拢——本行原为"等 run 收割需求再实施"的旧计划，已被同日需求侧定夺〔归档素材挖掘替代等 run〕与实施记录超越；最终完成情况见下方 2026-10-11 首验轮实施记录。）

## 方案与取舍

- **推荐候选**：真实 run 观察 → 通道探明 → 最薄切片（先一种通道一个折叠区，垂直轮加宽）。
- **不采纳**：现在就动工（没有真实观察素材，UI 形态与粒度全是猜——等 run）；复制 company 页签全形态（我们只要动作流，不要八页签）。

## run 期观察清单（需求侧素材按单收割，防"靠记忆"）

下一场 run 无论题目，观察者按此单记（每条落 run bundle 侧笔记或交付记录，卡只收结论）：

1. **痛点频次**：每次想逐个开队员会话看动作记一笔——时机 + 想看什么（检索词 / 取证文件 / 失败重试）；
2. **粒度需求**：`ui-agent-team` 任务板在哪几次不够用、缺的动作粒度是什么级（检索级 / 读文件级 / 出错级）；
3. **UI 直觉**：混排活动流 vs 每人折叠区的倾向**只记不定案**（定案在方案节，等素材齐）。

## 实施记录（2026-10-10）

- 验收 #1 **通过**：`tests/run/member-activity-fold.test.mjs` 5/5（红→绿：模块未建红 → 实现绿；事件形状 = 归档 journal 实证——web_search 参数 `queries` 数组、web_fetch 参数 `url`、失败 result `isError:true` + "Error: " 前缀）。
- 验收 #2 **通过**：`client-load-smoke` **ALL PASS**——新增两处无团队负例断言（绑定会话遍 + 未绑定会话遍）；正例断言（盘侧 spawn 名 ↔ 投影 roster 对账）已编码，当前绑定会话（cn-moe 停滞 lead，未组队）走负例分支——断言届时随真实团队自动生效。
- 验收 #3 **待首验**：投影不进 journal（实测 token-factory lead journal grep `agentTeam` = 0——投影走宿主控制流，会话日志无此事件），keyless 回放道不可造正例；首验 = 下一场真实 run（client-load-smoke 的 spawn 对账断言自动咬合）。
- 验收 #4 **通过**：design/40（构成表 + 折算层六件 + ⑦ 区描述 + 已知边界重写含分工句）+ pack README 限制行更新；`pnpm verify` 全绿（staged 后）、`pnpm test` 332/332（含新增 5）。
- 接线：`src/client/ResearchStatusTab.tsx` ⑦ 区（roster = 标准注入的 `useProjection('agentTeam')`——队员 id 唯一发现源；多路 follow 每队员一条，AbortController 统一回收）+ `src/lib/member-activity.ts` 折算 + pack devDep `@deepseek-ai/dsh-experimental-agent-team`（类型链，非 bundle 行——row-deps 不涉）；构建绿（tsc + tsdown client 50KB）。
- 顺带修（同 diff）：**client-load-smoke 深列表脆弱性**——dev home 累积 250+ 会话把目标埋 8 层 "Show N more sessions"，单次展开够不着（实测复现 + CDP 探针独立证实非 Playwright actionability 问题）→ clickRowByText 改循环展开（60 轮上限，至目标在场/按钮消失）；修复后冒烟 ALL PASS 复归。诊断脚本住 runtime/（gitignored 一次性）。
- 通道材料遗留 #1（队员 journal 真实形状）由归档挖掘闭环（见 §需求侧定夺）；遗留 #2（N 流稳定性）的最薄证据 = 首验时多路 follow 同开（gateway 无上限，源码级 + 单 lead 双流既有实证）。

## 实施记录（2026-10-11 · 首验轮——真实 run `drt_mcp-security-landscape`）

首验载体 = 低把握题目真实 run（MCP 服务器生态安全面盘点 2025–2026，四编制：scout + analyst×2 + critic 后置；run 已交付归档 `archive/drt_mcp-security-landscape`）。**验收 #3 通过**；首验本身抓出一窝真缺陷并当场修复：

- **⑦ 区核心缺陷（已修）**：队员会话 origin = subagent，多路 follow 用纯 sessionId 形态被 host 守卫全拒（`session/agent-busy "subagent Sessions require their durable parent address"`——三条队员流全灭）。修复 = follow 目标扩为 `FollowTarget`（普通 id ∪ 持久父地址 `{kind:'subagent', parentSessionId, childSessionId, mode:'unknown'}`，官方 ui-session `sessionAddress()` 同款；mode 'unknown' 跳过形态对账）。通道材料"任意会话可 follow"对 subagent 会话**不成立**——实证修正记录见 [Note](../../../notes/implemented/2026-10-11-member-activity-first-validation.md)，材料按纪律归档不回改。
- **smoke 正例环境缺口（已修）**：client-load-smoke 自起 web 只带 client 面（ui-agent-team），无 agent-team host 行（A 定案：组合归 run 通道 profile 层）→ 投影恒缺、正例断言永不咬合。修复 = smoke 运行时生成"overlay + agent-team host 行"合并补丁再 boot（行内容镜像 vendor agent-team-profile 层 rc.2 config；实证：新 host 从盘上持久状态重算 roster 全量在场）。
- **断言三处修复**：① 证据计数/交付态/停靠点期望改**断言时刻现扫**（journal 重读 + 文件现扫）+ 跨 30s 刷新周期复核——首验红"UI 4 份 vs 快照 2 份" = boot 前快照对在飞 run 的时点竞态；② 轨道 current 计数收窄到七步名——⑦ 区队员 phase 圆点（"● scout-security"）同用"● "前缀，裸 `startsWith` 假红（● ×5）；③ 复核环加 **reload 再水化**——被跟会话在别的 host 上活跃推进时，被动侧日志尾部追平可超 30s。
- **N 流稳定性（通道材料遗留 #2 闭环）**：lead + 4 队员多路 follow 同开，三个 host 实例（run 通道 3083 + 冒烟自起 3109 + 对照测试 3111）各自稳定、console 零错。
- **验收 #3 证据**：client-load-smoke ALL PASS（"队员 roster = 盘侧 spawn 名对账（一个不漏）"正例断言首次咬合：scout-security、analyst-vuln、analyst-spec、critic-review）+ 真通道 CDP 探针 ⑦ 区实证（四人折叠区 + 🔍/🌐/⚠️ 真实计数 + 错误徽标）。
- **顺带发现（独立登记）**：[BUG-020](../fixed_bugs/BUG-020-hitl-answer-provenance-misattribution.md)（hitl-answer 代答 provenance 误归给无关在飞 bundle——字典序 activeBundle 无归属判定，两次误落 drt_cn-moe-2026，已手工迁移修复，代码修复待做）。

## 关闭条件核对（2026-10-11）

- 数据通道选型有 vendor 同 pin 实测依据 ✅（通道探明材料 + 本轮 subagent 守卫实证修正）；
- 最薄切片落地且 client-load-smoke 真浏览器断言全绿 + design/40 同步 ✅（ALL PASS，含首验正例）；
- 与任务板的分工边界写进 design/40 ✅。


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
