# 00 · 文档地图、组织原则与决策台账

本目录是"DSH Deep Research 插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`。

> **读法（省上下文）**：入口链第 2 步只需要本页 §文档地图（下面那张表）——**别通读决策台账**；
> D 号按需查（改到哪个机制就查哪条），术语映射与外部材料登记同理。

## 先分流：用户要"用它"还是"改它"

**先记住这条模型**：本包是 bundle + preset 的集合，**自身没有进程**——"启动它"始终等于"装进
某个 profile + 起该 profile"（本仓 = `research` profile）。带着这个模型读下表：每行只给**一个
首个动作**（会占住前台的已标出；本表覆盖用户对"启动 / 跑 / 装 / 改"的全部常见说法）：

| 用户的说法 | 走哪（该事的唯一 owner） | 首个动作 |
|---|---|---|
| "启动这个 DSH 插件""跑起来看看""开跑"——**未指定别的 home 时就是本行，直接做、不要停下来问** | [guides/61](./guides/61-run-playbook.md) | `bash dev/boot-run.sh`（**占前台**，Ctrl-C 才停；**别**直接 `dsh --profile research`——那会绕过漂移检测、静默用旧镜像） |
| "接着上次跑""继续那个研究" | [guides/61 §5](./guides/61-run-playbook.md) | 同一条 `bash dev/boot-run.sh`；起来后新开 lead 会话说"继续 `<slug>` 这个 run" |
| "装到我的 DSH""部署给别人 / 别的机器" | [pack README §部署](../packages/deep-research-pack/README.md) + [`_dist/安装手册.md`](../_dist/安装手册.md)（出包 = `node scripts/dist/export-dist.mjs`） | `dsh --profile <p> --from-default-profile web --dump-config`（一次性；写的是 `DSH_HOME` 那个 home） |
| "只验证插件还能挂载"（开发证据面，不产生可用实例） | [guides/60 §2](./guides/60-dev-loop.md) | `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` |
| "改插件内容"（角色 / skill / 驾驶舱 / 部署面） | [guides/62](./guides/62-plugin-authoring.md) | 该页 §参与阶梯 + §改动影响面 |
| "改本仓开发流程"（门禁 / docs / notes / 入口链） | 根 [AGENTS.md](../AGENTS.md) §入口链 | 按请求范围进入第 3 步 |

**开跑前置**（只对第 1/2 行）：仓根 `pnpm install` 已跑 + `vendor/dsh` submodule 已 init +
`runtime/harness-home/.credentials.yaml` 有 `DEEPSEEK_API_KEY`（boot 本身 keyless）。
`bash dev/boot-run.sh` **自己 source `dev/env.sh`**——先 source 不是前置（`AGENTS.md §命令速查`
那条 ⚠ 只约束 L1/L2 脚本）。要它在你离开后继续服务 = [61 §0](./guides/61-run-playbook.md)
的"托管后台 + 保持 stdin 打开"形态。

**歧义裁定**（两条规则谁管谁）：用户**未指定别的 DSH home** → 直接走第 1 行，不停下来发问
（第 1 行的"不要问"只指"别问装哪个 home"；**在飞 run 的接续/新开照下面那条办，该问就问**）；
只有他明说"装到我日用 / 别人的 DSH"、或目标 home 不是 `runtime/harness-home` 时才问一句
"装到哪个 DSH home？"（本仓开发通道 = `runtime/harness-home`，先 `source dev/env.sh`；日用 =
`~/.dsh`，**不要** source——两者装的东西不同）。

**每次"启动"前先扫一眼在飞 run**（动作 = `ls -dt research-workspace/drt_*/`，`archive/` 除外；
细判据 = [61 §0](./guides/61-run-playbook.md)）：**根目录下每个未归档 bundle 都要报出来**——
(a) 无 `final/` 或 `review.md` 非 `readiness: PASS` = 在飞 → 问"接续它还是新开"；(b) 有 `final/`
且 PASS = 交付线已在盘、未归档 → 问"先归档再新开，还是补研究"（`present` 声明盘上不可验，
归档前请用户确认）。两类都带上 slug + mtime，**都不自己挑**。

## 文档组织原则

**docs/ 按"性质"分层，不按"时间"分层**（沿 ai_dsh_company D10）：时间维度的东西（初始意图、
提案、已废方案）住 `notes/`；按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 合同 | [evaluation.md](./evaluation.md) | **验收怎么判**（五面） | 活（变更须 D 号） |
| 设计 | `design/` | **为什么**：机制依据、方案取舍 | 稳定；被推翻时归档并记 D 号 |
| 问题与证据 | 根 `_backlog/`（[issues](../_backlog/issues/README.md) + bugs/ + research/ + methods/） | **问题澄清、查证与结论准备**：按需使用，不是实施前置 | 按结论关闭或归档 |
| 指南 | `guides/` | **怎么操作**：开发环 | 活（随操作方式演进） |

## 文档地图

| 文档 | 层 | 回答什么 |
|---|---|---|
| [project-map.md](./project-map.md) | 导航 | 人和 Agent 的驾驭地图：运行链、职责划分、测试资产分层与失败定位入口 |
| [evaluation.md](./evaluation.md) | 合同 | 评估五面（L0 结构/L1 挂载/L2 安装/L3 领域/L4 交付）与里程碑矩阵——**先于框架定案** |
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（单包四角色）；通道选型（agent-team 主通道）；工具面；偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 设计 | 四角色内容：职责 owner 表、persona 要素、skills 面（清单 = 盘上目录）、信噪比策略落点 |
| [design/30-methodology-mapping.md](./design/30-methodology-mapping.md) | 设计 | **方法论映射**：codex Deep Research harness 内核 → DSH 载体（L3 领域面的核心载体） |
| [design/40-research-cockpit.md](./design/40-research-cockpit.md) | 设计 | **研究驾驶舱**：观察面 client 套件的当前事实正本（定位/构成/通道/纪律/验证/边界——agent 一找就到的单一入口） |
| [design/50-agent-loop-and-state.md](./design/50-agent-loop-and-state.md) | 设计 | **Agent Loop 与状态模型**：运行驱动链总览 + 四类运行状态（run bundle / session log / goal·任务板 / 观察面）的 canonical 合同、恢复优先级与交付判定——当前事实正本 |
| [design/60-intent-carriers.md](./design/60-intent-carriers.md) | 设计 | **意图载体总图**：问题、授权工作、RFC、Note 与 TODO 的 owner、适用条件和出场方式 |
| [AGENTS.md](./AGENTS.md) | 指令 | **文档标准**（`docs/` 子树）：层级归属（一个事实一个家）/ 写作规则 / slop 清单 / 预算处置序——上游 `docs/AGENTS.md` 同构 |
| [alignment-ledger.json](./alignment-ledger.json) | 合同 | **对齐台账（机读）**：vendor/dsh harness 源面逐项结论（adopted/adapted/na + 落点 + 理由；条数以台账 `sources` 数组为准）；门禁 `align-ledger` 对账（source 在 vendor 存在 / 落点存在 / na 有理由）——人读视图 = discipline-map 源 1–9 |
| [discipline-map.md](./discipline-map.md) | 合同 | **纪律全量枚举**：vendor 逐源三态表（照搬/带证据适配/不适用+理由）——AGENTS §纪律的正本（随 vendor 换 tag 重校） |
| [_backlog/](../_backlog/README.md)（[问题](../_backlog/issues/README.md)） | 问题与证据 | 问题澄清、查证方法、调研材料、缺陷与归档 |
| [snapshots/](../snapshots/README.md) | 问题与证据 | 场景证据层：有持久消费者的整组录制回放资产与场景声明（消费 = snapshot-replay-smoke；证据边界与维护规则见该页） |
| [guides/60-dev-loop.md](./guides/60-dev-loop.md) | 指南 | 开发环：六步闭环、面选择表、双 home、密钥 |
| [guides/61-run-playbook.md](./guides/61-run-playbook.md) | 指南 | **run 操作指南**（研究发起人入口）：boot-run、lead 会话、HITL 两点、观察面——run 通道（research profile：本包 + vendor agent-team-profile 层，P1 定案）的使用面 |
| [guides/62-plugin-authoring.md](./guides/62-plugin-authoring.md) | 指南 | **插件作者入口**（改插件内容的人/agent 入口）：DSH 词汇对齐（plugin/bundle/profile/preset）、参与阶梯 L0–L3、新行为归属、范本与证据义务、**交付与部署形态**（bundle/profile 拓扑 + 工作区种子 + 部署 bin）、**改动影响面**（添/换/删要一起动什么）——上游 `docs/user/develop/**` 的本仓投影 |

## 决策台账

> 编号空间：本表 D 号 = 本仓决策；引用他仓决策必须带仓前缀（company D15/D18/D23 =
> `ai_dsh_company` 台账，vendor 出处直指 vendor 树）——裸 D 号一律指本表。

### 已定（写代码前不再讨论）

| # | 决定 | 依据/出处 |
|---|---|---|
| D1 | **自写包 = 1 个**（`deep-research-pack`）；行多包少，角色是 preset 目录不是包 | company D1 同构；[10-architecture](./design/10-architecture.md) |
| D2 | **角色 = 4 个**：Lead（主编）/ Scout（侦察）/ Analyst（分析）/ Critic（核查）；wave2 综合归 Lead（最薄队形——首场完整 run 实测 lead 独任综合无过载，专职 synthesizer 维持搁置）。**角色清单的事实源 = 盘上 `packages/deep-research-pack/presets/` 目录**（基础整治 §3.2）：JS 消费点经 `scripts/lib/roles.mjs` 枚举、bash 用目录枚举，硬编码清单被 verify 门禁 `role-list-sync` 咬；增删角色 = 推翻本条，先登记新 D 号（tests 数量哨兵会拦） | 用户指令（多角色分工）；[20-roles](./design/20-roles.md) |
| D3 | **协作主通道 = Agent Teams**（spawn_teammate 组队 + 任务板）；单点快捷查证走 one-shot subagent——续驶语义归 team（company D18 实证边界：team-scoped 会话里 continuable child 不可达，不重蹈）。**偏离登记**：官方 POLICY 是 opt-in——「仅用户显式要求才建队友」（vendor `packages/experimental/tool-agent-team/src/index.ts:31`）；本产品即该显式要求的物化，preset 钉默认通道 = 部署层预授权，有意为之 | 用户指令；company D18；vendor POLICY 原文；[10-architecture §3](./design/10-architecture.md) |
| D4 | **方法论内核 = codex harness 考古十条**（两 HITL 锚点 + 三波 + 证据身份链 + 声明式质量门 + 反伪造审计）；markdown 控制面与 CLI 状态机不采纳；不建立本仓 markdown 工作队列；执行顺序由会话内任务面组织 | [方法论映射](./design/30-methodology-mapping.md)；[harness 考古报告](../notes/implemented/2026-09-24-deep-research-harness-analysis.md) |
| D5 | **证据身份链 = 唯一自建残留**：evidence frontmatter 文件契约 + critic 狩猎，不做 CLI 引擎（完成判定锚定文件事实而非账本外观——codex 教训 1 的轻量等价物） | [30 §证据身份链](./design/30-methodology-mapping.md)；evaluation.md L3 判据 3 |
| D6 | **评估先行**：docs/evaluation.md 五面合同先于框架定案；完成定义 = 该面最小真检查；goal complete 的唯一条件 = 里程碑矩阵全绿 | 用户指令；company D15 |
| D7 | **首版 = 纯配置包**：pack 内零自写 JS、零构建；UI 用现成 `ui-agent-team`。**单点例外 = 观察面 client 面（D18）**：例外范围 = 两个插件（`src/client/` client 半 + `src/index.ts` host 半空壳宿主位）与 `src/lib/` 纯函数折算，构建产物 `lib/client.js` + `lib/index.js`（guides/62 双半契约），用途限定研究观察/调试。**边界澄清（基础整治 §3.7 补）**：约束对象是 `packages/deep-research-pack/`（发布产物）；仓级 `scripts/`、`tests/` 的工具 JS（verify/roles/run-dashboard 等）不受此限 | company D5 同教义（第 0 天零自定义 JS）；例外范围与用途限定见 D18 行 |
| D8 | **迭代单位 = 垂直轮 + 八成把握先行**：最薄全路径先行 → 逐轮加宽；不追求一次想透 | 用户指令（迭代纠错优先于完美规划）；原借鉴 company D11（company 已于其 D23/D24/D32 退役轮次制——本条现行依据 = 用户指令，company 引用为历史借鉴） |
| D9 | **web 工具行（已实证）**：模型面 `tool-web` 行随 preset（config 照抄 base：`fetch: true` = 注册 `web_fetch` 的布尔开关，`searchTimeoutMs: 60000` = 搜索预算；`fetchTimeoutMs` 本仓不设、走 vendor schema 默认 30000 ms——字段语义正本 = vendor `packages/web/tool-web/README.md`）；providers（web seam / web-search-deepseek / web-fetch-http）是 base host 面出厂行，不进本包 bundle 也不随 preset；DeepSeek 搜索 `apiKeyEnv: DEEPSEEK_API_KEY` 与 chat 同钥匙 | [10 §4](./design/10-architecture.md)；[web-tool-rows 毕业 Note](../notes/implemented/2026-09-24-web-tool-rows.md) |
| D10 | **vendor submodule = 机制权威**：本仓 `vendor/dsh/` pinned submodule（只读铁律；tag 与钉 commit 正本 = [AGENTS.md §DSH 源码表](../AGENTS.md)）；机制核对与验证会话一律走它，全局安装不作机制依据；verify 门禁 `vendor-pin`/`vendor-clean` 把守 | [evaluation.md §L0](./evaluation.md#l0-结构面机械门禁keyless)；[10 §1](./design/10-architecture.md) |
| D11 | **工作由用户请求授权**：直接按授权范围执行；复杂工作按需使用会话内 plan/todo，不设仓库任务队列或唯一当前指针 | 用户裁决（2026-10-09「其实应该消除它，把问题复杂化了」）；[吸收与移除理由](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) |
| D12 | **RFC 按持久决定需要使用**：仅当决定需要显式评审时建立，不是实施工作的普遍前置 | [吸收 Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md)；[notes 规则](../notes/AGENTS.md) |
| D13 | **status rots 拆除**：docs 只写 now，不复述易腐状态；当前工作由用户本轮请求及已有授权决定，不由文档状态或 agent 自选 | 用户指令（立项定调；来历与原话去向 = [notes/README §立项来历](../notes/README.md)）；[evaluation.md §3 尾注](./evaluation.md) |
| D14 | **preset-smoke 双通道**：源码域（web 出厂 profile + overlay 指向本仓 presets 源码，迭代快）+ 安装域（`--profile <p> --no-patch` 走 plugin add 正式路径）；断言同构（roster/逐角色 create/skills 隔离），L1 用前者、L2 用后者；boot 起自本仓 vendor/dsh 钉 tag 源码（tsx 解析树；E1 起统一默认，原 company checkout 借用已随 D10 销账），overlay/roots 用绝对路径 | [L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md) |
| D15 | **release-smoke 形状**：照 company release.md 五步（pack → 干净 profile 先删后建 → `plugin --profile add file:` → manifest 断言 → 安装域冒烟）；工具态（npm cache/pnpm store）全重定向进 repo gitignored 区；peers 是声明语义（安装锚兜底解析，非安装要求） | 同上 |
| D16 | **团队组合归 vendor agent-team-profile 层**（P1 A 定案）：run 通道 profile 装 `@…-agent-team-profile@<pin>`（版本从 pack 兼容矩阵同源派生，`dev/boot-run.sh` 执行）；本包 bundle 撤 agent-team / tool-agent-team 两行（同行 id 双 insert = 重复行，实证）；ui-agent-team 观察行留本包；三 preset 的 tool-subagent 声明 **one-shot** 对齐 company D18（差分实验实证 preset 行覆盖 profile 行——不对齐则层禁令被自家声明抵消；D3 原文"one-shot subagent"的漂移顺带修复） | [P1 毕业 Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md)；[10 §2/§3](./design/10-architecture.md)；[61 指南](./guides/61-run-playbook.md) |
| D17 | **harness / run bundle 分离**（`研究报告 = harness(bundle)`）：harness（pack+手册+templates+docs/notes）只读、零 per-run 状态、run 期间零写入；run bundle = `research-workspace/drt_<slug>/`（一调研一 bundle，drt = Deep Research Topic，目录名即方向），持全部变量（判定式：恢复这次研究所需）；**位置=状态**——在飞住工作区根，交付后由操作侧移入 `research-workspace/archive/`（2026-09-27）；rerun 三分（表述修订 polish 版本不变 / 证据扩张 final/ 下一版 / 结构性另起新 bundle+sibling 预检）；框架文档不出现具体题目 | 用户拍板（2026-09-24，源头 DEEP_RESEARCH_HARNESS 概念比对后定）；[10 §1 第一性分层](./design/10-architecture.md)；[Note](../notes/implemented/2026-09-24-run-bundle-drt-separation.md)；[研究手册](../research-workspace/AGENTS.md)（归档约定正本） |
| D18 | **观察面 client 面 = D7 的单点例外，套件名 = 研究驾驶舱（Research Cockpit，2026-09-28 用户拍板）**：例外范围 = 两个插件（`src/client/` client 半 + `src/index.ts` host 半空壳宿主位）+ `src/lib/` 折算纯函数；双半 tsdown 产物 `lib/client.js` + `lib/index.js`，用途限定 = 研究观察/调试；品牌/皮肤面不因此纳入；重议条件由 [ui-skin 否决 Note](../notes/rejected/2026-09-24-ui-skin.md) 承载。构成的当前事实正本 = [design/40](./design/40-research-cockpit.md) | 用户明确需求（run 期观察分散四处 + HITL 等待不可见实证）+ [琢磨稿](../notes/archived/2026-09-24-ui-observability-surfaces.md)（机制考古，已归档）+ company 同款生长序 + [observability-gui RFC](../notes/implemented/2026-09-24-observability-gui.md)（2026-09-25 马拉松 Stage 0） |
| D19 | **问题澄清与证据区 = 根目录 `_backlog/`**：吸纳 `ai_dsh_assitant/_backlog` 的 issues / bugs / research / methods / triggers / archive 思路；`_backlog` 承载问题澄清、查证、结论与必要交接，**不是实施前置门，也不授予实施授权**。`issues/` 是问题卡，不是 implementation plan；问题可直接以用户授权进入执行。notes/proposed RFC 仅在持久决定需要显式评审时建立；日期命名延续 `YYYY-MM-DD-<slug>` 与 notes 一致 | 用户指令（2026-10-09）；[历史决定与吸收理由](../notes/implemented/2026-10-09-backlog-methodology-absorption.md)；规矩手册 = [_backlog/README.md](../_backlog/README.md) |
| D20 | **不设独立 roadmap 或仓库任务队列**：问题、证据与持久决定各住实际 owner；执行顺序由会话内 plan/todo 表达 | 用户裁决（2026-10-09）；[吸收 Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md)；[轮内任务面](./guides/60-dev-loop.md) |
| D21 | **入口按意图分流（"用它" vs "改它"）**：路由正本 = 本页 §先分流（用户说法 → 文档 → 第一条命令），根 AGENTS.md §入口链与 README Start Here 各一行指针；"启动这个插件"默认理解 = 本仓 run 通道；含糊时判据 = 目标 DSH home（本仓 `runtime/harness-home` vs 日用 `~/.dsh`）。操作类请求按「用它」路径处理 | 用户定调（2026-09-29「fresh agent 一进来就要立刻明白」，泛化性优先于本人用法）+ 4 个零上下文探针实证 4/4 必须反问、且各自选了不同答案；[Note](../notes/implemented/2026-09-29-cold-start-intent-router.md) |
| D22 | **对外交付约束：pack 采纳面不得引入用户侧外部服务依赖**——外部账号 / API key / 付费订阅一律不过关（setup 复杂度是交付硬门槛）；裁决优先于能力与价格权衡。首例 = mcp-client 通道选**本地 Playwright MCP**（npx 拉起、零账号零凭据）而非 Firecrawl remote（账号 + key + 按量订阅） | 用户定调（2026-10-02「这工具今后是要交出去给人的……太复杂的话肯定不行」）；[mcp-playwright 采纳 Note](../notes/implemented/2026-10-02-mcp-playwright-adoption.md) |
| D23 | **条目级验收 TDD 化**：RFC 验收判据逐条绑定检查方式（机械门禁 / 契约测试 / 对账命令 / 人工判据四型），能机械的先立红再实现到绿，实施记录载实际红绿证据——评估先行（D6）的授权工作级投影；流程正本 = [guides/60 §0 验收门](./guides/60-dev-loop.md) | 用户定调（2026-10-05「先考虑怎么测，实现后看测试满足了吗，反复做对；全程要证据，不随性发挥」）；[Note](../notes/implemented/2026-10-05-item-lifecycle-tdd.md) |

### 待定（阻塞项标 ⛔）

当前无待定问题。新开放问题出现时在此登记（`# | 问题 | 归宿` 三列，归宿指向 D 号或
notes/ 文件）。

## 术语映射（本项目 ↔ DSH 官方 ↔ vendor/dsh 源码）

| 本项目 | DSH 官方 | vendor/dsh 落点 |
|---|---|---|
| 研究角色（Lead/Scout/Analyst/Critic） | agent preset（0.1.7 起：`@deepseek-ai/dsh-agent-preset` 一条行，config.plugins 内声明 persona/skills/工具行；行文件 = `presets/<id>.patch.yml`） | `packages/preset/agent-presets` + `packages/preset/persona` |
| 研究团队 / 组队 | Agent Teams（`spawn_teammate` / 任务板，experimental；**组合层 = vendor agent-team-profile**，D16） | `packages/experimental/agent-team` + `tool-agent-team` + `agent-team-profile` + `docs/subsystems/agent-team.md` |
| 研究工人（一次性查证） | one-shot/continuable subagent（`dsh-tool-subagent`, spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 研究方法论的载体 | skill（`presets/<role>/skills/<n>/SKILL.md`，硬隔离） | `packages/skill/skill-filesystem` |
| web 搜索/抓取 | `dsh-tool-web` + search/fetch provider | `packages/web/tool-web` + `web-search-deepseek` + `web-fetch-http` |
| 成品交付 | `present` 工具 explicit deliveries | `packages/fs/tool-present` + `client/ui-deliverables` |
| 研究工作区 | 会话 cwd + `agent-instructions` 注入手册 | `packages/context/agent-instructions` |
| **研究驾驶舱（Research Cockpit）** | —（本仓原生套件名，2026-09-28 用户拍板）：观察面 client 套件——页签 / 工具卡 / 活标题 / 挂起显性化 + 渲染装配；分层：观察面（伞）→ 驾驶舱（套件，最频改）+ 折算层（`src/lib` 谓词，共用）+ 仪表盘（`run-dashboard` 只读投影）；**当前事实正本 = [design/40](./design/40-research-cockpit.md)** | `packages/deep-research-pack/src/client/`（目录名守 DSH 双半约定 host/client——套件名钉入口头注）+ `src/lib/` |
| 开发 harness / 运行 harness | development harness / runtime harness（同一仓库的两面：前者让 agent 看懂、修改、验证自己；后者是产品运行框架） | 本仓两面并存：`packages/deep-research-pack/` 是 runtime 面，`AGENTS.md` + `docs/` + `notes/` + `.agents/skills/` + 门禁是 development 面 |
| 参与阶梯 | participation ladder（L0 组合 → L1 扩展点 → L2 capability seam → L3 core loop） | [guides/62 §参与阶梯](./guides/62-plugin-authoring.md)（本仓版本：L0 配置行 / L1 preset+skill+观察面 client 面 / L2 尚无 / L3 归上游） |
| 程序化工作记忆 | procedural memory（可复用工作流 + 专门判断标准） | `.agents/skills/`（开发技能：毕业条目 / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审——清单 = 盘上目录）——与产品内 runtime skills（`presets/*/skills/`）严格分家 |
| plugin / bundle / profile | plugin = 导出 `apply(ctx)` 的模块；bundle = 你编写与分发的单位（`dsh.bundle`）；profile = 用户 `dsh --profile` 启动的环境（`dsh.profile`）——**Nothing is both** | bundle = `packages/deep-research-pack/cordis.patch.yml`；profile = `runtime/harness-home/profiles/research/`（镜像；源 = pack——`boot-run.sh` 从 pack 重建；overlay 只是源码域冒烟通道的生成物） |
| run bundle（一次调研的变量容器） | —（本仓原生概念，源头 = DEEP_RESEARCH_HARNESS run bundle） | 载体 = `research-workspace/drt_<slug>/`（契约 = 研究手册目录约定）；**消歧**：DSH "bundle 行"（cordis.patch.yml 配置行）≠ run bundle（一次调研的变量容器），后者禁缩写成裸 "bundle" |
| 独立预期（金标准） | oracle（测试判定的独立来源——刷新录制不许顺手改写判定标准；record/refresh ≠ 接受新行为） | vendor `docs/testing.md`（verify the world, not the self-report）+ `snapshots/AGENTS.md`；本仓载体 = snapshot-replay C 层渲染金标准 + [tests/AGENTS](../tests/AGENTS.md)「fix fixtures, not normalizers」 |
| 真实组合 | real composition（经 Loader 与真实入口组合，只 mock 外部服务/非确定输入；mock-only 单测证明不了组合成立） | vendor `docs/testing.md`（test the real entry path）；本仓载体 = L1 真挂载 + L2 安装域 |
| 语义评审（对抗自审） | semantic review（意图-实现-文档-证据对齐的判断层，可由 agent 执行，不可机械化） | vendor `dsh-code-review` skill；本仓载体 = [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) + 收尾对账（[guides/60 §4](guides/60-dev-loop.md)） |

## 外部研究材料登记（repo 外，只读引用；**钉版** = 路径 + 引用时的 HEAD commit）

钉版纪律（_agent_ready_development 语料吸纳）：repo 外引用必须能以固定身份复核。本机参考仓
以 `路径 @ <short sha>` 记录；复核 = `git -C <路径> log -1 --format=%H` 与下表比对，不一致
即"上游已前进、结论待复核"（重审触发路径见 [discipline-map](discipline-map.md#重审触发路径)）。

| 材料（钉版身份） | 内容 | 吸收落点 |
|---|---|---|
| `/Users/bowhead/ai_tool_deepresearch/` @ `24ba84636` | 11-phase 生命周期 / wave 语义 / gate 体系 / 证据四层 / 反伪造教训 | [考古报告](../notes/implemented/2026-09-24-deep-research-harness-analysis.md) → 映射表 design/30 |
| `/Users/bowhead/ai_dsh_company/` @ `59551f2`（2026-10-09 钉版复核重钉） | 包结构 / patch 语法 / preset 教义 / verify 门禁 / 双 home / `_backlog` 推敲空间（D31）；vendor 同 pin | [解剖报告](../notes/implemented/2026-09-24-dsh-plugin-repo-anatomy.md) → design/10 + scripts/verify/verify.mjs + dev/env.sh；推敲空间借入 → 根 `_backlog/` + 门禁 `backlog-liveness`（D19/D20）；3cfa8f1→59551f2 逐条重审 = [company 钉版复核 Note](../notes/implemented/2026-10-09-company-repin-review.md)（结论无一被推翻；吸收 handbook-budget 门禁；候选与触发条件见该 Note） |
| DSH 插件生态（vendor 能力目录差集 + 第三方市场/清单；2026-09-25 认真版） | 直接竞品 8 个；**我们差异化 = 多角色 + 证据审计 + Teams = 空白位**（搜索/学术/知识库已饱和不扩） | 认真报告 [dsh-plugin-ecosystem](../notes/implemented/2026-09-25-dsh-plugin-ecosystem.md)（已毕业）；粗扫种子见 [dsh-market-scout](../notes/archived/2026-09-24-dsh-market-scout.md)（冻结）→ 落点即该认真报告 |
| DSH client/UI 扩展面（vendor slots/client-modules/hmr/remotes 正文档 + company client-face 多页签实例〔8 页签〕，2026-09-24 亲读+双代理考古；2026-10-09 钉版复核校正页签计数与通道名） | 右栏平台页签契约（sidebarRightTabs + sidebar.right.pane.tab 双半注册）/ 数据通道（agentTeam 投影〔sessions 座位，rc.2 起；旧名 remote.agentTeams.view〕·session.follow·workspaceFiles·@Remote）/ 双半 tsdown 构建契约 / 12 坑 | [琢磨稿](../notes/archived/2026-09-24-ui-observability-surfaces.md)（选项 A–D + 渐进路径 + D7/搁置池张力，已归档）——已落地为观察面 client 面（D18，构成正本 = [design/40](./design/40-research-cockpit.md)）：RFC = [observability-gui](../notes/implemented/2026-09-24-observability-gui.md) |
| DSH SDLC reference（`/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/` @ `efdba905b2`，2026-09-24 亲读 01-agent-note-lifecycle） | Agent Note 生命周期：决定覆盖（非提案优先）/ 取代检查硬触发 / 毕业正文改写 / alternatives 必载 / grandfather 条款 / 目录树代替索引 | [notes/README.md §决定覆盖与取代检查](../notes/README.md) + verify 门禁 note-format + [吸纳 Note](../notes/implemented/2026-09-24-note-lifecycle-absorption.md) |
| **`_agent_ready_development/` 全语料** @ `efdba905b2`（三视角 37 篇 + `_coverage` 维护页 + 语料 verify.mjs，2026-09-25 全文通读；语料自身钉 DSH `dsh-v0.1.7-rc.1`） | 开发 harness 原理（知识归属/载体分工/参与阶梯/分层反馈/运行时查询/仓库分类学/插件作者入口）+ 语料级门禁（锚点、目录 README、钉版外链）+ 维护页（re-pin 轮次与重审触发） | [吸纳 Note](../notes/implemented/2026-09-25-agent-ready-absorption.md)（三态清单）→ `.agents/skills/`（四个开发技能）、[guides/62](./guides/62-plugin-authoring.md)、[discipline-map](./discipline-map.md) 源 6–8、[notes/README](../notes/README.md)，新门禁 `md-anchors` / `note-status` / `dev-skill-format` |
| **`_digested/test-strategy/`** @ `639ed01539`（DSH 测试体系消化 11 篇：思想九教义 / 七层证据形态 / 快照机制 / CI 防假绿 / 可靠性纪律 / 插件测试五台阶；语料自报基线 = 本仓 vendor pin 同 commit——pin bump 后随 [discipline-map 重审触发路径](discipline-map.md#重审触发路径) 更新对账） | 测试策略增量吸收 | [采纳 Note](../notes/implemented/2026-10-04-test-strategy-adoption.md)（对照总账正本）→ [discipline-map 源 10](discipline-map.md)、[guides/62 §自写代码证据阶梯](guides/62-plugin-authoring.md)、[scripts/AGENTS §冒烟脚本可靠性纪律](../scripts/AGENTS.md)、[tests/AGENTS](../tests/AGENTS.md) |
| `/Users/bowhead/ai_dsh_assitant/` @ `202a27b`（2026-10-10 复核重钉；notes/ SDLC 治理：notes/README = 分类 owner + §二之三 test-first 证据环——四条纪律〔第 3 条上游 2026-10 改述为证据由交付记录承载〕+ 复发升格触发器已移居其复发追踪 Note；同日与 D23 同源定调的姊妹仓独立落地） | notes/README 门牌节 + 验收门四条硬边界（未成熟不进实施 / 掩盖修法禁 / 未验不得写 implemented / 复发升门禁） | [D23 Note](../notes/implemented/2026-10-05-item-lifecycle-tdd.md)（强化段）→ [guides/60 §0 验收门](guides/60-dev-loop.md)、[notes/README §执行纪律](../notes/README.md)；2026-10-10 复核 = [外部钉版债复核材料](../_backlog/research/2026-10-10-external-repin-review.md)（本仓落点零修改） |
| `/Users/bowhead/ai_dsh_assitant/_backlog/` @ `202a27b`（外部材料参考仓快照；非 vendor pin；2026-10-10 随上行走廊一并重钉） | 问题澄清优先、按需方法、证据/问题/交接分层、大小按决策依赖控制；本仓适配 = 会话内 plan/todo 组织实施、日期命名与 notes 对齐、复用本地证据命令与单人仓文件载体 | [Backlog 方法论吸收 Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) → `_backlog/` owner 与 [intent carriers](design/60-intent-carriers.md)；外部 commit 仅作参考版本，不进入 vendor pin 一致性 |
| **`_dsh_plugin_agent_ready_development/`** @ `ad6f5319dc`（2026-10-10 复核重钉；二代语料，换代重写：面向独立 DSH 插件仓的三卷——native-development-model / sdlc-reference / repo-harness + `_coverage` 维护页 + 语料自测 verify.test.mjs；2026-10-07 全文通读；语料自钉 DSH `dsh-v0.2.0-rc.2` = 本仓 vendor pin 同版；一代语料 2026-09-25 已吸纳） | 独立插件仓开发闭环（外部结果先行 / owner 路由 / 条件性记录 / 完整垂直切片 / 测试观察真实对象 / 安装形态验证 / 语义评审四角色）+ 完成判断公理（能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准）+ 主仓精确条款与适用边界 | [吸收审计毕业 Note](../notes/implemented/2026-10-07-dsh-plugin-corpus-absorption.md)（三态表 + 三缺口）→ discipline-map 源 11、[evaluation §完成判断四分离](evaluation.md)、`.agents/skills/reviewing-a-delivery`、`scripts/smoke/gates-smoke.mjs` + `tests/verify-gates.test.mjs`；2026-10-10 复核（24 提交六吸收面结论维持）= [外部钉版债复核材料](../_backlog/research/2026-10-10-external-repin-review.md) |
