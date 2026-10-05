# 推敲：项目可驾驭性 Phase 1——导航、Agent Loop 与状态模型

> 状态：已毕业｜毕业门判断 = 该做｜去向 = [毕业 Note](../../../notes/implemented/2026-10-05-project-navigability-phase1.md)（2026-10-05 用户授权全程自主推进，同日交付）

## 背景 / 触发

用户希望驾驭者和新 Coding Agent 能直接看懂项目的运行态、测试、调试、用户交互、Agent Loop、skills、运行状态和 run bundle，而不是先做一次目录考古。当前仓库的概念分层已经成立，但 `scripts/`、`dev/`、`tests/fixtures/` 的物理入口仍交叉；Agent Loop 和状态正本分散在项目地图、Run 指南、pack README、角色 skills、研究手册与 `NODES.md`。

本卡承接目录可导航性走查（`notes/implemented/2026-10-05-project-navigability.md`）提出的导航问题，但不直接推翻其“暂不整体搬迁”的判断。本阶段先改导航模型和事实归属，再以证据决定是否窄迁目录。

## 已知与未决

### 已知事实

- 真实运行入口是 `dev/boot-run.sh`；它准备研究 profile、安装 pack 与 Agent Teams 组合、检查发布镜像漂移、启动 DSH Web，并后台启动只读仪表盘。
- GUI 与 `dev/run-kickoff.mjs` 都能创建 Lead 会话；Lead preset、角色 skills、Agent Teams、研究工作区文件契约共同构成 Agent Loop，没有独立的仓级 JS 状态机。
- `research-workspace/drt_<slug>/` 是研究事实与恢复依据；DSH session log 是执行事件；goal/task board 是执行辅助；dashboard/cockpit 是派生观察面。
- `research-workspace/NODES.md` 已经拥有节点输入、输出、下游开工判据和回边语义，适合成为 Agent Loop 的 I/O 正本。
- `tests/*.test.mjs` 是默认 keyless 回归；`tests/fixtures/`、独立 smoke、真模型档、真实 run bundle 分属不同证据面，但 fixtures 缺少一张顶层 taxonomy。
- 直接移动文件存在静默漏测风险：测试命令、layering、smoke contract、凭据卫生和若干脚本都依赖顶层发现范围或相对路径。

### 本卡已作的方向决定

- 第一阶段采用“先导航、后迁移”，不移动运行代码，不改变发布、安装、profile、overlay、workspace seed 或研究运行语义。
- 状态模型固定为：`run bundle = 研究事实正本`；`session log = 执行事件正本`；`goal/task board = 执行辅助`；`dashboard/cockpit = 派生观察`。
- `NODES.md` 负责 Agent Loop 的节点 I/O；`project-map.md` 负责总览；`61-run-playbook.md` 负责人的操作；角色 skills 负责角色动作。
- GUI 是产品用户交互面；`run-kickoff`、`hitl-answer`、`cdp-probe` 是开发/运维驱动或探针，不与产品交互面混称。

### 未决点

- Agent Loop 与状态模型新文档的最终文件名，以及它与 `docs/project-map.md`、`docs/design/30-methodology-mapping.md` 的层级归属，需要在 RFC 中落定。
- `dev/smoke-workspace/` 中的同名旧原型、生成物和运行日志需要先以 `git ls-files` 与实际引用清点；没有引用证明前不删除、不改 canonical 入口。
- `tests/fixtures/` 第一阶段只做 taxonomy/index，还是同时把少数稳定 fixture 物理分组，需以发现范围反证决定；默认选择只加索引。
- 既有合同漂移（`quick_factual` 是否必须 Critic、`final.md` 与 `final/` 的当前版本语义）不纳入本卡，另立条目处理。

## 方案与实施面

### Phase 0：建立基线

- 记录当前入口、脚本发现范围、测试命令、fixture consumer、生成物和运行区路径。
- 清点 `scripts/`、`dev/` 和 `dev/smoke-workspace/` 的 tracked 文件、ignored 运行文件与重复命名；标出 canonical、兼容入口、原型和生成物。
- 以当前 `pnpm verify`、`pnpm test` 作为基线；基线失败先单独登记，不把既有失败归因于本卡。

### Phase 1：补齐导航与事实模型

- 新增一份短 reference，显式描述 Agent Loop、四类状态、每类状态的 writer/reader/canonical 性质、恢复优先级和交付判定。
- 在 `docs/project-map.md` 增加入口矩阵：启动、继续、观察、回答 HITL、查看 run、验证挂载、验证安装、查漂移和定位故障分别走哪个唯一入口；标注是否写盘、是否需要模型/浏览器、事实来源和失败后的下一站。
- 在 `NODES.md`、`project-map.md`、`61-run-playbook.md`、pack README 和角色 skills 之间改为单向指针：节点契约不在操作指南重复，操作步骤不冒充节点正本，角色 skill 不重新定义全局状态。
- 为 `scripts/` 增加职责索引，按 gate / smoke / probe / audit / run observation / distribution / library 标明 owner、输入、输出、凭据档位和 canonical 事实来源；不改变脚本路径与命令。
- 为 `tests/fixtures/` 增加 taxonomy/index，把 run-state、run-dashboard、node-gate、schema-scan、vendor-artifacts、replay 等夹具分别说明 consumer、证明内容、冻结规则和是否进入默认回归。
- 重排 `README.md` 与根 `AGENTS.md` 的首屏指针：README 面向人类三类任务，AGENTS 保留常驻纪律和入口链，长篇地图下放到其 owner 文档。
- 为 `dev/` 增加清晰的入口说明，显式区分 build/sync/environment、run channel、HITL driver、fixture recorder 和生成运行区；如果旧原型仍存在，明确标为非 canonical 或隔离到不参与发现的区域。

### Phase 2：反证与收口

- 用冷启动路径检查：新 Agent 只从 README 或 AGENTS 出发，能在少量跳转内找到运行入口、Agent Loop 正本、run 状态正本、测试入口和故障定位入口。
- 对入口矩阵中的每个入口做路径存在性与命令/文档对账；文档只指向真实文件，链接锚点由 `pnpm verify` 把守。
- 对状态模型做反证：临时把 dashboard、session log、goal/task board 或 bundle 当成错误的 canonical，相关说明或测试必须能暴露矛盾；不修改运行合同。
- 对 fixture taxonomy 做反证：每个现有 fixture 顶层类别至少有一个真实 consumer；不存在“索引点名但无人消费”或“有 fixture 无 owner”的静默孤儿。
- 完成后再评估是否存在稳定 owner、独立生命周期和独立发现范围；只有三者同时成立，才另立窄迁 RFC。

## 候选与取舍

### 采用：保守的导航优先方案

保留现有顶层目录和命令路径，新增导航索引、状态模型和事实归属，先解决认知成本。它直接满足用户要求，又不会扩大 profile 镜像、overlay、workspace seed、门禁扫描和运行恢复的同步面。

### 输掉：立即拆分 `scripts/` 与 `dev/`

物理上按 `gates/`、`smoke/`、`ops/`、`audit/`、`build/`、`run/` 拆分很直观，但当前发现机制大量依赖顶层 glob、`readdir`、凭据扫描和 `import.meta.url` 相对路径。没有先建立递归发现、manifest 与兼容入口，目录移动可能造成“全绿但漏测”。

### 输掉：激进拆成 runtime / operations / verification / observability

概念纯度更高，但会同时改动产品包发布形态、profile 安装镜像、run channel、观察面、工作区种子和文档入口；它还容易制造第二份状态或第二个启动入口。当前证据不足以支付这个风险。

## 毕业门

1. **导航门**：入口矩阵覆盖启动、继续、交互、观察、验证、调试和恢复；每个任务只有一个首选入口，并链接到真实文件和下一步。
2. **正本门**：Agent Loop 的节点 I/O 唯一归 `NODES.md`；四类状态的 writer/reader/canonical/生命周期/恢复优先级各有唯一说明，project-map、guides、README 和 skills 不再各自重述另一层合同。
3. **资产门**：`scripts/` 职责索引和 `tests/fixtures/` taxonomy 覆盖所有现有 tracked 入口与 fixture 类别；旧原型、生成物、运行产物均有明确状态，不能被新 Agent 误当 canonical。
4. **行为门**：不改变运行、安装、交互和研究合同；`pnpm verify` 与 `pnpm test` 全绿，文档链接/锚点、门禁发现范围和测试选集均有实际验证；若需要移动文件，另立迁移 RFC，不在本卡夹带。
