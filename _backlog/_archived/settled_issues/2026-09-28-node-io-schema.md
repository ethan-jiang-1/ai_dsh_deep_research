# 推敲：节点 I/O schema——上下游的交接约定

> 状态：已毕业·该做（近期）（2026-09-29 用户点名提前并定案：落点 A2〔NODES.md 新文件住契约全表 + 手册一行指针〕+ node-gate 小切口②③〔§Decisions 拍板行门 + present 声明门〕；C 形态同日翻案——分量够，不等第二阶段）｜去向 = 已授权后交付 + [毕业 Note](../../../notes/archived/2026-09-28-node-io-schema.md) + 本卡迁 _done/_closed_plans/

## 背景 / 触发

用户 2026-09-28 点出："每一个 node 都有输入有输出，前面那个输出就是后面那个输入，他们至少得有个约定——这个约定可能叫 schema。定一下，不要搞得太复杂，抓住要领最重要。"动机 = 节点可换可加的前提是接口有约（关联 [2026-09-28-pipeline-polish](2026-09-28-pipeline-polish.md) 第 7 面：拓扑演进）。

## 已知与未决

**schema 的坯子已经存在三处**（定约 = 显式化，不是发明新格式）：

- **模板 = 字段级契约实例**：`research-workspace/templates/run/` 六个模板（question/topics/leads/evidence-entry/findings/final），每个输出文件的必备件写在模板里。
- **手册 = 文件级正本**：[研究手册](../../../research-workspace/AGENTS.md) §目录约定（哪个节点写哪些文件）+ §证据文件契约（硬五字段/口径最小契约）。
- **audit = 交接的机械把守**：evidence-audit 已机械对账 evidence→final 链；run-fold 的**在场性折算**（STEP_ORDER 由文件在场驱动）= "节点完成"判据的机器可读形态——观察面轨道就是消费它。

**2026-09-29 活体验证（定稿同日）**：两场 run（model-ecosystem / cn-us-open-source，均 HITL2 定稿）把表第 7/8 行判据逐条演示——① **第 7 行判据（§Decisions 行在场）在两场上都红**：HITL2 拍板行缺席（cn-us-open-source 更是 present + HITL2 双缺席，G8 第二实例，会话日志全库取证）——交付节点因上游未给齐而无法开工，判据咬人实证；其自然机械化路径 = rerun-loop-live 候选后续③（审计层查版本交付前 ask 在场）。② **第 8 行三件**（final/v1.md + present 声明 + audit CRITICAL=0）在 model-ecosystem 当天全数落位、cn-us-open-source 由操作侧补齐——判据可执行性实测通过。

**草案三要领**（抓住要领）：

1. **文件即接口**——节点之间不传话，只传 bundle 文件；接口 = 文件 + 必备内容件。
2. **在场即完成**——输出文件在场且必备件齐 = 节点完成（不说"我做完了"）；轨道折算已按此运转。
3. **模板即 schema 实例**——字段级契约住模板，不另造一份格式清单（一个事实一个家）。

**八节点 I/O 草案表**：

| 节点 | 输入（读） | 输出（写） | 下游可开工判据 |
|---|---|---|---|
| 立项（HITL1） | 用户三问答案 | question.md（问题定稿 + Purpose + RQ 分解 + Scope/Constraints + HITL1 Snapshot + §Decisions 第 1 条）+ topics.md（T# + must_answer 2–5 问 + scope_role + depends_on） | 两文件在场 |
| 组队 | topics.md | spawn 的队员（无独立文件） | 在场性随立项；lead 按 topics 派工 |
| 侦察 wave0（scout） | topics.md | leads.md（每条：方向 + 状态〔建议挖深/已排除+原因〕+ 支持来源分级 + 关键线索 + 建议 owner 对应 topic） | leads.md 在场 |
| 挖掘 wave1（analyst） | leads.md（建议挖深条）+ topics.md | evidence/*.md（frontmatter：source_url / retrieved_at / quality / found_by / supports(T#) / source_tier / publisher + 原文摘录 + 解读 + Question List） | 卡片在场 + 硬字段齐（audit 机械把守） |
| 综合 wave2（synthesis） | evidence/ 全部 + topics.md | findings.md（F# 结论 + 支撑证据 + gap 四态）+ final/vN.md（TL;DR → 按 topic 论述带〔来源:〕→ 反例 → 缺口 → 来源清单） | findings + final 当前版在场 |
| 审查（critic） | findings.md + final 当前版 + evidence/ | review.md（readiness: PASS/FAIL + CRITICAL/MAJOR 清单） | review 在场且 readiness 判完；PASS = HITL2 前置 |
| 交付审阅（HITL2） | review.md + final 当前版 | question.md §Decisions 追加拍板行 | §Decisions 行在场 |
| 交付 | 拍板分支后果 | final/ 版本文件 + present 声明 + 操作侧 audit.md | 版本文件在场 + present + 审计 CRITICAL=0 |

回边（补研究）：重入挖掘，输入追加"范围锁定"（§Decisions 行），输出 final/ v(n+1)——版本语义见 D17。

**未决**：① 落点（下节取舍）；② leads 覆盖判据要不要量化（每 topic ≥N 条 leads——现在只有"在场"）；③ 硬五字段 vs frontmatter 七字段的口径统一表述；④ 交接判据哪些机械化（现在只有 evidence→final 链被 audit 把守，其余纯"文件在场"）。

## 候选与取舍

- **A. 手册加「节点 I/O 契约」节**：roles 直接照办（model-visible，l4-lite + 通道重启）。输掉点：与模板内容重复（一个事实一个家会被 slop 规则咬）；手册预算 118/120 行顶死，加节必须先压缩或升顶（升顶须登记理由）。
- **B. design/ 新页**（`50-node-schema.md` 类）：人读合同 + 拓扑演进的图纸，roles 不看。便宜、不重复模板（只放映射表 + 判据，字段细节链接模板）。
- **C. 不加新文档**：schema = 模板现状 + 在场性 + audit 的隐式契约，映射表只住本卡备查。最省；输掉点：约定没有显式的家，加节点时无依据可引。
- **当前倾向**：第一阶段走 C（跑通不加仪式，映射表住本卡）；第二阶段拆质量门卡时 A/B 一起判——交接判据机械化 = 质量门的坯子，两事一体。

## 毕业门

- **定稿门**：用户逐节点过目上表（重点 = "下游可开工判据"列是否符合直觉、有没有缺的必备件）→ 表定稿。
- **落地门**：落点 A/B/C 与质量门卡（pipeline-polish 第 6 面）同批判——交接判据机械化到哪，质量门就长在哪。
- **反证**：任一节点的输入在实际 run 里出现过"上游没给齐、下游瞎猜"的实证 → 该节点的判据行升为必修并优先机械化。**（2026-09-29 注：第 7 行判据现已两实例〔G8 + cn-us-open-source 通道死变体〕——"瞎猜"未发生恰因判据在场被人工核到；若候选后续③机械化落地，此行升为机械必修）**
