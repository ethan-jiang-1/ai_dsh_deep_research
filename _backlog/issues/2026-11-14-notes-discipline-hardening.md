---
status: 待落地
opened: 2026-11-14
---

# 落地：notes 工程纪律补借 P0——树形、归档元数据、拒绝条重启条件与归档校准 skill

> 立卡：2026-11-14 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — `notes/implemented/2026-11-14-notes-discipline-hardening.md`（交付时写）
> 立卡依据：用户 2026-11-14 直派「propose 一个 issue……借助我们的流程准备落地」。
> **`待落地` 不是授权**：实施前按入口规则取授权（[backlog 入口](../README.md)）。
> 出处：研究 = [notes 工程纪律补借](../research/notes-discipline-borrow/README.md)；材料 =
> [2026-11-13-notes-discipline-borrow.md](../research/notes-discipline-borrow/2026-11-13-notes-discipline-borrow.md)。
> 位置前提：**`notes/` 留在仓库根目录，不动**；只借思想与判据，不借 vendor `.agents/notes/`
> 路径与 class 目录位置。

**问题与期望结果：** 研究实测发现 notes 的骨架（四时态、取代检查、毕业改写、归档层、
活面→冻结件指针登记簿）已经借到，但四处**没有把守**：树形（嵌套目录、未知生命周期层、
无日期文件名全部静默通过）、归档元数据（无状态行/无归档行的冻结件也通过）、拒绝条
重启条件（零校验）、归档判断（判据只活在 commit message，报告还会与树面漂移）。
期望：把这四处变成会响的窄检查，并把归档判断写成可加载的校准 skill；不改 `notes/`
位置、不引入 class 层、不动冻结层内容。

**当前情况：**

- **探针 A–F（2026-11-13，HEAD `8e935037`，跑完即删）**：A 嵌套目录 / B 未知生命周期层 /
  C 无日期文件名 / D 重复状态行 / E 无元数据冻结件——全部 **PASS**；F 往冻结件追加一行，
  `pnpm verify` **全绿**。命令与结果 = 材料 §10.1。
- **语料基线（同日实测）**：`implemented/` 82 篇、`archived/` 136 篇、`rejected/` 10 篇、
  `proposed/` 0 篇；82+136 篇状态行全在头七行、恰一条；136 篇归档行全部有合法日期且不早于
  文件名日期，其中 12 篇带括号理由（断言须取日期前缀）；10 篇拒绝条全部有重启/复活节
  （3 篇独立 `## 复活条件`、4 篇 `## 重启*`、3 篇写在 `## 验收（= 复活条件现状）`）。
- **冻结层实况**：28 篇 / 136 篇归档后被改过（跨八次提交）；最近一次 `767674b1`（测试车道
  改名）改了 11 篇冻结件，根因是 `md-links` 仍扫 `notes/archived/**`。这一项属 P1，见 §范围。
- **一手核对**：vendor `scripts/agent-note-tree.ts`（深度等号/生命周期与 class 闭集/
  `INDEX.md` 禁令/文件名正则）、`verify-agent-note-format.ts`（状态行位置与唯一性）、
  `archived-agent-notes.ts`（归档元数据/哈希封印/具名例外）已逐条读过，参考卷转述与源码一致。

**未决问题：**

- 新门禁放 `c-notes` 域（推荐，notes 域已在那里）还是另立域——不影响判据，落地时按
  [scripts/AGENTS](../../scripts/AGENTS.md) 的域切分即可。
- P1（冻结封印 + 归档出链排除）的三个设计选择：清单放仓库内还是用 env 基线；排除
  `md-links` / `md-anchors` 的承诺降级要在哪份文档同步；具名例外的最小形态。**不在本卡**。
- 是否要为这批门禁升格 D 号——建议不升（属门禁补齐，不是制度换向）；若用户视其为制度
  变更，交付时同 diff 登记。
- 状态行"头七行"阈值：当前语料全部满足；若未来 banner 变长再重估，不预留更宽。

**下一步：** 按 S1 → S2 → S3 先红后绿推进（S3 可与 S1/S2 并行），S4 随交付同 diff 改文档与
Note；P1 待本卡关闭后按材料 §5.3 另立卡。

## 范围

**本卡关闭条件只含 P0 四项：**

| 切片 | 交什么 | 不改什么 |
|---|---|---|
| **S1 `note-tree`** | 新门禁：生命周期闭集、禁止嵌套、文件名日期前缀、`INDEX.md` 禁令 | 不加 class 层、不搬 `notes/` |
| **S2 `note-format` 扩展** | 状态行唯一/位置；archived 元数据；rejected 重启条件 | 不查冻结件骨架、不追改冻结件正文 |
| **S3 归档校准 skill** | `.agents/skills/archiving-a-note/SKILL.md`：判据/反指标/本仓样例/程序/报告对账 | 不是门禁；不替代人读 |
| **S4 文档与 Note** | `notes/README.md`、`docs/evaluation.md` 台账、交付 Note 同 diff | 不写第二份规则副本 |

**明确不在本卡：**

- **P1 冻结封印 + 归档出链排除**（材料 §5.3）：它是研究里最大的借点，但要一次全量封印提交
  和"不再检查归档出链"的承诺降级，需要单独拍板；本卡只把树形/元数据准备好，不碰封印。
- **P2**：class 层、`> 类型：` 字段、提案期标题禁行、动词命名/禁 `v2`、存在性/质量门禁
  （理由 = 材料 §3.3、§4.5、§7、§8.3）。
- 任何 `notes/` 路径移动、任何冻结件正文修改。

## 已知与未决

**已知（可直接作为断言基线）：**

- 特征行的四种形态（独立复活/重启/验收内嵌）与 12 篇归档行带理由后缀；机器断言必须容忍。
- 文件名允许含点（三个 `0.3.x` 发布 Note），所以 S1 的正则只钉日期前缀 + 非空主题，
  不照抄严格 kebab。
- `note-format` 的 grandfather 条款只服务 implemented 骨架，S2 不改变它。
- 空语料必须红（同 `archived-note-pointer` 与 `note-graduation-rewrite` 的既有做法）。

**未决（落地时可自行决定，若触面变化再回卡）：**

- S1 的错误文案是否列举允许值（建议列，vendor 同款）。
- S2 的 rejected 词表是否收 `重新引入`（建议收，参考卷的 retained 条件用词）。
- S3 的 description 触发词（建议含 archive/delete/consolidate/audit/归档/删除/合并）。

## 方案与取舍

**S1 · `note-tree`（新门禁，c-notes 域）**

- `notes/` 顶层目录 ∈ `{proposed, implemented, rejected, archived}`；`notes/README.md` 等
  根级文件允许。
- 每个生命周期目录内**只允许普通文件**（`README.md` 允许）；出现子目录即红（防探针 A）。
- Note 文件名匹配 `^\d{4}-\d{2}-\d{2}-.+\.md$`（防探针 C；允许点与中文）。
- `notes/` 下任何 `INDEX.md` 即红（参考卷同款；防第二份清单）。
- 扫描集为空即红（防空语料）。
- 登记：`scripts/verify/context.mjs` 的 gates 数组 + [evaluation §L0](../../docs/evaluation.md)
  台账行 + `tests/checks/verify-gates.test.mjs` 静态对账 + `gates.e2e` 四案例
  （嵌套目录 / 未知层 / 无日期文件名 / INDEX.md）。

**S2 · `note-format` 扩展**

- 四态通用：`> 状态：` 恰一条且在前七行（防探针 D）。
- archived：`> 状态：implemented` + `> 归档：<YYYY-MM-DD>`（取日期前缀，容忍 12 篇的括号理由）；
  日期须合法且不早于文件名日期；**不查骨架**（防探针 E）。
- rejected：必须有标题含 `复活|重启|重新引入` 的 h2（防"这层只剩状态行"）。
- 基线应全绿；红证：重复状态行、无归档行、非法日期、早于文件名日期、删掉重启节。

**S3 · `.agents/skills/archiving-a-note/SKILL.md`**

- description 以 `Use ` 开头（`dev-skill-format` 检查），触发归档/删除/合并/审计 notes。
- 内容骨架：反指标（字数/年龄/配额一律不当判据）→ 取证程序（读代码/配置/docs/台账/后续
  Note + grep 活面找真实引用 + 确认承接 owner）→ 五类处置（原地更新/历史注记/合并/删/
  archive；引 `notes/README.md` §主动清理，不复制）→ 本仓校准样表（材料 §6.5）→ 程序
  （只加归档行、入链重定向/登记、红→绿）→ 报告（名单与 `git diff --name-status` 对账）。
- 验收：`dev-skill-format` 绿；内容逐项在场（人工判据，无机械红证）。

**S4 · 文档与 Note（同 diff）**

- `notes/README.md`：补树形规则（一节或差异表行）、§已知缺口（材料 §8.3 的 G1–G6 压缩成
  本仓口径）、S3 skill 指针。
- `docs/evaluation.md`：新门禁台账行；`scripts/verify/gates/c-notes.mjs` 头注补域归属。
- `notes/AGENTS.md` 仅在需要一句话入口时改（受预算约束，优先下放 notes/README）。
- 交付 Note：`notes/implemented/2026-11-14-notes-discipline-hardening.md`，写决定、输掉的
  方案、实际红绿证据、残余边界（P1 未做）。

**输掉的方案：**

- **一次做完 P0 + P1**：封印要先做一次全量封印提交，并降级"归档出链可解析"的承诺；
  两件事的验收面与风险不同，绑在一起会让 P0 被 P1 的设计争论拖住。
- **只写 skill 不立门禁**：探针 A–E 证明现在可静默逃逸；skill 不解决"没有把守"。
- **加 class 层（孙目录）**：61/94 家族、检索未失效；迁移成本高，且封印后历史层不可重组
  （材料 §3.3）。
- **加 `> 类型：` 头字段**：没有消费者的分类会腐烂；真要分类直接做目录。
- **提案期标题禁行**：`## 方案` 在活跃区是合法交付节；标题检查只证外观。
- **把 S2 并进 S1 成一个大检查**：两类判据（树形 vs 元数据）失败面不同，合成一道会让
  错误文案与 `--only` 窄面都变差。

## 判据形状

- **权威事实**：文件系统树 + Note 头部状态行 + 文件名日期 + 归档行；不新增 canonical 数据，
  不引入 JSON/会话事件。
- **读取方**：`verify` 门禁 `note-tree`（新）与 `note-format`（扩展）；S3 skill 不是门禁。
- **坏输入**：缺失（目录/文件/状态行/归档行/重启节）→ 红；非法（未知层/嵌套/无日期文件名/
  `INDEX.md`/重复状态行/非法或过早归档日期）→ 红；互斥（同一状态行出现两次）→ 红；
  空扫描集 → 红。
- **旧形态**：现有 82+136+10 篇已全部合规（实测）；无需迁移，grandfather 条款不变。
- **反证**：`gates.e2e` 每类坏输入一案例；`tests/checks/verify-gates.test.mjs` 静态对账
  （门禁 ↔ 案例）；探针 A–E 是本卡立项前的现状证据；探针 F 属 P1。

## 验收标准

1. **S1**：`note-tree` 在 `pnpm verify` 中可单独 `--only` 运行；四类注入（嵌套目录、未知层、
   无日期文件名、`INDEX.md`）各先红后绿；真实语料基线绿；登记三处（gates 数组、evaluation
   台账、案例静态对账）同步。
2. **S2**：五类注入（重复状态行、无归档行、非法日期、归档早于文件名、拒绝条无重启节）各先红
   后绿；真实语料基线绿（含 12 篇带理由的归档行）；冻结件骨架不被检查。
3. **S3**：`dev-skill-format` 绿；skill 内反指标、取证程序、五类处置、校准样例、报告对账
   五项在场（人工逐项核对，记录在交付 Note）。
4. **S4**：`notes/README.md`、`docs/evaluation.md`、交付 Note 与实现同 diff；无第二份规则副本；
   `notes/` 路径零移动。
5. **收尾**：`pnpm verify` 全绿 + `pnpm test` 全绿；交付 Note 含实际红绿命令与输出摘要；
   P1 未做的事实与触发条件在 Note/材料中写明。

## 关闭条件

- 上列验收标准逐条成立；交付 Note 与门禁/文档同 diff；
- 需要用户验收的面（门禁与验收合同变更）已请用户确认，或按入口规则记录跳过理由；
- P1 的后续载体成立（另卡或 triggers 行），本卡不因 P1 未做而悬空；
- 归档本卡时同变更更新 [issues 索引](README.md) 与去向载体。
