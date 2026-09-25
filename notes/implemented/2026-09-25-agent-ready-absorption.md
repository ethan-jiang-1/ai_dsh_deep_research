# Agent-ready Development 吸纳（上游研发语料 → 本仓开发 harness）

> 来源：`/Users/bowhead/deepseek-harness/_agent_ready_development/`（用户 2026-09-25 指令：
> 我们是开发 DSH 插件的仓库，细节要与 DH 官方研发思路 align）。通读范围 = 全语料 56 个文件
> 中的全部正文（sdlc-tutorial 5 篇 / sdlc-reference 11 篇 / repo-harness 9 篇 / `_coverage`
> 维护页 / 三个 README 与图示归属页 / 语料 `verify.mjs`），钉版基线 = DS H `dsh-v0.1.7-rc.1`。
> 通则：**点状吸纳，不推翻本仓现行规则**；每项给三态（采纳 / 已具备 / 不适用+理由）。

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

- **技能发现（正面实证，非推断）**：四个 `.agents/skills/*/SKILL.md` 落盘后，本会话的技能
  目录立刻出现这四条（`adding-a-research-role` / `graduating-a-queue-item` /
  `running-a-research-run` / `writing-a-gate`）——发现根 = `projectRoot/.agents/skills`
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
- 新增文件：`.agents/skills/{graduating-a-queue-item,adding-a-research-role,writing-a-gate,
  running-a-research-run}/SKILL.md`、`docs/guides/62-plugin-authoring.md`、
  `notes/implemented/README.md`、`notes/research/README.md`。
- 改动文件：`AGENTS.md`（布局 + notes 节，仍在 entry-budget 内）、`docs/00-index.md`
  （文档地图 + 术语映射 + 外部研究材料登记）、`docs/discipline-map.md`（源 6–8 + 载体分工）、
  `docs/guides/60-dev-loop.md`（§2 三条纪律）、`notes/README.md`（时态地图重写）、
  `notes/proposed/README.md`（空目录常态）、`notes/{rejected,postmortem}/README.md`（时态行）、
  `notes/research/*`（四个状态行）、`scripts/verify.mjs`（三条门禁）。
- 未落地（登记为后续触发）：`.agents/notes/` 路径对齐、`implemented/` class 分层、`archived/`
  冻结树——各自引入条件写在 notes/README 差异表。
