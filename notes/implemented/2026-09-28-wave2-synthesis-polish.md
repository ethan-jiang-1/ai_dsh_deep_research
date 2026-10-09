# wave2 综合打磨——版本记账门④（pipeline-polish 面④）

> 状态：implemented

出处：[pipeline-polish 卡](../../_backlog/_archived/settled_issues/2026-09-28-pipeline-polish.md) 面④（主序
⑤→②→③→④ 第四棒；面⑤②③已毕业 2026-10-03）。

## 决定

1. **node-gate 新增门④（版本记账门）**：final/ 存在 vN（n≥2）→ ① §Decisions 须含提及 vN
   的行（版本落盘须有对应拍板/立项/追认记账——selfhosted-ai-gateway〔v2 立项行 + v2 收工
   行〕/siliconflow-financials〔HITL2' v2 行〕实证形态）；② final/v1.md 索引须登记该版本
   （跨版本索引——手册 final/ 节契约；三场 v2 run 实证：kimi「已被 v2 取代」/selfhosted
   索引表/siliconflow「当前交付版 v2」）；v1.md 缺席 = RED（fail-loud）；无 vN 或 final/
   不在场 = N/A 显式；断代 VERSION_CONTRACT_DATE = 2026-10-03（契约前 PRE-CONTRACT 不计
   红，同门 L 成例）。登记判定跳过 `>` 引用行——模板脚注（rerun 语义规则文本）本身含
   "vN"，朴素 includes 永远误绿（红绿纪律实测抓出）。
2. **NODES.md 回边版本语义节补门④把守表述** + 判据级清单升格（双副本同步 9 文件）。
3. **wave2 写作纪律三件确认为"不改"（证据入卡）**：纯综合先行（journal 多场确认"未出现
   第二轮"）、只补一轮（面③ 4 场确认）、未取得≠没有（面③已落）——均有 owner，无新失败
   实证不动。
4. **本棒零模型可见面改动**（scripts + NODES 契约面 only）。

## 输掉的方案

- **同行 /HITL2.*vN/ 匹配**：过拟合三样本格式（selfhosted 的立项行与收工行分离，均含 v2
  即已记账）——vN 行存在即记账在案，HITL2 全局判据由门③承担；
- **polish 原位机械化**：无 before-state 可比，机械查不出（如实不装）；
- **门④放 schema-scan**：在场级/判据级分层已定，版本记账是判据级（node-gate 领地）。

## 验证

- **先红后绿**：6 个新形态夹具（健康双证齐 / 缺 §Decisions v2 行 / 缺 v1.md 登记 / 仅 v1
  N/A / 断代 / 隔离性）实现前 6 红后全绿；tests 140/0（+7 含门 L 断代补充断言）。
- **活体回验抓出两处门缺陷并当棒修复**：① 模板脚注含 "vN" 导致登记判定朴素 includes 误绿
  → 登记判定改跳 `>` 引用行；② 门 L 的 0 节防空语料早退分支跳过断代（selfhosted/
  siliconflow 自由体 leads.md 实测 RED 而非 PRE-CONTRACT）→ 0 节路径补断代。两处均有
  fixture 断言钉死（"脚注样板不得算登记"、"0 节也走断代"）。
- **真 bundle 回验**：kimi（09-26 契约前，§Decisions 零 v2 记账）= 门④ PRE-CONTRACT 如实
  报告不追溯红；selfhosted/siliconflow = 门④ PASS；空 sessions 根探针的门② RED 为伪影
  （真实会话根回验 PASS）——审计必须用真实会话根。
- **L0**：verify 34 门全绿 + tests 140/0。

## 环境状态（Consequences）

- 门 L/门④ 断代依赖 final.md mtime 推交付日（schema-scan 同源设计）；归档 bundle 的 mtime
  被 post-delivery 操作触碰时会向契约期漂移——run 通道交付时点审计（mtime ≈ 交付日）不受
  影响，历史 bundle 全量重审时以注入日期为准（tests 成例）。
- 门③② 无断代（与 node-gate 同日出生）：审计 09-29 前交付的 bundle 会如实报红——属预期
  行为（kimi 门③② 实测 PASS，无实践冲突）。
- **主序 ⑤→②→③→④ 毕业完毕**；剩余面 = ①（策略对标，并行研究型）、⑥（质量门滚动，随
  run 喂证据）、⑦（拓扑演进程序，收尾文档活——同步面六处清单趁新写最省）。
