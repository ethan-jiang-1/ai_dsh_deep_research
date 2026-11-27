# AGENTS.md — 文档标准（本仓 `docs/` 子树）

本文件拥有 `docs/` 的**文档标准**：层级归属、写作规则、UTF-8 字节预算处置序与 slop 清单。
它只约束**人读文档**；Agent Note 的格式由 [notes/AGENTS.md](../notes/AGENTS.md) 拥有。
上游对应物 = DSH `docs/AGENTS.md`（`vendor/dsh/docs/AGENTS.md`，机制权威）。

## 层级归属（一个事实一个家，最大深度 2 层，零数字前缀）

| 层 | 拥有 | 不属于这层 |
|---|---|---|
| 根 [AGENTS.md](../AGENTS.md) | 每轮常驻指令（1 跳直链架构/枢纽/包 AGENTS/验证/启动，每条 1–3 行） | 教程、历史故事、情境化长流程 |
| 子树 `AGENTS.md`（本文件、`checks/`、`packages/*`、`notes/`、`tests/`、`_backlog`） | 只属于该子树的指令 | 根已承载的仓级规则 |
| 顶层 6 锚点（`README` / `AGENTS` / `architecture` / `decisions` / `testing` / `policy`） | 全局导航、写作标准、总架构、纯路由 D 账、验证宪法、治理与维护面合同 | 变更史、具体模块清单、大张手抄注册表 |
| `docs/contracts/` | 系统与领域**现行合同**（为什么这样组成、不变量、边界；每篇顶部统一带 `> **读法**：...`） | 操作教程、决策演变史、当前 API 逐字段手抄表 |
| `docs/guides/` | 任务型操作手册（怎么启动/开发/跑 run/写插件/写探针） | 架构设计理由（→ `notes/implemented/`）、全局治理规则（→ `policy.md`） |
| `docs/reference/` | 纯查表字典（`commands` / `glossary` / `discipline-matrix` / `external`）与自动生成真相源（`*.generated.md`、`alignment-ledger.json`） | 手写维护的可扫描清单（能从盘面生成的必须进生成器） |
| `notes/` | 为什么这样决定、放弃了什么、跑了什么验证（`docs/` 可依赖它，禁链 `_backlog/_archived/` 或具体方法，只链 `_backlog/triggers.md` 与池入口） | 当前合同（→ `docs/`） |
| 运行区（`research-workspace/`、`runtime/`） | 这次实际发生了什么 | 可复现的回归证据（→ `tests/`） |

高层文档只描述自己的主题与**直接子项**的职责；更低层的细节链接到拥有它的下层文档。子目录不建冗余 `README.md`，[docs/README.md](./README.md) 是整个 `docs/` 树的唯一双向清单。

## 写作规则

- **写当前状态，不写变更史**：说"现在是什么"，不说"之前是 / 现在改成 / 不再用"；历史归 commit 与 `notes/`。
- **链接只用相对 Markdown 路径**（`md-links` 门禁）且**锚点必须真实存在**（`md-anchors` 门禁）——不用裸文件名或已退役的数字编号。
- **禁段落墙（No Paragraph Walls）**：每段只承载一条规则或命题，严禁把多条规则、长括号旁白或千字文本塞进单行（正文段落单行保持简短，避免 >350 字压缩墙）。
- **编号词汇引入前先消歧**：同一前缀被两套词汇使用时，须分离前缀（先例：[D27](./decisions.md#d27) 的 `S0–S3` vs `L0–L4`；`MS1–MS3` 里程碑 vs `M1–M3` 运行形态）；新编号词汇进 [reference/glossary.md](./reference/glossary.md) 登记。
- **生成物严禁手改**：`docs/reference/*.generated.md` 由 `pnpm docs:gen` 确定性产出并受 `pnpm verify` 守护新鲜度；禁止手写维护 60 KB 级注册表或门禁台账。
- **强调要省着用**：粗体/大写满篇 = 没有重点；只强调改变行为的那一句。
- **已知限制与延后工作**用固定节名 `## 已知限制与延后工作`（与上游 `## Known Limitations and Deferred Work` 同构）——普通待办留在 TODO 或 Note，不进这里。
- **状态注记（"已实现！/未来：…"）不写进文档**：状态会腐烂，布局与门禁台账承载它。

## 预算与处置序（UTF-8 字节预算）

常驻文档的 **UTF-8 字节上限**由 [checks/doc-budgets.json](../checks/doc-budgets.json) 拥有（对上游 `vendor/dsh` 词数预算的忠实中文等价；弃用物理行数预算以免逼出单行塞字），门禁 `doc-budgets` 强制（超限或缺登记即红）。每个受预算文档留 ≥5% 余量。红了按序处置：

1. **下放**（把内容移到拥有它的层，原地留一行链接）；
2. **压缩**（留在这里但可以更短，同时不压成单行墙）；
3. **升顶**（确实需要空间时改 manifest，并在同一变更登记理由——**上限过低是预算 bug**）。

预算只防常驻入口膨胀；`docs/contracts/`、`docs/guides/` 与 `docs/reference/` 属生长面，不进 `doc-budgets.json`，靠审查与自动生成控制体积。

**产品模型可见面是另一本账**：`content/manual.md` 与 persona 的常驻成本由 [`checks/lib/repo/content-budget.mjs`](../checks/lib/repo/content-budget.mjs) 拥有，`content-disclosure` + `content-shape` 把守；两本账不互抵。

## slop 清单（写或审任何文档时逐条扫）

- 同一条规则出现在两个 home（grep 一个特征短语，保留一个，其余改链接）；
- 历史叙事：`之前/现在/不再/曾经/改名/移动`、PR 号、commit 号；
- 实现状态注记（"已实现！"、"未来：…"）；
- 手抄的清单/目录（源码或 `*.generated.md` 才是权威时）；
- 推理过程转述（实现步骤叙事、显然分支的证明、测试走读、被否掉的局部备选）；
- 段落墙（单行 >350 字塞多条规则 + 括号旁白）；
- 强调通胀（满篇粗体 = 没有重点）；
- implemented Note 里的规格腔（"应该"、迁移计划、验收清单）——已交付的 Note 只写"是什么"。

**单页自足性终检**（DSH `dsh-trim-cot-leakage` 同构）：一个**只有 HEAD**、拿不到会话记录/PR 讨论/未提交草稿/变更史的读者，能否解析本页的**每一个引用**并**核实每一条主张**？答不上来即 CoT 泄漏——补足页内事实或改指 HEAD 内真实载体，不允许指向"当时说过的话"。

## 分类与写作顺序（vendor docs/AGENTS.md 吸纳）

每份在范围内的文档先**分类**，再动笔：

- **tutorial**：沿一条有序路径到某个结果，只引入该步需要的东西；
- **reference**：定义一个查询范围与当前行为，不按教学顺序展开。

两类内容分量都大时分开写；某一类很小时在页内标注该节属于哪类。写 tutorial 前先判定读者起点与概念层级，**前置先于依赖概念、难度渐进**，把非必要的进阶材料移到后续 tutorial 或 reference。

作者顺序固定：**定位文档在树中的位置 → 定它允许的详略 → 选 tutorial/reference →（tutorial）按前置与难度排序概念 → 把下级拥有的细节下放 → 用链接替换低层解释**。

**配方页的新鲜度契约**：`guides/` 里以范本（preset 目录、模板、脚本）为准的清单必须与真实范本对齐；范本漂移先回改本页，不让清单烂在文档里。本仓与上游文档标准的逐条差异登记在 [reference/discipline-matrix.md](./reference/discipline-matrix.md) 源 3。
