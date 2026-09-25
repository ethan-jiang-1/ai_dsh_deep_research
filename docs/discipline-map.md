# discipline-map — DSH 纪律全量枚举（三态表）

> 层：合同（该遵守什么）。本表 = AGENTS.md §纪律首版枚举子集的**全量替换正本**（队列条目
> 「dsh-discipline 全量枚举」2026-09-24 毕业；AGENTS.md 只留指针）。枚举方法 = vendor 逐源
> 清点（"你无法继承你从没清点过的东西"），每行三态：**照搬**（原样继承，带本仓落点）/
> **带证据适配**（语义保留、载体改造，带证据）/ **不适用**（带理由——纯配置仓无该面）。
> 源头 = vendor/dsh submodule（tag dsh-v0.1.7-rc.2，只读铁律）。

## 源 1：vendor 根 AGENTS.md · Conventions

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Model-visible ⟺ logged（进模型请求的输入必须可从会话日志重建） | 会话日志即真相：L4-lite/探针断言全走 zstd 日志逐事件；手册完成判据 = 文件事实 | 照搬 |
| Misconfiguration fails loud（配置错在最早可判定点炸，不静默跳过） | verify 门禁全 fail-loud（清单正本 = evaluation §L0）；boot-run 漂移检测；design/10 记 ENOENT 静默空教训 | 照搬 |
| Files end with exactly one trailing newline | verify 门禁 md-utf8-newline（tracked 全量） | 照搬 |
| Add/update an Agent Note **only for lasting decision rationale**（机械与局部编辑——含本地 UI 呈现/交互——豁免；0.1.7 判据自 0.1.5 的 non-trivial 全量收窄） | AGENTS §notes 写入触发（同 diff）+ notes/AGENTS.md §什么时候必须写 Note + note-format 门禁 | 照搬（判据按 0.1.7 收窄） |
| Plugins, not loop changes（新行为走扩展点，不改 agent-loop） | 本包只经组合面贡献（preset/skill/bundle 行），循环属 DSH 侧 | 带证据适配（纯配置包天然满足；vendor 循环不在本仓改动面） |
| Prefer maintained dependencies over hand-rolling（真能删掉自 owned 代码与测试时） | 测试栈 node:test、zstd 解压 node:zlib、regex 断言——全部维护中的标准件；tsx/pnpm 构建链引入（vendor 落地）而非自造 | 照搬 |
| Tests describe behavior, not correctness（过时行为随测试一起改） | tests/ 契约测试（evaluation-contract 对手册谓词、dashboard 对文件形状）；行为变更同 diff 改锚 | 照搬 |
| No hardcoded tunables（部署可变量必须是 config 字段） | preset 工具行 config（tool-todo allowParallelInProgress、tool-web 超时）皆声明为 config；层版本钉在 pack 兼容矩阵 | 带证据适配（载体 = cordis 行 config 而非代码 Config 类型） |
| TODO 标记分级（FIXME/TODO/XXX 按紧急度） | 沿用（仓内出现时按此分级） | 照搬 |
| Source plane vs artifact plane, never mixed（静态测试走 src，吃构建产物的测试声明依赖） | L1 双通道：preset-smoke 源码域（overlay 指 src）+ 安装域（plugin add 正式路径）；根 tsconfig 门面 = 源码面解析 | 带证据适配（两平面在本仓 = 源码域/安装域两通道，D14） |
| Design each tool's UI presentation up front（呈现先于实现设计） | preset persona/skill 文本 = 工具的行为呈现面，R1 起逐角色先定稿再挂载；观察面 = 先 RFC 后实现（run-dashboard/debug-dashboard-plus 皆然） | 带证据适配 |
| Plan unit/e2e/snapshot coverage for seams | evaluation.md 五面合同（L0–L4）先于框架定案（D6） | 带证据适配 |
| Registrations are effects（一切贡献走 ctx.effect，register 返回 disposer） | 无自写 cordis 插件代码 | 不适用（纯配置包，无 ctx 调用面；DSH 侧机制由 vendor 享有） |
| Runtime invariants assert owned relationships（invariant 包规则） | 同上 | 不适用 |
| Typed events / declaration merging / assertNever / waterfall next() / branded ids / Trust TypeScript / explicit request-spec split / compiler faces | 无 TypeScript 源码 | 不适用（R3+ 若引入 TS 面则重估——vendor-submodule Note 已记 tsconfig 门面就位） |
| ESM everywhere / 包命名与 rescope / cordis peer 约定 | 不发布 npm 包（private pack 经 plugin add 分发） | 不适用 |
| Client UI copy is locale-owned | 无 client UI 代码（观察面 GUI 化条目立项时重估） | 不适用 |
| Choose PR history deliberately / GitHub stacks / Labels taxonomy | 无 GitHub PR 流（本地单仓窄切片提交） | 不适用（等价物 = 窄证据切片 commit 纪律 + pre-commit 门禁） |
| Both SDKs project the loop | 无 SDK 维护面 | 不适用 |

## 源 2：vendor docs/testing.md

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Tiers：keyless（无凭据可跑）与 with-key 分层 | 档位词汇（AGENTS §密钥）：verify/tests/smokes keyless；l4-lite/team-preflight/entry-chain-probe 真模型档 | 照搬 |
| Verify the world, not the self-report | evaluation L4 判据 + 手册完成判据 + 探针留档人工复核 | 照搬 |
| Test the real entry path（发布产物路径） | release-smoke L2：pack → 干净 profile → plugin add → 安装域冒烟 | 照搬 |
| Prefer the real implementation over a mock | L1 真挂载档（真会话断言工具/skill 面——dump/roster 可见不算） | 照搬 |
| The with-key policy: inference is cheap（语义面用真模型证） | 真模型档三脚本；入口链探针 = 语义漂移的真模型检测 | 照搬 |
| Test resolution: source plane only | keyless 回归断言 tracked 源文件（md-utf8-newline 改 git ls-files 驱动即为此则——运行区不扫，live run 实证） | 带证据适配 |
| Snapshot tests（关键用户可见变更更新录制快照） | 无 client/UI 面；等价物 = tests/fixtures（keyless 形状回归）+ 真模型档会话日志断言（zstd 逐事件） | 带证据适配 |
| Test subprocess launch modes（构建产物/源码启动模式分立） | 无构建产物测试面（vendor lib/ 仅机制基线消费） | 不适用 |

## 源 3：vendor docs/AGENTS.md（文档标准）

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Tier 分类法：一处事实一个家（docs 只写 now） | 00-index 组织原则；docs/notes/roadmap 三层分工 | 照搬 |
| Wordcount budgets（入口文件行数顶） | verify 门禁 entry-budget（AGENTS ≤145 / README ≤30——vendor verify-doc-budgets 裁剪版；超顶处置序 = 下放>压缩>升顶须 D 号，本表自身即"下放"实证） | 带证据适配 |
| Cross-reference with machine-checkable links, never free prose | md-links 门禁（方括号+圆括号语法全 tracked md）+ entry-chain 门禁（反引号指针盲区补齐） | 带证据适配（反引号裸路径不检 = 已知盲区，entry-chain 探针语义面兜底） |
| Slop checklist（文档废话清单） | 行文规范沿袭（定性吸收，未机械化） | 带证据适配 |

## 源 4：vendor .agents/notes/（Note 生命周期规则）

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Agent Note 生命周期（proposed/implemented/rejected + archived 冻结） | notes/ 六目录；archived/ 暂不设（差异表：无低价值存量；引入条件已写 notes/README） | 带证据适配（archived 延后，条件在案） |
| Every new Note triggers a supersession check（同决定搜树：更新/互链/吸收后删） | AGENTS §notes 取代检查 bullet + notes/README §决定覆盖与取代检查（SDLC reference 01 吸纳） | 照搬 |
| Alternatives considered mandatory（没记击败了什么 = 会重开讼） | guides/60 §4 骨架 + note-format 门禁（## 输掉的方案在场断言） | 照搬 |
| Implemented Note 保持 current（路径/默认值随实现同 diff；逆转写新 Note 互链） | AGENTS §notes implemented bullet；毕业 = 正文改写（guides/60 §4） | 照搬 |
| Note 格式机械化（verify-agent-note-format） | verify 门禁 note-format（regex 版 + grandfather 条款——本仓轻量适配） | 带证据适配 |
| 归档树 append-only hash manifest | archived/ 未设 | 不适用（随 archived 引入重估） |

## 源 5：postmortem（2026-09-25 二轮更正）

vendor 的事故复盘住在 **`docs/postmortem/`**（10 篇编号条目 + `README.md` 定义进门判据），
不在 `.agents/notes/` 下——一轮核对时查错路径，写成"空目录"，此处更正。判据 = **bug 到达了
不该到达的地方**（真实用户 / 已合并 PR / 一次 release），产出重点是"为什么流程放它过去"
与随后新增的 guardrail；编号 `NNNN-<slug>`，双语三件套。

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| 事故复盘的进门判据（到达不该到达的地方）+ 编号条目 + 必须链接由事故催生的 guardrails | [notes/postmortem/README.md](../notes/postmortem/README.md)：同一判据、`NNNN-<症状>` 编号、五节骨架（症状/为什么没早发现/根因/修复/新增防线）；产物落 `evaluation.md` 才闭环 | 带证据适配 |
| 层的位置：`docs/postmortem/`（与"当前合同"同层，属文档 tier 表一行） | `notes/postmortem/`（开发记忆层） | 带证据适配（登记偏离：我们的 docs 只写 now，事故叙事归 notes 时间层；差异理由 = notes 是"为什么/发生过什么"的唯一时间层） |
| 双子语三件套 | 单语 | 不适用（同全仓单语登记） |

## 源 6：vendor .agents/skills/（开发 Skill——2026-09-25 吸纳，`.agents/skills/` 落地）

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| 两类同名 Skill 严格区分：repository development Skills（`.agents/skills/`，服务改仓库的 coding agent）vs runtime Skill capability（`packages/skill/`，服务产品内 agent） | 本仓两侧都有且分家：`.agents/skills/`（四个开发技能）+ `packages/deep-research-pack/presets/*/skills/`（研究角色运行时技能） | 照搬 |
| Skill 的定位 = 可复用工作流 + 专门判断标准（不是产品 API，也不是自动门禁） | 四个开发技能各带触发条件/步骤/完成判据；机制细节仍链接 owner 文档而非复制 | 照搬 |
| 五步调用：Match（description 命中）→ Load（读全文，不从摘要猜）→ Resolve sources（读 owner）→ Apply judgment → Verify and report | 技能正文按此组织；`dev-skill-format` 门禁断言 frontmatter 在场且 `name` = 目录名 | 带证据适配（门禁为 regex 版，非 vendor 的 schema 校验） |
| Skill ≠ gate：机械可判的下沉到类型/脚本/invariant，语义留给 review | 本仓分工表见末节「载体分工」 | 照搬 |
| 按需加载控制上下文成本（progressive disclosure） | AGENTS 只放指针（命令表 + 布局树一行），完整流程按 description 触发加载 | 照搬 |

## 源 7：仓库分类学与维护形态（vendor `repo-harness/08`，2026-09-25 吸纳）

**内容的五种维护形态**（DSH 用"哪只手能改它"分类，而不是"静态/动态"二分）：

| 形态 | DSH 例子 | 本仓实例 | 机器边界 |
|---|---|---|---|
| 手写维护 | AGENTS、docs、README、活动 Note、Skills | 全部 `docs/`、`notes/`、`AGENTS.md`、presets、skills | 结构受门禁（预算/格式/链接），内容人写 |
| 生成 + freshness 门禁 | tool/config/persistence catalog、module-graph | **无 tracked 生成物** | 引入条件：出现"从源码可穷举、手写会漂移"的清单 |
| 混合（生成区嵌手写页） | subsystem 页的 cordis-surface 区、type-equiv 块 | `agent.cordis.yml`（手写）↔ `dev/research.overlay.yml` + profile 镜像（同事实的第二落点）——由 `boot-run.sh` 漂移检测承担 freshness | 漂移即 fail-loud |
| 录制（机器写、人审、封存不改） | snapshots/、archived Note、persistence releases | run bundle（`research-workspace/drt_*`）——gitignored 运行区，事实由 bundle 文件承载 | 不进 L0（运行区不扫）；完整性归 run 内 critic + 观察面谓词 |
| 投影（canonical 源的抛弃型派生物） | `website/.generated/` | `dev/smoke-workspace/dashboard.html`（canonical = 会话日志 + bundle 文件） | 随时可重建；永不手改、永不入库 |

**一个事实一个 owner / 目录树即清单 / 不建第二份索引**：`notes/` 不设集中 INDEX（路径 =
生命周期 + 日期 + 主题）；`research/` 例外地有一份 README 目录表（人类视角的状态面），
其新鲜度由 `note-status` 门禁对账——这是本仓对"不建索引"的**登记偏离**：人读场景优先。

**vendor = 所有权边界**：DSH 把框架层 vendor 进仓（可审计、可打补丁、钉版本）并要求
"离上游的每一处分叉都留痕"；本仓用 **pinned submodule**（钉 commit，只读铁律，`vendor-pin`
+ `vendor-clean` 把守）——更强的不变量（零分叉），代价是本地修改只能走上游或升 pin。

## 源 8：反馈分层与评估框架（vendor `repo-harness/05`/`07`，2026-09-25 吸纳）

**六层反馈 ↔ 本仓五面**（每层只拥有自己观察得到的性质）：

| DSH 层 | 能证明 | 本仓对应 | 命令 |
|---|---|---|---|
| 编译期 | 类型与穷举分支 | （无 TS 源码面） | — |
| Load / parser | 输入在最早可解析点合法 | L0 门禁 + cordis 行校验 | `node scripts/verify.mjs` |
| 局部行为 | 模块正例/错误/生命周期 | L0 契约测试 | `node --test tests/*.test.mjs` |
| 组装行为 | 真实入口产生预期外部结果 | L1 真挂载 + L2 安装形状 | `preset-smoke`（`DSH_SMOKE_REAL=1`）/ `release-smoke` |
| 运行时关系 | 活系统中的 owner relationship | 本仓等价物 = 真模型档与 run 内 critic（无 invariant companion 面） | `l4-lite-smoke` / `team-preflight-smoke` / `entry-chain-probe` |
| 语义判断 | 意图、架构、风险与证据对齐 | 人工验收 + run 内 critic | 用户验收 / `review.md` |

**三问自检**（评估任何 development harness，vendor `repo-harness/07` 归纳）：
① 规则住在哪里（人脑 vs 可搜索文档/类型/生成索引/可执行检查）→ 本仓：AGENTS 入口链 +
docs 合同 + notes 记忆 + 17+ 门禁；
② 正确入口是否明确（能否从目标找到 owner、范本与升级条件）→ 本仓：布局树 + 参与阶梯
（[guides/62 §参与阶梯](guides/62-plugin-authoring.md)）+ `.agents/skills/` 范本；
③ 错误何时被发现（编译/加载/局部/运行时/push 前/评审/生产）→ 本仓：pre-commit 门禁 +
契约测试 + 三级冒烟 + 真模型档 + 人工验收。

## 载体分工

谁回答什么（vendor `repo-harness/03` §Skill 不等于 gate，2026-09-25 吸纳）：

| 载体 | 擅长回答 | 不能替代 | 本仓实例 |
|---|---|---|---|
| `AGENTS.md` | 每轮必须遵守什么 | 情境化长流程 | 入口链、命令表、纪律指针 |
| `docs/` 合同面 | 系统**现在**是什么、怎么用 | 决策历史 | evaluation、discipline-map、guides 60–62 |
| Skill（`.agents/skills/`） | 面对某类任务怎样调查、判断、验证 | 确定性 pass/fail | 毕业条目 / 加角色 / 写门禁 / 跑 run |
| 门禁与契约测试 | 一个可机械条件是否满足 | 意图与设计质量 | `scripts/verify.mjs` + `tests/` |
| Agent Note（`notes/`） | 为什么这样决定、放弃了什么 | 当前 API 的唯一说明 | proposed（将来）/ implemented（过去）|
| 运行区记录 | 这次实际发生了什么 | 可复现的回归证据 | `drt_*` bundle、会话日志、仪表盘投影 |

组合使用的判据：规则改变 → 只改规则 owner；Skill 只**链接** owner 不复制；门禁只判条件，
语义判断留给 review 与用户验收。

## 源 9：vendor 本体仓库结构（`vendor/dsh/` @ `477b4f4205`，2026-09-25 二轮核对补）

> 语料（源 1–8 的部分行）是对 0.1.7 的**描述**；下面这些是从我们钉住的 **vendor 本体**
> 直接读出的结构约定——语料未覆盖，是"对齐"的硬面。

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| **子树 `AGENTS.md` 层**：根只放每轮常驻指令（1–3 行 + 链 home），子树专属指令放子树 `AGENTS.md`（vendor 22 份） | 四份子树 AGENTS.md（`docs/` · `scripts/` · `notes/` · `packages/deep-research-pack/`）+ 根瘦身至 132 行；`entry-chain` 门禁把守成员在场 | 照搬 |
| `docs/AGENTS.md` = 文档标准：层级归属（一个事实一个家）/ 写作规则 / slop 清单 / 预算处置序 / 机检链接 | [docs/AGENTS.md](AGENTS.md)：tier 表、写作规则、slop 清单（中文适配）、`## 已知限制与延后工作` 节约定 | 带证据适配 |
| 预算由 **manifest 拥有**（`scripts/doc-budgets.manifest.json`），门禁拒超限**与缺登记** | [scripts/doc-budgets.json](../scripts/doc-budgets.json) + 门禁 `doc-budgets`（登记项须存在且不超限；仓内新增 AGENTS.md 未登记即红） | 带证据适配（度量词数 → 行数：CJK 词数不可靠） |
| `scripts/AGENTS.md` = 门禁写作规则（无 shell / 端口与临时路径自持有 / 只在单独运行通过的 spec 是缺陷） | [scripts/AGENTS.md](../scripts/AGENTS.md)：范围（git ls-files tracked-only）、剥 `GIT_*`、端口独占、stdlib-only 分层 | 带证据适配（换成我们的实测教训） |
| `packages/AGENTS.md` = 包级约定（插件导出形态 / 当前 owner 与需求 / 限制节） | [packages/deep-research-pack/AGENTS.md](../packages/deep-research-pack/AGENTS.md)：三处同步、模型可见面 + 重启、roster 单一事实源 | 带证据适配（纯配置包版） |
| `.agents/notes/AGENTS.md` = Note 子树常设指令（**取代检查硬触发**） | [notes/AGENTS.md](../notes/AGENTS.md)：写入触发 + 取代检查 + 格式与毕业；根只留指针 | 照搬 |
| Note 头三行恰为 `# Agent Note: <title>` / 空 / `Status: <status>`（**裸值，无日期括号**），与生命周期目录互验；rejected 的理由用 `—` 附在状态行 | `> 状态：<裸值>` + 目录互验（`note-format` 门禁）；rejected 允许 `— 一行理由`；章节名映射（问题↔Problem · 决定↔Decision · 输掉的方案↔Alternatives considered · 验证↔Verification · 环境状态↔Consequences）登记在 notes/AGENTS.md | 带证据适配（头三行结构与裸值照搬；`## Problem` 不强制于遗留篇——grandfather） |
| 包 README 的 `## Known Limitations and Deferred Work` 固定节 | `## 已知限制与延后工作` 写进 docs/AGENTS.md 与包 AGENTS | 照搬 |
| 根 AGENTS 的 “Editing these instructions” 节 | 根新增 §编辑这些指令（预算 manifest / 子树归属 / 门禁把守） | 照搬 |
| `.agents/skills/` 命名带产品前缀（`dsh-`），少数通用技能无前缀 | 四个开发技能无前缀（与 vendor 的 `agent-experience`、`record-browser-gif` 同风格） | 已具备 |
| **一段一行**（`verify-md-wrap` 门禁） | 硬折行 ~90 列 | **不适用**：中文优先仓折行是既有惯例，整仓重排会淹没审阅（成本 > 收益）；引入条件 = 转英文或双语文档 |
| `docs/defensive-patterns.md`（高风险缺陷模式：生命周期/并发/子进程/teardown——供 review 逐条扫） | 主体 = TypeScript 代码模式，本仓无 TS 面；**可迁移的部分已分居**：门禁与子进程陷阱 → [scripts/AGENTS.md](../scripts/AGENTS.md)，事故与教训 → notes/postmortem/ 与各毕业 Note | 不适用（不另建第二份清单，避免与上述 home 漂移） |
vendor 根部其余结构面的处置（二轮逐项登记，避免"没抄=遗漏"的误读）：

| vendor 文件/目录 | 本仓处置 |
|---|---|
| `.claude/skills` symlink | **采纳**：`.claude/skills -> ../.agents/skills`（Claude 系 harness 发现同一批开发技能）；门禁 `claude-symlink` 覆盖两条 symlink |
| `docs/glossary.md` | 已具备：`docs/00-index.md §术语映射`（一个概念一个 canonical term，含 DSH↔本仓对照） |
| `docs/development.md` · `docs/testing.md` · `docs/architecture.md` · `docs/cookbook/` · `docs/subsystems/` | 已具备（改名映射）：guides/60 · evaluation + guides/60 §2 · design/10 · guides/61/62 · design/ |
| `docs/i18n/` · `docs/user/` · `website/` | 不适用：单语、无对外产品文档站与站点投影 |
| `snapshots/`（session 回放 fixture） | 不适用：无 session 快照测试面；keyless 回归 = 契约测试与夹具（放置规则归 [tests/AGENTS.md](../tests/AGENTS.md)） |
| `benchmarks/` · `native/` · `python/` · `patches/` · `apps/` | 不适用：本仓无这些发布 lane 与运行时面 |
| `CONTRIBUTING.md` · `SAFETY.md` · `SECURITY` · `THIRD_PARTY_NOTICES.md` · `BRAND_GUIDELINES.md` | 不适用：无外部贡献流、无运行时安全授权面、无捆绑第三方代码、无品牌资产 |
| `.editorconfig` · `.gitattributes` · lint（oxlint）· 重复代码检测（jscpd）· vitest 系列配置 · `lefthook.yml` | 不适用：无 TS 源码面；Markdown 纪律由门禁（md-utf8-newline / md-links / md-anchors / doc-budgets）承担，git 钩子 = `dev/hooks/pre-commit` |
| `LICENSE` | **未决（非遗漏）**：本仓 `private: true` 未分发；已进 [roadmap 搁置池](../roadmap.md)，复活条件 = 对外分发前定许可证 |

## 重审触发路径

升 pin 时按此清单逐条复核（语料 `_coverage` 模式吸纳）：

换 `vendor/dsh` tag 时，下列**我们赖以立论的 vendor 源**逐条重读并核对本表与 `docs/`：

- 根 `AGENTS.md`（Conventions / Editing these instructions / Vendoring policy）；
- `docs/AGENTS.md`（文档标准与预算表）、`docs/testing.md`、`docs/architecture.md`；
- `scripts/AGENTS.md`、`scripts/doc-budgets.manifest.json`、`scripts/run-gates.ts`；
- `packages/AGENTS.md`、`packages/README.md`；
- `.agents/notes/{README,AGENTS,implemented/AGENTS,archived/AGENTS}.md`；
- `.agents/skills/**`（清单与 frontmatter 约定）；
- `snapshots/AGENTS.md`、`vendor/README.md`、`.github/AGENTS.md`。

复核结论（"无命中/改写哪几行"）连同新 tag 与日期，写进该轮「升 pin 重校」条目的毕业 Note
——**逐条结论本身即是重审记录**，不另建维护页（避免第二份会漂移的清单）。

## 维护规则

- 本表随 vendor 换 tag 重校（roadmap 触发型条目「升 pin 重校」）；新增三态行同 diff 落
  本表，不在 AGENTS.md 复制（一处事实一个家）；
- 首版枚举子集表（三个来源、11 行）已被本表**完整覆盖并扩展**——历史原文见 git（本条目
  毕业时的 AGENTS.md 版本）。

## 0.1.7 重审命中（2026-09-25 升 pin：fb2c4b9e → 477b4f4205）

按 §重审触发路径 逐条重读上列 vendor 源，**实质命中四处**（其余源 diff 无涉本仓结论）：

| 源 | 0.1.5 → 0.1.7 变化 | 本仓处置 |
|---|---|---|
| 根 `AGENTS.md` · `docs/AGENTS.md` · `.agents/notes/README.md` | Agent Note 判据收窄：`non-trivial change MUST add a Note` → **只有"代码/测试/现有文档解释不了的持久决定理由"才写**；豁免扩到"含本地 UI 呈现/交互" | 三处载体同改（根 AGENTS §notes / `notes/AGENTS.md` / 本表源 1 行）——本仓写入触发本就以"持久决定理由"为准，此次只补豁免面 |
| `vendor/README.md` + `scripts/run-gates.ts` | vendored 引用改 `workspace:~`（DSH 侧 `workspace:*`）；原 `verify-vendored-links` 门禁**已删除**（现存仅 markdown/public-repository links） | 本仓 `vendor-links` 门禁**独立立论**（E1 事故教训：devDep 必须解析为 `link:vendor/dsh/...` 且无 registry 副本）——上游去掉该门禁不影响本仓保留；devDeps 继续用 `workspace:*`（link，永不 registry），pack 的 peerDeps 用 semver 区间（随包分发到 profile，那里没有 workspace） |
| `packages/README.md` | `experimental/` 语义**反转**：`private by default with explicit public exceptions` → `pre-stable prototypes with explicit private exceptions`；包分组重构（`e2b/`→`ssh/`、`code-runtime/`→`ptc-runtime/`，新增 `computer-use/` `browser-use/` `deliverables/` `jobs/` `schedule/` `goal/` `storage/` `workspace/` `feedback/` `mcp/` `host/` `client/` `session-query/` `attachment/` `spill/` `runtime-diagnostics/` `test-support/`；`self-modification/`→`extensions/`、`support/`→`test-support/`） | 本仓不引用 vendor 包分组路径；团队机制层 `@deepseek-ai/dsh-experimental-agent-team-profile` 的**包名未变**、语义仍为 pre-stable（`experimental/` 的 public/private 默认与本仓依赖无关）。结论：无命中，登记备查 |
| `snapshots/AGENTS.md` | 新增 `retired-tools` 钉法：**退役工具录制可与迁移覆盖无关地独立钉住**（含当前 format 版本）；replay 接受保留的 V3 基线或当前代 | 搁置池「keyless 录制快照通道」的复活条件更新：0.1.7 起可只钉"退役工具"这一窄面，不必整代快照 |

**逐条结论（清单全量，含无命中）**：根 AGENTS.md（命中①）· `docs/AGENTS.md`（命中①，另有 persistence-history 新文档层——本仓无持久化面） ·
`docs/testing.md`（"real entry path" 例证改指 `lib/process.js`/`ptc-runtime`——本仓 L2 断言面未变）· `docs/architecture.md`（应用启动节不变） ·
`scripts/AGENTS.md`（无命中）· `scripts/doc-budgets.manifest.json`（仅 `docs/architecture.md` 2400→2410 升顶——本仓预算自持） ·
`scripts/run-gates.ts`（命中②：门禁增删；本仓门禁集自持，见 evaluation §L0）· `packages/AGENTS.md`（无命中；invariant 规则不变） ·
`packages/README.md`（命中③）· `.agents/notes/{README,AGENTS,implemented/AGENTS,archived/AGENTS}.md`（命中①；archived 删除规则细化——本仓未设 archived/，条件在案） ·
`.agents/skills/**`（清单与 frontmatter 约定不变：新增 `agent-experience`、`dsh-client-ui-ux` 两个技能已登记进台账） ·
`snapshots/AGENTS.md`（命中④）· `vendor/README.md`（命中②）· `.github/AGENTS.md`（无命中，CI 细节）。
