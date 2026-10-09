# 项目可驾驭性 Phase 1——导航、Agent Loop 与状态模型

> 状态：implemented

来源推敲卡：[2026-10-05-project-navigability-phase1](../../_backlog/_archived/settled_issues/2026-10-05-project-navigability-phase1.md)（判断材料与取舍过程随卡归档，铁律 = 内容不重写）。用户 2026-10-05 授权 ongoing goal 全程自主推进（R1 授权落档 → R2 基线与立红 → R3–R4 实现 → R5 对账 → R6 毕业收尾）；同日 steer = 条目级验收 TDD 化（D23），本条目为其首个完整应用。

## 问题

驾驭者与新 Coding Agent 需要直接看懂项目的运行态、测试、调试、用户交互、Agent Loop、skills、运行状态与 run bundle，而不是先做一次目录考古。概念分层已由[目录与入口治理走查](2026-10-05-project-navigability.md)确立，但三处入口仍交叉：`scripts/`、`dev/`、`tests/fixtures/` 物理入口交叉且无职责索引；Agent Loop 与状态正本分散在 project-map、run 指南、pack README、角色 skills、研究手册与 NODES.md；`dev/smoke-workspace/` 盘上原型与运行产物 canonical 性质不明。

## 决定

- **状态模型固定**：run bundle（`research-workspace/drt_<slug>/`）= 研究事实正本；DSH session log = 执行事件正本；goal/任务板 = 执行辅助（与 bundle 冲突以 bundle 文件事实为准）；dashboard/cockpit = 派生观察（fail-soft，不是交付绿灯）。事实归属：NODES.md 持节点 I/O，project-map 持总览与入口矩阵，61 持人的操作，角色 skills 持角色动作；GUI 是产品交互面，run-kickoff / hitl-answer / cdp-probe 是开发/运维驱动或探针，不与产品交互面混称。
- **新增 [design/50](../../docs/design/50-agent-loop-and-state.md)**（体裁沿 design/40"当前事实正本 + agent 一找就到的单一入口"）：Agent Loop 四部件总览（无独立仓级 JS 状态机）+ 四类状态 canonical 合同 + 恢复优先级（只认 bundle 文件事实）+ 交付判定（文件事实链）。00-index 文档地图登记；project-map / 61 以链接指之；NODES.md 纯文本指路（种子部署侧不带仓内链接）。
- **project-map 增任务入口矩阵**：九任务（启动 / 继续 / 观察 / 回答 HITL / 查看 run / 验证挂载 / 验证安装 / 查漂移 / 定位故障）× 唯一首选入口 × 写盘 / 档位 / 事实来源 / 失败下一站。
- **三个资产索引**：[scripts/README](../../scripts/README.md)（门禁 / 冒烟 / 探针 / 审计 / 观察 / 分发 / 库 × 档位 × 事实来源，26 入口全点名）、[dev/README](../../dev/README.md)（环境/构建/同步 · run 通道 · 驱动 · 运行区，15 入口全点名，运行区标非 canonical）、[tests/fixtures/README](../../tests/fixtures/README.md)（六组 taxonomy：consumer / 证明内容 / 冻结规则 / 回归面）。
- **单向指针化**：61 §5 合同框架句（"run 根只有一个正本…位置=状态"）退役为纯操作面，§6 交付判定改指针；角色 skills 与 pack README 经精确排查（恢复/正本/仪表盘/任务板/session log/dashboard/canonical/交付判定/goal 九模式全量扫）零全局状态重述，一字未动——非 owner 地位由契约测试 spot-grep 永久把守。
- **首屏**：README Start Here 增"想看懂"第四指针并折叠 Directory Map（31→28 行）；根 AGENTS 两处 `design/10-40`→`10-50`（138 行不变）；entry-chain 门禁成员扩 design/50。
- **契约回归**：`tests/navigability-contract.test.mjs` 七组断言（design/50 在场与合同词、三面指针、矩阵九任务与链接目标、三索引全覆盖、fixture 每组 ≥1 真实 consumer 零孤儿、状态合同词非 owner 零重述）进默认回归；[evaluation.md §L0](../../docs/evaluation.md) 登记契约回归行。
- **窄迁评估：不迁目录**——稳定 owner（部分成立，各职责类有 owner 面但共享目录）、独立生命周期（不成立，verify 每轮 / smoke 按改动面 / run 门每 run 交叉）、独立发现范围（不成立，tests glob、scripts readdir、smoke-contract 顶层扫描、真模型档 closed set、`import.meta.url` 相对路径全部依赖顶层结构）三者不同时成立；索引承载认知成本。触发条件维持推敲卡原文：三者同时成立时另立窄迁 RFC。
- **方法论副产品（D23 首例）**：判据四型绑定 → 红状态不落 git（沿门禁反证先例，红证记录在案）→ 实现到绿同 diff 提交；对账命令须复用契约判据源、不手抄第二份（两次手抄两次形态错的实录教训）。

## 输掉的方案

### 立即拆分 `scripts/` 与 `dev/`

物理按 gates/、smoke/、ops/、audit/、build/、run/ 拆分直观，但发现机制大量依赖顶层 glob、`readdir`、凭据扫描与 `import.meta.url` 相对路径；没有先建立递归发现、manifest 与兼容入口，目录移动 = "全绿但漏测"。

### 激进拆成 runtime / operations / verification / observability

概念纯度更高，但同时改动产品包发布形态、profile 安装镜像、run channel、观察面、工作区种子与文档入口，且容易制造第二份状态或第二个启动入口；当前证据不足以支付该风险。

### 把 Agent Loop 与状态模型全部写进 project-map

少一个文件、少一处登记，但导航地图页膨胀，与"短 reference"定位冲突，四类状态合同未来无处下放；design/40 已验证"事实正本独立成篇 + 地图页链接"的形态更可取。

### fixtures 物理分组（本阶段）

分组直觉合理，但测试发现范围依赖顶层 glob 与 consumer 相对路径；没有发现范围反证前移动 = 静默漏测。taxonomy 先行，分组留给窄迁 RFC（若触发）。

## 验证

四门逐门对账（2026-10-05，检查方式按验收节四型绑定）：

1. **导航门**：冷启动走查（人工判据型）两起点全通——README 第 4 指针 1 跳达任务入口矩阵、调试表、状态正本；AGENTS → 00-index 文档地图 → design/50 均 ≤2 跳；链路 grep 实证在场。矩阵命令对账：preset-smoke / release-smoke 命令与 guides/60 §2 正本逐字一致，boot-run 漂移门与实装一致。
2. **正本门**：契约断言全绿（design/50 在场 + project-map/61/NODES 三面指针 + spot-grep 零重述）；状态模型反证 = 向 61 注入「仪表盘才是研究事实正本」→ spot-grep 精确红（报文件 + 合同词 + 修正入口）→ 还原绿。
3. **资产门**：契约断言全绿（三索引全覆盖 + 每组 ≥1 真实 consumer 零孤儿）；逐条声称审计实抓两处虚账（schema-scan←scripts、vendor-artifacts←lib 为间接消费被写成直接引用）→ 修为确切声称，9/9 全实。
4. **行为门**：`pnpm verify` 全绿 + `pnpm test` 201/201；条目全部提交零运行件路径移动（git mv 仅推敲卡与 RFC 自身的规划面移动）；BUG-013（snapshot-replay Lead persona 既有红）未触碰、不归因本条目。

红绿证据链（D23 应用实录）：契约测试 R2 首跑 6 红 1 绿（六个待实现物缺席即红——判据在实现前确实能失败）；三针反证（孤儿组注入 / 状态词注入 / stub 预证孤儿断言）全咬合后还原；R3 实现中修三处（61 链接前缀断言细化、矩阵行名词表漂移——测试实抓 RFC 词表与文档措辞漂移，改文档不改判据、dev README 自指豁免）→ 7/7 绿；entry-chain 成员扩列注入 bogus 反证 FAIL→还原 PASS。

`pnpm verify` 与 `pnpm test` 于本 Note 收尾同 diff 复跑全绿；入口链探针（真模型档，改动面含 docs/AGENTS 必跑）：**ALL PASS**——模型沿入口链四问全部命中终态真值（parked 队列 → 正确动作 = 向用户取题而非开工、入口链步骤与 guides/60 开工/收尾指认正确），留档 `dev/smoke-workspace/entry-chain-probe-2026-10-05T13-13-57-422Z.md` 供人工复核。

## 环境状态

- L1（真挂载）/ L2 / 观察面 / 真模型 smoke 未跑：本条目未改 preset、pack 发布集与 client 面（排查零重述后一字未动）——非本条目判据面，如实分开记录（未跑 ≠ 通过）。
- entry-chain-probe 留档 `dev/smoke-workspace/` 供人工复核。
- `dev/smoke-workspace/` 盘上 77 项清点结论：全部为运行日志、探针留档、生成运行区（boot-run / release-smoke / export-dist 写入，tracked 引用在案）或被走查 Note 引用的一次性原型——无删除候选。
- 既有合同漂移（quick_factual 是否必须 Critic、`final.md` 与 `final/` 版本语义）不属本条目范围，由独立条目处理。
