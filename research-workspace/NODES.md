# NODES — 节点 I/O 契约全表（角色开工对照正本）

> 正本地位：本表由推敲卡 2026-09-28-node-io-schema 定稿（2026-09-29 用户逐节点过目）。
> 状态合同（run bundle / session log / goal·任务板 / 观察面的 canonical 与恢复优先级）正本 =
> 仓库 docs/design/50-agent-loop-and-state.md——本表只持节点 I/O；随包部署的种子不带仓内链接，故此处纯文本指路。
> 三要领 = **文件即接口**（节点之间只传 bundle 文件）/ **在场即完成**（输出在场且必备件齐
> = 节点完成）/ **模板即 schema 实例**（字段级契约住 templates/run/，不另造格式清单）。
> 加节点/调节点 = 改本表 + 同步 cockpit 渲染与步序正本（改轨道程序住 pipeline-polish 卡
> 第 7 面）。机械把守两层：**在场级** = `scripts/schema-scan.mjs`（全表输出件在场断言，
> 断代定红）；**判据级** = `scripts/node-gate.mjs`（v2 = 交付两门〔第 7/8 行〕+ leads 交接门
> 〔第 3 行：方向节字段齐 + primary/comparison topic 覆盖，quick_factual 编制豁免，断代
> 2026-10-03〕；其余行按证据逐个升格，防假牙齿——只门机械可查事实，不发明数值打分）。
> 门编号图例：门② = present 声明 · 门③ = §Decisions 拍板行 · 门④ = 版本记账（见回边版本
> 语义节）· 门L = leads 交接门（L = leads）· 门R = 标题重复退化门（final.md 同一标题 ≥4 次
> = 生成退化，2026-10-06 起，出处 = oss-dr 借鉴 A1 / LDR #6452）——编号 = node-gate 实装序，与表行序无关。

## 八节点 I/O 契约表

| 节点 | 输入（读） | 输出（写） | 下游可开工判据 |
|---|---|---|---|
| 立项（HITL1） | 用户三问答案 | question.md（问题定稿 + Purpose + RQ 分解 + Scope/Constraints + HITL1 Snapshot + §Decisions 第 1 条）+ topics.md（T# + must_answer 2–5 问 + scope_role + depends_on） | 两文件在场 |
| 组队 | topics.md | spawn 的队员（无独立文件） | 在场性随立项；lead 按 topics 派工 |
| 侦察 wave0（scout） | topics.md | leads.md（每条：方向 + 状态〔建议挖深/已排除+原因〕+ 支持来源分级 + 关键线索 + 建议 owner 对应 topic） | leads.md 在场 |
| 挖掘 wave1（analyst） | leads.md（建议挖深条）+ topics.md | evidence/*.md（frontmatter 七字段 + 原文摘录 + 解读 + Question List） | 卡片在场 + 硬字段齐（evidence-audit 机械把守） |
| 综合 wave2（synthesis） | evidence/ 全部 + topics.md | findings.md（F# 结论 + 支撑证据 + gap 四态）+ final.md 当前版（run 根；版本记账归 final/） | findings + final 当前版在场 |
| 审查（critic） | findings.md + final 当前版 + evidence/ | review.md（readiness: PASS/FAIL + CRITICAL/MAJOR 清单） | review 在场且 readiness 判完；PASS = HITL2 前置 |
| 交付审阅（HITL2） | review.md + final 当前版 | question.md §Decisions 追加拍板行 | **§Decisions 行在场**（node-gate 门③） |
| 交付 | 拍板分支后果 | final/ 版本记账（vN.md）+ present 声明 + 操作侧 audit.md | **版本记账 + present + 审计 CRITICAL=0**（present = node-gate 门②） |

**输入侧规矩**：硬输入清单 = 上表"输入（读）"列；缺件 = 本节点亮红灯而非开工，下游对缺失
输入只有两个动作——上报 lead 或等，**没有"瞎猜补全"这个选项**。清单检查由脚本做，不加记账仪式。

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

## 两点交互边界

整个 run 只有两个人机交互点（HITL1 立项 / HITL2 交付审阅），都由 lead 以结构化选项卡执行；
critic 审查步内的 FAIL→修复循环保持**静默**（质量拦截非方向问题）。第 7/8 行判据由
node-gate 机械把守；**通道死亡时的操作侧补齐必须显式记账**（§Decisions 拍板行标注"操作侧
代驱/补齐"）——显性化而不是静默，静默缺席 = 门红。
