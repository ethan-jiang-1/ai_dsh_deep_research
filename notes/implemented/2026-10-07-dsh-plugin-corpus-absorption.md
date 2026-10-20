# DSH 插件开发语料（二代）吸收审计与落地

> 状态：implemented

## 问题（背景）

用户定调（2026-10-07）：本仓作为 DSH 插件仓，开发历史呈现"驾驭无力"——每次需要用户驱动才动得了、
产出质量缺乏保障感、流程有缺口、测试资产方位一度不明；自诊 = 对 DSH 原生流程没有吃透。用户指定
二代语料为考卷：`/Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/`（钉版 =
`deepseek-harness` 仓 @ `bbcf346ddb`，语料自钉 DSH `dsh-v0.2.0-rc.2`，与本仓 vendor pin 同版），
逐条审计本仓吸收面、补齐真缺口。交付节奏与深度由用户裁定：先诊断 RFC 再动手；文档与门禁测试
一起改（RFC 已呈批通过）。

审计范围 = 语料全部正文 .md（三卷各自 README 与 00-index、native-development-model 01–02、
sdlc-reference 01–11、repo-harness 01–09、`_coverage` 两篇）+ 语料 verify.mjs / verify.test.mjs
规则面；SVG 未逐张读（图服务正文，归属页已读）。对照面 = 本仓入口链全链 + evaluation +
discipline-map + project-map + guides/60–62 + tests·scripts·notes 三份子树 AGENTS + 一代吸纳 Note
（`2026-09-25-agent-ready-absorption`）。一代语料已三轮吸纳，本审计只认二代增量。

## 决定

### 审计结论（三态）

**大部分机制面已具备**（一代吸纳 + vendor 逐源台账 + 测试策略采纳覆盖：闭环前六步、证据路由、
测试分层、安装验证、文档标准、参与阶梯、运行时查询、分类学、维护页模式——逐件对照表见本 Note
文末附录）。真缺口集中在**质量判断的三块**，全部落地：

| 缺口 | 判断依据（语料出处） | 落点 |
|---|---|---|
| 语义自审层缺席——交付判断四角色（机械检查/语义评审/批准/显式交互）中 agent 可自主承担的角色未程序化 | 卷一闭环第 7 步 + sdlc-reference 06 | `.agents/skills/reviewing-a-delivery/SKILL.md`（blocking requirements 本仓化） |
| 门禁自测缺席——门禁反证全是一次性人工实录，verify.mjs 自身零自动回归，门禁钝化机器发现不了 | 语料 verify.test.mjs 模式 | `scripts/smoke/gates-smoke.mjs` + `tests/contracts/verify-gates.test.mjs` |
| 完成判断公理与验证词汇不显性——四分离公理只隐含在 L0–L4 里，oracle/real composition/semantic review 词汇缺席 | 卷一 00-index + 术语页 | evaluation §完成判断四分离 + 00-index §术语映射验证词汇行 |

**不适用维持**：主仓治理全套（Issue/PR policy、weighted approval、stacked PR、release lane、
`.github/`）——语料适用边界明文反证既有立场（主仓制度不自动适用插件仓）。

### 痛点归因（对用户四句感受的对账）

- **"每次驱动一下能干点"**——部分为设计使然（队列空 = parked = 待取题，D11/入口链纪律；
  语料卷二 09 反证取题文化本身 DSH-native）；改善面 = 每次驱动的产出质量由四角色对账分担，
  不再全靠用户亲自把关。
- **"质量成问题"** → 语义自审层 + 完成判断公理两缺口。
- **"流程上也有问题"** → 门禁自测缺口（质量保障的地基无回归守护）。
- **"测试资产不知道在哪儿"** → 既有落点已建（project-map 测试资产地图，2026-10-05）；本条目
  增量 = 验证词汇进术语映射 + gates-smoke 进测试资产表。

### 落地形态

- **A 语义自审技能**：`reviewing-a-delivery`——触发 = 条目收尾前 / 毕业复查 / 用户点名 review /
  跨面改动必做。正文 = 四角色定位 + 阻塞判据五条（意图对齐 / docs 同 diff / 断言有效性含证据
  选型 / 完成判断四分离 / 记录判据）+ 高风险语义扫描 + 产出边界。写后按 writing-for-agents
  杠杆自查，两处否定式边界段改正向表述。落盘即被 harness 技能目录发现（机制实证）。
- **B 门禁自测**：落点在实施中修正（原方案把执行体放 tests/ 撞 layering 门禁——默认回归禁
  spawn），改为 smoke 道执行体 + 静态契约：`gates-smoke.mjs`（tracked 全量副本 + 被 tracked md
  引用的运行区链接目标补拷 + git init + 注入违规经真实 verify 入口点名报红 + 零注入对照组防
  断言空转；verdict 契约 0/1/2；失败保留临时目录）+ `tests/contracts/verify-gates.test.mjs`（案例门禁名
  ↔ verify gates 数组对账——门禁改名/退役未跟案例即红）。承重抽样 = md-links / md-anchors /
  note-format / entry-chain / gate-ledger-sync。
- **C 完成判断公理固化**：evaluation 新节「完成判断四分离」（公理 + 四结果 ↔ L1 挂载 / L1 行为
  断言 / L2 / 收尾对账+批准映射 + 验收四角色表）；00-index 术语映射补 oracle / real composition /
  semantic review 行。
- **D 登记与入册**：00-index §外部研究材料登记二代语料 @ `bbcf346ddb`；discipline-map 新增
  源 11（二代增量三态表）；B 面文档同步 = scripts/README、scripts/AGENTS（门禁自测条款）、
  guides/60 §2（全档命令 + 任务型路由行）、根 AGENTS 布局树 smoke 行、project-map 证据表。
- **附带战果**：gates-smoke 对照组首跑即红，暴露 **BUG-016**（fresh clone 上 `pnpm verify` 红
  ——`_done/_reference` 摘要链接 `research-workspace/archive/` 运行区文件，门禁绿依赖机器状态）；
  已立缺陷卡（修复方向两候选在卡内），顺手修 `_done/README` 的 Next BUG ID stale（取号
  BUG-016，指针改指 BUG-017）。

## 输掉的方案

- **为本仓再造一套三卷语料结构**：已有 discipline-map / evaluation / project-map 三张对照面各自
  拥有同类事实，第二套叙述必然漂移。改为增量行进既有表。
- **把语义自审做成门禁**：语义判断不可机械化（语料明示 Skill ≠ gate）；做成门禁只能产出形式
  检查的假绿灯。改为技能。
- **全量门禁自测**（逐条 fixture）：成本收益倒挂（语料也只测八类 invalid case）。取承重抽样 +
  注入回归反证；全量版引入条件 = 出现第一条"门禁失效未被自测抓住"的实例。
- **移植 dsh-pre-push-checks 技能**：本仓无远端 PR 流，等价物 = 收尾程序 + 任务型路由表（一代
  已登记不适用）；其证据选择判断面已被 A 吸收。
- **六误区整体搬进 evaluation §2 负面判据**：两表判据对象不同（完成判断误区 vs 框架设计缺陷
  信号），混排稀释两表；维持分立（六误区逐条散落既有登记：D6 / L1 / tests·AGENTS / 源 1 / 不
  适用登记）。
- **门禁自测执行体放 tests/**（原方案）：layering 门禁禁默认回归 spawn（tests/AGENTS 分层合同），
  tests/ 只放静态契约钉子，执行体归 smoke 道——实施中发现并修正，理由在案。

## 验证

- **验收判据逐条对账**（全绿）：
  1. 技能 A：`pnpm verify` 全绿（dev-skill-format 覆盖）；正文与语料 sdlc-06 的映射 = 阻塞判据
     五条逐条对应其 blocking requirements（意图对齐↔PR 描述与 owner 对齐 / docs 同 diff↔README
     JSDoc 同步 / 断言有效性↔assertion fails on target regression + negative control / 完成判断
     四分离↔机器绿灯与批准各不冒充 / 记录判据↔Note 与证据放置规则），高风险扫描收其语义维度
     的本仓面；
  2. 门禁自测：`node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入全 PASS + 承重抽样注入
     案例均被点名报红）；`pnpm test` 含 verify-gates.test 两断言绿；
  3. evaluation「完成判断四分离」节在场（md-anchors 覆盖 discipline-map `#source-11` 锚点链）；
  4. 00-index 术语映射验证词汇行在场；
  5. 钉版对账：`git -C /Users/bowhead/deepseek-harness log -1 --format=%h` = `bbcf346ddb`；
  6. discipline-map 源 11 在场（三态行齐全）；
  7. 收尾：`pnpm verify` 全绿 + `pnpm test` 全绿（keyless 回归全过）+ gates-smoke 全绿 +
     入口链探针 ALL PASS（真模型档，留档 runtime/smoke-workspace/entry-chain-probe-2026-10-07T14-08-34-557Z.md）。
- **两面反证实录**：① 钝化 verify.mjs 的 md-anchors（块内遮蔽 fail 为 no-op）→ gates-smoke
  精确红「md-anchors：注入回归未被点名报红」→ 还原 → 复绿；② 改契约测试案例门禁名为不存在值
  → 测试红（报因含改法）→ 还原 → 绿。
- **探针过程战果**：队列行格式首写偏离编号惯例（裸 ▶ 行），探针真值锚 fail-loud 报错 → 改为
  编号形态 → ALL PASS——探针自身的反证实录。
- **未跑项分列**：L1/L2 未跑（改动面不含 pack 发布集与 preset 内容，两面对本次 diff 不适用）；
  语料 SVG 未逐张读（归属页已读，图服务正文）。

## 环境状态

- 新增：`.agents/skills/reviewing-a-delivery/SKILL.md`、`scripts/smoke/gates-smoke.mjs`、
  `tests/contracts/verify-gates.test.mjs`、`_backlog/bugs/BUG-016-fresh-clone-mdlinks-runtime-links.md`。
- 改动：`docs/evaluation.md`（完成判断四分离节）、`docs/00-index.md`（术语映射三行 + 外部材料
  登记）、`docs/discipline-map.md`（源 11）、`docs/project-map.md`（证据表
  门禁自测行）、`docs/guides/60-dev-loop.md`（全档命令 + 任务型路由行）、`scripts/README.md`
  （smoke 表）、`scripts/AGENTS.md`（门禁自测条款，压缩后入预算）、根 `AGENTS.md`（布局树
  smoke 行）、`_backlog/bugs/README.md`（活跃列表）、`_backlog/_done/README.md`（Next BUG ID）。
- 队列：本条目毕业离队，恢复 parked 态。
- 复核修正（同日，用户要求对交付做系统性/一致性复查）：新技能接进条目生命周期为
  **反馈门③**（guides/60 §0/§4——原落地缺流程接线，技能存在但收尾程序不引用）；六处
  技能清单枚举补齐（其中三处系存量漂移：改轨道缺席）；evaluation 四分离节的"正本"指向
  纠正（判据正本 = evaluation 自身，discipline-map 源 11 = 来源登记）；"验收四角色"统一为
  "交付判断四角色"（与技能/discipline-map 用词一致）；技能 description 补跨面触发（正文
  有而指针缺 = 触发面丢失）；BUG-016 卡复现措辞与 gates-smoke 注释交叉引用收口。
- 语料钉版身份：`deepseek-harness` @ `bbcf346ddb`（登记于 00-index §外部研究材料；语料自钉
  `dsh-v0.2.0-rc.2` = 本仓 vendor pin 同版——vendor 换 pin 时语料结论随 discipline-map
  §重审触发路径复核）。

## 附录：已具备对照表（防重复吸纳）

| 二代语料主张 | 本仓既有落点（审计时逐件核过） |
|---|---|
| 卷一闭环 1–2：外部结果先行、事实 owner 路由 | RFC 问题/验收节 + D23；00-index 组织原则 + owner 表 + 术语映射 |
| 卷一闭环 3：条件性使用 Issue/Note/Plan | notes/AGENTS 写入触发；guides/60 反馈门①；队列制 D11/D12 |
| 卷一闭环 4：完整垂直切片 | guides/60 §4 收尾五件 + 同 diff 纪律；任务型路由"同 diff 必改"列 |
| 卷一闭环 5：测试观察真实对象、每层只证明自己能观察的性质 | evaluation 五面 + project-map §测试怎么选 + discipline-map 源 8 |
| 卷一闭环 6：安装形态 + 版本范围声明 | L2 release-smoke + pack 兼容矩阵 dshReleases |
| 卷一误区：goal≠验收 / mock-only / 刷新≠接受 / agent-loop / 不抄主仓治理 | D6；L1 真挂载；tests/AGENTS fix fixtures；源 1 plugins-not-loop-changes；不适用登记 |
| 卷二 01/04/05/09：Note 生命周期 / 证据路由 / 文档标准 / 意图入口 | note-lifecycle-absorption + note-* 三门禁；guides/60 §2 路由表 + 五条纪律；docs/AGENTS 全套；队列制 + 取题文化 |
| 卷三 01–09 全部 | 入口链 + D21 分流；一个事实一个 owner + 负知识；`.agents/skills/` + dev-skill-format；guides/62 参与阶梯；源 8 + 三问自检；--dump-config 纪律；源 7 五形态；guides/62 投影 |
| 语料 `_coverage` 维护页模式 | discipline-map §重审触发路径 + 升 pin 重校毕业 Note |
| 语料 verify.mjs 语料级结构门禁 | 本仓 verify 门禁族（台账 = evaluation §L0，每条带反证记录列） |
