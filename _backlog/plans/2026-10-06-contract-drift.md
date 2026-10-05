# 推敲：合同漂移——quick_factual 的 Critic 必要性与 final.md/final/ 版本语义

> 状态：推敲中｜毕业门判断 = 待定（两问各有实证材料，待逐问裁决）｜下一步 = 用户点名继续推敲，或打磨轮成熟

## 背景 / 触发

项目可驾驭性走查（[Note](../../notes/implemented/2026-10-05-project-navigability.md)）与其 Phase 1 毕业时两次承诺"既有合同漂移由独立条目处理"——本卡即该欠账的兑现。两处漂移各自独立，可分别出判断。

## 已知与未决

### 问 A：quick_factual 是否必须配 Critic

- **合同现值**：[NODES.md](../../research-workspace/NODES.md) 编制条件性——quick_factual "不设 scout/analyst 常设编制，**critic 可轻量或不配**"；review.md 为条件件（缺席合法当且仅当类型字段在场 + journal 记账补偿把关）。
- **实证材料**：
  - drt_mistral-api-model-list（2026-10-05，quick_factual 数据表档）：**实际配了 critic 且两轮审查有效**（rev1 FAIL 抓出 2 CRITICAL → 修复 → rev2 PASS；r1 推导错误亦被 critic 抓到）——"可轻量或不配"的宽松面未被实践采用；
  - 同场豁免机制全程正确：schema-scan 编制豁免注记不静默、门L N/A 显式——**机制无漂移，漂移在"配不配"的指引面**；
  - drt_mcp-hosts-governance（team 型全编制）：门L PASS + critic 狩猎第 4 线在场——全编制形态无争议。
- **未决**：指引改为"必须配（可轻量）"还是维持"可不配"？判据候选：①critic 在 quick_factual 的捕获率实证（mistral 一场 3 处有效捕获）；②"可不配"路径有没有任何一场实际走过（若零场次，宽松面是未经验证的死条款）。

### 问 B：final.md 与 final/ 的当前版本语义

- **合同现值**：[研究手册](../../research-workspace/AGENTS.md)——run 根 `final.md` = 当前版权威副本（位置钉死，2026-09-26 实测教训）；`final/` 只放版本记账（v1.md 索引 + 扩张版全文），**不放当前版全文**；node-gate 门④ 机械把守（vN 在场 → §Decisions 记账行 + v1 索引登记）。
- **漂移点（走查发现）**：各文档对"当前版在哪、版本怎么记"的表述存在代际不一致的残留（走查原话"final.md 与 final/ 的当前版本语义"）——需要逐文档对账：手册 / NODES / 61 / design/50 / 手册内模板脚注，确认五处口径一致或收敛到单一表述。
- **实证材料**：mcp-hosts 与 mistral 两场均按现行合同走完（final.md run 根 + final/v1.md 记账 + 门④ N/A）——**实践无漂移，漂移在文档表述面**。

## 候选与取舍

- **问 A**：候选一 = 改 NODES 为"critic 必配、形态可轻量"（贴近实践与捕获率实证）；候选二 = 维持"可不配"但补"零场次走过的宽松面"警告注记（保守，等更多 quick_factual 场次）；候选三 = 维持现状（判"无漂移"——mistral 配 critic 只是 lead 的选择而非合同强制）。
- **问 B**：候选一 = 逐文档对账收敛表述（纯文档卫生小修）；候选二 = 判"design/50 落地后表述已收敛，残余仅历史 Note 引用"（不修，仅记）。

## 毕业门

1. **问 A 门**：quick_factual 的 critic 指引有唯一一致表述（NODES + team-assembly skill 同步），且裁决带实证依据（捕获率或场次统计）；
2. **问 B 门**：五处文档口径对账完成——一致或收敛，残留点列出；
3. 两问可分别毕业（A 落 NODES 小修，B 落文档对账），不必捆绑。
