# 项目可驾驭性 Phase 1——导航、Agent Loop 与状态模型

> 状态：approved

来源推敲卡：[2026-10-05-project-navigability-phase1](../../_backlog/_done/_closed_plans/2026-10-05-project-navigability-phase1.md)（判断材料与取舍过程随卡归档，铁律 = 内容不重写）。用户 2026-10-05 授权 ongoing goal 全程自主推进至毕业，插话即 steer 重排。

## 问题

驾驭者与新 Coding Agent 需要直接看懂项目的运行态、测试、调试、用户交互、Agent Loop、skills、运行状态与 run bundle，而不是先做一次目录考古。概念分层已由[目录与入口治理走查](../implemented/2026-10-05-project-navigability.md)确立，但三处入口仍交叉：

- `scripts/`、`dev/`、`tests/fixtures/` 的物理入口交叉，职责只有 [project-map](../../docs/project-map.md) 一处散文描述，缺少按 gate / smoke / probe / audit / run observation / distribution / library 的职责索引；
- Agent Loop 与状态正本分散在 project-map、run 指南、pack README、角色 skills、研究手册与 [NODES.md](../../research-workspace/NODES.md)——同一合同多处重述，改一处漏一处；
- `dev/smoke-workspace/` 盘上存在同名旧原型、生成物与运行日志（tracked 仅 `.gitkeep`），canonical 性质不明，新 Agent 易误当正本。

## 方案

方向（随卡定案）：**先导航、后迁移**——本阶段不动运行代码，不改变发布、安装、profile、overlay、workspace seed 与研究运行语义；只改导航模型与事实归属，之后以证据决定是否窄迁目录。

状态模型（固定）：run bundle（`research-workspace/drt_<slug>/`）= 研究事实正本；DSH session log = 执行事件正本；goal/task board = 执行辅助；dashboard/cockpit = 派生观察面。

事实归属（单向指针）：[NODES.md](../../research-workspace/NODES.md) 拥有 Agent Loop 的节点 I/O；[project-map.md](../../docs/project-map.md) 拥有总览与入口矩阵；[61-run-playbook](../../docs/guides/61-run-playbook.md) 拥有人的操作；角色 skills 拥有角色动作、不重述全局状态；GUI 是产品用户交互面，run-kickoff / hitl-answer / cdp-probe 是开发/运维驱动或探针，不与产品交互面混称。

### 已落定的未决点

1. **新 reference 落点 = `docs/design/50-agent-loop-and-state.md`**（用户 2026-10-05 拍板）：体裁沿 [design/40](../../docs/design/40-research-cockpit.md)——"当前事实正本 + agent 一找就到的单一入口"；project-map / 61 / NODES.md 链到它，节点 I/O 细节仍归 NODES.md。
2. **`dev/smoke-workspace/` 只清点标状态**：以 `git ls-files` 与实际引用清点 tracked 与运行区文件；没有引用证明前不删除、不改 canonical 入口。
3. **`tests/fixtures/` 只加 taxonomy/index，不物理分组**：是否分组由发现范围反证决定，默认不动（静默漏测风险，输掉方案见节尾）。
4. **既有合同漂移不纳入**：quick_factual 是否必须 Critic、`final.md` 与 `final/` 的版本语义另立条目处理，本条目不夹带。

### Phase 0：建立基线

- 记录当前入口、脚本发现范围、测试命令、fixture consumer、生成物与运行区路径；
- 清点 `scripts/`、`dev/` 与 `dev/smoke-workspace/` 的 tracked 文件、ignored 运行文件与重复命名，标出 canonical / 兼容入口 / 原型 / 生成物；
- 以当前 `pnpm verify`、`pnpm test` 为基线；既有失败（如 [BUG-013](../../_backlog/bugs/BUG-013-lead-replay-persona-stale.md)）单独登记，不归因本条目、不扩大修复面。

### Phase 1：补齐导航与事实模型（七项）

1. 新增 `docs/design/50-agent-loop-and-state.md` 短 reference：Agent Loop、四类状态、每类的 writer/reader/canonical 性质、恢复优先级与交付判定；
2. [project-map.md](../../docs/project-map.md) 增加入口矩阵：启动、继续、观察、回答 HITL、查看 run、验证挂载、验证安装、查漂移、定位故障——每任务唯一入口，标注是否写盘、是否需要模型/浏览器、事实来源、失败后的下一站；
3. NODES.md、project-map、61、pack README 与角色 skills 之间改单向指针：节点契约不在操作指南重复，操作步骤不冒充节点正本，角色 skill 不重新定义全局状态；
4. `scripts/` 职责索引（gate / smoke / probe / audit / run observation / distribution / library 各标 owner、输入、输出、凭据档位与 canonical 事实来源），不改变脚本路径与命令；
5. `tests/fixtures/` taxonomy/index：每类夹具的 consumer、证明内容、冻结规则、是否进入默认回归；
6. [README.md](../../README.md) 与根 [AGENTS.md](../../AGENTS.md) 首屏指针重排（doc-budgets 处置序 = 下放优先）：README 面向人类三类任务，AGENTS 保留常驻纪律与入口链，长篇地图下放 owner 文档；
7. `dev/` 入口说明：显式区分 build/sync/environment、run channel、HITL driver、fixture recorder 与生成运行区；旧原型标非 canonical 或隔离到不参与发现的区域。

### Phase 2：反证与收口

- 冷启动路径检查：新 Agent 只从 README 或 AGENTS 出发，少量跳转内找到运行入口、Agent Loop 正本、run 状态正本、测试入口与故障定位入口；
- 入口矩阵逐项对账：路径存在性与命令/文档一致；文档只指向真实文件，链接锚点由 `pnpm verify` 把守；
- 状态模型反证：临时把 dashboard、session log、goal/task board 或 bundle 当成错误的 canonical，相关说明或测试必须能暴露矛盾；不修改运行合同；
- fixture taxonomy 反证：每个现有顶层类别至少一个真实 consumer；不存在"索引点名但无人消费"或"有 fixture 无 owner"的静默孤儿；
- 窄迁评估：完成后评估是否存在稳定 owner、独立生命周期与独立发现范围；只有三者同时成立，才另立窄迁 RFC。

## 输掉的方案

### 立即拆分 `scripts/` 与 `dev/`

物理按 gates/、smoke/、ops/、audit/、build/、run/ 拆分直观，但发现机制大量依赖顶层 glob、`readdir`、凭据扫描与 `import.meta.url` 相对路径；没有先建立递归发现、manifest 与兼容入口，目录移动 = "全绿但漏测"。

### 激进拆成 runtime / operations / verification / observability

概念纯度更高，但同时改动产品包发布形态、profile 安装镜像、run channel、观察面、工作区种子与文档入口，且容易制造第二份状态或第二个启动入口；当前证据不足以支付该风险。

### 把 Agent Loop 与状态模型全部写进 project-map

少一个文件、少一处登记，但导航地图页膨胀，与"短 reference"定位冲突，四类状态合同未来无处下放；design/40 已验证"事实正本独立成篇 + 地图页链接"的形态更可取。

### fixtures 物理分组（本阶段）

分组直觉合理，但测试发现范围依赖顶层 glob 与 consumer 相对路径；没有发现范围反证前移动 = 静默漏测。taxonomy 先行，分组留给窄迁 RFC（若触发）。

## 验收

判据可检验化（2026-10-05 用户定调，流程正本 = [guides/60 §0 验收门](../../docs/guides/60-dev-loop.md)，登记 = D23）：每门绑定检查方式；能机械的检查在实现前先立红——判据在实现前必须能失败，Phase 1 收口逐门对账全绿，证据记入实施记录。

1. **导航门**：入口矩阵覆盖启动、继续、交互、观察、验证、调试、恢复；每个任务只有一个首选入口，并链接到真实文件和下一步。检查 = 契约测试（矩阵任务覆盖 + 每行链接目标在场）+ 命令/文档逐项对账记录 + 冷启动走查记录（人工判据型：记跳数与路径，不伪装成机械断言）。
2. **正本门**：Agent Loop 的节点 I/O 唯一归 NODES.md；四类状态的 writer/reader/canonical/生命周期/恢复优先级各有唯一说明，project-map、guides、README 和 skills 不再各自重述另一层合同。检查 = spot-grep（全局状态特征短语在非 owner 文档零重述）+ design/50 在场且被 project-map/61/NODES.md 链接的断言（契约测试）。
3. **资产门**：`scripts/` 职责索引和 `tests/fixtures/` taxonomy 覆盖所有现有 tracked 入口与 fixture 类别；旧原型、生成物、运行产物均有明确状态，不能被新 Agent 误当 canonical。检查 = 契约测试（索引覆盖 `git ls-files` 全量 tracked 入口 + fixtures 每顶层类别 ≥1 真实 consumer，零孤儿）。
4. **行为门**：不改变运行、安装、交互和研究合同；`pnpm verify` 与 `pnpm test` 全绿，文档链接/锚点、门禁发现范围和测试选集均有实际验证；若需要移动文件，另立迁移 RFC，不在本条目夹带。检查 = verify/test 实跑记录 + 既有红（BUG-013 等）与本条目改动分离对账 + diff 无 scripts/dev/tests 运行件路径移动。

## 实施记录

- **R1（2026-10-05）**：RFC 落档（approved；未决点四项落定）；queue.md ▶ 行登记（卫生，可自主）；推敲卡 `git mv` 归档 `_done/_closed_plans/`，状态行补去向指针，plans/ 与 _closed_plans/ 两处索引同步。用户 steer（同日）= 条目级验收 TDD 化（D23）：验收节按四型绑定检查方式，流程正本 = guides/60 §0 验收门。后续轮次：R2 = Phase 0 基线 + 判据可检验化落地（四门展开为逐条检查：契约测试 `tests/navigability-contract.test.mjs` 与对账命令先立红并记录），R3–R4 = Phase 1 七项实现到绿（动 preset 则 render-overlay 先于 L1；动工作区正本则 sync-pack-workspace），R5 = Phase 2 反证 + 逐门对账，R6 = 同 diff 收尾（四门逐条对账全绿 + RFC 迁 implemented/ 正文改写 + 队列行删除 + entry-chain-probe）。
- **R2（2026-10-05，Phase 0 基线 + 判据可检验化）**：
  - **基线**：`pnpm verify` 全绿 + `pnpm test` 194/0（R1 收官实测、树同态复跑；BUG-013 为 snapshot-replay 冒烟面既有红，不在默认回归内，与本条目分离登记）。
  - **盘点（Phase 0）**：`scripts/` 26 个 tracked 入口（根级脚本 + lib/ 七模块 + AGENTS.md/doc-budgets.json 配置件）；`dev/` 12 文件 + 3 目录（hooks/ 配置、harness-home/ 与 smoke-workspace/ 两个运行区）；`dev/smoke-workspace/` 盘上 77 项分类 = 运行日志（*.log）+ 探针留档（entry-chain-probe-*.md）+ 生成运行区（release-pack / run-pack / npm-cache / web.log / dashboard.html——由 boot-run、release-smoke、export-dist 写入，tracked 引用在案）+ regression-process-guard.mjs（被走查 Note 引用的原型）+ 各类一次性测试输出。引用证明齐备，**无删除候选**——未决点②按"只清点标状态"结案。
  - **判据可检验化落地**：新增 `tests/navigability-contract.test.mjs`（keyless 契约回归 = 四门的机械面：design/50 在场且承载状态合同 + project-map/61/NODES 三导航面链接、入口矩阵九任务全覆盖 + 矩阵链接目标在场、scripts/README + dev/README + tests/fixtures/README 覆盖全量盘上入口、fixtures 每顶层组 ≥1 真实 consumer、状态合同词在非 owner 文档零重述）。
  - **立红实测**：6 红 1 绿（design/50、三链接、矩阵、三个索引 README 均缺席即红；spot-grep 因合同词尚不存在而空转绿）。**反证实测（三针）**：注入孤儿 fixture 组（stub README 预置命名）→ 孤儿断言红（"零真实 consumer"）；向 README.md 注入状态合同词 → spot-grep 红；还原后回到 6 红 1 绿基线。consumer 形态归一化实证：`fixtures/<组>` 与 `join(..., 'fixtures', '<组>')` 两种写法皆有真实消费，六组全有 consumer（taxonomy 的输入事实）。
  - **提交策略（D23 与绿提交不变量的调和）**：立红状态不落 git（沿"门禁带反证"先例——红证记录在案、红状态不提交）；本测试在工作树内保持红，R3–R4 实现到绿后**同 diff** 提交，并按 tests/AGENTS 在 docs/evaluation.md 对应面登记本契约测试。另：分片 commit 时 pre-commit 以临时索引对账，与工作树不一致的切片会被拦（R1 实拦一次）——R3/R4 提交用整片或次序化切片。工作树恢复四源（guides/60 §7）照常有效。
- **R3（2026-10-05，Phase 1 实现到绿——契约测试 6 红 → 0）**：
  - `docs/design/50-agent-loop-and-state.md` 新档落地（Agent Loop 四部件总览 + 四类状态 canonical 合同 + 恢复优先级 + 交付判定；体裁沿 design/40），[00-index 文档地图](../../docs/00-index.md) 登记；
  - [project-map](../../docs/project-map.md) 增「任务入口矩阵」（九任务 × 唯一入口 × 写盘/档位/事实来源/失败下一站），面 表与已知限制节挂 design/50 与三个新索引；
  - [61 §5](../../docs/guides/61-run-playbook.md) 挂 design/50 指针（操作步骤不冒充状态正本）；[NODES.md](../../research-workspace/NODES.md) 头部纯文本指路——种子部署侧不带仓内链接，契约测试断言相应细化为 repo 文档链接形态 / 种子纯文本两档；种子经 sync-pack-workspace 同步（9 文件）；
  - 三个资产索引落地：[scripts/README](../../scripts/README.md)（职责分类 × 档位 × 事实来源，26 入口全点名）、[dev/README](../../dev/README.md)（环境/构建/同步 · run 通道 · 驱动 · 运行区，15 入口全点名，运行区标非 canonical）、[tests/fixtures/README](../../tests/fixtures/README.md)（六组 taxonomy：consumer / 证明内容 / 冻结规则 / 回归面）；
  - [evaluation.md §L0](../../docs/evaluation.md) 增「契约回归」登记行（tests/AGENTS 同 diff 登记义务）；
  - **红转绿实录**：契约测试 6 红 1 绿 → 修三处 → 7/7 绿、verify 全绿、tests 201/201。三处 = ①61 链接 `../` 前缀断言细化（合同细化非放宽）；②矩阵行名「验证插件挂载」→「验证挂载（插件真挂载）」——**测试抓到 RFC 词表与文档措辞的真实漂移，改文档不改判据**；③dev README 自指豁免。
  - 余项（R4）：角色 skills 单向指针化（四分之六的 SKILL.md 含状态措辞；动 preset → render-overlay 先于 L1）、README + 根 AGENTS 首屏重排（doc-budgets 处置序）、根 AGENTS 布局「design/10-40」→「10-50」+ entry-chain 门禁成员清单同 diff 同步、61/研究手册深层重述修剪。
- **R4（2026-10-05，Phase 1 收尾——五文档单向指针化收口 + 首屏重排）**：
  - **角色 skills / pack README 重述排查（精确模式：恢复｜正本｜仪表盘｜任务板｜session log｜dashboard｜canonical｜交付判定｜goal 全量扫）**：零全局状态重述——命中均为任务板作为协作工具的角色动作描述（team-assembly 派工面）与既有 design/40 指针。**不动 preset** → render-overlay / L1 未触发（未跑 ≠ 通过，如实记档：preset 未改，L1 非本项判据面；skills 的非 owner 地位由契约测试 spot-grep 永久把守）。
  - **61 两处重述修剪**：§5「run 根只有一个正本（D17 契约位）位置=状态」合同框架句退役 → 「在飞与归档的位置」纯操作面（生命周期事实移入 design/50 状态表行）；§6 交付判定改为指针（design/50 §交付判定 + 手册 §完成判据）。
  - **根 AGENTS** 两处 `design/10-40` → `10-50`（入口链分流句 + 布局图；行数不变 138/138）。
  - **entry-chain 门禁成员扩列 design/50**（writing-a-gate 纪律执行：先加载技能全文 → 改 verify.mjs members + evaluation.md 行同步 → **注入反证**：加 bogus 成员 `docs/design/99-bogus.md` → entry-chain FAIL → 还原 → PASS；反证记录入 evaluation.md 该行）。
  - **README 首屏重排**：Start Here 增第四指针（想看懂运转 → project-map 任务入口矩阵 + design/50 状态合同），Directory Map 节折叠并入该指针（31 → 28 行，预算内净减）。
  - Phase 1 七项至此全数落地（第 3 项含"验证过、无需改"的如实记录——不发明工作）。验证：契约测试 7/7 + verify 全绿 + tests 201/201。
