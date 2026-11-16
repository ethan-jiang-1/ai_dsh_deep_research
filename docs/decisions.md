# 决策台账（D 号）

> [00-index](./00-index.md) 的路由层：**一处事实一个家**（[D56](#d56)）——每行 ≤100 字结论 + 活载体链接（合同在 docs/，理由与输掉的方案在 notes/）。
> 行首 `<a id="dN"></a>` 锚点，引用写 `[D18](./decisions.md#d18)`；被完整取代的 D 号移入 [§已退役](#已退役)。
> 修订既有 D 号 = 触发 notes 取代检查；机械判据 = `tests/checks/decisions-now.test.mjs`（含 16KB 硬顶）。

## 已定（写代码前不再讨论）

| # | 决定 | 依据/出处 |
|---|---|---|
| <a id="d1"></a>D1 | **自写包 = 1 个**（`deep-research-pack`）；角色是 preset 目录，不是包 | [10](./design/10-architecture.md) |
| <a id="d2"></a>D2 | **角色 = 5 个**：Lead / Scout / Analyst / Critic + Method Editor（非研究角色，D37）；清单事实源 = 盘上 `presets/` | [20](./design/20-roles.md) · [roles.mjs](../scripts/lib/shared/roles.mjs) |
| <a id="d3"></a>D3 | **协作主通道 = Agent Teams**；单点查证走 one-shot subagent；preset 钉默认通道 = 部署层预授权 | [10 §3](./design/10-architecture.md) |
| <a id="d4"></a>D4 | **方法论内核 = codex harness 考古十条**；不采纳 markdown 控制面与 CLI 状态机，不建仓库 markdown 队列 | [30](./design/30-methodology-mapping.md) · [考古](../notes/archived/2026-09-24-deep-research-harness-analysis.md) |
| <a id="d5"></a>D5 | **证据身份链 = 唯一自建残留**：evidence frontmatter 文件契约 + critic 狩猎，不做 CLI 引擎 | [30](./design/30-methodology-mapping.md) · [evaluation](./evaluation.md) |
| <a id="d6"></a>D6 | **评估先行**：五面合同先于框架；完成定义 = 该面最小真检查 | [evaluation](./evaluation.md) · [60](./guides/60-dev-loop.md) |
| <a id="d7"></a>D7 | **包默认零自写 JS、零构建**；有界例外 = 研究驾驶舱双半（D18）+ 抓取回退 provider（D31）；仓级工具 JS 不受限 | [10](./design/10-architecture.md) · [D18](#d18) · [D31](#d31) |
| <a id="d8"></a>D8 | **迭代单位 = 垂直轮 + 八成把握先行**：最薄全路径先行，逐轮加宽 | [CONTRIBUTING](../CONTRIBUTING.md#development-charter) · [60](./guides/60-dev-loop.md) |
| <a id="d9"></a>D9 | **web 工具行随 preset**（config 照抄 base）；providers 是 base 出厂行，不进本包；选择 = D30 | [10 §4](./design/10-architecture.md) · [Note](../notes/archived/2026-09-24-web-tool-rows.md) |
| <a id="d10"></a>D10 | **vendor submodule = 机制权威**：只读铁律；机制核对一律走它，全局安装不作依据 | [evaluation L0](./evaluation.md#l0-结构面机械门禁keyless) · [10 §1](./design/10-architecture.md) |
| <a id="d11"></a>D11 | **工作由用户请求授权**；复杂工作用会话内 plan/todo，不设仓库任务队列 | [Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) · [60](./guides/60-dev-loop.md) |
| <a id="d12"></a>D12 | **RFC 按持久决定需要使用**，不是实施工作的普遍前置 | [Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) · [notes 规则](../notes/AGENTS.md) |
| <a id="d13"></a>D13 | **status rots 拆除**：docs 只写 now；当前工作由用户本轮请求决定，不由文档状态决定 | [evaluation](./evaluation.md) · [立项来历](../notes/README.md) |
| <a id="d14"></a>D14 | **preset.e2e 双通道**：源码域（L1）+ 安装域（L2）；断言同构 | [evaluation](./evaluation.md) · [preset.e2e](../scripts/smoke/preset.e2e.mjs) · [Note](../notes/archived/2026-09-24-l1-l2-green.md) |
| <a id="d15"></a>D15 | **release.entry 五步形状**：pack → 干净 profile → plugin add → manifest 断言 → 安装域冒烟 | [release.entry](../scripts/smoke/release.entry.mjs) · [evaluation](./evaluation.md) · [Note](../notes/archived/2026-09-24-l1-l2-green.md) |
| <a id="d16"></a>D16 | **团队组合归 vendor agent-team-profile 层**；bundle 不带团队行；tool-subagent 声明 one-shot | [10 §2/§3](./design/10-architecture.md) · [61](./guides/61-run-playbook.md) · [Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md) |
| <a id="d17"></a>D17 | **harness / run bundle 分离**：harness 只读、零 per-run 状态；run bundle = `drt_<slug>/` 持全部变量 | [10 §1](./design/10-architecture.md) · [手册](../packages/deep-research-pack/content/manual.md) · [Note](../notes/archived/2026-09-24-run-bundle-drt-separation.md) |
| <a id="d18"></a>D18 | **观察面 client = D7 第一处有界例外，套件名研究驾驶舱**；用途限定观察/调试，品牌皮肤不纳入 | [40](./design/40-research-cockpit.md) · [RFC](../notes/implemented/2026-09-24-observability-gui.md) · [琢磨稿](../notes/archived/2026-09-24-ui-observability-surfaces.md) · [ui-skin 否决](../notes/rejected/2026-09-24-ui-skin.md) |
| <a id="d19"></a>D19 | **问题澄清与证据区 = `_backlog/`**：不是实施前置门，不授予实施授权 | [_backlog](../_backlog/README.md) · [Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) · [D24](#d24) |
| <a id="d20"></a>D20 | **不设独立 roadmap 或仓库任务队列**；执行顺序由会话内 plan/todo 表达 | [60](./guides/60-dev-loop.md) · [Note](../notes/implemented/2026-10-09-backlog-methodology-absorption.md) |
| <a id="d21"></a>D21 | **入口按意图分流（“用它” vs “改它”）**；含糊时判据 = 目标 DSH home | [00-index](./00-index.md) · [Note](../notes/archived/2026-09-29-cold-start-intent-router.md) |
| <a id="d22"></a>D22 | **对外交付不引入用户侧外部服务依赖**：外部账号 / key / 付费订阅一律不过关 | [10 §6](./design/10-architecture.md) · [Note](../notes/archived/2026-10-02-mcp-playwright-adoption.md) |
| <a id="d23"></a>D23 | **条目级验收 TDD 化**：判据逐条绑定检查方式，能机械的先红后绿并载证据 | [60](./guides/60-dev-loop.md) · [Note](../notes/archived/2026-10-05-item-lifecycle-tdd.md) |
| <a id="d24"></a>D24 | **backlog 制度显性化**：入口两票、`修复就绪` 授权、五道门、审查分层；`待落地` 只选去向 | [_backlog/AGENTS](../_backlog/AGENTS.md) · [Note](../notes/implemented/2026-10-12-backlog-process-borrow.md) · [流水线](../notes/archived/2026-11-02-backlog-pipeline.md) |
| <a id="d25"></a>D25 | **研究配置中继面**：管理指令经 Lead；写库唯一路径 = Method Editor 窄 host 工具，面板不直写 | [40 §2.6](./design/40-research-cockpit.md) · [Note](../notes/implemented/2026-10-12-research-config-tab.md) |
| <a id="d26"></a>D26 | **测试栈偏离 vendor：node:test 而非 vitest**；verify 用 regex 断言 | [tests/AGENTS](../tests/AGENTS.md) · [Note](../notes/implemented/2026-09-24-vendor-submodule.md) |
| <a id="d27"></a>D27 | **参与阶梯编号 = S0–S3**（避开评估面 L0–L4 前缀撞车） | [62](./guides/62-plugin-authoring.md) · [docs/AGENTS](./AGENTS.md) · [Note](../notes/archived/2026-10-21-six-dim-hygiene-round.md) |
| <a id="d28"></a>D28 | **run bundle 状态 = 内容，位置 = 操作桶**；在飞/archive/_abandoned 只用于发现与展示 | [50](./design/50-agent-loop-and-state.md) · [宪章卡](../_backlog/_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md) |
| <a id="d29"></a>D29 | **可读终稿层**：critic PASS 后 Lead 写 `final/readable.md`，与 canonical 一起 present | [Note](../notes/implemented/2026-10-23-reader-final.md) · [手册](../packages/deep-research-pack/content/manual.md) |
| <a id="d30"></a>D30 | **检索底座 = DeepSeek Search API 搜索 + 本地 http 抓取**；bundle `- id: web` 替换行钉两项选择 | [10 §4](./design/10-architecture.md) · [Note](../notes/implemented/2026-10-27-deepseek-search-api-retrieval.md) |
| <a id="d31"></a>D31 | **抓取回退 provider = D7 第二处有界例外**：本地失败再补 DeepSeek Fetch API；仅 fetch，阻断类不回退 | [10](./design/10-architecture.md) · [Note](../notes/implemented/2026-10-27-fetch-fallback-provider.md) |
| <a id="d32"></a>D32 | **时间原生化**：五个 preset 各挂 `dsh-time-context` 时钟行；读数不替代证据卡 `retrieved_at` | [lead preset](../packages/deep-research-pack/presets/lead.patch.yml) · [Note](../notes/implemented/2026-10-28-data-plane-hardening.md) |
| <a id="d33"></a>D33 | **run bundle 契约版本整数化**：`run.md` 用 `schema: 2` + `created`；写了 schema 就按现行从严 | [50](./design/50-agent-loop-and-state.md) · [Note](../notes/implemented/2026-10-28-data-plane-hardening.md) |
| <a id="d34"></a>D34 | **交付承诺与数据现实对齐**：回执三态、数据卡 `可移植` 列、方法库 = 本工作区 | [65](./guides/65-run-forms.md) · [README](../packages/deep-research-pack/README.md) · [Note](../notes/implemented/2026-10-28-data-plane-hardening.md) |
| <a id="d36"></a>D36 | **交付见证 = `delivered.json` 哈希 + present 事件**；`manifest.json` 只是目录快照，不是见证 | [50](./design/50-agent-loop-and-state.md) · [Note](../notes/implemented/2026-10-28-data-plane-hardening.md) |
| <a id="d37"></a>D37 | **第 5 个 preset = Method Editor**（非研究角色）：窄 host 工具写库，页面按钮触发，面板不直写 | [20 §5](./design/20-roles.md) · [40](./design/40-research-cockpit.md) · [卡](../_backlog/_archived/settled_issues/2026-10-28-method-library-cocreation.md) |
| <a id="d40"></a>D40 | **交付 = bundle + 自建 custom profile `deep-research` + 启动期工作区**；无 launcher/scaffold，只留只读 doctor | [65](./guides/65-run-forms.md) · [Note](../notes/implemented/2026-11-02-release-model-terms.md) · [D42](#d42) |
| <a id="d41"></a>D41 | **交付模型术语收口**：合同文档只用 DSH 对象词；不自称 Harness 发行版 | [65](./guides/65-run-forms.md) · [terms](./terms.md) · [Note](../notes/implemented/2026-11-02-release-model-terms.md) |
| <a id="d42"></a>D42 | **当前安装事实 = 本地 tarball**；npm / Plugins 页 / Discover 为 staged | [安装手册](../_dist/安装手册.md) · [Note](../notes/implemented/2026-11-10-current-install-fact.md) |
| <a id="d43"></a>D43 | **研究视角层（lens）= 可选、可配对、可查覆盖的证据面数据**；静默空格 = MAJOR + FAIL | [手册](../packages/deep-research-pack/content/manual.md) · [Note](../notes/implemented/2026-11-10-lens-layer.md) |
| <a id="d44"></a>D44 | **claim 级独立复核 = typed verdict + 机械覆盖门**：`verdict-audit` 接 `run-accept` 第三道 | [20](./design/20-roles.md) · [Note](../notes/implemented/2026-11-10-claim-verdict-quality-loop.md) |
| <a id="d45"></a>D45 | **wave 执行 = `lens-fanout` 固定配方**：只脚本化 topic×lens 取证层；HITL 仍两点 | [20 §2](./design/20-roles.md) · [Note](../notes/implemented/2026-11-10-wave-execution-lens-fanout.md) |
| <a id="d46"></a>D46 | **偏好层 Protocol = `protocol.json` canonical + 派生投影**；`protocol-audit` 接 `run-accept` 第四道 | [手册](../packages/deep-research-pack/content/manual.md) · [Note](../notes/implemented/2026-11-11-preference-protocol-layer.md) |
| <a id="d47"></a>D47 | **worker profiles + 路由**：`research-worker`/`research-wave` 住 `workers/`，不计入 4 研究角色 | [20 §0.1](./design/20-roles.md) · [Note](../notes/implemented/2026-11-11-worker-profiles.md) |
| <a id="d48"></a>D48 | **Strategy 投影 + HITL1 typed 输入**：策略是派生视图，不新增 canonical | [手册](../packages/deep-research-pack/content/manual.md) · [Note](../notes/implemented/2026-11-11-strategy-projection.md) |
| <a id="d49"></a>D49 | **默认界面语言 = 中文**（bundle patch 钉 `locale.preference=zh`，profile 可覆盖） | [bundle](../packages/deep-research-pack/cordis.patch.yml) · [Note](../notes/implemented/2026-11-12-default-locale-zh.md) |
| <a id="d50"></a>D50 | **项目研究默认 = workspace `research-defaults.json` + host command**；只存 depth/output/source | [65](./guides/65-run-forms.md) · [Note](../notes/implemented/2026-11-12-project-research-defaults.md) |
| <a id="d51"></a>D51 | **判据不猜，投影不编**：互斥或无法判定 = 红；权威输入 = 结构化事实 | [evaluation](./evaluation.md#verdict-shape) · [Note](../notes/implemented/2026-11-13-verdict-shape.md) |
| <a id="d52"></a>D52 | **加工环路的实体检查 = 字段 + 门**：判据类卡/Note 必填 `## 判据形状`；收口门看暂存区成对判据 | [60](./guides/60-dev-loop.md) · [judgment-design](../_backlog/methods/judgment-design.md) · [Note](../notes/implemented/2026-11-13-workflow-substance-gates.md) |
| <a id="d53"></a>D53 | **测试文件名 = 证据车道**：spec / e2e / entry / checks 四后缀；错后缀或错 lane = 红；新增车道 = 新 D 号 | [67 §6](./guides/67-test-strategy.md) · [tests/AGENTS](../tests/AGENTS.md) · [Note](../notes/implemented/2026-11-13-test-naming-lanes.md) |
| <a id="d54"></a>D54 | **测试制度 = 三环四账五关**：先归失败类，再选最低可见层，类级守卫或显式不可机械化 | [67](./guides/67-test-strategy.md) · [Note](../notes/implemented/2026-11-13-test-strategy-operating-model.md) |
| <a id="d55"></a>D55 | **测试制度 oracle 独立化**：判据锚定独立真值；自指显式入账待迁；修复证据唯一 `json fix-evidence` | [67](./guides/67-test-strategy.md) · [Note](../notes/implemented/2026-11-14-verification-oracle-hardening.md) |
| <a id="d56"></a>D56 | **决策台账纯路由化（一处事实一个家）**：台账只存 ≤100 字结论 + 活载体路由；参数归 docs/ 合同，理由归 notes/ | [docs/AGENTS](./AGENTS.md) · [Note](../notes/implemented/2026-11-14-decisions-routing-ledger.md) |
| <a id="d57"></a>D57 | **维护面三分 = judge / show / operate**：判据 = 主要产出什么；`scripts/` 混装不改名，`run-ops/` 以 show 为主 | [68](./guides/68-surface-contract.md) · [Note](../notes/implemented/2026-11-16-maintenance-surface-taxonomy.md) |

## 已退役

被后续决定完整取代的 D 号只留一行去向；正文与输掉的方案住各自 Note/卡。

| # | 决定（退役） | 现行为 |
|---|---|---|
| <a id="d35"></a>D35 | 种子所有权三态（`seed.json` policy / `scaffold --check`） | 随种子与 scaffold 删除而退役——[D40](#d40)（[数据面收口 Note](../notes/implemented/2026-10-28-data-plane-hardening.md)） |
| <a id="d38"></a>D38 | 插件即产品 = bundle + `dsh-deep-research` launcher + Host 工作区注册 | 由 [D40](#d40) 取代（删 launcher/种子）——[Note](../notes/implemented/2026-11-01-plugin-as-product-v2.md) |
| <a id="d39"></a>D39 | web profile 为主分发、launcher 作可选便利 | 由 [D40](#d40) 取代（入口翻回专用 profile）——[Note](../notes/implemented/2026-11-02-release-model-terms.md) |

### 待定（阻塞项标 ⛔）

当前无待定问题。新开放问题出现时在此登记（`# | 问题 | 归宿` 三列，归宿指向 D 号或
notes/ 文件）。
