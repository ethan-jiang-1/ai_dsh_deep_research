---
status: 已结
opened: 2026-10-12
---

# 推敲：借鉴 loop_advisor 的 backlog 制度显性化（入口两张票、缺陷修复通道、状态生命周期、agent 门牌）

> 立卡：2026-10-12 ｜ 状态：已结（2026-10-12）｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是

**关闭结论（2026-10-12）**：全套一轮落地。借鉴源 = `ai_dsh_loop_advisor/_backlog/`（钉版 `b43be87`，登记 = [00-index §外部研究材料](../../../docs/00-index.md)）。三项用户裁定：① 全套一轮落地（含门禁收紧，acceptance-presence 新族缓）；② 借「修复就绪 = P1/P2 修理型修复自授权」（P0 或修复触及入口链、门禁与验收合同、文档合同、pack 公共行为、已记录决定 → `等人拍板`）；③ 借「结论倾向」闭集头（未定/现在做/以后做/不做/并入已有）。落点：[入口手册](../../README.md)（两张票/缺陷通道/生命周期法则）、[issues](../../issues/README.md)（翻转表+结论倾向）、[bugs](../../bugs/README.md)（frontmatter 模板/修复判据/翻转表）、门牌 [AGENTS.md](../../AGENTS.md)、门禁 [backlog-liveness](../../../scripts/lib/backlog-liveness.mjs)（枚举+镜像互查+倾向头，反证 = gates-smoke 注入案例 + 仓内红→绿实录）；决定登记 = [D24](../../../docs/00-index.md)；三态表（照搬/适配/不借）= [借鉴 Note](../../../notes/implemented/2026-10-12-backlog-process-borrow.md)。

**问题与期望结果：** loop_advisor 仓把自家 backlog 制度显性化（入口票、缺陷修复流程、状态生命周期、agent 门面、门禁收紧），owner 已批准并落地。本仓 `_backlog` 结构同源但多项制度「在做未成文」——借该轮成果把本仓 `_backlog` 的内容调对：入口票一处成文、缺陷修复通道写明谁授权走哪条、双轨状态生命周期成法、规则经子树 AGENTS.md 自动注入到落进本区的 agent。
**当前情况：** 全部落地；`pnpm verify` / `pnpm test` / `gates-smoke` 全绿（实录 = [借鉴 Note](../../../notes/implemented/2026-10-12-backlog-process-borrow.md)）。
**未决问题：** 无。acceptance-presence 检查族（修复就绪缺 `## 修复判据` 不红）按裁定 under-pressure 缓落地，重提条件 = 首张缺验收卡漏过门禁。
**下一步：** 无（卡按关闭律当轮归档）。

## 已知与未决

立卡时点的缺口审计（对照借鉴源的七缺口，逐条在本仓实测）：

| # | 缺口 | 本仓实测 |
|---|---|---|
| 1 | 缺陷修复流程未写（谁授权/走哪/什么算修复确认） | 成立——bugs 只有「修复关联」段；手册「不是实施授权」对延后缺陷卡是字面真空 |
| 2 | bug 模板无验收字段 | 成立——无「修复判据」段；[BUG-021](../fixed_bugs/BUG-021-cdp-probe-ask-send-fail.md) 在正文即兴写关闭条件（同款实测成本） |
| 3 | 模板缺复现段 | 不成立——本仓模板已有 `## 复现` |
| 4 | 入口票没有一处成文 | 成立——issues 侧一句散文 + methods；bugs 侧没有 |
| 5 | 无 agent 门面（规则 pull-only） | 成立——docs/scripts/notes 都有子树 AGENTS.md，唯独 `_backlog` 没有；嵌套 AGENTS.md 在 first-party fs 触碰时自动注入（平台事实） |
| 6 | severity 记了没人消费 | 成立——P0/P1/P2 门禁只查形状，无规则读它 |
| 7 | 状态生命周期零散、bug 侧空心 | 成立——issues 两值无翻转表；bugs 单值「活跃」，且与手册自己的「活跃区」词汇相撞 |
| 8 | （本仓特有）bugs 模板缺 frontmatter 块 | 成立——根手册与门禁都要求 `status`/`severity`/`opened`，模板里没有，新卡只能照归档卡抄 |

## 方案与取舍

**三项裁定**（2026-10-12 用户）：全套一轮落地（含门禁，acceptance-presence 族缓）；修复就绪 = P1/P2 自授权 + 例外上 owner；结论倾向头借入（只作倾向，关门语义仍走本仓关闭表与 D12——不借「do-now 默认同轮落 RFC」）。

**适配要点**：中文枚举（bugs「活跃」改「排查中」，新增 修复就绪/修复落地/等人拍板；立卡时点零活跃 bug 卡，改名零迁移成本）；归档值 已结/叫停/已修/待修 保留，历史归档卡不动（门禁既有豁免）；门禁在既有 backlog-liveness 类内收紧（镜像互查 = 既有类加强，非新族）；门牌走本仓子树 AGENTS.md 惯例（doc-budgets 登记）。

**不借清单**：四门 do-now 默认同轮落 RFC（与 D12 冲突）；英文枚举（本仓人面中文）；状态行 `next:` 字段（「下一步」留在卡体）；`blocked` 状态（平台 goal 机需要自报阻塞，读者消费的卡不需要）；acceptance-presence 门禁族（under-pressure）；id-collision 门禁（同款 promote-on-recurrence 哲学，未到复发门槛）。

## 验收标准

| 面 | 检查方式 | 结果 |
|---|---|---|
| 入口手册含两张票/缺陷通道（含授权例外与回退法则）/生命周期法则 | 人工走查 + md 链接门禁 | 绿（2026-10-12） |
| issues 骨架含结论倾向闭集头 + 翻转表 | 走查 | 绿 |
| bugs 模板含 frontmatter 块 + `## 修复判据` + 翻转表 | 走查 | 绿 |
| 门牌在场且登记预算 | doc-budgets 门禁 | 绿 |
| 门禁枚举/镜像/倾向头拦真回归 | gates-smoke 注入案例（查案例表）+ 仓内红→绿实录（Note） | 绿 |
| 外部借鉴钉版登记 + 决定入账 | 00-index §外部研究材料 + D24 | 绿 |

## 关闭条件

按入口关闭表「有结论」：判断落地 + 同轮全部落点交付 + 用户三项裁定在案（本页「方案与取舍」）——同次变更归档；去向 = [借鉴 Note](../../../notes/implemented/2026-10-12-backlog-process-borrow.md) + [D24](../../../docs/00-index.md)。
