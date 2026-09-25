# 00 · 文档地图、组织原则与决策台账

本目录是"DSH Deep Research 插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`。

## 文档组织原则

**docs/ 按"性质"分层，不按"时间"分层**（沿 ai_dsh_company D10）：时间维度的东西（初始意图、
提案、已废方案）住 `notes/`；按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 合同 | [evaluation.md](./evaluation.md) | **验收怎么判**（五面） | 活（变更须 D 号） |
| 设计 | `design/` | **为什么**：机制依据、方案取舍 | 稳定；被推翻时归档并记 D 号 |
| 计划 | 根 `roadmap.md` | **接下来**：队列 | 被实现逐条吞掉（完成即离队） |
| 指南 | `guides/` | **怎么操作**：开发环 | 活（随操作方式演进） |

## 文档地图

| 文档 | 层 | 回答什么 |
|---|---|---|
| [evaluation.md](./evaluation.md) | 合同 | 评估五面（L0 结构/L1 挂载/L2 安装/L3 领域/L4 交付）与里程碑矩阵——**先于框架定案** |
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（单包四角色）；通道选型（agent-team 主通道）；工具面；偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 设计 | 四角色内容：职责 owner 表、persona 要素、skills 清单、信噪比策略落点 |
| [design/30-methodology-mapping.md](./design/30-methodology-mapping.md) | 设计 | **方法论映射**：codex Deep Research harness 内核 → DSH 载体（L3 领域面的核心载体） |
| [AGENTS.md](./AGENTS.md) | 指令 | **文档标准**（`docs/` 子树）：层级归属（一个事实一个家）/ 写作规则 / slop 清单 / 预算处置序——上游 `docs/AGENTS.md` 同构 |
| [alignment-ledger.json](./alignment-ledger.json) | 合同 | **对齐台账（机读）**：vendor/dsh harness 源面 80 条逐项结论（adopted/adapted/na + 落点 + 理由）；门禁 `align-ledger` 对账（source 在 vendor 存在 / 落点存在 / na 有理由）——人读视图 = discipline-map 源 1–9 |
| [discipline-map.md](./discipline-map.md) | 合同 | **纪律全量枚举**：vendor 逐源三态表（照搬/带证据适配/不适用+理由）——AGENTS §纪律的正本（随 vendor 换 tag 重校） |
| [根 roadmap.md](../roadmap.md) | 计划 | 队列（条目按主题命名、完成即离队）+ 搁置池 |
| [guides/60-dev-loop.md](./guides/60-dev-loop.md) | 指南 | 开发环：六步闭环、面选择表、双 home、密钥 |
| [guides/61-run-playbook.md](./guides/61-run-playbook.md) | 指南 | **run 操作指南**（研究发起人入口）：boot-run、lead 会话、HITL 两点、观察面——run 通道（research profile：本包 + vendor agent-team-profile 层，P1 定案）的使用面 |
| [guides/62-plugin-authoring.md](./guides/62-plugin-authoring.md) | 指南 | **插件作者入口**（改插件内容的人/agent 入口）：DSH 词汇对齐（plugin/bundle/profile/preset）、参与阶梯 L0–L3、新行为归属、范本与证据义务——上游 `docs/user/develop/**` 的本仓投影 |

## 决策台账

> 编号空间：本表 D 号 = 本仓决策；引用他仓决策必须带仓前缀（company D15/D18/D23 =
> `ai_dsh_company` 台账，vendor 出处直指 vendor 树）——裸 D 号一律指本表。

### 已定（写代码前不再讨论）

| # | 决定 | 依据/出处 |
|---|---|---|
| D1 | **自写包 = 1 个**（`deep-research-pack`）；行多包少，角色是 preset 目录不是包 | company D1 同构；[10-architecture](./design/10-architecture.md) |
| D2 | **角色 = 4 个**：Lead（主编）/ Scout（侦察）/ Analyst（分析）/ Critic（核查）；wave2 综合归 Lead（最薄队形；专职 synthesizer 视 run 实测再拆）。**角色清单的事实源 = 盘上 `packages/deep-research-pack/presets/` 目录**（基础整治 §3.2）：JS 消费点经 `scripts/lib/roles.mjs` 枚举、bash 用目录枚举，硬编码清单被 verify 门禁 `role-list-sync` 咬；增删角色 = 推翻本条，先登记新 D 号（tests 数量哨兵会拦） | 用户指令（多角色分工）；[20-roles](./design/20-roles.md) |
| D3 | **协作主通道 = Agent Teams**（spawn_teammate 组队 + 任务板）；单点快捷查证走 one-shot subagent——续驶语义归 team（company D18 实证边界：team-scoped 会话里 continuable child 不可达，不重蹈） | 用户指令；company D18；[10-architecture §3](./design/10-architecture.md) |
| D4 | **方法论内核 = codex harness 考古十条**（两 HITL 锚点 + 三波 + 证据身份链 + 声明式质量门 + 反伪造审计）；markdown 控制面/CLI 状态机/手工队列**弃用**，DSH 原生载体承接 | [方法论映射](./design/30-methodology-mapping.md)；[harness 考古报告](../notes/research/2026-09-24-deep-research-harness-analysis.md) |
| D5 | **证据身份链 = 唯一自建残留**：evidence frontmatter 文件契约 + critic 狩猎，不做 CLI 引擎（完成判定锚定文件事实而非账本外观——codex 教训 1 的轻量等价物） | [30 §证据身份链](./design/30-methodology-mapping.md)；evaluation.md L3 判据 3 |
| D6 | **评估先行**：docs/evaluation.md 五面合同先于框架定案；完成定义 = 该面最小真检查；goal complete 的唯一条件 = 里程碑矩阵全绿 | 用户指令；company D15 |
| D7 | **首版 = 纯配置包**：pack 内零自写 JS、零构建、无 client 面；UI 用现成 `ui-agent-team`。**边界澄清（基础整治 §3.7 补）**：约束对象是 `packages/deep-research-pack/`（发布产物）；仓级 `scripts/`、`tests/` 的工具 JS（verify/roles/run-dashboard 等）不受此限，构建链另见队列「观察面 GUI 化」 | company D5 同教义（第 0 天零自定义 JS） |
| D8 | **迭代单位 = 垂直轮 + 八成把握先行**：最薄全路径先行 → 逐轮加宽；不追求一次想透 | 用户指令（迭代纠错优先于完美规划）；company D11 |
| D9 | **web 工具行（已实证）**：模型面 `tool-web` 行随 preset（config 照抄 base：`fetch: true` + 60s 超时）；providers（web seam / web-search-deepseek / web-fetch-http）是 base host 面出厂行，不进本包 bundle 也不随 preset；DeepSeek 搜索 `apiKeyEnv: DEEPSEEK_API_KEY` 与 chat 同钥匙 | [10 §4](./design/10-architecture.md)；[web-tool-rows 毕业 Note](../notes/implemented/2026-09-24-web-tool-rows.md) |
| D10 | **vendor submodule 延后**：首版无构建需求（纯配置包）；机制权威暂借 `/Users/bowhead/ai_dsh_company/vendor/dsh`（同一钉住 tag，只读）；verify 的 vendor-pin 门禁随队列条目启用 | [偏离登记](../notes/implemented/2026-09-24-r1-scaffold.md)；队列「vendor-submodule-and-pnpm-dsh」 |
| D11 | **队列制 roadmap**：纯队列——条目按主题命名（feature/卫生/研究三型）、完成即离队（历史归 notes/ + git）；▶ = 全仓唯一"当前"指针 | 用户指令；inround-task-surface 精神；[根 roadmap 头注](../roadmap.md) |
| D12 | **队列与 RFC 分家**：队列行只做有序索引（每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住 notes/proposed/ 一文件一条目；毕业 = 迁 implemented/ + 删行 | 用户指令；[proposed/README.md](../notes/proposed/README.md) |
| D13 | **status rots 拆除**：时变状态（当前条目/跑到哪了）不住 docs——docs 只写 now，全仓唯一"当前"指针 = roadmap ▶ | 用户指令（[intents 第 6 条](../notes/intents.md)）；[evaluation.md §3 尾注](./evaluation.md) |
| D14 | **preset-smoke 双通道**：源码域（web 出厂 profile + overlay 指向本仓 presets 源码，迭代快）+ 安装域（`--profile <p> --no-patch` 走 plugin add 正式路径）；断言同构（roster/逐角色 create/skills 隔离），L1 用前者、L2 用后者；boot 必须起自 company 钉 tag 源码（tsx 解析树），overlay/roots 用绝对路径 | [L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md) |
| D15 | **release-smoke 形状**：照 company release.md 五步（pack → 干净 profile 先删后建 → `plugin --profile add file:` → manifest 断言 → 安装域冒烟）；工具态（npm cache/pnpm store）全重定向进 repo gitignored 区；peers 是声明语义（安装锚兜底解析，非安装要求） | 同上 |
| D16 | **团队组合归 vendor agent-team-profile 层**（P1 A 定案）：run 通道 profile 装 `@…-agent-team-profile@<pin>`（版本从 pack 兼容矩阵同源派生，`dev/boot-run.sh` 执行）；本包 bundle 撤 agent-team / tool-agent-team 两行（同行 id 双 insert = 重复行，实证）；ui-agent-team 观察行留本包；三 preset 的 tool-subagent 声明 **one-shot** 对齐 company D18（差分实验实证 preset 行覆盖 profile 行——不对齐则层禁令被自家声明抵消；D3 原文"one-shot subagent"的漂移顺带修复） | [P1 毕业 Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md)；[10 §2/§3](./design/10-architecture.md)；[61 指南](./guides/61-run-playbook.md) |
| D17 | **harness / run bundle 分离**（`研究报告 = harness(bundle)`）：harness（pack+手册+templates+docs/notes）只读、零 per-run 状态、run 期间零写入；run bundle = `research-workspace/drt_<slug>/`（一调研一 bundle，drt = Deep Research Topic，目录名即方向），持全部变量（判定式：恢复这次研究所需）；rerun 三分（表述修订 polish 版本不变 / 证据扩张 final/ 下一版 / 结构性另起新 bundle+sibling 预检）；框架文档不出现具体题目 | 用户拍板（2026-09-24，源头 DEEP_RESEARCH_HARNESS 概念比对后定）；[10 §1 第一性分层](./design/10-architecture.md)；[Note](../notes/implemented/2026-09-24-run-bundle-drt-separation.md) |

### 待定（阻塞项标 ⛔）

| # | 问题 | 归宿 |
|---|---|---|
| ~~Q2~~ | ~~agent-team spawn_teammate 成员会话的 preset 组合~~ **已销账（2026-09-25 run 实测）**：成员挂 roster 默认 preset（`agentPreset:"lead"` 原样在案）+ 角色人格经 lead spawn prompt 传达且行为生效（scout/analyst 按章程行事）；D18 复核 = team 语境 one-shot subagent 可用（本仓 vendor 探针 ×2 PASS），continuable 边界维持 company 结论 | [m2-run-mechanics §实施记录](../notes/implemented/2026-09-24-m2-run-mechanics.md)；[P2 Note](../notes/implemented/2026-09-24-m2-p2-team-preflight.md) |
| ~~Q4~~ | ~~专职 synthesizer 是否独立成角色~~ **已销账（2026-09-25 run 实测）**：lead 独任综合无过载（journal 两次调度决策干净落地；标准报告 4 topic 规模）——不拆角色，搁置池条目维持搁置 | [m2-run-mechanics §实施记录](../notes/implemented/2026-09-24-m2-run-mechanics.md) |
| ~~Q5~~ | ~~多 analyst 并行时的 topic 争用~~ **已销账（2026-09-25 run 实测）**：无争用——T1 中途改派经 lead 调度干净落地，单 owner + 任务板纪律足够 | [m2-run-mechanics §实施记录](../notes/implemented/2026-09-24-m2-run-mechanics.md) |
| ~~Q6~~ | ~~floor 数值门禁是否需要机械化~~ **已销账（2026-09-25 run 实测）**：不需要——critic 散文审查实际抓出三根钉子（"2–4 年"无来源/"1.56×"平台不对称/"国产高 16%"口径）即质量证据；数值 floor 维持搁置 | [m2-run-mechanics §实施记录](../notes/implemented/2026-09-24-m2-run-mechanics.md) |

（已销账：Q1 → D9（[web-tool-rows Note](../notes/implemented/2026-09-24-web-tool-rows.md)）；Q3 → D15（[L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md)）。2026-09-24。Q2/Q4/Q5/Q6 → run 实测，2026-09-25。）

## 术语映射（本项目 ↔ DSH 官方 ↔ vendor/dsh 源码）

| 本项目 | DSH 官方 | vendor/dsh 落点 |
|---|---|---|
| 研究角色（Lead/Scout/Analyst/Critic） | agent preset（`presets/<id>/`：preset.yml + agent.cordis.yml[persona 行/skills/工具行] + skills/） | `packages/preset/agent-presets` + `packages/preset/persona` |
| 研究团队 / 组队 | Agent Teams（`spawn_teammate` / 任务板，experimental；**组合层 = vendor agent-team-profile**，D16） | `packages/experimental/agent-team` + `tool-agent-team` + `agent-team-profile` + `docs/subsystems/agent-team.md` |
| 研究工人（一次性查证） | one-shot/continuable subagent（`dsh-tool-subagent`, spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 研究方法论的载体 | skill（`presets/<role>/skills/<n>/SKILL.md`，硬隔离） | `packages/skill/skill-filesystem` |
| web 搜索/抓取 | `dsh-tool-web` + search/fetch provider | `packages/web/tool-web` + `web-search-deepseek` + `web-fetch-http` |
| 成品交付 | `present` 工具 explicit deliveries | `packages/fs/tool-present` + `client/ui-deliverables` |
| 研究工作区 | 会话 cwd + `agent-instructions` 注入手册 | `packages/context/agent-instructions` |
| 开发 harness / 运行 harness | development harness / runtime harness（同一仓库的两面：前者让 agent 看懂、修改、验证自己；后者是产品运行框架） | 本仓两面并存：`packages/deep-research-pack/` 是 runtime 面，`AGENTS.md` + `docs/` + `notes/` + `.agents/skills/` + 门禁是 development 面 |
| 参与阶梯 | participation ladder（L0 组合 → L1 扩展点 → L2 capability seam → L3 core loop） | [guides/62 §参与阶梯](./guides/62-plugin-authoring.md)（本仓版本：L0 配置行 / L1 preset+skill / L2 尚无 / L3 归上游） |
| 程序化工作记忆 | procedural memory（可复用工作流 + 专门判断标准） | `.agents/skills/`（开发技能：毕业条目 / 加角色 / 写门禁 / 跑 run）——与产品内 runtime skills（`presets/*/skills/`）严格分家 |
| plugin / bundle / profile | plugin = 导出 `apply(ctx)` 的模块；bundle = 你编写与分发的单位（`dsh.bundle`）；profile = 用户 `dsh --profile` 启动的环境（`dsh.profile`）——**Nothing is both** | bundle = `packages/deep-research-pack/cordis.patch.yml`；profile = `dev/harness-home/profiles/research/`（镜像；源 = `dev/research.overlay.yml`） |
| run bundle（一次调研的变量容器） | —（本仓原生概念，源头 = DEEP_RESEARCH_HARNESS run bundle） | 载体 = `research-workspace/drt_<slug>/`（契约 = 研究手册目录约定）；**消歧**：DSH "bundle 行"（cordis.patch.yml 配置行）≠ run bundle（一次调研的变量容器），后者禁缩写成裸 "bundle" |

## 外部研究材料登记（repo 外，只读引用；**钉版** = 路径 + 引用时的 HEAD commit）

钉版纪律（_agent_ready_development 语料吸纳）：repo 外引用必须能以固定身份复核。本机参考仓
以 `路径 @ <short sha>` 记录；复核 = `git -C <路径> log -1 --format=%H` 与下表比对，不一致
即"上游已前进、结论待复核"（重审触发路径见 [discipline-map](discipline-map.md#重审触发路径)）。

| 材料（钉版身份） | 内容 | 吸收落点 |
|---|---|---|
| `/Users/bowhead/ai_tool_deepresearch/` @ `24ba84636` | | 11-phase 生命周期 / wave 语义 / gate 体系 / 证据四层 / 反伪造教训 | 考古报告 `notes/research/2026-09-24-deep-research-harness-analysis.md` → 映射表 design/30 |
| `/Users/bowhead/ai_dsh_company/` @ `555215d` | | 包结构 / patch 语法 / preset 教义 / verify 门禁 / 双 home / 垂直轮 | 解剖报告 `notes/research/2026-09-24-dsh-plugin-repo-anatomy.md` → design/10 + scripts/verify.mjs + dev/env.sh |
| DSH 插件生态（vendor 能力目录差集 + 第三方市场/清单，2026-09-24 快照） | workflow / mcp / session-query / compaction 等未采用能力；第三方 280+ 插件（14 类，未亲装） | 粗扫报告 `notes/research/2026-09-24-dsh-market-scout.md` → 认真琢磨 = 后续 research 条目（用户定节奏） |
| DSH client/UI 扩展面（vendor slots/client-modules/hmr/remotes 正文档 + company client-face 五页签实例，2026-09-24 亲读+双代理考古） | 右栏平台页签契约（sidebarRightTabs + sidebar.right.pane.tab 双半注册）/ 数据通道（agentTeams.view·session.follow·workspaceFiles·@Remote）/ 双半 tsdown 构建契约 / 12 坑 | 琢磨稿 `notes/research/2026-09-24-ui-observability-surfaces.md`（选项 A–D + 渐进路径 + D7/搁置池张力 + 队列条目草案——用户推敲中，未入 roadmap） |
| DSH SDLC reference（`/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/` @ `efdba905b2`，2026-09-24 亲读 01-agent-note-lifecycle） | Agent Note 生命周期：决定覆盖（非提案优先）/ 取代检查硬触发 / 毕业正文改写 / alternatives 必载 / grandfather 条款 / 目录树代替索引 | [notes/README.md §决定覆盖与取代检查](../notes/README.md) + verify 门禁 note-format + [吸纳 Note](../notes/implemented/2026-09-24-note-lifecycle-absorption.md) |
| **`_agent_ready_development/` 全语料** @ `efdba905b2`（三视角 37 篇 + `_coverage` 维护页 + 语料 verify.mjs，2026-09-25 全文通读；语料自身钉 DSH `dsh-v0.1.7-rc.1`） | 开发 harness 原理（知识归属/载体分工/参与阶梯/分层反馈/运行时查询/仓库分类学/插件作者入口）+ 语料级门禁（锚点、目录 README、钉版外链）+ 维护页（re-pin 轮次与重审触发） | [吸纳 Note](../notes/implemented/2026-09-25-agent-ready-absorption.md)（三态清单）→ `.agents/skills/`（四个开发技能）、[guides/62](./guides/62-plugin-authoring.md)、[discipline-map](./discipline-map.md) 源 6–8、[notes/README](../notes/README.md)，新门禁 `md-anchors` / `note-status` / `dev-skill-format` |
