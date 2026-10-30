# notes 一致性清扫：按“还指不指导当前工作”分层处置（2026-10-30）

> 状态：implemented

> 用户 2026-10-30 指令：notes 已演进多轮，里面混着“当时的思考”和“后来的结论”，
> 一致性/逻辑性/自洽性不一致，放在一起会打架；要把过时的甄别出来，必须保留的标注清楚
> 是历史上的什么、已经过期。处置政策经用户选择 = **分层处置**（删 > 并 > 标历史 > 归档 > 留）。
>
> 审计方式：分簇只读通读既有 Note，逐条对照 `docs/decisions.md`、当前设计/指南、
> 源码与测试；主 agent 对每个候选回读原文与当前权威后定罪，再统一改。

## 决定

**1. 采用“五类处置”，并把判据写进常设规则。**
判定只看“这条 Note 还指不指导当前工作”，不看年龄：活漂移 → 原地更新；被推翻但仍有引用 →
留 implemented + `> 历史注记` + 互链；重复 owner → 合并；纯推敲 → 删；惰性且无需再解释 →
archive。规则落 [notes/README §主动清理](../README.md) 与 [notes/AGENTS §格式](../AGENTS.md)，
并在 [reviewing-a-delivery](../../.agents/skills/reviewing-a-delivery/SKILL.md) 的跨面自审里加
“旧 Note 一致性”一条——让清理发生在决定变更的同 diff，而不是隔一阵子再来一次。

**2. 完整取代：删除 1 篇否决条。**
`notes/rejected/2026-09-24-license.md` 的复活条件（对外分发前定许可证）已被 2026-10-25 开源发布
满足并落地 MIT。其独有备选（私有/内部保留）已吸收进
[open-source-launch](2026-10-25-open-source-launch.md) 的「输掉的方案」；`LICENSE` 与
`CONTRIBUTING`/`SECURITY` 的现行事实同步进 [discipline-map](../../docs/discipline-map.md) 源 9 表，
并删除所有活面入链。保留它只会让读者以为“许可证仍未决”。

**3. 被后续决定推翻 / 旧时代 RFC：留活跃、加历史注记，共 30 余篇。**
按簇登记（代表，不穷举）：

| 簇 | 处置 | 代表 |
|---|---|---|
| 研究配置 / 方法库（D25 三次修订） | 历史注记：四区管理块已迁「方法库」tab；写入扩为 Method Editor host 工具 | [研究配置页签](2026-10-12-research-config-tab.md) · [显式化](2026-10-18-research-config-explicitness.md) · [方法配置](2026-10-12-research-method-config.md) |
| run 语义（D28/D29/D33） | 更新或历史注记：位置只用于发现；交付不是冻结；契约纪元 = schema 整数；终稿默认读者版 | [run-ops](2026-09-27-run-ops-self-diagnosis.md) · [bundle 分离](2026-09-24-run-bundle-drt-separation.md) · [宪章](2026-10-23-run-bundle-charter.md) · [版本面](2026-10-23-rerun-version-face.md) |
| 门禁 / 工程形态 | 历史注记：单文件 verify 已按域拆；归档复核面已落地；快照覆盖面已扩 | [verify 重排](2026-10-13-verify-domain-regroup.md) · [notes 体检](2026-10-08-notes-stocktake.md) · [重估](2026-10-20-test-asset-reassessment.md) |
| 旧时代 RFC / 队列 | 历史注记：roadmap/queue 已由 D20 退役，四角色已扩为五 preset | [m2 运行机制](2026-09-24-m2-run-mechanics.md) · [R1 搭建](2026-09-24-r1-scaffold.md) · [入口链审计](2026-09-24-entry-chain-fresh-agent-audit.md) · [backlog 立层](2026-09-28-backlog-deliberation-space.md) |
| 检索 / 发布 / 部署 | 更新：D31 第二处例外；pin/版本/安装锚与盘上对齐 | [web 行](2026-09-24-web-tool-rows.md) · [search seam](2026-09-27-search-fallback-seam.md) · [dist 导出](2026-09-28-dist-export.md) · [发布版本](2026-10-25-release-versioning.md) |
| 事故 / 自相矛盾 | 更新：根因改判、BUG-022 归档；复审上限 2→3；pilot→常驻 | [重试 Note](2026-10-11-provider-malformed-response-retry.md) · [审查回边](2026-10-06-review-loop-bound.md) · [MCP Playwright](2026-10-02-mcp-playwright-adoption.md) |

**4. 当前合同里的死指针同步修正。**
[D9](../../docs/decisions.md#d9) 与 [design/10](../../docs/design/10-architecture.md) 的
`fetchTimeoutMs` 从“不设/默认 30000”改为 `45000`（D31）；[D25](../../docs/decisions.md#d25) 的
写入路径改为“面板触发 → Method Editor host 工具；Lead 对话显式保存仍按手册直写”；
[guides/61](../../docs/guides/61-run-playbook.md) 不再把 m2-run-mechanics 当现行流程全图；
[snapshots/README](../../snapshots/README.md) 与 guides/60 的角色面对账改为“研究角色子集”；
卡路径、pack 注释里的 BUG-022 目录、`alignment-ledger` 的失效卡路径一并校正。

**5. 修掉审计中发现的活回归（非 Note 文本问题）。**
第 5 个 preset（Method Editor，D37）加入后，`snapshot-replay-smoke` 仍拿盘上全部 preset 与
`research-face` 的四个 case 对账，场景加载即报 `cases must match roles exactly`。修复 =
smoke 改用 `researchRoles()`（方法编辑不属 run 生命周期），并在
[replay-scene.test.mjs](../../tests/run/replay-scene.test.mjs) 增加“真实场景覆盖研究角色面”的
回归；`snapshots/README`、guides/60、snapshots-adoption Note 同步口径。

**6. 本轮 archive 只用于“层退役”：2 篇事故复盘迁入 archived/。**
逐篇判定后，看起来“过时”的旧 RFC/轮次记录几乎都仍被 docs、门禁台账或其它 Note 引用，或承载
独有的输掉的方案/红证；而 `archived/` **冻结后正文永不修改**，把“需要补一句被谁取代”的 Note
搬进去，只会让旧结论在冷层继续打架。因此本轮把“被推翻”的留在 implemented 加历史注记，
只对真正完整取代且无独有价值的许可证否决条执行删除；事故复盘两篇按 §7 随层退役迁入。

**7. postmortem/ 层退役（用户 2026-10-30 指令）。**
事故复盘不再设独立时态目录；两篇事故复盘（roadmap 毕业漂移、LLM 流 MALFORMED 风暴）迁
`archived/` 冻结，判据与五节骨架并入 [notes/README §事故复盘](../README.md)；活面引用改指为
历史指针并登记 [scripts/archived-note-pointers.json](../../scripts/archived-note-pointers.json)。
事故内容不删——只是取消一个不必存在的层。

## 输掉的方案

- **一刀切 archive 所有旧 Note**：shrink 了活跃区，但冻结层仍需解释“被谁取代”；本仓 2026-10-08
  存量体检已实证归档判定在不同口径下几乎给出不相交名单（严格轮 8/8 对抗抽样被打回），
  按年龄或“看起来旧”批量搬 = 用坏尺子量生产线。
- **按文件日期删掉 2026-09/10 的早期 Note**：早期 Note 承载大量负知识（grep 假阳性、门禁自咬、
  红证出处、放弃的方案）；删了会在同一坑重开讼。
- **只建一份“当前事实索引”**：本仓明文不建手抄索引（会漂移）；现行事实的家是 `docs/`，
  notes 只需要时态标记与互链。
- **把旧 Note 正文改写成现在的结论**：伪造历史，且会让“当时为什么输掉”不可复核；规则是
  加历史注记、不改写原决定。
- **给每篇旧 Note 加统一横幅、不区分死活**：会把仍在指导当前工作的 Note 一起标记成历史，
  读者反而更不知道信谁；本轮只给“现在时结论已假”的篇加注记。

## 实际跑过的验证

- **审计覆盖**：分簇只读通读既有 Note；主 agent 对候选逐条回读原文与当前权威
  （`docs/decisions.md`、design/40、design/50、guides/61/65、NODES、源码与测试），排除
  “只是历史验证数字”的误报（如旧测试计数、旧端口、旧 pin 实例值）。
- **回归（先红后绿）**：修复前 `import('./scripts/smoke/snapshot-replay-smoke.mjs')` 在场景加载期报
  `Replay scene …: cases must match roles exactly`；改 `researchRoles` 后加载通过。新增测试
  `research-face 场景覆盖研究角色面` 首次运行红（场景顺序 vs 字典序），改为集合比较后
  `node --test tests/run/replay-scene.test.mjs` **13/13 绿**。
- **L0**：`pnpm verify` **全绿**（含 `note-format` / `note-graduation-rewrite` / `md-links` /
  `archived-note-pointer` / `discipline-map` 族 / `overlay-fresh` / `pack-workspace-fresh`）。
- **回归全量**：`pnpm test` **1000/1000 绿**。
- **改动边界**：`git status` 仅涉及 `notes/`、`docs/`、`scripts/`、`tests/`、`snapshots/`、
  `_backlog/`、`dev/`、根 `AGENTS.md`、`.agents/skills/`、一处 pack 注释；无产品行为、无新门禁、无凭据面。
- **未跑（如实分开）**：完整 `snapshot-replay-smoke` 端到端（需 `source dev/env.sh` + 浏览器
  + 端口）本轮只验证到“场景加载通过 + 单测”，未跑整场回放；`reviewing-a-delivery` 的新检查项
  未单独用一次真实交付演练。

## 环境状态

- 删除 `notes/rejected/2026-09-24-license.md`（完整取代，吸收后删除）；`postmortem/` 层退役：
  两篇事故复盘迁 `archived/` 冻结，目录 README 删除，活面引用改指并登记历史指针；其余 notes
  篇目只做就地更新或历史注记。归档件正文按冻结纪律保留原路径/原词汇（如“进 notes/postmortem/”），
  不追改。
- 常设规则新增：`notes/README §主动清理`、`notes/AGENTS §格式（历史注记）`、
  `reviewing-a-delivery` 的“旧 Note 一致性”检查项；`notes/` 四个子目录 README 收成目录宪章。
- 现行事实与历史记忆的分工不变：`docs/` 写 now，`notes/` 写 why；历史注记只补“这是哪一段、
  被谁取代、现行看哪”，不改写原决定。
- 篇数以盘上 `ls notes/*` 为准；本页不复制会腐烂的计数。
