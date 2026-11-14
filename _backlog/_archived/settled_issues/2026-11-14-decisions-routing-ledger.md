---
status: 已结
opened: 2026-11-14
---

# 已结：决策台账纯路由化与三层归属收口（一处事实一个家）

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 — D55 补强轮已使 `docs/decisions.md` 越过 32KB 硬顶（33,229 B > 32,768 B），吸收跨仓对比建议并补齐本仓冻结层、第 3 列溢出与判据守卫缺口后一次收口 ｜ 可关闭：是
> 去向：implemented — [2026-11-14-decisions-routing-ledger](../../../notes/implemented/2026-11-14-decisions-routing-ledger.md)；业务验收：用户

**问题与期望结果：** 本仓已有完整的三层载体基础（`docs/` 当前合同 + [docs/decisions.md](../../../docs/decisions.md) 顶层锚点双表 + `notes/` 生命周期记忆），但 `decisions.md` 长期维持「单格 `≤ 800` 字浓缩正文 + 依据列贴原话/散文」的过渡形态，导致同一事实在合同、台账、Note 三处重复交税。盘上 `HEAD` 已达 `32,729 B`（距 `32,768 B` 硬顶仅余 `39 B`），D55 补强写入后达 `33,229 B` 并当场触发 [decisions-now.test.mjs](../../../tests/checks/decisions-now.test.mjs) 红灯。期望在不破坏全仓 `#d1`–`#d55` 锚点引用与冻结层只读铁律的前提下，将 `decisions.md` 收口为与姊妹仓对齐的 **纯路由台账**（全文收敛至 `≤ 8 KB`、硬顶棘轮下调至 `12 KB`），做到「合同管 What、台账管 Where、Note 管 Why」，同时消除 [triggers.md](../../triggers.md) 中两条台账历史技术债。
**当前情况：** 已结合本仓门禁、预算清单与全量 55 条 D 号逐行核查 `ai_dsh_company` 跨仓对比建议书（`2026-11-14-project-b-deep-research-decisions-proposal.md`），识别并修正原建议未覆盖的 4 处本仓约束（无文件链接实为 11 行 + 仅冻结链接 7 行、`notes/archived/` 冻结禁改与 `archived-note-pointer` 联动、第 3 列散文溢出与旧指令冲突、`decisions-now` 列解析与上界硬编码 `54` 漏检）。
**未决问题：** 无技术阻塞；新立 `D56` 记录「决策台账纯路由化」制度边界（推荐默认，与 `D53–D55` 宪法锚点同级），待用户确认授权后即可按分片推进。
**下一步：** 无——已按 S1 → S4 落地，毕业 Note 已写。

---

## 一、跨仓建议消化账（采纳什么 vs 本仓修正什么）

| 议题 | 跨仓建议原方案 | 本仓核查事实与消化修正 |
|---|---|---|
| **1. 体积触顶诊断与三层模型** | 估测 `29.4 KB` 逼近 `32 KB`；建立「第 1 层现在时合同 / 第 2 层纯路由台账 / 第 3 层 Note 理由」并保留顶层 `decisions.md`、`#dN` 锚点与 `## 已定` / `## 已退役` 双表 | **全盘采纳，且紧迫度更高**：`HEAD` 实为 `32,729 B`，工作区 D55 写入后已达 `33,229 B` 直接撞红 `32KB` 门；顺带移除 `## 已定` 表头 `0.3.4` 临时安装横幅，解除 [release-copies.test.mjs](../../../tests/checks/release-copies.test.mjs) 在台账上的版本同步税 |
| **2. 缺链接行盘点与「活家」要求** | 点名 `D32/33/34/36/37/47` 共 6 行无 Markdown 链接，要求每行第 3 列至少 1 个仓内文件链接 | **加严并纠偏**：全量实测第 3 列零仓内文件链接的共有 **11 行**（`D6, D7, D8, D15「同上」, D27, D32, D33, D34, D36, D37, D47`），其中 `D32/33/34/36` 已有活跃 Note [2026-10-28-data-plane-hardening](../../../notes/implemented/2026-10-28-data-plane-hardening.md)、`D47` 已有 [2026-11-11-worker-profiles](../../../notes/implemented/2026-11-11-worker-profiles.md)（`D50`、`D52` 亦漏链活跃 Note [2026-11-12-project-research-defaults](../../../notes/implemented/2026-11-12-project-research-defaults.md) 与 [2026-11-13-workflow-substance-gates](../../../notes/implemented/2026-11-13-workflow-substance-gates.md)）；另有 **7 行**（`D14, D21, D22, D23, D28, D50, D52`）第 3 列**只链向归档层**而未指向现行活合同。修正为：**`## 已定` 每行第 3 列必须至少含 1 个非归档活载体链接**（`docs/`、`packages/`、`scripts/`、`_dist/` 或 `notes/implemented|rejected/`） |
| **3. 独有事实下放与冻结层铁律** | 将台账格中未进合同/Note 的细节（如 `D27` 输掉的方案）补进对应 Note 或 `docs/design/` | **补齐冻结层禁改 +「各回本领域真家、禁杂物筐 Note」约束**：本仓 `D4, D9, D14, D17, D18, D21, D22, D23, D24` 指向 `notes/archived/*.md`（且核实 `D27` 否决 `A0–A3`/`P0–P3` 的负知识早已存在于其领域 Note `notes/archived/2026-10-21-six-dim-hygiene-round.md` 第 26 行），冻结件按 [notes/README](../../../notes/README.md) **严禁追改正文**。修正为：① 现行参数/行为细节只补进**本领域** `docs/` 活合同或同机制活跃 `notes/implemented/`（如 `D33` 整数版本严判与忽略残留 `contract` 补齐至 [50-agent-loop-and-state](../../../docs/design/50-agent-loop-and-state.md) 与 `data-plane-hardening` Note，`D6` 归 [evaluation.md](../../../docs/evaluation.md)，`D8` 归 [CONTRIBUTING.md](../../../CONTRIBUTING.md) 与 [guides/60](../../../docs/guides/60-dev-loop.md)）；② 已有冻结领域 Note 的（如 `D27 → 2026-10-21-six-dim-hygiene-round.md`）直接补链并在 [archived-note-pointers.json](../../../scripts/archived-note-pointers.json) 登记历史指针，**严禁把无关领域理由塞进本次迁移毕业 Note 充当杂物筐**（保持机制名检索直达真家） |
| **4. 第 3 列散文溢出与旧指令冲突** | 只将第 2 列（`决定`）从 `800` 字收紧至 `100` 字 | **堵住第 3 列挤气球漏洞 + 清理旧指令**：[AGENTS.md](../../../AGENTS.md) 第 55 行与 [notes/README.md](../../../notes/README.md) §立项来历 残留「用户定调只进 decisions.md D 号依据列」旧口径，导致多行第 3 列堆砌 `220–260` 字散文。修正为：① 按**可见文本长度**计量（剥除 `<a id="dN"></a>` 与 Markdown 链接 `(url)` 路径本身，避免长相对路径惩罚合规链接）；② 同时约束**第 2 列可见字符 `≤ 100` 字**与**第 3 列可见字符 `≤ 120` 字**；③ 在不破 [doc-budgets.json](../../../scripts/doc-budgets.json) 行数预算（`AGENTS.md` 140/140、`notes/AGENTS.md` 53/54、`docs/AGENTS.md` 83/85）的前提下原地更新口径：新定调理由归 Note/合同，台账只做路由 |
| **5. 路由守卫与 D53/D54 断言解绑** | 迁移 `D53/D54` 单元格关键词断言至权威文档；体积硬顶 `32KB → 12KB` | **采纳并修复既有解析漏检**：原测试用裸 `split(' \| ')` 切列且连续性循环硬编码 `n <= 54`（漏检 `D55`）；升级为感知 `\\|` 转义的严格三列 GFM 解析器，动态校验 `D1..D<max>`（`max >= 55`）唯一连续；`D53/D54` 细词断言迁往 [guides/67](../../../docs/guides/67-test-strategy.md) 与 [tests/AGENTS.md](../../../tests/AGENTS.md)，路由测试只验锚点、字数、活家链接与总字节 `≤ 12 KB` |

---

## 二、方案与取舍

| 决策点 | 采纳方案 | 否决备选 | 取舍依据 |
|---|---|---|---|
| **单格字数计量口径** | 剥除行首 `<a id="dN"></a>`、Markdown 链接目标 `(target)` 与行内强调符号壳后按纯可见字符计长：第 2 列 `≤ 100` 字、第 3 列 `≤ 120` 字 | 按原始 Markdown 源码字节/字符计长；或只限第 2 列不管第 3 列 | `_backlog/_archived/settled_issues/...` 单条相对路径即达 80+ 字符，按源码计长会逼作者少挂链接；不管第 3 列则会让散文从第 2 列搬家到第 3 列 |
| **「决定的家」可解析强度** | `## 已定` 每行第 3 列至少含 1 个盘上存在且被 git 跟踪的**非归档活文件**链接（排除 `notes/archived/` 与 `_backlog/_archived/` 孤本，允许其作为附加历史出处并存）；`## 已退役` 每行第 3 列至少含 1 个真实文件链接 + 取代者 `#dN` 链接 | 任意相对链接（含仅指向 `notes/archived/` 或纯 `#dN` 自指）即放行 | 现行有效决定若只链向冻结历史快照，读者跳过去读到的是旧阶段快照而非当前合同（违背第 1 层 What 定位） |
| **无活跃 Note 条目的独有理由安置** | 各回本领域真家：现行合同事实补入对应 `docs/` 活合同（如 `D6 → evaluation.md`、`D8 → CONTRIBUTING.md + guides/60`）；既有冻结领域 Note（如 `D27 → 2026-10-21-six-dim-hygiene-round.md`）补链并登记 `archived-note-pointers.json`；本次毕业 Note **只记录 `D56` 台账路由化本身**，绝不充当跨领域杂物筐，绝不改写 `notes/archived/` 与 `_backlog/_archived/` | 把零散领域理由统一塞进 `decisions-routing-ledger` Note；或伪造历史日期建新 Note；或改写冻结件 | 塞进台账迁移 Note 会让未来按机制名检索彻底失灵（短视妥协）；伪造日期违背 `note-tree` 纪律，改冻结件违背归档不可变铁律 |
| **是否登记 `D56`** | 新增 `D56`（一句话锁定「决策台账纯路由化：三层一处事实一个家，`decisions.md` 只存 `≤100` 字定性结论与活家路由，参数与理由分归合同与 Note」） | 不立 D 号，仅改测试与文档说明 | 与 `D13`（只写 now）、`D27`（编号消歧）、`D53–D55`（测试制度宪法锚点）同级，立号后全仓规则引用只需 `[D56]` 一跳 |

---

## 判据形状

| 判据对象 | Authority（权威结构化事实） | Readers（读取方与决定） | Bad inputs（缺 / 非法 / 互斥） | Legacy exit（旧形态退出条件） | Proof（变异矩阵 / 反证位置） |
|---|---|---|---|---|---|
| **1. `docs/decisions.md` 纯路由结构与体积契约** | `docs/decisions.md` 的 `## 已定` / `## 已退役` GFM 三列表格行（行首 `<a id="dN"></a>D<N>`、第 2 列定性结论、第 3 列 Markdown 相对链接集）及 UTF-8 总字节数 | `tests/checks/decisions-now.test.mjs`、`scripts/verify/gates/a-docs.mjs`（`md-links` / `md-anchors` / `doc-drefs` / `archived-note-pointer`） | 缺节 / 表内空行 / 列数 ≠ 3 → 红；`D1..D<max>` 缺号或重号 → 红；第 2 列可见字符 `> 100` 或第 3 列可见字符 `> 120` → 红；含日期化修订史或退役措辞混入已定表 → 红；`## 已定` 行第 3 列零非归档活文件链接、或链接盘上缺席 → 红；全文 `> 12288` bytes（12 KB）→ 红 | 删除 `800` 字宽限、`32 KB` 旧硬顶、`n <= 54` 硬编码上界及表头 `0.3.4` 临时状态横幅，零历史豁免 | `tests/checks/decisions-now.test.mjs`（导出纯校验函数并覆盖超长行、纯散文无链接、仅归档链接、断号/重号、列数畸形、超 12KB 六类变异负例） |
| **2. D53 / D54 / D55 宪法条款正本守卫** | [docs/guides/67-test-strategy.md](../../../docs/guides/67-test-strategy.md)、[tests/AGENTS.md](../../../tests/AGENTS.md) 及对应 `notes/implemented/` 正本中的核心契约定义 + `decisions.md` 对应行的路由链接 | `tests/checks/decisions-now.test.mjs`（路由存在性与落点绑定）+ 合同检查测试 | `decisions.md` 缺 `D53/D54/D55` 或未链向 `guides/67` / `tests/AGENTS.md` / 对应 Note → 红；权威合同页丢失四车道后缀或「三环/四账/五关/失败类/最低可见层」核心条款 → 红 | 移除对 `decisions.md` 单元格正文的制度细词枚举断言，解除路由表充当合同正文的反向绑架 | `tests/checks/decisions-now.test.mjs`（删路由链接 → 红；删 `guides/67` 核心条款 → 红） |

方法 = [设计判据](../../methods/judgment-design.md)。

---

## 分片

- **S1 · 独有事实核对与下放安置（零信息丢失前置）**
  - 逐行对账 `D1–D55` 当前单元格与目标合同/Note：将尚未落入活合同/活跃 Note 的有效边界补齐至正本（重点：`D3` 部署层预授权偏离确认在 [10-architecture](../../../docs/design/10-architecture.md) §3、`D9` 超时语义确认在 `10-architecture` §4、`D33` 整数 schema 严判与残留 `contract` 忽略规则补入 [50-agent-loop-and-state](../../../docs/design/50-agent-loop-and-state.md) 与 [2026-10-28-data-plane-hardening](../../../notes/implemented/2026-10-28-data-plane-hardening.md)、`D37` 工具面确认在 [20-roles](../../../docs/design/20-roles.md) / [40-research-cockpit](../../../docs/design/40-research-cockpit.md)）；
  - 确认所有领域理由与负知识均已落在本领域真家（如 `D27 → notes/archived/2026-10-21-six-dim-hygiene-round.md`、`D6 → evaluation.md`、`D8 → CONTRIBUTING.md + guides/60`），不把本次迁移 Note 当杂物筐，且零修改 `notes/archived/` 与 `_backlog/_archived/`。
- **S2 · 先立红灯：升级 `decisions-now.test.mjs` 纯路由契约与变异单测**
  - 抽取可单测的纯判定函数（严格三列解析、可见字数计量、活文件家解析、连续编号 `1..max`、总字节 `≤ 12 KB`），补齐六类坏输入变异矩阵（先在旧 33KB `decisions.md` 上跑出明确红灯）；
  - 将 `D53/D54` 细词枚举断言迁移至 `guides/67` / `tests/AGENTS.md` 正本校验，`decisions.md` 侧改为校验 `D53/D54/D55`（及 `D56`）路由链接完备。
- **S3 · 压缩 `docs/decisions.md`（D1–D56）并同步指针登记簿**
  - 移除 `## 已定` 下方 `0.3.4` 临时安装横幅；将全部已定行压为第 2 列 `≤ 100` 可见字的一句话定性边界 + 第 3 列 `≤ 120` 可见字的可解析活家链接，补齐 11 行无链接项与 7 行仅归档链接项的现行合同落点，新增 `D56`；
  - 对照 `docs/decisions.md` 中保留或调整的 `notes/archived/*.md` 链接，精确同步 [scripts/archived-note-pointers.json](../../../scripts/archived-note-pointers.json)。
- **S4 · 清理两条 Trigger、对齐常驻指令口径与收尾交付**
  - 从 [_backlog/triggers.md](../../triggers.md) 移除已根治的 `decisions 台账去历史化` 与 `决策台账 20KB 收敛` 两行；
  - 在不超 [scripts/doc-budgets.json](../../../scripts/doc-budgets.json) 行数上限的前提下，原地更新 [AGENTS.md](../../../AGENTS.md)、[notes/README.md](../../../notes/README.md) §立项来历、[notes/AGENTS.md](../../../notes/AGENTS.md)、[docs/00-index.md](../../../docs/00-index.md) 与 [docs/AGENTS.md](../../../docs/AGENTS.md) 的台账职责表述；若测试台账受影响，同步更新 `asset-ledger`；
  - 全量跑通 `pnpm verify && pnpm test`（含 `gates.e2e` 相关检查），同变更落地毕业 Note 并归档本卡。

---

## 验收标准

| Behavior | Class | Input / state | Pass / fail signal | Negative / recovery | Evidence owner | Human judgment |
|---|---|---|---|---|---|---|
| **AC1 · 路由化压缩与体积硬顶棘轮** | Deterministic logic | `docs/decisions.md` 全文及 `## 已定` / `## 已退役` 全部数据行 | 全文 UTF-8 体积从 `>32 KB` 降至 `≤ 8 KB`（硬顶锁在 `≤ 12 KB`）；`D1..D56` 锚点唯一连续；每行第 2 列可见字数 `≤ 100`、第 3 列可见字数 `≤ 120`；表头无临时版本号横幅 | 注入 105 字第 2 列、130 字第 3 列散文、断号 `D57` 或超过 `12 KB` 文本 → 判定函数与 `decisions-now.test.mjs` 精确判红 | `tests/checks/decisions-now.test.mjs`、`tests/checks/release-copies.test.mjs` | 用户审阅一句话结论的可读性与信息保真度 |
| **AC2 · 每条已定决定必有可解析「活家」且冻结层零篡改** | Deterministic logic | `## 已定` 与 `## 已退役` 每行第 3 列链接集、`notes/archived/`、`_backlog/_archived/`、`scripts/archived-note-pointers.json` | 全部 `## 已定` 行第 3 列至少含 1 个存在的非归档活文件链接；全部 `## 已退役` 行含真实文件链接 + 取代者 `#dN`；`git diff notes/archived _backlog/_archived` 对既有冻结正文零改动；`archived-note-pointer`、`md-links`、`md-anchors`、`doc-drefs` 全绿 | 将任一已定行第 3 列改为纯文字 `用户拍板`、纯 `#d40` 内部锚点或仅指向 `notes/archived/*.md` → `decisions-now.test.mjs` 判红 | `tests/checks/decisions-now.test.mjs`、`pnpm verify` | 无 |
| **AC3 · 合同断言归位、双 Trigger 清理与常驻预算全绿** | Deterministic logic | `guides/67`、`tests/AGENTS.md`、`_backlog/triggers.md`、常驻 `AGENTS.md` 族 | `D53/D54` 制度细词断言在权威合同上生效，不在 `decisions.md` 单元格上硬绑；`triggers.md` 中两条 `decisions` 体积/去历史化触发项已移除；`doc-budgets`、`doc-now-only`、`count-free` 与 `pnpm test` 全绿 | 删 `guides/67` 中 `三环/四账/五关` 或删 `decisions.md` 中 `D54 → guides/67` 链接 → `decisions-now.test.mjs` 判红；任一 `AGENTS.md` 超预算行 → `doc-budgets` 判红 | `tests/checks/decisions-now.test.mjs`、`tests/checks/docs-consistency.test.mjs`、`pnpm verify` | 用户最终业务验收 |

---

## 排除项

- **不重排或回收既有 D 号编号**：`D35/D38/D39` 保持在 `## 已退役` 并保留原 `#d35/#d38/#d39` 锚点，确保全仓与历史记录中的 `#dN` 链接永不断链。
- **不追改任何冻结历史文件**：不编辑 `notes/archived/*.md` 与 `_backlog/_archived/**` 的历史正文。
- **不触碰插件包运行时行为或模型可见提示词**：本卡范围纯属仓库文档架构、决策路由与 L0 门禁契约，不涉及 `packages/deep-research-pack/presets/` 或 `src/` 逻辑变更。

---

## 关闭条件

1. S1–S4 全部完成，`pnpm verify` 与 `pnpm test` 全绿，且 `decisions-now.test.mjs` 新增判据具备先红后绿实证与变异负例单测。
2. 按 `reviewing-a-delivery` 完成跨面语义自审（核实被压缩的 55 条 D 号无任何独有合同参数或负知识蒸发）。
3. 同次提交写入 `notes/implemented/2026-11-14-decisions-routing-ledger.md`，更新 `docs/decisions.md#d56`，并将本卡 `git mv` 归档至 `_backlog/_archived/settled_issues/`、更新双侧索引。

审查：自审（reviewing-a-delivery）——机械：`pnpm verify` + 决策台账判据（6 组变异）；语义：D1–D56 路由与领域家逐行核对，冻结层零改。
