# 马拉松二号复盘：证据可靠性 + 研究交互 + 观察面补全（2026-09-25）

> 状态：implemented
> 归档：2026-09-27

归宿：goal「静默自主长程马拉松二号」复盘；三个队列条目各自毕业 Note 在案
（[evidence-reliability](2026-09-25-evidence-reliability.md) · [research-interaction](2026-09-25-research-interaction.md) ·
[observability-completion](2026-09-25-observability-completion.md)）——本 Note 只做马拉松级汇总。

## 决定

8 小时静默自主按队列次序执行条目 1→3（4/5 需用户触发，搁置池不动）。**三件全部毕业**
（条目 3 部分交付如实记档），全程 pre-commit 绿、7 个提交（含两次被格式门禁拦下修正再提）。

## 交付与证据总表

| 条目 | 交付 | 关键证据 |
|---|---|---|
| 1 证据可靠性面 | 七字段契约 + 交叉验证纪律 + **evidence-audit 机械对账** | 8/8 keyless tests；基线审计：首场 run **102/102 URL 全溯源无伪造**、final 链 94/94、31 份全无 frontmatter 如实揭出 |
| 2 研究交互设计 | HITL1/2 结构化选项卡 + 研究语义工具卡 | **HITL1 卡片真模型 PASS**（一次三问 + 全 options + 推荐位齐）；L4-lite ALL PASS；client-load-smoke ALL PASS |
| 3 观察面补全 | run-fold.ts 共享折算 + 页签渐进面骨架 | 6/6 单测（含首场 run 期望值）；smoke 8/8；**部分交付**：真数据上屏待数据面发现（如实记档） |

## 用户点名两问的落地对应

- **"信息源对不对"** → L1 信源分级（source_tier 四级 + 域名，契约六副本）；
- **"交叉验证 + 一路留 evidence + 谁知道是不是幻觉"** → L2 交叉验证纪律（≥2 独立信源、
  独立性=不同注册域非转载链、单源显性标注）+ L3 机械对账（声称 URL 必须在会话日志工具
  事件真实出现过、摘录可回溯、final 链完整 → bundle audit.md）。

**基线审计的诚实结论**：首场 run 的**链接真实性**通过（102/102——模型没伪造链接，好消息）；
但**格式契约**完全没被执行（31 份证据全无 frontmatter——run 期间的 analyst 没按手册写）。
下一场 run（研究类型覆盖）是新契约的首个真实执行场。

## 本轮实证的机制事实（记档防复犯）

- ask_user_question 全参数契约：questions 数组一次多问；推荐项 = **首选项 + label 尾
  "(Recommended)"**——persona 指令用全角（Recommended），验证正则须宽匹配 [（(]Recommended[)）]；
- toolview 槽三要点：**一键一 inject**（rc.2 旧写法不生效）+ **priority -1** 压通用行
  （同键同优先级 throw）+ 展示模型 = call/result 切片纯函数；PreparingToolCall 无 argsRaw
  须收窄后读；
- TS noUncheckedIndexedAccess：Record<string,string> 索引返回 string|undefined——常量
  映射用字面量对象推断（实测 STEP_LABELS）。

## 真模型花销

L4-lite ×2（条目 2 首跑 + 收尾）、HITL1 卡片实测 ×4（三轮迭代 + 终验）、hitl-smoke 未跑
（条目 2 的 HITL 验证由卡片实测覆盖）——合计 ≈6 个模型回合，单消息级。

## 残留风险与未完成（如实）

- **观察面真数据上屏**：步骤条/矩阵的渲染骨架与折算正本落地（单测含首场 run 期望值），
  但页签上的实时数据因 workspaceFiles bundle 目录发现未接通而留空——毕业 Note 已记
  复活路径；
- **HITL2 选项卡的真模型实测**：persona 已塑形（结构化选项 + 推荐位），HITL1 已实测 PASS；
  HITL2 的实测归下一场 run（真人档收口一并）；
- 工具卡只做 2 张（spawn/web_search——RFC 范围内 ≥2 达标；task 卡留后续）；
- 搁置池五条原样未动。

## 输掉的方案（马拉松级）

- **七字段全硬谓词**：否决——会判旧 run 全部证据无效，历史不回填（分层：硬五定有效性、
  软二标未分级）；
- **自建审批/问询面板**：否决——user-questions 面板与问题卡是现成的（plugins not loop
  changes）；
- **实时重访 URL 比对**：押后——日志在场的原始结果 + 交叉验证已兜住首版（真网络面慢且
  改版误伤）。
