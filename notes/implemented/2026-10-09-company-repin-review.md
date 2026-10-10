# company 钉版复核：3cfa8f1 → 59551f2 逐条重审 + handbook-budget 吸收

> 状态：implemented

出处 = 用户指令「沿着推荐顺序一步一步推进」（2026-10-09）——仓库盘点发现 `ai_dsh_company`
钉版 `3cfa8f1` 落后实际 HEAD（复核时点 = `59551f2`；company 活跃开发中，其工作树脏区仅为
自身 backlog 草稿，不涉本仓依赖源）。钉版纪律原文：「不一致即上游已前进、结论待复核」。
复核方法 = 三路并行只读子任务（移植件语义 / snapshots 治理 / 范式与决策依据），company 侧
一律 `git show 59551f2:<path>` 读固定 commit（免疫其后续提交）；vendor/dsh 侧直接读本仓
submodule（company 的 vendor 指针已升到与本仓相同的 `639ed015` = dsh-v0.2.0-rc.2）。

## 决定

**重钉 company @ `59551f2`，五簇立论结论无一被推翻；落地一项高价值吸收（handbook-budget 门禁），
修正四处描述性失真，新登记一条机制边界，其余候选登记待用户定优先级。**

### 复核总判定

| 立论簇 | 判定 | 变点 |
|---|---|---|
| D3/D16（team 通道，引 company D18） | **成立且被强化** | D18 核心语义未推翻；新增三条边界事实（见下） |
| D10（docs 按性质分层）+ D31（`_backlog` 推敲空间） | **成立** | 两句原文均未变；company 另借入与本仓 D19/D20 同源同日收敛的 backlog 生命周期（源头同为 ai_dsh_assitant） |
| preset 教义 | **核心不变 + 三项新增** | 四形态矩阵（teammate 继承 Lead 组合）、tool-web 逐 preset 声明（本仓已对齐）、0.2.0 harvest 批次（本仓已有逐项收口） |
| 双 home / verify 门禁范式 | **成立**（company 侧 scripts/ 升格为 checks/ probes/ tools/，机制不变） | — |
| client-face 参考假设 | **结构假设成立** | 描述性过期两处（页签计数、数据通道名——已修正） |
| 垂直轮（D8 引 company D11） | **引用过期** | company 已退役轮次制（其 D23/D24/D32）；本仓 D8 现行依据 = 用户指令，已加注 |

### 新登记的机制边界（vendor 同 pin，直接适用本仓）

- **one-shot worker 的工具目录可见 Team 工具但调不通**（vendor `tool-agent-team/README.md`
  known limitation）——已写入 [design/10 §3](../../docs/design/10-architecture.md) 协作通道表，
  派工方应让 worker 明确别调 `spawn_teammate` / `team_task_*` / `wait_agent`；
- **maxDepth rc.2 默认 = 1**：本仓 preset 未显式声明 → worker 不能再生 grandchild，与单点
  查证用法相容（已注明 design/10）；
- **teammate 组合继承语义**（company presets.md 四形态矩阵）：成员会话加载的是 Lead 的组合，
  名册角色名 ≠ 该会话加载的 preset——已补进 [design/20 §0](../../docs/design/20-roles.md)
  （此前合同空白）。

### 吸收：handbook-budget 门禁（同 diff 落地）

agent-instructions 的 maxBytes 超限时 vendor **静默截断**手册尾部——company 由此出过真实事故
（手册 1.2KB→17.4KB 后「工作纪律」节从未注入）。本仓同构面：四 preset 各 `maxBytes: 16384`，
手册 9,726B，此前无任何门禁看余量。已按 company `checks/run-gates.mjs:99–117` 形态落地
[verify.mjs](../../scripts/verify/verify.mjs) 门禁 `handbook-budget`（四 preset maxBytes 同值 +
手册字节 + 1024B render 余量 ≤ maxBytes），带 gates-smoke 常驻反证案例。行数栅栏
（doc-budgets）管不到字节截断，这是它的独立价值。

### 修正的描述性失真（docs = 当前合同）

1. [00-index](../../docs/00-index.md) 钉版行：门禁名 `plans-liveness` → `backlog-liveness`（实名）；
   hash 重钉；内容列去掉 company 已退役的「垂直轮」；
2. D8 依据列加注：company D11 已退役轮次制，本条为历史借鉴，现行依据 = 用户指令；
3. 00-index client-face 行：「五页签」→「8 页签」；`agentTeams.view` → `agentTeam 投影
   （sessions 座位，rc.2 起）」；
4. preset 头注 ×4 / 根 AGENTS 布局行 / design/10：「0.1.7 形态」→「单行形态（rc.2 有效）」；
5. [release-smoke.mjs](../../scripts/smoke/release-smoke.mjs) 头注：「照搬」→「裁剪自 + 差异列举」
   （company 该节已演进为 0–5 步，且我们缺其四项断言——列为候选）。

### 对抗自审收紧（同 diff 落地）

吸收后对抗自审发现 company 原版的一处盲区：`budgets` 摊平收集时，**单个 preset 丢 `maxBytes`
行**只剩三个一致值 → 门禁绿，而该角色手册已失去截断防线（绿而坏，与 pack-bundle-compat
「≥1 条」旧洞同型）。本仓收紧为**逐文件收集**：任一 preset 零声明即点名红；配套
`handbook-budget-bare-preset` 常驻反证案例。该修正属本仓改进，非 company 现状。

### 前提澄清（snapshots 分析报告）

本仓 2026-10-09 的 [company snapshots 分析](../../_backlog/_archived/research/2026-10-09-company-snapshots-analysis.md)
在 `fb01c74` 上完成，**已包含** runnable 3→1 的两个 commit（e01b761/3b2df76，merge-base 已核）；
其后到 `59551f2` snapshots 面仅 12 个文件、约 29 变更行的 README 说明级修正——报告结论仍然成立，
无需重做。

### 语料交叉验证（FAQ 21，同日新增）

钉版复核期间 `_dsh_plugin_agent_ready_development` 语料新增 FAQ 21「recorded-session 快照证据
该不该进 git」（`fb862eed5c`）——与昨天 [snapshots 落地](2026-10-09-snapshots-adoption.md)直接对题。
逐条对照其五条不变量：边界声明在先（snapshots/README 收什么/不收什么）✓；声明真的驱动消费者
（replay-scene fail-loud 全形态）✓；判据集由消费者固定、不可削减（BUG-018 教训同源）✓；录制身份
跟着夹具走、缺失如实标 `unknown` 不许猜填（`unknown-historical` 设计同款）✓；归一化只抹确实挥发的
身份（三槽定向，其余逐字）✓。其落点判决「独立 agent 运营仓选顶层 `snapshots/` 证据面」与「L4 按
触发条件启用、一个目录一个场景」均与本仓已落地形态一致；其「变更探测器 ≠ 正确性 oracle」与本仓
README 证据边界同句。**无需返工**；其 06/07（bug 复现 playbook、check-in 反增长杠杆）留作后续
场景族扩张时的参照。

### 候选与触发条件（登记，不构成实施授权）

- **guard-red-record 本仓化**（高）：把 tests/AGENTS「新契约测试带反证」的散文义务机械化
  （verify 门禁面已有 gates-smoke 超出其水平；tests 面无机械，`ask-drive.test.mjs` 标题已带
  BUG 声明）。适配三点：BUG 卡双址、node:test 标题串、留证或夹具二选一；
- **release-smoke 补齐**（中高）：安装副本 `lib/client.js` 断言 + `dependencies === undefined`
  断言 + 安装域浏览器模块表断言 + run() 超时/并发锁/进程组回收；可连同 client-half 门禁
  （exports./client ⟺ dsh.client 双向）与 pack-compat「含当前 tag」提前到 L0 打包一张卡；
- **layering 二代**（中高）：AST 判法（动态 import/密钥间接引用现逃检）+ import 图守卫
  （`tests/verify-gates.test.mjs` import gates-smoke.mjs 靠约定安全）+ package.json test
  命令形状钉；
- **盘点后定**（中）：bare-path（live 文档反引号裸路径，company 实测 21.3% 死指针率）、
  preset-required-config（对照 vendor config-catalog 盘点我方行 config 面）；
- **触发条件型**（已登记 [snapshots/README](../../snapshots/README.md)）：场景 glob 发现 +
  资格三态 + 判定日期（第二场景族 / 首个永久红场景时）；snapshots 体积预算（累积型类别入库时）；
- **运维规则**（已写进 [bumping-vendor-pin 技能](../../.agents/skills/bumping-vendor-pin/SKILL.md)
  §5-bis）：升 pin ⇒ B·headers 必红 ⇒ 真模型重录 research-face + 更新 snapshot.json 身份，
  不许降档凑绿。

### 其他外部材料钉版状态（如实记账）

- `_dsh_plugin_agent_ready_development` `bbcf346ddb`→`ad6f5319dc`（24 提交）与 `ai_dsh_assitant`
  `576c5f8`→`202a27b`（全仓 210 提交，吸收两路径 141）已于 2026-10-10 复核——两债吸收面
  结论维持，重钉 + 债 2 行描述改述已落地（逐面判定与证据 =
  [外部钉版债复核材料](../../_backlog/research/2026-10-10-external-repin-review.md)）；
- `_agent_ready_development` 老路径已不存在（一代语料，2026-09-25 已吸收，二代语料已取代）；
- vendor/dsh 上游无新 tag（`git ls-remote` 核对，最高仍为 `dsh-v0.2.0-rc.2`）——本轮无需升 pin。

## 输掉的方案

- **跟进 company 的 scripts/→checks/probes/tools 目录重组**：纯结构模仿，无消费者；本仓
  分组布局已有职责索引与门禁把守。
- **吸收 judges 降档（full/presence）**：BUG-018 教训——judge 集固定全集不可削减，降档 =
  盲区复长；代价（每轮模型可见输入变更须重录）已认账。
- **吸收 doc-budget 棘轮（只降不升）**：知情政策分歧——本仓明文「上限过低是预算 bug，
  升顶须登记理由」。
- **吸收 script-port 默认 '0' 哲学**：有意偏离——本仓固定端口 + port-exclusive 独占登记自洽。
- **立即实施全部吸收候选**：违背「有消费者才建」与窄切片纪律；候选登记由用户定优先级。
- **对 ai_dsh_assitant 170 提交做同轮全面复核**：超出本轮授权范围；其钉版表记录的是吸收时
  版本，登记待复核即可。

## 实际跑过的验证

- **复核可复核性**：三路子任务全程只读、company 侧固定 commit 读取，报告逐行带文件行号与
  commit 锚点；本侧对 vendor 同 pin 关键断言（tool-agent-team README known limitation、
  tool-subagent maxDepth 默认值）独立复核在场。
- **handbook-budget 反证（三形态实录）**：单 preset maxBytes 改 8192 → 「不一致」红；四 preset
  同降 8000 → 「手册 9726B + 1024B 余量 > 8000 静默截断」红；单 preset 删 maxBytes 行 → 「该角色
  无字节预算」红（对抗自审 S1 抓获的盲区——company 原版摊平收集会静默放行，本仓收紧为逐文件收集）；
  各自还原 → 绿。三形态均已固化为 gates-smoke 常驻案例。
- **gates-smoke**：新案例 `handbook-budget-truncated`（事故形态）、`handbook-budget-mismatch`（不一致）
  与 `handbook-budget-bare-preset`（S1 裸 preset）注入后经真实 verify 入口点名报红，对照组零注入
  全 PASS；首版案例带多余 expect 被对照组判红（expect 仅用于基线非 PASS 的对账报因）——修正后全绿。
- **L0**：`pnpm verify` 全绿 + `pnpm test` 全绿（315/315，含 handbook-budget 新门禁与 gates-smoke
  案例对账）；`git diff --cached --check` 干净。未跑：L1 挂载 / L2 安装 / L4-lite——本轮未触碰
  角色、方法论、schema 与运行代码。
- **上游核对**：`git -C vendor/dsh ls-remote --tags origin` 确认无新于 `dsh-v0.2.0-rc.2` 的
  tag——升 pin 重录路径本轮为规则登记，无实跑（如实分列）。
