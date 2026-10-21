# NODES — 节点 I/O 契约全表（角色开工对照正本）

> 正本地位：本表由推敲卡 2026-09-28-node-io-schema 定稿（2026-09-29 用户逐节点过目）。
> 状态合同（run bundle / session log / goal·任务板 / 观察面的 canonical 与恢复优先级）正本 =
> 仓库 docs/design/50-agent-loop-and-state.md——本表只持节点 I/O；随包部署的种子不带仓内链接，故此处纯文本指路。
> 三要领 = **文件即接口**（节点之间只传 bundle 文件）/ **在场即完成**（输出在场且必备件齐
> = 节点完成）/ **模板即 schema 实例**（字段级契约住 templates/run/，不另造格式清单）。
> 加节点/调节点 = 改本表 + 同步 cockpit 渲染与步序正本（程序 = 开发仓
> `.agents/skills/changing-node-topology/`：六处同步面 + 先想红）。机械把守两层：**在场级** = `scripts/run-gates/schema-scan.mjs`（全表输出件在场断言，
> 断代定红）；**判据级** = `scripts/run-gates/node-gate.mjs`（v2 = 交付两门〔第 7/8 行〕+ leads 交接门
> 〔第 3 行：方向节字段齐 + primary/comparison topic 覆盖，quick_factual 编制豁免，断代
> 2026-10-03〕；其余行按证据逐个升格，防假牙齿——只门机械可查事实，不发明数值打分）。
> 门编号图例：门① = HITL 锚点门（HITL1 选项卡真实在场——BUG-006 落地，契约日 2026-10-05）·
> 门② = present 声明 · 门③ = §Decisions 拍板行 · 门④ = 版本记账（见回边版本
> 语义节）· 门L = leads 交接门（L = leads）· 门R = 标题重复退化门（final.md 同一标题 ≥4 次
> = 生成退化，2026-10-06 起，出处 = oss-dr 借鉴 A1 / LDR #6452）· 门A = 交付完整性门（readiness 非 PASS 时：review.md 有升级/未决项记账 **且** §Decisions 有 HITL2 拍板行——含代理代答 provenance——即按"升级到用户裁决"路径，不判越过前置；见 notes/implemented/2026-10-18-node-gate-judgment-widening.md）
> （第 8 行交付判据下沉：final/ 记账在场 × readiness 非 PASS 交叉断言 + 交付前置达成时
> final/v1.md 记账与**当前 bundle 对应的可解析 audit.md** 在场；摘要与 CRITICAL 节条目数须一致且显式 `CRITICAL=0`；附条件 PASS 显性化为 WARN 注记不机械红——
> 裁决权威在 HITL2 用户；契约日 2026-10-08，出处 = delivery-criteria-mechanization RFC）——
> 编号 = node-gate 实装序，与表行序无关。

## 八节点 I/O 契约表

| 节点 | 输入（读） | 输出（写） | 下游可开工判据 |
|---|---|---|---|
| 立项（HITL1，两段卡） | 用户三问答案 + 计划确认拍板（quick_factual 豁免第二段） | question.md（问题定稿 + Purpose + RQ 分解 + Scope/Constraints + 研究方法节〔本次实际采用〕+ HITL1 Snapshot 含研究方法与计划确认行 + §Decisions 第 1 条含计划确认拍板）+ topics.md（T# + must_answer 2–5 问 + scope_role + depends_on） | 两文件在场 |
| 组队 | topics.md | spawn 的队员 + plan.md（lead 过程件：节点 id/kind/owner_role/deps/output/acceptance/budget/depth/task_id + 重写记录） | 在场性随立项；lead 按 plan.md 的图派工 |
| 侦察 wave0（scout） | topics.md | leads.md（每条：方向 + 状态〔建议挖深/已排除+原因〕+ 支持来源分级 + 检索器〔单一达标「单检索器——待破」〕+ 关键线索 + 建议 owner 对应 topic） | leads.md 在场 |
| 挖掘 wave1（analyst） | leads.md（建议挖深条）+ topics.md | evidence/*.md（frontmatter 七字段 + 原文摘录 + 解读 + Question List） | 卡片在场 + 硬字段齐（evidence-audit 机械把守） |
| 综合 wave2（synthesis） | evidence/ 全部 + topics.md | findings.md（F# 结论 + 支撑证据 + gap 四态）+ final.md 当前版（run 根；版本记账归 final/） | findings + final 当前版在场 |
| 审查（critic） | findings.md + final 当前版 + evidence/ | review.md（readiness: PASS/FAIL + CRITICAL/MAJOR 清单） | review 在场且 readiness 判完；PASS = HITL2 前置 |
| 交付审阅（HITL2） | review.md + final 当前版 | question.md §Decisions 追加拍板行 | **§Decisions 行在场**（node-gate 门③） |
| 交付 | 拍板分支后果 | final/ 版本记账（vN.md）+ present 声明 + 当前 bundle 对应的可解析操作侧 audit.md | **版本记账 + present + 报告摘要与 CRITICAL 节一致且 `CRITICAL=0`**（present = node-gate 门②） |

**输入侧规矩**：硬输入清单 = 上表"输入（读）"列；缺件 = 本节点亮红灯而非开工，下游对缺失
输入只有两个动作——上报 lead 或等，**没有"瞎猜补全"这个选项**。清单检查由脚本做，不加记账仪式。
**plan.md 边界**：`plan.md` 是组队节点的 lead 过程件（执行图 + 重写记录），**不是交付门**——
`schema-scan`/`node-gate` 不检查它；Team 任务板是当前会话的执行镜像，恢复时按 plan 的 `N` 节点
重建任务（`task_id` 只是会话映射）。
**委派-收活同构**（2026-10-06 起，oss-dr 借鉴）：lead 派工的验收判据（team-assembly 派发
五件③④）在收活时逐条机械核验；判不了的判据显式标 **UNVERIFIED**（固定标记词，逐字使用——
机械可检索，与"单源——待破"同款；第三态：不是 PASS 也不是 FAIL，交 critic 狩猎或人工核），
**永不静默放行**——收活结论（哪条 PASS/哪条 UNVERIFIED）随关单/journal 记账。

**编制条件性（quick_factual）**：研究类型 = quick_factual（快速事实核查；HITL1 定、记
question.md）按 team-assembly 矩阵**不设 scout/analyst 常设编制、critic 轻量 ×1**（编制正本 =
team-assembly 矩阵；原「critic 可轻量或不配」分支已撤销——三场 quick_factual 实证全配 critic
且两场共 4 处有效捕获，主编自检不能替代对抗审查；裁决 = 合同漂移卡 2026-10-06）——
节点 2/3 的输出与节点 6 的 `review.md` 为**条件件**：缺席合法当且仅当 ①question.md 研究类型
字段在场 ②journal 显式记账补偿把关（谁承担了核查；异常场兜底回退，常态不触发）。节点 1/4/5/8
输出件全类型必备；schema-scan 按此感知（条件件缺席 → 豁免注记不静默，journal 无记账 → WARN）。

## 回边版本语义（D17）

补研究 = 重入挖掘（最深重入点），输入追加"范围锁定"（§Decisions 行），输出 final/ v(n+1)
——**扩张 +1**；修订表述 = 原位改 final.md 当前版，**不回节点、版本号不变**；结构性重构 =
另起新 bundle。HITL1 永不重开。机械把守 = node-gate 门④（版本记账门，2026-10-03 起）：
final/vN（n≥2）在场 → §Decisions 须含 vN 行 + final/v1.md 索引须登记该版本（断代同门 L，
契约前 PRE-CONTRACT 不计红）。

## 回边超界处置（2026-10-06 起，oss-dr 借鉴 A2）

回边的"上限 + 超界处置 + 降级记录"显式化——超界处置三选项 = 打回/放行/报错升级，本仓选
**报错升级**（fail-loud 同向；gpt-researcher 超界 fail-open 强 accept 是反面参照）：

- **审查回边（critic FAIL → 修复 → 复审）**：复审上限 **3 轮**（首次审查 + ≤3 复审；2026-10-06
  存量标定：真实修复循环最坏四轮收敛〔cn-agentic-parity，FAIL×3→PASS〕，dsh-release-watch
  五轮争议形态恰属"人跑一条 bash 即可终裁"的形态——超界升级正是解法）。超界处置 = 停止
  循环，未决 CRITICAL/MAJOR 清单**原样升级 HITL2 人工裁决**（阶段边界请人——宪章一致；
  不静默放行、不静默丢弃）；每轮修复动作与复审结论记 journal（超界/降级显性化）。轮内
  静默纪律不变（质量拦截非方向问题），超界升级不是汇报、是红灯上移；
- **补研究重入（HITL2 扩张）**：不设机械上限——每次重入由用户拍板触发（门③），**上限住
  用户不在机制**；无拍板行的重入 = 门④红（既有机械把守）；
- **gap 定向补搜**：只补一轮（skill 纪律既有，不变）。

机械把守边界：复审轮数不立机械门（journal 轮次记账是散文事实，机械判会产生会漂移的假
牙齿）——上限靠 skill 纪律 + 超界升级的人工可见性把守。

## 两点交互边界

整个 run 只有两个人机交互点（HITL1 立项 / HITL2 交付审阅），都由 lead 以结构化选项卡执行；
HITL1 为**两段卡**（三问 + 计划确认卡——quick_factual 豁免第二段，正本 = 研究手册 §交互纪律）；
critic 审查步内的 FAIL→修复循环保持**静默**（质量拦截非方向问题）。第 7/8 行判据由
node-gate 机械把守；**通道死亡时的操作侧补齐必须显式记账**（§Decisions 拍板行标注"操作侧
代驱/补齐"）——显性化而不是静默，静默缺席 = 门红。审查回边超界（复审 >3 轮，即超出上限
3 轮）升级走的就是 HITL2 既有交互点，不新增交互面。
