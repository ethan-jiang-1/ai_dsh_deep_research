# Agent-ready Development 吸纳（上游研发语料 → 本仓开发 harness）

> 状态：implemented

> 历史注记（2026-10-30）：本篇是 2026-09-25 队列 / roadmap 时代的语料吸纳记录；
> `entry-budget` 现名 `doc-budgets`、LICENSE 已定 MIT（2026-10-25）、keyless 快照已交付、
> `archived/` 已设（2026-09-27）、`postmortem/` 已退役（事故复盘规则迁 notes/README §事故复盘）。
> 当时“未落地 / 未决”项均已有后续 owner；语料吸收结论仍有效。下方历史路径保留 2026-09-25 原样。

> 来源：`/Users/bowhead/deepseek-harness/_agent_ready_development/`（用户 2026-09-25 指令：
> 我们是开发 DSH 插件的仓库，细节要与 DH 官方研发思路 align）。通读范围 = 语料 **37 篇 .md
> 全部**（root/三个主题与图示 README、sdlc-tutorial 5 篇、sdlc-reference 11 篇、repo-harness
> 9 篇、`_coverage` 维护页与 `_coverage/README`）+ 语料 `verify.mjs` 的规则面（锚点/链接/
> 目录 README/SVG 检查，非全文）；**18 张 SVG 未逐张读**（图服务正文，正文与图示归属页已读）。
> 钉版基线 = DSH `dsh-v0.1.7-rc.1`。通则：**点状吸纳，不推翻本仓现行规则**；每项给三态
> （采纳 / 已具备 / 不适用+理由）。

## 决定

1. **吸纳的判据是"对齐词汇 + 补齐载体"，不是复制形态。** 上游明确写了继承边界：插件仓库
   直接继承的是**插件形态、配置与打包模型、术语**；`AGENTS.md`/Notes/gates/发布序列是 DSH
   自身作为 development harness 的参与机制，分类学精神（一个事实一个 owner、生成物有生成器、
   决定有记录）是可迁移原则而非强制。
2. **新增载体：`.agents/skills/` 开发技能**（DSH 约定路径，`project-agents` 发现根）。四个
   技能覆盖本仓真实复现任务：毕业队列条目 / 加研究角色 / 写门禁 / 跑 run。它填的是
   "规则（AGENTS）与检查（gate）之间"缺的那一层——需要读上下文、应用判断、执行多步的任务。
3. **新增文档：`docs/guides/62-plugin-authoring.md`**（插件作者入口）——上游
   `docs/user/develop/{basic,framework,practice}` + 参与阶梯的本仓投影：词汇对齐、L0–L3、
   新行为归属、范本、证据义务。
4. **新增门禁 3 条**（可机械化的承诺必须有会红的命令）：`md-anchors`（锚点漂移）、
   `note-status`（notes 时态/状态面）、`dev-skill-format`（技能形状）。门禁 17 → 20。
5. **notes/ 时态地图**（用户第二件事）：目录名即状态 + `notes/README.md` 三时态表 +
   每子目录 README + `research/` 状态表与状态行。**空 `proposed/` 要显式解释为常态**
   （它在队列条目开工时才有文件；下一步看 roadmap ▶）。

## 采纳（含落点）

| 上游做法 | 落点 | 形态 |
|---|---|---|
| 两类 Skill 严格分家：repository development Skills 与 runtime Skill capability | `.agents/skills/`（开发技能）vs `presets/*/skills/`（研究角色技能） | 照搬 |
| Skill = 可复用工作流 + 专门判断标准；五步调用（Match→Load→Resolve→Apply→Verify）；Skill ≠ gate | 四个开发技能的正文结构；载体分工表（discipline-map §载体分工） | 照搬 |
| 插件作者入口：两教程线分界、插件最小定义（导出 `apply(ctx)`）、bundle/profile 二分（**Nothing is both**） | [guides/62](../../docs/guides/62-plugin-authoring.md)（词汇表 + 范本 + 证据义务） | 带证据适配（本仓是纯配置包，链接上游教程而非复制） |
| 参与阶梯 L0 组合 → L1 扩展点 → L2 capability seam → L3 core loop；横切义务 model-visible ⟺ logged | guides/62 §参与阶梯（本仓映射：L0 配置行 / L1 preset+skill / L2 尚无 / L3 归上游） | 带证据适配 |
| 载体分工表（AGENTS / Skill / gate / Note / docs 各回答什么） | discipline-map §载体分工 | 照搬 |
| 内容的五种维护形态（手写 / 生成+freshness / 混合 / 录制 / 投影） | discipline-map 源 7（本仓实例：手写、混合（overlay↔镜像，漂移检测）、录制（drt_ bundle）、投影（dashboard）；生成态**缺席带引入条件**） | 带证据适配 |
| 六层反馈 ↔ 每层只证明自己观察得到的性质 | discipline-map 源 8（六层 ↔ 本仓 L0–L4 映射表） | 带证据适配 |
| 三问评估框架（规则住哪 / 入口是否明确 / 错误何时发现） | discipline-map 源 8 末（本仓逐问作答） | 照搬 |
| 运行时查询：`--dump-config` 查实际配置树（别从源码猜部署） | [guides/60 §2 三条纪律](../../docs/guides/60-dev-loop.md) + 命令表已有 `pnpm dsh` | 照搬 |
| 证据路由与"未运行项如实分开" | guides/60 §2 第三条纪律 | 照搬 |
| 语料级门禁：内部链接**锚点**校验、目录 README、钉版外链 | 新门禁 `md-anchors`、`note-status`；钉版外链不适用（见下） | 带证据适配 |
| 维护页模式（re-pin 轮次 + 重审触发路径 + 历轮改动记录） | 本仓对应物 = 触发型条目「升 pin 重校」的每轮毕业 Note；其 RFC 应要求记录重审范围 | 带证据适配 |
| 目录 README 三段式（定位 / 主入口 / 直接内容） | notes/ 各子目录 README；本仓 docs 与 scripts 暂不强制（见"输掉的方案"） | 带证据适配 |

## 已具备（已对齐，登记以免重复吸纳）

| 上游做法 | 本仓既有落点 |
|---|---|
| fail-loud、model-visible ⟺ logged、registrations are effects、plugins not loop changes | vendor 根 AGENTS Conventions（discipline-map 源 1 已逐条三态） |
| 机械门禁优先于散文约定；每条门禁带负例（红→还原→绿） | 20 条门禁 + evaluation.md 登记表的反证记录列 |
| verify the world, not the self-report；真入口路径 = 发布产物 | evaluation L4 + 手册完成判据 + release-smoke（L2） |
| 文档预算与处置序（下放 → 压缩 → 升顶须登记） | `entry-budget` 门禁 + AGENTS 纪律节下放实证（2026-09-24） |
| Agent Note 生命周期、取代检查、alternatives 必载、目录树代替索引 | notes/README + note-format 门禁（2026-09-24 吸纳 Note） |
| 一个事实一个 owner；docs 只写 now | 00-index 组织原则 + 各文档 owner 表 |
| 决定记忆与当前事实分家（Note vs docs） | AGENTS §notes 分工段 |

## 不适用（带理由，不记为空缺）

| 上游机制 | 理由 |
|---|---|
| GitHub Flow 全套（Issue 模板 / Project 状态机 / PR 模板 / CI 聚合 / weighted approval / stacked PR / branch 规则） | 本仓无远端 PR 流（单开发者本地仓）：等价物 = pre-commit 门禁 + 窄证据切片 commit + 每轮毕业 Note |
| 双语配对（`*.zh.md` + `.i18n.yaml` hash） | 单语仓（中文为唯一书写语言） |
| `archived/` 冻结树 + append-only hash manifest | 无归档需求；引入条件已写进 notes/README 差异表 |
| 生成目录 + freshness 门禁（catalog/module-graph） | 无 tracked 生成物；本仓的"源→派生物"模式是 gitignored 投影（dashboard），无需 freshness |
| `.github/` 远端执行层 | 无远端；本地 pre-commit 承担同一角色（gate "在什么事件下跑"由 hook 拥有） |
| SVG 图示规范（固有尺寸 / 无障碍元数据 / 归属页） | 本仓无图；若引入图，语料 verify.mjs 的规则可直接照搬 |
| 钉版外链（外链必须指固定 commit） | 本仓外链对象是**本机只读参考仓**（路径而非 URL），钉版由"参考仓 + 日期 + 落点"三段登记在 00-index §外部研究材料 |
| cordis-tutorial 七讲的 scratch 运行器 | 上游已有且 keyless 可运行；本仓只需链接（guides/62 指向它），复制会漂移 |

## 输掉的方案

- **把 `notes/` 整体迁到 `.agents/notes/`**（与 vendor 路径完全同构）：churn 覆盖全仓链接与
  三条门禁，且隐藏目录伤人类可发现性——用户本轮的诉求恰是"人一眼看懂"。改为：`.agents/skills/`
  按 vendor 约定落地，`notes/` 留顶层并在差异表**登记这条偏离**（代价/收益写明）。
- **notes/ 按时间分目录**（`2026-09/` 月份层）：必长"烂尾层"（既有 D10 教义）；生命周期目录
  名自带时态，人机都能一眼分辨。
- **给 `implemented/` 建全量索引 README**：第二份会漂移的清单（vendor 明文禁止集中
  `INDEX.md`）；只在 `research/` 做人读状态表，并用 `note-status` 门禁对账新鲜度（登记偏离）。
- **一次性照搬上游 14 个开发 Skill**：本仓任务面窄，多余技能只增加维护面与触发噪声；
  四个覆盖真实复现任务，缺什么再加（引入条件写在各自 description 里）。
- **把锚点校验并进现有 `md-links`**：失败语义不同（"文件不存在"与"标题改名后锚点失效"），
  合并会让定位变慢；分列两条门禁，登记表对账更清楚。
- **把 `note-status` 三条断言并进 `note-format`**：前者管"目录时态与状态面"，后者管"决定
  记录骨架"；混在一起后红一次要人工分辨是哪类退化。
- **给 `docs/` 与 `scripts/` 全目录加 README**（语料"每目录必须有 README"的直接照搬）：
  本仓这两层的成员少且入口已在 00-index 与 AGENTS 布局树里；先只在 `notes/` 强制
  （真实痛点所在），引入条件 = 目录成员超过约 10 个或出现"找不到入口"的实例。

## 实际跑过的验证

- **技能发现（正面实证，非推断）**：开发技能落盘后，本会话的技能目录出现相应项目技能；发现根 = `projectRoot/.agents/skills`
  （vendor `skill-filesystem` 源码 `project-agents` 源）。
- **三条新门禁的反证（红→还原→绿，逐条实测）**：
  - `md-anchors`：在某 tracked md 注入一条指向 `#不存在的锚点` 的链接 → `FAIL md-anchors`
    （锚点不可解析）；还原后 PASS（正例 = notes/README 指向 `discipline-map.md#载体分工`
    的真实锚点——正反两例都跑过）；
  - `note-status`：删 `notes/research/2026-09-24-dsh-market-scout.md` 的状态行 →
    `[note-status] … 缺状态行（> 状态：已完成 | 进行中 · 日期）`；还原后 PASS；
  - `dev-skill-format`：把 `writing-a-gate/SKILL.md` 的 `name:` 改成 `writing-a-gates` →
    `[dev-skill-format] frontmatter name=writing-a-gates ≠ 目录名`；还原后 PASS。
- **门禁与台账对账**：`gate-ledger-sync` 绿（gates 数组 20 = evaluation.md §L0 登记表 20 行）。
- **keyless 回归**：`node --test tests/*.test.mjs` 全绿（23 tests）。

## 环境状态

- 门禁 **17 → 20**；`docs/evaluation.md` §L0 登记表同步（三条新行各带反证记录指向本 Note）。
- 新增文件：项目开发技能、`docs/guides/62-plugin-authoring.md`、
  `notes/implemented/README.md`、`notes/research/README.md`。
- 改动文件：`AGENTS.md`（布局 + notes 节，仍在 entry-budget 内）、`docs/00-index.md`
  （文档地图 + 术语映射 + 外部研究材料登记）、`docs/discipline-map.md`（源 6–8 + 载体分工）、
  `docs/guides/60-dev-loop.md`（§2 三条纪律）、`notes/README.md`（时态地图重写）、
  `notes/proposed/README.md`（空目录常态）、`notes/{rejected,postmortem}/README.md`（时态行）、
  `notes/research/*`（四个状态行）、`scripts/verify.mjs`（三条门禁）。
- 未落地（登记为后续触发）：`.agents/notes/` 路径对齐、`implemented/` class 分层、`archived/`
  冻结树——各自引入条件写在 notes/README 差异表。

## 复核轮（2026-09-25 二轮：改以 vendor 本体为主源）

**动因**：用户质疑"确定完全对齐了吗"。一轮的读法是"读语料"——而语料是对 DSH `dsh-v0.1.7-rc.1`
的**描述**，我们当时钉的 vendor 是 `dsh-v0.1.7-rc.2`，且语料**未覆盖**若干仓库本体约定。二轮改为
逐条对照 `vendor/dsh/` 本体，差距如下（全部已落地）。

| 二轮发现的差距 | vendor 证据 | 本仓落点 |
|---|---|---|
| **子树 `AGENTS.md` 层**：根只放每轮常驻指令，子树专属指令放子树 `AGENTS.md`（22 份） | `docs/AGENTS.md` tier 表 + 22 个子树文件 | 新建 `docs/AGENTS.md` · `scripts/AGENTS.md` · `notes/AGENTS.md` · `packages/deep-research-pack/AGENTS.md`；根瘦身 138 → 132 行（notes 段下放）；`entry-chain` 成员补四项 |
| **文档标准文件**（层级归属 / 写作规则 / slop 清单 / 预算处置序 / 机检链接） | `docs/AGENTS.md` 全文 | [docs/AGENTS.md](../../docs/AGENTS.md)（中文适配；含 `## 已知限制与延后工作` 节约定） |
| **门禁写作规则文件** | `scripts/AGENTS.md` | [scripts/AGENTS.md](../../scripts/AGENTS.md)（范围 tracked-only / 剥 `GIT_*` / 端口独占 / stdlib-only） |
| **包级约定文件** | `packages/AGENTS.md` | [packages/deep-research-pack/AGENTS.md](../../packages/deep-research-pack/AGENTS.md)（三处同步 / 模型可见面 / roster 单一事实源） |
| **Note 子树常设指令**（取代检查硬触发） | `.agents/notes/AGENTS.md` | [notes/AGENTS.md](../../notes/AGENTS.md)；根只留指针 |
| **Note 头三行格式**：`Status:` 裸值、无日期括号、与目录互验；rejected 理由用 `—` 附行 | `.agents/notes/README.md` §The file format | `note-format` 门禁收紧为裸值正则；**25 篇 implemented 全部规整**（13 篇补状态行、12 篇去日期括号并把 provenance 落正文）；顺带修掉 3 篇"写 approved 却已在 implemented/"的目录↔状态不一致 |
| **预算由 manifest 拥有**，门禁拒超限**与缺登记** | `scripts/doc-budgets.manifest.json` + `verify-doc-budgets` | 新建 [scripts/doc-budgets.json](../../scripts/doc-budgets.json)；门禁 `entry-budget` → `doc-budgets`（自动发现仓内 AGENTS.md 未登记即红） |
| 根 AGENTS 的 **“Editing these instructions” 节** | 根 `AGENTS.md` §Editing these instructions | 根新增 §编辑这些指令 |
| **外部证据钉版**（上游 URL 钉 commit） | 语料 `verify.mjs` 的钉版外链检查 | [00-index §外部研究材料](../../docs/00-index.md) 记 `路径 @ <short sha>`（`ai_dsh_company @ 555215d` · `ai_tool_deepresearch @ 24ba84636` · `deepseek-harness @ efdba905b2`）+ [discipline-map §重审触发路径](../../docs/discipline-map.md#重审触发路径) |

**二轮更正的事实错误**：一轮源 5 曾写"vendor 与本仓 postmortem 均为空目录"——错在只查了
`.agents/notes/postmortem/`（不存在）。vendor 的事故复盘住在 **`docs/postmortem/`**（10 篇
编号条目 + README 判据）。已更正为带**层差异**的三态行（vendor 放 docs 层 / 本仓放 notes 时间层），并按 vendor 判据收紧
`notes/postmortem/README.md` 的进门条件（"bug 到达了不该到达的地方"）。
（2026-10-30：`postmortem/` 层退役，事故复盘冻结在 `archived/`；规则迁 notes/README §事故复盘。）

**二轮明确不采纳（带理由）**：

- **一段一行**（`verify-md-wrap`）：中文优先仓硬折行是既有惯例，整仓重排会淹没审阅（成本 >
  收益）；引入条件 = 转英文或双语文档。登记在 docs/AGENTS.md 差异表。
- **词数预算**：CJK 词数不可靠；改为行数（manifest 机制照搬，度量等价）。
- **`.agents/notes/` 路径**：维持顶层 `notes/`（人类可发现性），差异登记在 notes/README。

**二轮证据**：

- **三条门禁反证（实测）**：`doc-budgets` 超限（AGENTS.md 145 > 140 → 红）、未登记子树
  AGENTS（`tests/AGENTS.md` → 红）、`note-format` 缺裸状态行（删一行 → 红）；三者各自还原后绿；
- **锚点门禁在真实改动中抓到新写坏的锚点**：00-index 指向 `discipline-map.md#重审触发路径`，
  而该标题当时带括号尾注 → slug 不匹配 → 红；简化标题后绿。**这不是构造的负例**——是新门禁
  在本轮改动里直接拦下的真实缺陷；
- **子树 `AGENTS.md` 被运行中的 harness 作为局部指令注入**：四份文件写入后，本会话即出现
  "Additional instructions from: docs/AGENTS.md / scripts/AGENTS.md / notes/AGENTS.md /
  packages/deep-research-pack/AGENTS.md"——机制在场的行为实证（与 `.agents/skills/` 的目录
  发现并列）。

**环境状态（二轮后）**：门禁 20 条（`doc-budgets` 改名并 manifest 化）；常驻指令文件 7 份
（根 + 四子树 + 研究手册）全部登记预算；`notes/implemented/` 25 篇全部带裸状态行；
notes/README 差异表、notes/AGENTS.md、guides/60 §4、evaluation 台账同步。

**二轮补充（同批）**：`tests/AGENTS.md`（证据放置 owner——vendor `snapshots/AGENTS.md` 规则
的等价物：keyless 回归只放契约测试与夹具，运行产物/真会话日志不进仓）；子树 `CLAUDE.md`
symlink **不追平**（vendor 自身只在根 · `packages/` · `vendor/` · `.agents/notes/implemented/`
四处有，非一致约定）。

**二轮再补（结构面逐项登记）**：`vendor/dsh` 根部结构面逐项过了一遍，避免"没抄 = 遗漏"的
误读——**采纳 1 项**：`.claude/skills -> ../.agents/skills`（上游 `.claude/` 只此一件；让
Claude 系 harness 发现与 DSH 同一批开发技能），门禁 `claude-symlink` 扩为覆盖两条 symlink；
**已具备（改名映射）**：glossary → 00-index §术语映射，development/testing/architecture/
cookbook/subsystems → guides/60 · evaluation · design/ · guides/61-62 · design/；
**当时未决 1 项**：`LICENSE`（本仓 `private: true` 未分发，vendor 是 MIT——当时进 roadmap 搁置池，
复活条件 = 对外分发前；2026-10-25 已定 MIT，见顶部历史注记）；**不适用**：i18n/user/website、snapshots、benchmarks/native/python/
patches/apps、CONTRIBUTING/SAFETY/THIRD_PARTY/BRAND、lint/jscpd/vitest/lefthook 配置（无 TS
源码面；Markdown 纪律由门禁承担）。逐项理由见 [discipline-map 源 9](../../docs/discipline-map.md)。

## 三轮（2026-09-25：vendor 逐源枚举 → 机读台账）

**方法**：把 vendor 侧 harness 源面按五组（根与打包 / 子树 AGENTS / 开发技能 / docs 标准 /
包与证据）委派并行枚举，**810 条规范写成文件**（`dev/smoke-workspace/inventory/*.json`，
gitignored 运行区，可重跑复现），聚合成 **80 个唯一源面**。

**机读台账 + 门禁**：

- `docs/alignment-ledger.json`：80 条源面，每条 = source（vendor 路径）· owns · verdict
  （adopted 6 / adapted 58 / na 16）· landing（本仓路径）· reason；
- 门禁 **`align-ledger`**：① 每条 source 在 `vendor/dsh` 真实存在——**换 pin 后源文件移位即红
  （重审触发器）**；② adopted/adapted 的每处 landing 存在；③ na 必须给理由；
  （④ 2026-10-08 补宽：na 还须带可机械判定的 `liveness` 缺席断言，断言对象一旦出现即红
  ——把"`不适用` + 当时为真的理由"这个永久免检区拆掉；见
  [证据与依据层活性硬化](2026-10-08-evidence-liveness-hardening.md)。本条前三项仍成立。）
- 门禁 **`repo-conventions`**：与 vendor 本体的机械约定对比——`.editorconfig`（root/LF/尾换行）、
  `.gitattributes`（`* text=auto eol=lf`）、`package.json engines.node` **直接等于** vendor 值、
  pre-commit 含 whitespace 检查、**scripts 不得整体透传 `process.env`**（凭据卫生）。

**本轮落地（都不是"指向文件"，是真改）**：

| 落地 | vendor 依据 | 证据 |
|---|---|---|
| `.editorconfig` + `.gitattributes`（LF 正本形态；分工注释照搬） | `.editorconfig` / `.gitattributes` | `repo-conventions` 三门红证 |
| `engines.node`: `>=20` → **`^22.19.0 \|\| >=24.0.0`**（与 vendor 同区间，门禁直接对 vendor 比较） | 根 `package.json` | 红证：改回 `>=20` 即红 |
| pre-commit 加 `git diff --cached --check`（暂存面空白/冲突标记） | `lefthook.yml` whitespace 作业 | 红证：删该行即红 |
| **子进程凭据卫生**：新增 `scripts/lib/env.mjs`（`scrubbedEnv` / `withModelKey`，丢掉 `*KEY*/*SECRET*/*TOKEN*/*PASSWORD*`），五个脚本 6 处 spawn 全部改造；门禁禁止再出现 `env: { ...process.env }` | `docs/defensive-patterns.md` §27-29 | 红证 + **真模型档实证**：洗 env 下 l4-lite ALL PASS |
| `dshSrc` 默认值统一为**本仓 ROOT**（l4-lite / team-preflight 原默认 company） | 根 `AGENTS.md`（机制基线 = vendor 钉 tag） | 重跑 team-preflight 机制面全 PASS；E1 Note 勘误在案 |

**枚举点出、尚未落地的缺口（下一轮或新条目的输入，已在案不丢）**：

1. **vendored 链接无门禁**：verify 不读 `pnpm-lock.yaml`，无法断言 `@deepseek-ai/*` 解析为
   `link:vendor/dsh/...`（vendor 有 `verify-vendored-links`）——E1 事故（registry 混入闭包）
   的机械面缺位；
2. **声明未用的依赖**：`dsh-session-snapshot`、`dsh-llm-replay` 由 E1 修复引入但零引用
   （是否最小集未验；keyless 录制快照面缺）；
3. **docs 写作顺序**：vendor 要求先分类 tutorial/reference、按前置知识与难度排序、作者顺序
   「定位→定详略→分类→排序→下放下级细节」——本仓 docs/AGENTS.md 只有层级表与 slop 清单；
4. **门禁防空/收窄语料**：vendor `scripts/AGENTS.md` 要求门禁防"扫到 0 文件"并测检测边界的
   纳入/排除形态——本仓 writing-a-gate 只要求反证；
5. **包 README 义务节**：`## 已知限制与延后工作`（约定已立，pack README 尚未加节）与
   **Model Experience**（persona/skills 注入模型请求的可见面与代价）；
6. **技能形式**：vendor 技能多在首段声明"这是 guidance 不是 checklist"、用 `references/` 分层、
   技能间互链（24 处）——本仓四技能全无；
7. **复盘开头**：vendor 复盘有"三十秒摘要"起手节——本仓五节骨架缺此节。

**三轮（同批续）：缺口收敛结果**

| 缺口 | 结果 | 证据 |
|---|---|---|
| vendored 链接无门禁 | **已落地**：门禁 `vendor-links`（devDep 必须在 lockfile importer 解析为 `link:vendor/dsh/...`；overrides 三件套无 registry 条目；`link:vendor/dsh/` 为 0 即红） | 三形态红证（改 registry 版 / 注入 registry 条目 / 清空 link） |
| 声明未用的依赖 | **已核销**：`dsh-session-snapshot`、`dsh-llm-replay` 移除（E1 修复的最小集是 14 而非 16） | 移除后双通道复跑：research profile 真模型调用 ✅ + `l4-lite-smoke` ALL PASS ✅ |
| docs 写作顺序 / 分类 | **已落地**：docs/AGENTS.md 新增「分类与写作顺序」（tutorial/reference、前置与难度、作者六步）+ 配方页新鲜度契约（预算同步升顶 70→85，理由同变更） | verify 绿（doc-budgets 覆盖升顶） |
| 门禁防空/收窄语料 | **已落地**：scripts/AGENTS.md 新增「语料面纪律」+ writing-a-gate 同步（防空集、测边界形态） | — |
| 包 README 义务节 | **已落地**：pack README 新增「模型体验」（persona/skill/工具行/手册注入的可见面与代价）与「已知限制与延后工作」四节 | — |
| 技能形式（guidance 声明/互链） | **已落地**：四个技能首段加「guidance 不是 checklist」+ 相关技能互链 | — |
| 复盘三十秒摘要 | **已落地**：notes/postmortem/README 起手节（一至三句：什么坏了/影响谁/根因） | — |
| keyless 录制快照面 | **已交付**（2026-09-27；快照见 `notes/archived/2026-09-24-keyless-snapshot-lane.md`） | — |
